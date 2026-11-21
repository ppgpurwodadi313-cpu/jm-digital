/* JM Digital — lapisan API: fetch text/plain (bebas preflight CORS), cache SWR,
   deduplikasi in-flight, batcher baca, dan antrean offline untuk presensi/capaian. */
(function () {
  'use strict';
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
    keys() { try { return Object.keys(localStorage); } catch (e) { return []; } }
  };
  let token = LS.get('jm_token') || '', uid = LS.get('jm_uid') || '0', epoch = 0;
  const mem = {}, inflight = {}, authCbs = [], QKEY = 'jm_queue';
  const QUEUEABLE = { simpanPresensi: 1, simpanCapaian: 1 };

  function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function key(a, d) { return a + '|' + JSON.stringify(d || {}); }
  function lsKey(k) { return 'jm_c_' + uid + '_' + hash(k); }
  function getCache(k) {
    if (mem[k]) return mem[k];
    const raw = LS.get(lsKey(k)); if (!raw) return null;
    try { const o = JSON.parse(raw); o.ep = -1; mem[k] = o; return o; } catch (e) { return null; }
  }
  function setCache(k, v) {
    const o = { t: Date.now(), v: v, ep: epoch }; mem[k] = o;
    const s = JSON.stringify(o); if (s.length < 400000) LS.set(lsKey(k), s);
  }
  function clearCache() {
    Object.keys(mem).forEach(function (k) { delete mem[k]; });
    LS.keys().forEach(function (k) { if (k.indexOf('jm_c_') === 0) LS.del(k); });
  }

  async function raw(action, data) {
    const ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 30000);
    try {
      const res = await fetch(window.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, data: data || {}, token: token }), signal: ctl.signal });
      return await res.json();
    } catch (e) { const er = new Error('Tidak dapat terhubung ke server. Periksa koneksi internet.'); er.code = 'NET'; throw er; }
    finally { clearTimeout(to); }
  }
  async function post(action, data) {
    let j;
    try { j = await raw(action, data); }
    catch (e) { if (e.code === 'NET' && !QUEUEABLE[action]) { j = await raw(action, data); } else throw e; } // 1x ulang untuk jaringan putus-nyambung
    if (!j.success) {
      const er = new Error(j.message || 'Terjadi kesalahan.'); er.code = j.code || 'ERR';
      if (er.code === 'AUTH' && token) { setToken('', '0'); authCbs.forEach(function (f) { f(); }); }
      throw er;
    }
    return j;
  }
  function setToken(t, id) { token = t || ''; if (t) { LS.set('jm_token', t); } else { LS.del('jm_token'); clearCache(); } if (id !== undefined) { uid = id; LS.set('jm_uid', id); } }

  /* ----- Baca: batcher + dedupe ----- */
  let bq = [], bt = null;
  function fetchRead(a, d) {
    const k = epoch + '|' + key(a, d);
    if (inflight[k]) return inflight[k];
    const p = new Promise(function (res, rej) { bq.push({ a: a, d: d, res: res, rej: rej }); if (!bt) bt = setTimeout(flush, 0); });
    inflight[k] = p; const done = function () { delete inflight[k]; }; p.then(done, done);
    return p;
  }
  async function flush() {
    const q = bq; bq = []; bt = null;
    if (q.length === 1) { try { q[0].res(await post(q[0].a, q[0].d)); } catch (e) { q[0].rej(e); } return; }
    for (let i = 0; i < q.length; i += 8) {
      const chunk = q.slice(i, i + 8);
      try {
        const r = await post('batch', { calls: chunk.map(function (c) { return { action: c.a, data: c.d }; }) });
        chunk.forEach(function (c, n) {
          const x = r.hasil[n];
          if (x && x.success) c.res(x); else { const er = new Error((x && x.message) || 'Gagal'); er.code = x && x.code; c.rej(er); }
        });
      } catch (e) { chunk.forEach(function (c) { c.rej(e); }); }
    }
  }
  // Stale-while-revalidate: tampilkan cache seketika, segarkan di latar belakang
  function swr(a, d, cb, opt) {
    const ttl = (opt && opt.ttl) || 30000, k = key(a, d), hit = getCache(k);
    if (hit) { cb(hit.v, true); if (hit.ep === epoch && Date.now() - hit.t < ttl) return Promise.resolve(hit.v); }
    return fetchRead(a, d).then(function (v) {
      setCache(k, v);
      if (!hit || JSON.stringify(hit.v) !== JSON.stringify(v)) cb(v, false);
      return v;
    }).catch(function (e) { if (hit && e.code === 'NET') return hit.v; throw e; });
  }
  function peek(a, d) { const h = getCache(key(a, d)); return h ? h.v : null; }

  /* ----- Tulis + antrean offline ----- */
  function queue() { try { return JSON.parse(LS.get(QKEY) || '[]'); } catch (e) { return []; } }
  function saveQueue(q) { LS.set(QKEY, JSON.stringify(q)); notifyQ(); }
  const qCbs = []; function notifyQ() { qCbs.forEach(function (f) { f(queue().length); }); }
  async function write(a, d) {
    epoch++;
    try { return await post(a, d); }
    catch (e) {
      if (e.code === 'NET' && QUEUEABLE[a]) { const q = queue(); q.push({ a: a, d: d, t: Date.now() }); saveQueue(q); return { success: true, queued: true }; }
      throw e;
    }
  }
  let flushing = false;
  async function flushQueue() {
    if (flushing || !token) return; flushing = true;
    try {
      let q = queue();
      while (q.length) {
        try { await post(q[0].a, q[0].d); epoch++; q.shift(); saveQueue(q); }
        catch (e) { if (e.code === 'NET') break; q.shift(); saveQueue(q); if (window.JM && JM.toast) JM.toast('Satu data offline ditolak server: ' + e.message, 'err'); }
      }
    } finally { flushing = false; }
  }
  window.addEventListener('online', flushQueue);
  setInterval(function () { if (queue().length) flushQueue(); }, 30000);

  window.JMAPI = { post: post, write: write, swr: swr, peek: peek, setToken: setToken, hasToken: function () { return !!token; },
    clearCache: clearCache, onAuth: function (f) { authCbs.push(f); }, onQueue: function (f) { qCbs.push(f); }, queueSize: function () { return queue().length; },
    flushQueue: flushQueue, bump: function () { epoch++; }, LS: LS };
})();
