/* JM Digital — inti aplikasi: autentikasi, boot (1 panggilan), router hash, shell responsif, PWA */
(function () {
  'use strict';
  const JM = window.JM = window.JM || {};
  const $ = JM.$, $$ = JM.$$, esc = JM.esc, ic = JM.ic;
  JM.views = {}; JM.boot = null; JM.user = null; JM.izin = {};
  JM.view = function (id, def) { def.id = id; JM.views[id] = def; };
  JM.can = function (mod, act) { return ((JM.izin || {})[mod] || '').indexOf(act || 'r') > -1; };
  JM.refs = function () { return (JM.boot && JM.boot.refs) || { wilayah: [], jenjang: [], kurikulum: [] }; };
  JM.jenjangList = function () { return JM.refs().jenjang.map(function (j) { return j.Nama_Jenjang; }); };
  JM.desaList = function () { const s = {}; JM.refs().wilayah.forEach(function (w) { if (w.Nama_Desa) s[w.Nama_Desa] = 1; }); return Object.keys(s).sort(); };
  JM.kelompokList = function (desa) { return JM.refs().wilayah.filter(function (w) { return w.Nama_Kelompok && (!desa || w.Nama_Desa === desa); }).map(function (w) { return w.Nama_Kelompok; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(); };
  JM.opts = function (arr, ph) { return '<option value="">' + esc(ph) + '</option>' + arr.map(function (a) { return '<option>' + esc(a) + '</option>'; }).join(''); };
  JM.head = function (o) {
    return '<div class="page-head"><div>' + (o.eyebrow ? '<div class="eyebrow">' + esc(o.eyebrow) + '</div>' : '') + '<h1>' + esc(o.title) + '</h1>' + (o.desc ? '<p>' + esc(o.desc) + '</p>' : '') + '</div><div class="actions" id="head-act">' + (o.actions || '') + '</div></div>';
  };
  JM.ROLE = { Admin_Daerah: 'Admin Daerah', Pengurus_Desa: 'Pengurus Desa', Pengurus_Kelompok: 'Pengurus Kelompok', Guru: 'Guru / Mubaligh' };

  const MENU = [
    { id: 'dashboard', t: 'Dashboard Analitik', i: 'dashboard', ok: function () { return true; } },
    { id: 'jamaah', t: 'Database Jamaah & Generus', i: 'groups', ok: function () { return JM.can('jamaah'); } },
    { id: 'guru', t: 'Direktori Guru & Mubaligh', i: 'school', ok: function () { return JM.can('guru'); } },
    { id: 'jadwal', t: 'Jadwal & Broadcast WA', i: 'forum', ok: function () { return JM.can('jadwal'); } },
    { id: 'presensi', t: 'Presensi Digital', i: 'fact_check', ok: function () { return JM.can('presensi'); } },
    { id: 'kbm', t: 'Jurnal KBM & GBPM', i: 'menu_book', ok: function () { return JM.can('jurnal'); } },
    { id: 'laporan', t: 'Pusat Laporan & Rapor', i: 'description', ok: function () { return JM.can('laporan'); } },
    { id: 'infaq', t: 'Infaq', i: 'volunteer_activism', ok: function () { return JM.can('infaq'); } },
    { id: 'akun', t: 'Manajemen Akun', i: 'manage_accounts', ok: function () { return JM.can('pengguna', 'c'); } },
    { id: 'pengaturan', t: 'Pengaturan Sistem', i: 'settings', ok: function () { return JM.can('rahasia'); } }
  ];

  /* ---------- Login ---------- */
  function renderLogin(pesan) {
    $('#app').hidden = false; closeBoot();
    $('#app').innerHTML = '<div class="login"><form class="login-card" id="lf" autocomplete="on"><div class="logo">JM</div><h1>JM Digital</h1><p>Masuk untuk mengelola data jamaah & pembinaan generus.</p>' +
      '<div class="fld" style="margin-bottom:12px"><label for="lu">Username</label><input class="inp" id="lu" name="username" autocomplete="username" autocapitalize="none" required></div>' +
      '<div class="fld" style="margin-bottom:6px"><label for="lp">Kata sandi</label><input class="inp" id="lp" type="password" name="password" autocomplete="current-password" required></div>' +
      '<label style="display:flex;gap:6px;font-size:12px;color:var(--muted);margin:8px 0 14px"><input type="checkbox" id="ls"> Tampilkan kata sandi</label>' +
      '<div class="err" id="le" style="min-height:18px;margin-bottom:8px">' + esc(pesan || '') + '</div><button class="btn" style="width:100%" id="lb">Masuk</button></form></div>';
    $('#ls').onchange = function (e) { $('#lp').type = e.target.checked ? 'text' : 'password'; };
    $('#lf').onsubmit = async function (e) {
      e.preventDefault(); const b = $('#lb'); b.disabled = true; b.textContent = 'Memeriksa…'; $('#le').textContent = '';
      try {
        const r = await JMAPI.post('login', { username: $('#lu').value, password: $('#lp').value });
        JMAPI.setToken(r.token, r.user.username); location.hash = '#/dashboard'; bootApp();
      } catch (er) { $('#le').textContent = er.message; b.disabled = false; b.textContent = 'Masuk'; }
    };
    $('#lu').focus();
  }
  function closeBoot() { const b = $('#boot'); if (b) { b.classList.add('off'); setTimeout(function () { b.remove(); }, 400); } }

  /* ---------- Boot ---------- */
  let shellReady = false;
  function bootApp() {
    shellReady = false;
    JMAPI.swr('boot', {}, function (r, dariCache) {
      const berubah = !JM.boot || JSON.stringify(JM.boot.refs) !== JSON.stringify(r.refs);
      JM.boot = r; JM.user = r.user; JM.izin = r.izin;
      if (!shellReady) { renderShell(); shellReady = true; route(); }
      else if (!dariCache && berubah && JM.curId === 'dashboard') route();
    }, { ttl: 20000 }).catch(function (e) {
      if (e.code === 'AUTH') renderLogin('Sesi berakhir. Silakan masuk kembali.');
      else if (!shellReady) { $('#app').hidden = false; closeBoot(); $('#app').innerHTML = '<div class="login"><div class="login-card"><h1>Tidak terhubung</h1><p>' + esc(e.message) + '</p><button class="btn" onclick="location.reload()">Coba lagi</button></div></div>'; }
    });
  }
  JMAPI.onAuth(function () { shellReady = false; renderLogin('Sesi berakhir. Silakan masuk kembali.'); });

  /* ---------- Shell ---------- */
  function wilayahLabel() {
    const u = JM.user, w = JM.refs().wilayah[0], daerah = w ? w.Nama_Daerah : '';
    if (u.role === 'Admin_Daerah') return '<b>' + esc(daerah || 'Seluruh Daerah') + '</b> • Semua Desa';
    return (daerah ? esc(daerah) + ' • ' : '') + '<b>' + esc(u.desa) + '</b>' + (u.kelompok ? ' • Kelompok ' + esc(u.kelompok) : '');
  }
  function hijri() { try { return new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).replace(/ H$/, '') + ' H'; } catch (e) { return ''; } }
  function renderShell() {
    const u = JM.user, items = MENU.filter(function (m) { return m.ok(); });
    $('#app').hidden = false;
    $('#app').innerHTML =
      '<div class="shell"><aside class="side" id="side"><div class="brand"><div class="logo">JM</div><div><b>JM Digital</b><small>Portal Pembinaan</small></div></div>' +
      '<div class="menu-label">Menu Utama</div><nav class="nav">' + items.map(function (m) { return '<a href="#/' + m.id + '" data-m="' + m.id + '" title="' + esc(m.t) + '">' + ic(m.i) + '<span class="l">' + esc(m.t) + '</span></a>'; }).join('') + '</nav>' +
      '<div class="side-foot"><div class="who"><span class="avatar">' + esc(JM.initials(u.nama)) + '</span><div class="l"><b>' + esc(u.nama) + '</b><small>' + esc(JM.ROLE[u.role] || u.role) + '</small></div></div><button id="lo">' + ic('logout') + '<span class="l">Keluar Sistem</span></button></div></aside>' +
      '<div class="main"><div id="offbar" class="off-bar" hidden></div><header class="top"><button class="icon-btn menu-btn" id="mb" aria-label="Menu">' + ic('menu') + '</button><span class="ttl" id="ttl" style="display:none"></span>' +
      '<span class="chip w">' + ic('location_on') + '<span>Wilayah: ' + wilayahLabel() + '</span></span><span class="grow"></span>' +
      '<div class="date mhide"><b>' + esc(hijri()) + '</b>' + esc(JM.tgl(JM.hariIni(), true)) + '</div>' +
      '<button class="icon-btn" id="bell" aria-label="Notifikasi">' + ic('notifications') + '<span class="dot" id="beldot" hidden></span></button>' +
      '<span class="avatar mhide" style="cursor:pointer" id="usr" title="Profil">' + esc(JM.initials(u.nama)) + '</span></header>' +
      '<main class="page" id="page"></main></div></div>' +
      '<nav class="bottom-nav"><a href="#/dashboard" data-m="dashboard">' + ic('home') + 'Beranda</a><a href="#/jadwal" data-m="jadwal">' + ic('event') + 'Kegiatan</a>' +
      '<button class="fab" id="fab" aria-label="Asisten"><span class="c">' + ic('bolt') + '</span>Asisten</button><button id="dat">' + ic('database') + 'Data</button><a href="#/profil" data-m="profil">' + ic('person') + 'Saya</a></nav>' +
      '<div class="sheet-bg" id="sbg"></div><div class="sheet" id="sheet"></div>';
    $('#lo').onclick = logout; $('#usr').onclick = function () { JM.go('profil'); };
    $('#mb').onclick = function () { if (window.innerWidth >= 1024) document.body.classList.toggle('collapsed'); else document.body.classList.toggle('menu-open'); };
    $('#bell').onclick = showStatus; $('#fab').onclick = sheetAsisten; $('#dat').onclick = sheetData; $('#sbg').onclick = closeSheet;
    $('#side').addEventListener('click', function (e) { if (e.target.closest('a')) document.body.classList.remove('menu-open'); });
    document.body.addEventListener('click', function (e) { if (document.body.classList.contains('menu-open') && !e.target.closest('#side') && !e.target.closest('#mb')) document.body.classList.remove('menu-open'); });
    updateOff(); pollStatus(); closeBoot();
  }
  async function logout() { try { await JMAPI.post('logout', {}); } catch (e) {} JMAPI.setToken('', '0'); JM.boot = null; shellReady = false; location.hash = ''; renderLogin(); }
  JM.logout = logout;
  // Segarkan data referensi (wilayah/jenjang/kurikulum) setelah master diubah
  JM.refreshRefs = function () { JMAPI.post('boot', { tanpaDashboard: true }).then(function (r) { if (JM.boot) { JM.boot.refs = r.refs; } }).catch(function () {}); };

  /* ---------- Sheet mobile (Asisten & Data) ---------- */
  function openSheet(html) { const s = $('#sheet'); s.innerHTML = html; $('#sbg').classList.add('on'); requestAnimationFrame(function () { s.classList.add('on'); }); $$('a', s).forEach(function (a) { a.onclick = closeSheet; }); }
  function closeSheet() { $('#sheet').classList.remove('on'); $('#sbg').classList.remove('on'); }
  function qa(href, icon, t, s) { return '<a class="qa" href="' + href + '"><span class="tile t-pri">' + ic(icon) + '</span><span><b>' + esc(t) + '</b><small>' + esc(s) + '</small></span></a>'; }
  function sheetAsisten() {
    const a = [];
    if (JM.can('presensi', 'c')) a.push(qa('#/presensi', 'fact_check', 'Presensi Cepat', 'Absen kegiatan hari ini'));
    if (JM.can('jamaah', 'c')) a.push(qa('#/jamaah?baru=1', 'person_add', 'Tambah Jamaah', 'Data generus baru'));
    if (JM.can('jadwal', 'c')) a.push(qa('#/jadwal?baru=1', 'add_circle', 'Jadwal Baru', 'Buat agenda kegiatan'));
    if (JM.can('wa', 'c')) a.push(qa('#/jadwal', 'forum', 'Broadcast WA', 'Undangan ke wali murid'));
    if (JM.can('jurnal', 'c')) a.push(qa('#/kbm', 'menu_book', 'Jurnal KBM', 'Isi capaian materi'));
    if (JM.can('laporan')) a.push(qa('#/laporan?tab=rapor', 'description', 'Rapor Santri', 'Cetak & kirim ke wali'));
    openSheet('<h3>Asisten — pintasan cepat</h3><div class="grid">' + a.join('') + '</div>');
  }
  function sheetData() {
    openSheet('<h3>Data & Menu</h3><div class="grid">' + MENU.filter(function (m) { return m.ok() && ['dashboard', 'jadwal'].indexOf(m.id) < 0; }).map(function (m) { return qa('#/' + m.id, m.i, m.t, ''); }).join('') + '</div>');
  }

  /* ---------- Router ---------- */
  JM.go = function (id, params) { const q = params ? '?' + new URLSearchParams(params).toString() : ''; location.hash = '#/' + id + q; };
  let cleanup = null, tok = 0;
  function route() {
    if (!shellReady) return;
    const h = location.hash.replace(/^#\/?/, ''), qi = h.indexOf('?'), id = (qi > -1 ? h.slice(0, qi) : h) || 'dashboard', params = Object.fromEntries(new URLSearchParams(qi > -1 ? h.slice(qi + 1) : ''));
    let v = JM.views[id];
    const m = MENU.filter(function (x) { return x.id === id; })[0];
    if (!v || (m && !m.ok())) { id !== 'dashboard' && JM.toast('Halaman tidak tersedia untuk peran Anda.', 'err'); v = JM.views.dashboard; location.replace('#/dashboard'); if (!v) return; }
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    JM.curId = v.id; const my = ++tok, page = $('#page');
    $$('[data-m]').forEach(function (a) { a.classList.toggle('on', a.dataset.m === v.id || (v.id === 'presensi' && a.dataset.m === 'presensi')); });
    const t = $('#ttl'); t.textContent = v.title; t.style.display = '';
    document.title = v.title + ' — JM Digital';
    closeSheet(); document.body.classList.remove('menu-open'); window.scrollTo(0, 0);
    page.innerHTML = '';
    try {
      const r = v.render(page, { params: params, alive: function () { return my === tok; } });
      if (r && typeof r.then === 'function') r.then(function (c) { if (typeof c === 'function') cleanup = c; }).catch(viewError);
      else if (typeof r === 'function') cleanup = r;
    } catch (e) { viewError(e); }
  }
  function viewError(e) { if (e.code === 'AUTH') return; $('#page').innerHTML = '<div class="card empty">' + ic('error', '') + '<p><b>Terjadi kesalahan</b></p><p>' + esc(e.message) + '</p><br><button class="btn sec" onclick="location.reload()">Muat ulang</button></div>'; }
  window.addEventListener('hashchange', route);

  /* ---------- Status: offline, antrean, WA ---------- */
  function updateOff() {
    const b = $('#offbar'); if (!b) return; const q = JMAPI.queueSize();
    const t = (!navigator.onLine ? 'Anda sedang offline — data tersimpan di perangkat. ' : '') + (q ? q + ' data menunggu dikirim ke server.' : '');
    b.hidden = !t; b.textContent = t;
  }
  window.addEventListener('online', updateOff); window.addEventListener('offline', updateOff); JMAPI.onQueue(updateOff);
  let waSt = null;
  function pollStatus() {
    if (!JM.can('wa', 'r')) return;
    const f = function () { if (document.visibilityState !== 'visible' || !JMAPI.hasToken()) return; JMAPI.swr('waStatus', {}, function (r) { waSt = r; const d = $('#beldot'); if (d) d.hidden = !(r.ringkas.antri || r.ringkas.gagal); }, { ttl: 20000 }).catch(function () {}); };
    f(); setInterval(f, 60000);
  }
  function showStatus() {
    const q = JMAPI.queueSize(), s = waSt;
    JM.modal({ title: 'Status & Notifikasi', size: 'sm', body:
      '<div class="grid"><div class="note ' + (navigator.onLine ? '' : 'wr') + '">' + ic(navigator.onLine ? 'wifi' : 'wifi_off') + '<span>' + (navigator.onLine ? 'Terhubung ke server' : 'Offline — data disimpan di perangkat') + '</span></div>' +
      (q ? '<div class="note wr">' + ic('sync') + '<span>' + q + ' data menunggu dikirim.</span></div>' : '') +
      (s ? '<div class="card pad"><b>WhatsApp otomatis</b> ' + (s.aktif ? JM.pill('Aktif', 'p-ok') : JM.pill('Nonaktif', 'p-gr')) + '<p class="sub" style="margin-top:6px">Antri: ' + s.ringkas.antri + ' • Terkirim 24 jam: ' + s.ringkas.terkirim + ' • Gagal: ' + s.ringkas.gagal + '</p></div>' : '') + '</div>',
      actions: [{ label: 'Kirim ulang antrean', cls: 'sec', onClick: function () { JMAPI.flushQueue(); JM.toast('Mencoba mengirim…'); } }, { label: 'Tutup', close: true }] });
  }

  /* ---------- PWA ---------- */
  JM.installPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); JM.installPrompt = e; const b = $('#btnInstall'); if (b) b.hidden = false; });
  window.addEventListener('appinstalled', function () { JM.installPrompt = null; const b = $('#btnInstall'); if (b) b.hidden = true; });

  JM.start = function () {
    const fontOk = function () { document.documentElement.classList.add('fonts-ready'); };
    const cekFont = function () { try { return document.fonts.check('20px "Material Symbols Outlined"', 'home'); } catch (e) { return true; } };
    if (document.fonts && document.fonts.load) {
      // load() selesai (kosong) walau font gagal diunduh -> pastikan font benar-benar ada sebelum ikon ditampilkan
      document.fonts.load('20px "Material Symbols Outlined"', 'home').then(function (f) { if (f && f.length) fontOk(); }, function () {});
      document.fonts.ready.then(function () { if (cekFont() && document.fonts.size) { const adaIkon = Array.from(document.fonts).some(function (x) { return /Material Symbols/.test(x.family) && x.status === 'loaded'; }); if (adaIkon) fontOk(); } });
    } else fontOk();
    if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
    if (!/^https?:\/\/.+\/exec/.test(window.GAS_URL || '')) { closeBoot(); $('#app').hidden = false; $('#app').innerHTML = '<div class="login"><div class="login-card"><h1>Konfigurasi belum diisi</h1><p>Buka <code>js/config.js</code> lalu isi <code>GAS_URL</code> dengan URL Web App Google Apps Script Anda (berakhiran <code>/exec</code>).</p></div></div>'; return; }
    if (!JMAPI.hasToken()) { renderLogin(); return; }
    bootApp(); JMAPI.flushQueue();
  };
})();
