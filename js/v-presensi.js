/* Presensi Digital Cepat: pilih sesi -> daftar peserta otomatis -> tandai -> kunci & kirim (draf offline-safe) */
(function () {
  'use strict';
  const JM = window.JM, $ = JM.$, $$ = JM.$$, esc = JM.esc, ic = JM.ic;
  const ST = [['Hadir', 'h'], ['Izin', 'i'], ['Sakit', 's'], ['Alpa', 'a']];

  JM.view('presensi', { title: 'Presensi Digital', render: function (root, ctx) {
    const edit = JM.can('presensi', 'c'), uid = JM.user.id;
    let jadwals = [], j = null, tanggal = '', peserta = [], map = {}, fJ = '', q = '', dirty = false, savedAt = '', alive = true, draftKey = '';
    root.innerHTML = JM.head({ eyebrow: 'Manajemen operasional & pengajian', title: 'Presensi Digital Cepat', desc: 'Catat kehadiran jamaah dan generus kegiatan secara cepat, akurat, dan terintegrasi.',
      actions: '<button class="btn sec" id="p-his">' + ic('history') + 'Riwayat Presensi</button>' + (JM.can('jadwal', 'c') ? '<button class="btn sec" id="p-new">' + ic('add_circle') + 'Buat Sesi Baru</button>' : '') }) +
      '<div class="card pad" style="margin-bottom:16px"><div class="frm" style="grid-template-columns:2fr 1fr"><div class="fld"><label for="p-j">Sesi pengajian terjadwal</label><select class="inp" id="p-j"><option>Memuat sesi…</option></select></div><div class="fld"><label for="p-t">Tanggal kegiatan</label><input class="inp" type="date" id="p-t"></div></div>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:14px"><div class="chips" id="p-ch"></div><span style="flex:1"></span><div class="search" style="flex:0 1 280px">' + ic('search') + '<input class="inp" id="p-q" type="search" placeholder="Ketik nama atau no. induk…  (Ctrl+K)"></div></div></div>' +
      '<div class="card pad" style="margin-bottom:16px"><div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center"><div><div class="eyebrow" style="color:var(--muted)">Total terdaftar</div><div class="val num" style="font:700 28px var(--fh)" id="p-tot">0</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;flex:1" id="p-sum"></div>' +
      (edit ? '<div class="actions"><button class="btn sec sm" id="p-all">' + ic('done_all') + 'Tandai semua hadir</button><button class="btn sec sm" id="p-rst">' + ic('restart_alt') + 'Reset</button></div>' : '') + '</div><div class="bar-prog" id="p-bar"></div>' +
      (JM.can('wa', 'c') ? '<div style="margin-top:12px"><button class="btn wa sm" id="p-wa">' + ic('chat') + 'Kirim WA wali tidak hadir (Alpa)</button></div>' : '') + '</div>' +
      '<div class="card"><div id="p-list"><div style="padding:16px">' + JM.skel(6) + '</div></div></div>' +
      (edit ? '<div class="savebar"><div><b id="p-prog">–</b><br><small id="p-info">Draf lokal tersimpan otomatis (aman saat offline)</small></div><span id="p-exp"></span><button class="btn" id="p-save">' + ic('lock') + 'Kunci & Kirim Presensi</button></div>' : '<div class="note" style="margin-top:12px">' + ic('visibility') + '<span>Peran Anda hanya dapat melihat presensi.</span></div>');

    const hit = function () {
      const c = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0, Belum: 0 }; peserta.forEach(function (p) { const s = (map[p.ID_Jamaah] || {}).s; c[s || 'Belum']++; });
      const n = peserta.length, pc = function (x) { return n ? Math.round(x / n * 1000) / 10 : 0; };
      $('#p-tot', root).textContent = n;
      $('#p-sum', root).innerHTML = JM.pill('Hadir: ' + c.Hadir + ' (' + pc(c.Hadir) + '%)', 'p-ok') + JM.pill('Izin: ' + c.Izin, 'p-in') + JM.pill('Sakit: ' + c.Sakit, 'p-wr') + JM.pill('Alpa: ' + c.Alpa, 'p-er') + (c.Belum ? JM.pill('Belum: ' + c.Belum, 'p-gr') : '');
      $('#p-bar', root).innerHTML = [['Hadir', '#0F766E'], ['Izin', '#1D4ED8'], ['Sakit', '#D97706'], ['Alpa', '#991B1B']].map(function (x) { return '<s style="width:' + pc(c[x[0]]) + '%;background:' + x[1] + '"></s>'; }).join('');
      const pr = $('#p-prog', root); if (pr) pr.textContent = 'Progres entri: ' + (n - c.Belum) + ' dari ' + n + ' santri';
      return c;
    };
    const tampilChips = function () {
      const cnt = {}; peserta.forEach(function (p) { cnt[p.Jenjang] = (cnt[p.Jenjang] || 0) + 1; });
      $('#p-ch', root).innerHTML = '<button class="' + (!fJ ? 'on' : '') + '" data-j="">Semua (' + peserta.length + ')</button>' + Object.keys(cnt).map(function (k) { return '<button class="' + (fJ === k ? 'on' : '') + '" data-j="' + esc(k) + '">' + esc(k) + ' (' + cnt[k] + ')</button>'; }).join('');
      $$('#p-ch button', root).forEach(function (b) { b.onclick = function () { fJ = b.dataset.j; tampilChips(); tampilList(); }; });
    };
    const seg = function (id) { const s = (map[id] || {}).s; return '<div class="seg">' + ST.map(function (x) { return '<button type="button" class="' + x[1] + (s === x[0] ? ' on' : '') + '" data-id="' + id + '" data-s="' + x[0] + '"' + (edit ? '' : ' disabled') + '>' + x[0] + '</button>'; }).join('') + '</div>'; };
    const tampilList = function () {
      const ql = q.toLowerCase(), rows = peserta.filter(function (p) { return (!fJ || p.Jenjang === fJ) && (!ql || (p.Nama_Lengkap + ' ' + p.No_Induk).toLowerCase().indexOf(ql) > -1); });
      const L = $('#p-list', root);
      if (!rows.length) { L.innerHTML = '<div class="empty">' + (peserta.length ? 'Tidak ada yang cocok dengan pencarian.' : 'Belum ada peserta untuk sesi ini (periksa jenjang sasaran & wilayah jadwal).') + '</div>'; return; }
      const ket = function (p) { return '<input class="inp" data-k="' + p.ID_Jamaah + '" placeholder="Catatan…" value="' + esc((map[p.ID_Jamaah] || {}).k || '') + '"' + (edit ? '' : ' disabled') + ' style="min-width:140px">'; };
      L.innerHTML = '<div class="tbl-wrap hide-m"><table class="tbl"><thead><tr><th>No</th><th>Santri / generus</th><th>Jenjang & kelompok</th><th>Status kehadiran cepat</th><th>Catatan</th></tr></thead><tbody>' +
        rows.map(function (p, i) { return '<tr><td class="num sub">' + ('0' + (i + 1)).slice(-2) + '</td><td><div class="person">' + JM.avatar(p) + '<div><b>' + esc(p.Nama_Lengkap) + '</b><small class="num">' + esc(p.No_Induk) + ' • ' + (p.Jenis_Kelamin === 'L' ? 'Laki-laki' : 'Perempuan') + (p.Usia !== '' ? ' ' + p.Usia + ' th' : '') + '</small></div></div></td><td><span class="eyebrow" style="color:var(--wr)">' + esc(p.Jenjang) + '</span><span class="sub">Kel. ' + esc(p.Kelompok) + '</span></td><td>' + seg(p.ID_Jamaah) + '</td><td>' + ket(p) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="cards-m">' + rows.map(function (p) { return '<div style="padding:12px 14px;border-bottom:1px solid var(--soft)"><div class="person" style="margin-bottom:8px">' + JM.avatar(p) + '<div style="min-width:0"><b>' + esc(p.Nama_Lengkap) + '</b><small>' + esc(p.Jenjang) + ' • ' + esc(p.No_Induk) + '</small></div></div>' + seg(p.ID_Jamaah) + '<div style="margin-top:8px">' + ket(p) + '</div></div>'; }).join('') + '</div>';
      $$('.seg button', L).forEach(function (b) { b.onclick = function () { const id = b.dataset.id, cur = map[id] || (map[id] = { s: '', k: '' }); cur.s = cur.s === b.dataset.s ? '' : b.dataset.s; $$('.seg button[data-id="' + id + '"]', L).forEach(function (x) { x.classList.toggle('on', x.dataset.s === cur.s); }); ubah(); }; });
      $$('[data-k]', L).forEach(function (i) { i.oninput = function () { (map[i.dataset.k] || (map[i.dataset.k] = { s: '', k: '' })).k = i.value; ubah(true); }; });
    };
    let dt; const ubah = function (tanpaHit) { dirty = true; if (!tanpaHit) hit(); clearTimeout(dt); dt = setTimeout(simpanDraf, 300); };
    const simpanDraf = function () { try { localStorage.setItem(draftKey, JSON.stringify(map)); const i = $('#p-info', root); if (i) i.textContent = 'Draf lokal tersimpan otomatis (aman saat offline)' + (savedAt ? ' • Terkirim terakhir ' + savedAt : ''); } catch (e) {} };

    const muatPeserta = function () {
      if (!j) { peserta = []; map = {}; tampilChips(); hit(); tampilList(); return; }
      draftKey = 'jm_dr_' + uid + '_' + j.ID_Jadwal + '_' + tanggal; let draf = null; try { draf = JSON.parse(localStorage.getItem(draftKey) || 'null'); } catch (e) {}
      const first = {}; map = {}; dirty = !!draf;
      const apply = function (r) {
        if (!alive || r.jadwal.ID_Jadwal !== j.ID_Jadwal || r.tanggal !== tanggal) return;
        peserta = r.peserta; peserta.forEach(function (p) { if (!first[p.ID_Jamaah]) { first[p.ID_Jamaah] = 1; map[p.ID_Jamaah] = (draf && draf[p.ID_Jamaah]) || { s: p.status || '', k: p.ket || '' }; } else if (!dirty && !(map[p.ID_Jamaah] || {}).s) map[p.ID_Jamaah] = { s: p.status || '', k: p.ket || '' }; });
        tampilChips(); hit(); tampilList();
      };
      JMAPI.swr('pesertaJadwal', { idJadwal: j.ID_Jadwal, tanggal: tanggal }, apply, { ttl: 10000 }).then(apply).catch(function (e) { if (alive) $('#p-list', root).innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
    };
    const pilih = function (id, tgl) { j = jadwals.filter(function (x) { return x.ID_Jadwal === id; })[0] || null; tanggal = tgl || (j ? j.Tanggal : ''); $('#p-j', root).value = j ? j.ID_Jadwal : ''; $('#p-t', root).value = tanggal; muatPeserta(); };
    const isiJadwal = function (rows) {
      jadwals = rows; const today = JM.hariIni(); const s = $('#p-j', root);
      s.innerHTML = rows.length ? rows.map(function (x) { return '<option value="' + esc(x.ID_Jadwal) + '">' + esc(x.Judul_Kegiatan) + ' — ' + esc(JM.hariTgl(x.Tanggal)) + '</option>'; }).join('') : '<option value="">Belum ada sesi terjadwal</option>';
      if (j) return;
      const pick = (ctx.params.j && rows.filter(function (x) { return x.ID_Jadwal === ctx.params.j; })[0]) || rows.filter(function (x) { return x.Tanggal === today; })[0] || rows.filter(function (x) { return x.Tanggal > today; })[0] || rows[rows.length - 1];
      if (pick) pilih(pick.ID_Jadwal, ctx.params.tgl); else pilih('', '');
    };
    JMAPI.swr('list', { tabel: 'jadwal', from: JM.geser(JM.hariIni(), -21), to: JM.geser(JM.hariIni(), 21), size: 100, sort: { col: 'Tanggal', dir: 'asc' } }, function (r) { if (alive) isiJadwal(r.rows); }, { ttl: 20000 })
      .then(function (r) { if (alive && !jadwals.length) isiJadwal(r.rows); }).catch(function (e) { JM.toast(e.message, 'err'); });
    // Jika sesi dari parameter di luar jendela 6 minggu, tetap dapat dibuka lewat riwayat

    $('#p-j', root).onchange = function (e) { pilih(e.target.value); };
    $('#p-t', root).onchange = function (e) { tanggal = e.target.value || tanggal; muatPeserta(); };
    $('#p-q', root).oninput = JM.debounce(function (e) { q = e.target.value; tampilList(); }, 150);
    $('#p-q', root).onkeydown = function (e) { if (e.key === 'Enter') { const b = $('.seg button.h', root); if (b && peserta.filter(function (p) { return (p.Nama_Lengkap + ' ' + p.No_Induk).toLowerCase().indexOf(q.toLowerCase()) > -1; }).length === 1) { b.click(); e.target.select(); } } };
    const kk = function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#p-q', root).focus(); } }; document.addEventListener('keydown', kk);
    const all = $('#p-all', root); if (all) all.onclick = function () { peserta.forEach(function (p) { if (!fJ || p.Jenjang === fJ) (map[p.ID_Jamaah] = map[p.ID_Jamaah] || { s: '', k: '' }).s = 'Hadir'; }); ubah(); tampilList(); };
    const rst = $('#p-rst', root); if (rst) rst.onclick = async function () { if (await JM.confirm('Kosongkan semua tanda kehadiran di layar ini?', 'Reset')) { peserta.forEach(function (p) { map[p.ID_Jamaah] = { s: '', k: '' }; }); ubah(); tampilList(); } };
    $('#p-his', root).onclick = function () {
      const api = JM.modal({ title: 'Riwayat Presensi (60 hari)', size: 'lg', body: JM.skel(4), actions: [{ label: 'Tutup', close: true }] });
      JMAPI.post('riwayatPresensi', { from: JM.geser(JM.hariIni(), -60) }).then(function (r) {
        api.body.innerHTML = r.sesi.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Kegiatan</th><th>H</th><th>I</th><th>S</th><th>A</th><th>% Hadir</th><th></th></tr></thead><tbody>' + r.sesi.map(function (s) { return '<tr><td class="num">' + JM.tgl(s.Tanggal) + '</td><td>' + esc(s.Judul) + '</td><td class="num">' + s.Hadir + '</td><td class="num">' + s.Izin + '</td><td class="num">' + s.Sakit + '</td><td class="num">' + s.Alpa + '</td><td class="num"><b>' + Math.round(s.Hadir / (s.Total || 1) * 100) + '%</b></td><td><button class="btn sec sm" data-j="' + esc(s.ID_Jadwal) + '" data-t="' + esc(s.Tanggal) + '">Buka</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">Belum ada riwayat presensi.</div>';
        $$('[data-j]', api.body).forEach(function (b) { b.onclick = function () { api.close(); if (!jadwals.some(function (x) { return x.ID_Jadwal === b.dataset.j; })) { JMAPI.post('list', { tabel: 'jadwal', size: 100 }).then(function (rr) { const f = rr.rows.filter(function (x) { return x.ID_Jadwal === b.dataset.j; })[0]; if (f) { jadwals.push(f); $('#p-j', root).insertAdjacentHTML('beforeend', '<option value="' + esc(f.ID_Jadwal) + '">' + esc(f.Judul_Kegiatan) + '</option>'); pilih(f.ID_Jadwal, b.dataset.t); } }); } else pilih(b.dataset.j, b.dataset.t); }; });
      }).catch(function (e) { api.body.innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
    };
    const nw = $('#p-new', root); if (nw) nw.onclick = function () { JM.go('jadwal', { baru: 1 }); };
    const wa = $('#p-wa', root); if (wa) wa.onclick = function () {
      if (!j) return JM.toast('Pilih sesi terlebih dahulu.', 'err'); if (dirty) return JM.toast('Simpan presensi terlebih dahulu (Kunci & Kirim) agar data terbaru terbaca.', 'err');
      JM.waModal(j, { jenis: 'tidakHadir', tanggal: tanggal, statuses: ['Alpa'], izinkanHadir: true });
    };
    const ex = $('#p-exp', root); if (ex) { ex.appendChild(JM.tombolEkspor(async function () { return { judul: 'Rekap Presensi — ' + (j ? j.Judul_Kegiatan : '') + ' (' + JM.tgl(tanggal) + ')', kolom: ['No', 'No. Induk', 'Nama', 'Jenjang', 'Kelompok', 'Status', 'Catatan'], baris: peserta.map(function (p, i) { const m = map[p.ID_Jamaah] || {}; return [i + 1, p.No_Induk, p.Nama_Lengkap, p.Jenjang, p.Kelompok, m.s || '-', m.k || '']; }) }; }, 'presensi')); $$('button', ex).forEach(function (b) { b.classList.remove('wa'); b.classList.add('sec'); }); }
    const sv = $('#p-save', root); if (sv) sv.onclick = async function () {
      if (!j) return JM.toast('Pilih sesi terlebih dahulu.', 'err');
      const recs = peserta.filter(function (p) { return (map[p.ID_Jamaah] || {}).s; }).map(function (p) { return { ID_Jamaah: p.ID_Jamaah, Status_Kehadiran: map[p.ID_Jamaah].s, Keterangan: map[p.ID_Jamaah].k || '' }; });
      if (!recs.length) return JM.toast('Belum ada kehadiran yang ditandai.', 'err');
      const kosong = peserta.length - recs.length; if (kosong && !(await JM.confirm(kosong + ' santri belum ditandai dan tidak akan disimpan. Lanjutkan?', 'Ya, kirim'))) return;
      sv.disabled = true;
      try {
        const r = await JMAPI.write('simpanPresensi', { idJadwal: j.ID_Jadwal, tanggal: tanggal, records: recs });
        if (r.queued) { JM.toast('Offline: presensi disimpan di perangkat & dikirim otomatis saat online.', 'ok'); }
        else { JM.toast('Presensi terkirim (' + r.disimpan + ' data).', 'ok'); try { localStorage.removeItem(draftKey); } catch (e) {} dirty = false; savedAt = new Date().toTimeString().slice(0, 5); const i = $('#p-info', root); if (i) i.textContent = 'Terkirim ' + savedAt + ' WIB'; }
      } catch (e) { JM.toast(e.message, 'err'); } finally { sv.disabled = false; }
    };
    return function () { alive = false; clearTimeout(dt); document.removeEventListener('keydown', kk); if (dirty) simpanDraf(); };
  } });
})();
