/* Akun pengguna, profil, pengaturan sistem (WhatsApp, migrasi, wilayah, jenjang) & infaq */
(function () {
  'use strict';
  const JM = window.JM, $ = JM.$, $$ = JM.$$, esc = JM.esc, ic = JM.ic;

  /* ---------- Manajemen Akun ---------- */
  function sandiModal(judul, sandi) {
    JM.modal({ title: judul, size: 'sm', body: '<p>Sampaikan kata sandi sementara ini kepada pengguna. <b>Hanya ditampilkan sekali.</b></p><div class="card pad num" style="text-align:center;font:700 22px var(--fh);letter-spacing:.06em;margin-top:12px;user-select:all">' + esc(sandi) + '</div>',
      actions: [{ label: 'Salin', cls: 'sec', icon: 'content_copy', autoClose: false, onClick: async function () { try { await navigator.clipboard.writeText(sandi); JM.toast('Disalin.', 'ok'); } catch (e) { JM.toast('Salin manual dari layar.', 'err'); } return false; } }, { label: 'Selesai', close: true }] });
  }
  JM.view('akun', { title: 'Manajemen Akun', render: function (root, ctx) {
    const u = JM.user; let rows = [], guru = [];
    root.innerHTML = JM.head({ eyebrow: 'Hak akses berjenjang', title: 'Manajemen Akun Pengguna', desc: 'Kelola akun pengurus dan guru sesuai wilayah Anda.', actions: '<button class="btn" id="a-add">' + ic('person_add') + 'Tambah Akun</button>' }) + '<div class="card"><div id="a-b">' + JM.skel(5) + '</div></div>';
    const form = function (d) {
      const adm = u.role === 'Admin_Daerah', peran = (JM.boot.aturanPeran || []).map(function (r) { return { v: r, l: JM.ROLE[r] }; }), desaVal = (d && d.Desa) || (adm ? '' : u.desa);
      const f = [{ k: 'Nama_Lengkap', label: 'Nama lengkap', req: true, full: true }, { k: 'Username', label: 'Username', req: true, autocomplete: 'off', help: 'Huruf kecil, angka, titik, strip (3–30)' }, { k: 'Role', label: 'Peran', t: 'select', opts: peran, req: true },
        { k: 'Desa', label: 'Desa', t: 'select', opts: adm ? JM.desaList() : [u.desa], def: desaVal, blank: adm }, { k: 'Kelompok', label: 'Kelompok', t: 'select', opts: u.role === 'Pengurus_Kelompok' ? [u.kelompok] : JM.kelompokList(desaVal), def: u.role === 'Pengurus_Kelompok' ? u.kelompok : undefined, blank: u.role !== 'Pengurus_Kelompok' },
        { k: 'No_WA', label: 'No. WhatsApp', t: 'tel' }, { k: 'Status_Aktif', label: 'Status', t: 'select', opts: ['Aktif', 'Nonaktif'], blank: false, def: 'Aktif' },
        { k: 'ID_Guru', label: 'Tautkan ke data guru (untuk peran Guru)', t: 'select', opts: guru.map(function (g) { return { v: g.ID_Guru, l: g.Nama_Lengkap + ' — ' + g.Kelompok }; }), full: true, help: 'Membatasi tampilan guru sesuai jenjang ampuannya' },
        { k: 'Password', label: d ? 'Kata sandi baru (kosongkan bila tidak diubah)' : 'Kata sandi (kosongkan = dibuatkan otomatis)', t: 'password', full: true, autocomplete: 'new-password' }];
      JM.formModal({ title: d ? 'Ubah Akun' : 'Tambah Akun', fields: f, data: d, size: 'lg', noFocus: true,
        pre: function (r) { JM.tautDesaKelompok(r, 'Desa', 'Kelompok', JM.kelompokList); const ro = $('#f_Role', r), sy = function () { $('#f_ID_Guru', r).closest('.fld').hidden = ro.value !== 'Guru'; $('#f_Desa', r).closest('.fld').hidden = ro.value === 'Admin_Daerah'; $('#f_Kelompok', r).closest('.fld').hidden = ro.value === 'Admin_Daerah' || ro.value === 'Pengurus_Desa'; }; ro.onchange = sy; sy(); },
        save: async function (v, m) { if (d) v.ID_User = d.ID_User; const r = await JMAPI.write('simpanPengguna', { data: v }); muat(); if (r.sandiSementara) setTimeout(function () { sandiModal('Akun dibuat', r.sandiSementara); }, 300); } });
    };
    const tampil = function () {
      const B = $('#a-b', root); if (!rows.length) { B.innerHTML = '<div class="empty">Belum ada akun.</div>'; return; }
      B.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Peran</th><th>Wilayah</th><th>Status</th><th>Login terakhir</th><th></th></tr></thead><tbody>' + rows.map(function (r, i) {
        const dapat = (JM.boot.aturanPeran || []).indexOf(r.Role) > -1 && r.ID_User !== u.id;
        return '<tr><td><div class="person"><span class="avatar">' + esc(JM.initials(r.Nama_Lengkap)) + '</span><div><b>' + esc(r.Nama_Lengkap) + '</b><small>@' + esc(r.Username) + '</small></div></div></td><td>' + JM.pill(JM.ROLE[r.Role] || r.Role, 'p-in') + '</td><td>' + esc(r.Desa || 'Seluruh daerah') + (r.Kelompok ? '<span class="sub">Kel. ' + esc(r.Kelompok) + '</span>' : '') + '</td><td>' + JM.pill(r.Status_Aktif) + '</td><td class="sub">' + esc(r.Last_Login || '-') + '</td><td><div class="row-act">' + (dapat ? '<button class="icon-btn" data-e="' + i + '" title="Ubah">' + ic('edit') + '</button><button class="icon-btn" data-r="' + i + '" title="Reset sandi">' + ic('lock_reset') + '</button><button class="icon-btn" data-d="' + i + '" title="Hapus">' + ic('delete') + '</button>' : '') + '</div></td></tr>'; }).join('') + '</tbody></table></div>';
      $$('[data-e]', B).forEach(function (b) { b.onclick = function () { form(rows[+b.dataset.e]); }; });
      $$('[data-r]', B).forEach(function (b) { b.onclick = async function () { const r = rows[+b.dataset.r]; if (await JM.confirm('Reset kata sandi ' + r.Nama_Lengkap + '? Sesi aktifnya akan berakhir.', 'Reset')) { try { const x = await JMAPI.write('resetSandiPengguna', { id: r.ID_User }); sandiModal('Kata sandi direset', x.sandiSementara); } catch (e) { JM.toast(e.message, 'err'); } } }; });
      $$('[data-d]', B).forEach(function (b) { b.onclick = async function () { const r = rows[+b.dataset.d]; if (await JM.confirm('Hapus akun ' + r.Nama_Lengkap + '?', 'Hapus', true)) { try { await JMAPI.write('hapus', { tabel: 'pengguna', id: r.ID_User }); JM.toast('Akun dihapus.', 'ok'); muat(); } catch (e) { JM.toast(e.message, 'err'); } } }; });
    };
    const muat = function () { JMAPI.swr('list', { tabel: 'pengguna', all: true }, function (r) { if (ctx.alive()) { rows = r.rows; tampil(); } }, { ttl: 10000 }).then(function (r) { if (ctx.alive() && !rows.length) { rows = r.rows; tampil(); } }).catch(function (e) { JM.toast(e.message, 'err'); }); };
    JMAPI.post('list', { tabel: 'guru', all: true }).then(function (r) { guru = r.rows; }).catch(function () {});
    $('#a-add', root).onclick = function () { form(null); }; muat();
  } });

  /* ---------- Profil (Saya) ---------- */
  JM.view('profil', { title: 'Saya', render: function (root, ctx) {
    const u = JM.user, ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    root.innerHTML = JM.head({ eyebrow: JM.ROLE[u.role], title: u.nama, desc: (u.desa ? u.desa + (u.kelompok ? ' • Kelompok ' + u.kelompok : '') : 'Seluruh daerah') }) +
      '<div class="grid g2" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))"><div class="card pad"><h3 style="margin-bottom:12px">Profil</h3>' + JM.formHtml([{ k: 'Nama_Lengkap', label: 'Nama lengkap', def: u.nama, full: true }, { k: 'No_WA', label: 'No. WhatsApp', t: 'tel', def: u.wa, full: true }]) + '<div style="margin-top:12px"><button class="btn" id="p-s"' + (u.darurat ? ' disabled' : '') + '>Simpan profil</button></div></div>' +
      '<div class="card pad"><h3 style="margin-bottom:12px">Ubah kata sandi</h3>' + JM.formHtml([{ k: 'lama', label: 'Kata sandi lama', t: 'password', full: true, autocomplete: 'current-password' }, { k: 'baru', label: 'Kata sandi baru (min. 8 karakter)', t: 'password', full: true, autocomplete: 'new-password' }]) + '<div style="margin-top:12px"><button class="btn" id="p-p"' + (u.darurat ? ' disabled' : '') + '>Ubah kata sandi</button></div></div>' +
      '<div class="card pad"><h3 style="margin-bottom:8px">Aplikasi</h3><p class="sub" style="margin-bottom:12px">Pasang JM Digital di layar utama agar terbuka cepat seperti aplikasi dan tetap bisa dipakai saat sinyal lemah.</p><button class="btn" id="btnInstall"' + (JM.installPrompt ? '' : ' hidden') + '>' + ic('install_mobile') + 'Pasang aplikasi</button>' +
      (ios ? '<div class="note">' + ic('ios_share') + '<span>Di iPhone/iPad: ketuk <b>Bagikan</b> lalu <b>Tambah ke Layar Utama</b>.</span></div>' : (JM.installPrompt ? '' : '<div class="note">' + ic('info') + '<span>Jika tombol pasang tidak muncul, gunakan menu browser → <b>Instal aplikasi</b> / <b>Tambahkan ke layar utama</b>.</span></div>')) +
      '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec" id="p-c">' + ic('cleaning_services') + 'Bersihkan cache lokal</button><button class="btn del" id="p-o">' + ic('logout') + 'Keluar</button></div><p class="sub" style="margin-top:12px">Versi aplikasi 1.0.0</p></div></div>';
    $('#btnInstall', root).onclick = async function () { if (!JM.installPrompt) return; JM.installPrompt.prompt(); await JM.installPrompt.userChoice; JM.installPrompt = null; this.hidden = true; };
    $('#p-s', root).onclick = async function () { try { const v = JM.formRead([{ k: 'Nama_Lengkap' }, { k: 'No_WA' }], root); const r = await JMAPI.write('ubahProfil', v); JM.user.nama = r.data.nama; JM.user.wa = r.data.wa; JM.toast('Profil disimpan.', 'ok'); } catch (e) { JM.toast(e.message, 'err'); } };
    $('#p-p', root).onclick = async function () { try { const v = JM.formRead([{ k: 'lama', req: true, label: 'Kata sandi lama' }, { k: 'baru', req: true, label: 'Kata sandi baru' }], root); await JMAPI.write('ubahSandi', v); JM.toast('Kata sandi diubah. Silakan masuk kembali.', 'ok'); setTimeout(function () { JMAPI.setToken('', '0'); location.reload(); }, 900); } catch (e) { JM.toast(e.message, 'err'); } };
    $('#p-c', root).onclick = function () { JMAPI.clearCache(); JM.toast('Cache dibersihkan.', 'ok'); };
    $('#p-o', root).onclick = JM.logout;
  } });

  /* ---------- Infaq ---------- */
  JM.view('infaq', { title: 'Infaq', render: function (root, ctx) {
    const u = JM.user, bln = JM.hariIni().slice(0, 7), c = JM.can('infaq', 'c'), adm = u.role === 'Admin_Daerah', des = adm || u.role === 'Pengurus_Desa';
    root.innerHTML = JM.head({ eyebrow: 'Keuangan pembinaan', title: 'Pencatatan Infaq', desc: 'Catat infaq kegiatan per kelompok dan lihat total periode berjalan.', actions: '<input type="month" class="inp" id="i-b" value="' + bln + '" style="width:auto">' }) + '<div class="grid g3 one" style="margin-bottom:16px"><div class="card kpi"><div class="lab">Total periode</div><div class="val num" id="i-tot">–</div></div></div><div id="i-l"></div>';
    let L; const mulai = function () {
      const b = $('#i-b', root).value || bln;
      L = JM.crudList($('#i-l', root), { tabel: 'infaq', pk: 'ID_Infaq', noun: 'catatan infaq', addLabel: 'Catat infaq', canC: c, canU: JM.can('infaq', 'u'), canD: JM.can('infaq', 'd'), alive: ctx.alive, args: { from: b + '-01', to: b + '-31' },
        onData: function (rows) { $('#i-tot', root).textContent = JM.rp(rows.reduce(function (s, r) { return s + (Number(r.Nominal) || 0); }, 0)); },
        cols: [{ h: 'Tanggal', f: function (r) { return JM.tgl(r.Tanggal); } }, { h: 'Jenis', f: function (r) { return esc(r.Jenis); } }, { h: 'Wilayah', f: function (r) { return esc(r.Desa || '-') + (r.Kelompok ? '<span class="sub">Kel. ' + esc(r.Kelompok) + '</span>' : ''); } }, { h: 'Nominal', f: function (r) { return '<b class="num">' + JM.rp(r.Nominal) + '</b>'; } }, { h: 'Keterangan', f: function (r) { return esc(r.Keterangan || ''); } }],
        fields: function (d) { return [{ k: 'Tanggal', label: 'Tanggal', t: 'date', req: true, def: JM.hariIni() }, { k: 'Jenis', label: 'Jenis', t: 'select', opts: ['Infaq harian', 'Infaq pekanan', 'Infaq bulanan', 'Sedekah', 'Lainnya'], req: true }, { k: 'Nominal', label: 'Nominal (Rp)', t: 'number', req: true }].concat(
          adm ? [{ k: 'Desa', label: 'Desa', t: 'select', opts: JM.desaList() }] : [], des ? [{ k: 'Kelompok', label: 'Kelompok', t: 'select', opts: JM.kelompokList(adm ? '' : u.desa) }] : [], [{ k: 'Keterangan', label: 'Keterangan', t: 'textarea', full: true }]); } });
    };
    $('#i-b', root).onchange = mulai; mulai();
  } });

  /* ---------- Pengaturan Sistem (Admin Daerah) ---------- */
  function tabWA(B, ctx) {
    B.innerHTML = '<div class="card pad">' + JM.skel(5) + '</div>';
    JMAPI.post('getRahasia', {}).then(function (r) {
      if (!ctx.alive()) return; const p = r.pengaturan, t = r.data.FONNTE_TOKEN;
      B.innerHTML = '<div class="card pad"><h3>WhatsApp otomatis (Fonnte)</h3><p class="sub" style="margin:4px 0 14px">Token disimpan aman di Script Properties server — tidak pernah dikirim ke browser. Pengiriman massal memakai antrean dengan jeda acak agar nomor aman dari pemblokiran.</p>' +
        JM.formHtml([{ k: 'token', label: 'Token Fonnte' + (t.ada ? ' (tersimpan: ' + t.tampil + ')' : ''), t: 'password', full: true, ph: t.ada ? 'Kosongkan bila tidak diganti' : 'Tempel token dari fonnte.com', autocomplete: 'off', help: 'Ketik __HAPUS__ untuk menghapus token' },
          { k: 'NOTIF_WA_AKTIF', label: 'Pengiriman otomatis', t: 'select', opts: [{ v: '1', l: 'Aktif' }, { v: '0', l: 'Nonaktif' }], blank: false, def: p.NOTIF_WA_AKTIF || '0' }, { k: 'NAMA_INSTITUSI', label: 'Nama lembaga (di akhir pesan)', def: p.NAMA_INSTITUSI || 'JM Digital' },
          { k: 'WA_BATCH', label: 'Pesan per putaran (maks 50)', t: 'number', def: p.WA_BATCH || 20 }, { k: 'WA_JEDA_MIN', label: 'Jeda minimum (detik)', t: 'number', def: p.WA_JEDA_MIN || 3 }, { k: 'WA_JEDA_MAX', label: 'Jeda maksimum (detik)', t: 'number', def: p.WA_JEDA_MAX || 8 }, { k: 'APP_URL', label: 'Alamat aplikasi (opsional)', full: true, def: p.APP_URL }]) +
        '<div style="margin-top:14px"><button class="btn" id="w-s">' + ic('save') + 'Simpan pengaturan</button></div></div>';
      $('#w-s', B).onclick = async function () {
        const f = ['token', 'NOTIF_WA_AKTIF', 'NAMA_INSTITUSI', 'WA_BATCH', 'WA_JEDA_MIN', 'WA_JEDA_MAX', 'APP_URL'].map(function (k) { return { k: k }; }), v = JM.formRead(f, B), tok = v.token; delete v.token;
        try { await JMAPI.write('simpanRahasia', { nilai: tok ? { FONNTE_TOKEN: tok } : {}, pengaturan: v }); JM.toast('Pengaturan disimpan.', 'ok'); JMAPI.bump(); tabWA(B, ctx); } catch (e) { JM.toast(e.message, 'err'); }
      };
    }).catch(function (e) { B.innerHTML = '<div class="card empty">' + esc(e.message) + '</div>'; });
  }
  function tabMigrasi(B, ctx) {
    B.innerHTML = '<div class="card pad"><h3>Migrasi dari spreadsheet lama</h3><p class="sub" style="margin:4px 0 14px">Spreadsheet lama hanya <b>dibaca</b>. Data dicocokkan berdasarkan nama kolom, aman diulang (tanpa duplikat), dan <b>Pindai</b> hanya simulasi. Akun pengguna tidak dimigrasi. Gunakan akun Google yang sama dengan pemilik spreadsheet lama.</p>' +
      JM.formHtml([{ k: 'sumber', label: 'ID atau URL spreadsheet lama', full: true }]) + '<div class="actions" style="margin-top:12px"><button class="btn sec" id="m-p">' + ic('search') + 'Pindai (simulasi)</button><button class="btn" id="m-j">' + ic('sync') + 'Jalankan migrasi</button></div><div id="m-o" style="margin-top:16px"></div></div>';
    const jalan = async function (aksi, b) {
      const sumber = $('#f_sumber', B).value.trim(); if (!sumber) return JM.toast('Isi ID spreadsheet lama.', 'err'); if (aksi === 'jalankanMigrasi' && !(await JM.confirm('Jalankan migrasi sungguhan? Sebaiknya Pindai dulu.', 'Jalankan'))) return;
      b.disabled = true; $('#m-o', B).innerHTML = JM.skel(3);
      try { const r = await JMAPI.write(aksi, { sumber: sumber }); $('#m-o', B).innerHTML = '<div class="note" style="margin-bottom:10px">' + ic('info') + '<span>' + (r.dryRun ? 'Hasil simulasi — belum ada data yang ditulis.' : 'Migrasi selesai.') + '</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sheet</th><th>Sumber</th><th>Baru</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>' + r.laporan.map(function (x) { return x.catatan ? '<tr><td>' + esc(x.sheet) + '</td><td colspan="4" class="sub">' + esc(x.catatan) + '</td></tr>' : '<tr><td>' + esc(x.sheet) + '</td><td class="num">' + x.sumber + '</td><td class="num"><b>' + x.inserted + '</b></td><td class="num">' + x.updated + '</td><td class="num">' + x.skipped + '</td></tr>'; }).join('') + '</tbody></table></div>'; }
      catch (e) { $('#m-o', B).innerHTML = '<div class="note wr">' + esc(e.message) + '</div>'; } finally { b.disabled = false; }
    };
    $('#m-p', B).onclick = function () { jalan('pindaiMigrasi', this); }; $('#m-j', B).onclick = function () { jalan('jalankanMigrasi', this); };
  }
  JM.view('pengaturan', { title: 'Pengaturan', render: function (root, ctx) {
    root.innerHTML = JM.head({ eyebrow: 'Admin Daerah', title: 'Pengaturan Sistem', desc: 'WhatsApp otomatis, master wilayah & jenjang, dan migrasi data.' }) + '<div class="tabs"><button data-t="wa">WhatsApp</button><button data-t="wil">Wilayah</button><button data-t="jen">Jenjang</button><button data-t="mig">Migrasi data</button></div><div id="pg"></div>';
    const go = function (t) {
      $$('.tabs button', root).forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); }); const B = $('#pg', root); B.innerHTML = '';
      if (t === 'wa') tabWA(B, ctx); else if (t === 'mig') tabMigrasi(B, ctx);
      else if (t === 'wil') JM.crudList(B, { tabel: 'wilayah', pk: 'ID_Wilayah', noun: 'wilayah', addLabel: 'Tambah kelompok', canC: true, canU: true, canD: true, alive: ctx.alive, cols: [{ h: 'Daerah', f: function (r) { return esc(r.Nama_Daerah); } }, { h: 'Desa', f: function (r) { return '<b style="font-weight:600">' + esc(r.Nama_Desa) + '</b>'; } }, { h: 'Kelompok', f: function (r) { return esc(r.Nama_Kelompok); } }, { h: 'Alamat masjid / TPQ', f: function (r) { return esc(r['Alamat_Masjid/TPQ'] || ''); } }],
        fields: function () { return [{ k: 'Nama_Daerah', label: 'Nama daerah' }, { k: 'Nama_Desa', label: 'Nama desa', req: true }, { k: 'Nama_Kelompok', label: 'Nama kelompok', req: true }, { k: 'Alamat_Masjid/TPQ', label: 'Alamat masjid / TPQ', full: true }, { k: 'Koordinat_Maps', label: 'Koordinat / tautan Maps', full: true }]; } });
      else JM.crudList(B, { tabel: 'jenjang', pk: 'ID_Jenjang', noun: 'jenjang', addLabel: 'Tambah jenjang', canC: true, canU: true, canD: true, alive: ctx.alive, cols: [{ h: 'Urutan', f: function (r) { return r.Urutan; } }, { h: 'Jenjang', f: function (r) { return '<b style="font-weight:600">' + esc(r.Nama_Jenjang) + '</b>'; } }, { h: 'Usia', f: function (r) { return r.Usia_Min + ' – ' + r.Usia_Maks + ' th'; } }, { h: 'Aktif', f: function (r) { return JM.pill(r.Aktif === 'Tidak' ? 'Tidak' : 'Ya', r.Aktif === 'Tidak' ? 'p-gr' : 'p-ok'); } }],
        fields: function () { return [{ k: 'Nama_Jenjang', label: 'Nama jenjang', req: true, full: true }, { k: 'Usia_Min', label: 'Usia minimum', t: 'number' }, { k: 'Usia_Maks', label: 'Usia maksimum', t: 'number' }, { k: 'Urutan', label: 'Urutan tampil', t: 'number' }, { k: 'Aktif', label: 'Aktif', t: 'select', opts: ['Ya', 'Tidak'], blank: false, def: 'Ya' }]; }, args: {} });
    };
    $$('.tabs button', root).forEach(function (b) { b.onclick = function () { go(b.dataset.t); }; }); go('wa');
  } });
})();
