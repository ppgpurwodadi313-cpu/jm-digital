/* Database Jamaah & Generus: pencarian, filter bertingkat, CRUD, foto, mutasi & naik jenjang massal */
(function () {
  'use strict';
  const JM = window.JM, $ = JM.$, $$ = JM.$$, esc = JM.esc, ic = JM.ic;
  const JK = { L: 'Laki-laki', P: 'Perempuan' };

  function fields(d) {
    const u = JM.user, adm = u.role === 'Admin_Daerah', desaTetap = !adm, kelTetap = u.role === 'Pengurus_Kelompok' || u.role === 'Guru';
    const desaOpts = adm ? JM.desaList() : [u.desa], desaVal = (d && d.Desa) || (adm ? '' : u.desa);
    return [
      { k: 'Nama_Lengkap', label: 'Nama lengkap', req: true, full: true },
      { k: 'Jenis_Kelamin', label: 'Jenis kelamin', t: 'select', opts: [{ v: 'L', l: 'Laki-laki' }, { v: 'P', l: 'Perempuan' }], req: true },
      { k: 'Tanggal_Lahir', label: 'Tanggal lahir', t: 'date' },
      { k: 'Tempat_Lahir', label: 'Tempat lahir' },
      { k: 'Jenjang', label: 'Jenjang', t: 'select', opts: JM.jenjangList(), req: true, help: 'Terisi otomatis dari usia' },
      { k: 'Desa', label: 'Desa', t: 'select', opts: desaOpts, req: true, def: desaVal, blank: !desaTetap },
      { k: 'Kelompok', label: 'Kelompok', t: 'select', opts: kelTetap ? [u.kelompok] : JM.kelompokList(desaVal), req: true, def: kelTetap ? u.kelompok : undefined, blank: !kelTetap },
      { k: 'Dapukan', label: 'Dapukan / kelas', ph: 'mis. Kelas Tilawati 2' },
      { k: 'Nama_Wali', label: 'Nama wali murid' },
      { k: 'No_WA_Wali', label: 'No. WhatsApp wali', t: 'tel', ph: '0812…' },
      { k: 'Domisili', label: 'Domisili', t: 'select', opts: ['Mukim', 'Musafir'], blank: false, def: 'Mukim' },
      { k: 'Status_Keaktifan', label: 'Status keaktifan', t: 'select', opts: ['Aktif', 'Pindah', 'Non-Aktif'], blank: false, def: 'Aktif' },
      { k: 'OptOut_WA', label: 'Pesan WhatsApp', t: 'select', opts: [{ v: 'TIDAK', l: 'Boleh dikirimi pesan' }, { v: 'YA', l: 'Berhenti menerima (opt-out)' }], blank: false, def: 'TIDAK', full: true }
    ];
  }
  function usiaDari(t) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t || ''); if (!m) return ''; const n = new Date(); let a = n.getFullYear() - m[1]; if (n.getMonth() + 1 < +m[2] || (n.getMonth() + 1 === +m[2] && n.getDate() < +m[3])) a--; return a; }

  function form(d, done) {
    const f = fields(d), baru = !d || !d.ID_Jamaah; let foto = (d && d.URL_Foto) || '';
    const top = '<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px"><div id="ft">' + (foto ? '<img class="avatar" style="width:72px;height:72px;border-radius:14px" src="' + esc(foto) + '" alt="">' : '<span class="avatar" style="width:72px;height:72px;border-radius:14px;background:#CCFBF1;color:var(--primary-d)">' + ic('add_a_photo') + '</span>') + '</div><div><label class="btn sec sm" for="fi" style="cursor:pointer">' + ic('upload') + 'Unggah foto</label><input id="fi" type="file" accept="image/*" hidden><small class="sub" style="display:block;margin-top:4px">Otomatis dikompres &lt; 300 KB</small></div></div>';
    JM.formModal({ title: baru ? 'Tambah Jamaah Baru' : 'Ubah Data Jamaah', fields: f, data: d, top: top, size: 'lg', noFocus: true,
      pre: function (root) {
        JM.tautDesaKelompok(root, 'Desa', 'Kelompok', JM.kelompokList);
        const td = $('#f_Tanggal_Lahir', root), jj = $('#f_Jenjang', root);
        td.onchange = function () {
          const a = usiaDari(td.value); if (a === '' || jj.value) return;
          const j = JM.refs().jenjang.filter(function (x) { return a >= +x.Usia_Min && a <= +x.Usia_Maks; })[0]; if (j) jj.value = j.Nama_Jenjang;
        };
        $('#fi', root).onchange = async function (e) {
          const file = e.target.files[0]; if (!file) return;
          try {
            const b64 = await JM.kompresFoto(file); $('#ft', root).innerHTML = '<img class="avatar" style="width:72px;height:72px;border-radius:14px" src="' + b64 + '" alt="">';
            JM.toast('Mengunggah foto…'); const r = await JMAPI.write('uploadFoto', { base64: b64, mime: 'image/jpeg' }); foto = r.url; JM.toast('Foto terunggah.', 'ok');
          } catch (er) { JM.toast(er.message, 'err'); }
        };
      },
      extra: function () { return { URL_Foto: foto }; },
      save: async function (v) { if (!baru) v.ID_Jamaah = d.ID_Jamaah; await JMAPI.write('simpan', { tabel: 'jamaah', data: v }); done(); } });
  }

  function detail(r, reload) {
    const wali = r.No_WA_Wali ? '<a class="btn wa" target="_blank" rel="noopener" href="' + esc(JM.wa(r.No_WA_Wali)) + '">' + ic('chat') + 'Hubungi wali</a>' : '';
    const api = JM.modal({ title: 'Profil Jamaah', size: 'sm', body: '<div style="text-align:center;margin-bottom:14px">' + JM.avatar(r, '') .replace('class="avatar ', 'style="width:84px;height:84px;border-radius:18px;font-size:24px" class="avatar ') + '<h3 style="margin-top:8px">' + esc(r.Nama_Lengkap) + '</h3><div>' + JM.pill(r.Jenjang, 'p-in') + ' ' + JM.pill(r.Status_Keaktifan) + '</div></div>' +
      '<dl class="kv"><dt>No. Induk</dt><dd class="num">' + esc(r.No_Induk) + '</dd><dt>Jenis kelamin</dt><dd>' + (JK[r.Jenis_Kelamin] || '-') + '</dd><dt>TTL</dt><dd>' + esc(r.Tempat_Lahir || '-') + ', ' + JM.tgl(r.Tanggal_Lahir) + (r.Usia !== '' ? ' (' + r.Usia + ' th)' : '') + '</dd><dt>Wilayah</dt><dd>' + esc(r.Desa) + ' / ' + esc(r.Kelompok) + '</dd><dt>Dapukan</dt><dd>' + esc(r.Dapukan || '-') + '</dd><dt>Domisili</dt><dd>' + esc(r.Domisili || '-') + '</dd><dt>Wali</dt><dd>' + esc(r.Nama_Wali || '-') + '</dd><dt>WhatsApp</dt><dd class="num">' + esc(JM.hp(r.No_WA_Wali) || '-') + (r.OptOut_WA === 'YA' ? ' ' + JM.pill('opt-out', 'p-er') : '') + '</dd></dl>',
      actions: [wali ? { label: 'Hubungi wali', cls: 'wa', icon: 'chat', onClick: function () { window.open(JM.wa(r.No_WA_Wali), '_blank', 'noopener'); return false; } } : null, JM.can('laporan') ? { label: 'Rapor', cls: 'sec', icon: 'description', onClick: function () { JM.go('laporan', { tab: 'rapor', id: r.ID_Jamaah }); } } : null, { label: 'Tutup', close: true }].filter(Boolean) });
    return api;
  }

  JM.view('jamaah', { title: 'Database Jamaah', render: function (root, ctx) {
    const u = JM.user, st = { q: '', Desa: '', Kelompok: '', Jenjang: '', Status_Keaktifan: '', page: 1, size: 20 }, sel = {};
    const adm = u.role === 'Admin_Daerah', desaLvl = adm || u.role === 'Pengurus_Desa', mutasi = JM.can('jamaah', 'u') && desaLvl;
    root.innerHTML = JM.head({ eyebrow: 'Sistem pembinaan terpadu', title: 'Database Induk Jamaah & Generus', desc: 'Kelola data santri, wali murid, mutasi jenjang, dan status keaktifan berjenjang.',
      actions: (JM.can('jamaah', 'u') ? '<button class="btn sec" id="j-naik">' + ic('swap_vert') + 'Naik Jenjang</button>' : '') + (mutasi ? '<button class="btn sec" id="j-mut">' + ic('move_down') + 'Mutasi Massal</button>' : '') + (JM.can('jamaah', 'c') ? '<button class="btn" id="j-add">' + ic('person_add') + 'Tambah Jamaah</button>' : '') }) +
      '<div class="grid g4" id="j-stat" style="margin-bottom:16px"></div><div class="card"><div class="toolbar"><div class="search">' + ic('search') + '<input class="inp" id="j-q" placeholder="Cari nama, No. Induk, wali, atau No. WhatsApp…" type="search"></div>' +
      (adm ? '<select class="inp" id="j-d">' + JM.opts(JM.desaList(), 'Semua Desa') + '</select>' : '') + (desaLvl ? '<select class="inp" id="j-k">' + JM.opts(JM.kelompokList(adm ? '' : u.desa), 'Semua Kelompok') + '</select>' : '') +
      '<select class="inp" id="j-j">' + JM.opts(JM.jenjangList(), 'Semua Jenjang') + '</select><select class="inp" id="j-s">' + JM.opts(['Aktif', 'Pindah', 'Non-Aktif'], 'Semua Status') + '</select><span id="j-exp"></span></div>' +
      '<div class="sel-bar" id="j-sel" hidden></div><div id="j-list">' + '<div style="padding:16px">' + JM.skel(6) + '</div>' + '</div></div>';

    const args = function (extra) { return Object.assign({ tabel: 'jamaah', q: st.q, filters: { Desa: st.Desa, Kelompok: st.Kelompok, Jenjang: st.Jenjang, Status_Keaktifan: st.Status_Keaktifan }, page: st.page, size: st.size, sort: { col: 'Nama_Lengkap' } }, extra || {}); };
    let rows = [];
    const render = function (r) {
      if (!ctx.alive()) return; rows = r.rows;
      const s = r.stat; if (s) $('#j-stat', root).innerHTML = [['Total generus', s.total, 'groups', 't-pri', JM.pill('terdaftar', 'p-pri')], ['Status aktif', s.aktif, 'check_circle', 't-grn', JM.pill(Math.round(s.aktif / (s.total || 1) * 100) + '% dari total', 'p-ok')], ['Mutasi / pindah', s.pindah, 'swap_horiz', 't-amb', JM.pill('pindah tugas / studi', 'p-wr')], ['Wali terkoneksi WA', s.waTerkoneksi, 'chat', 't-blue', JM.pill(Math.round(s.waTerkoneksi / (s.total || 1) * 100) + '% otomatisasi', 'p-in')]]
        .map(function (c) { return '<div class="card kpi"><div class="row"><div><div class="lab">' + c[0] + '</div><div class="val num">' + c[1] + '</div></div><span class="tile ' + c[3] + '">' + ic(c[2]) + '</span></div><div class="foot">' + c[4] + '</div></div>'; }).join('');
      const L = $('#j-list', root);
      if (!rows.length) { L.innerHTML = '<div class="empty">' + ic('search_off') + '<p>Tidak ada data yang cocok.</p></div>'; return; }
      const aksi = function (x) { return '<div class="row-act"><button class="icon-btn" data-v="' + x.ID_Jamaah + '" aria-label="Lihat">' + ic('visibility') + '</button>' + (JM.can('jamaah', 'u') ? '<button class="icon-btn" data-e="' + x.ID_Jamaah + '" aria-label="Ubah">' + ic('edit') + '</button>' : '') + (JM.can('jamaah', 'd') ? '<button class="icon-btn" data-d="' + x.ID_Jamaah + '" aria-label="Hapus">' + ic('delete') + '</button>' : '') + '</div>'; };
      L.innerHTML = '<div class="tbl-wrap hide-m"><table class="tbl"><thead><tr><th><input type="checkbox" id="j-all" aria-label="Pilih semua"></th><th>Foto & nama / No. Induk</th><th>Jenjang & dapukan</th><th>Wilayah</th><th>Kontak wali</th><th>Status</th><th></th></tr></thead><tbody>' +
        rows.map(function (x) { return '<tr><td><input type="checkbox" data-s="' + x.ID_Jamaah + '"' + (sel[x.ID_Jamaah] ? ' checked' : '') + '></td><td><div class="person">' + JM.avatar(x) + '<div><b>' + esc(x.Nama_Lengkap) + '</b><small class="num">' + esc(x.No_Induk) + ' • ' + (JK[x.Jenis_Kelamin] || '') + (x.Usia !== '' ? ' (' + x.Usia + ' th)' : '') + '</small></div></div></td><td>' + JM.pill(x.Jenjang, 'p-in') + '<span class="sub">' + esc(x.Dapukan || '') + '</span></td><td><b style="font-weight:600">' + esc(x.Desa) + '</b><span class="sub">Kel. ' + esc(x.Kelompok) + '</span></td><td>' + esc(x.Nama_Wali || '-') + '<span class="sub num">' + esc(JM.hp(x.No_WA_Wali)) + (x.OptOut_WA === 'YA' ? ' • opt-out' : '') + '</span></td><td>' + JM.pill(x.Status_Keaktifan) + '</td><td>' + aksi(x) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="cards-m">' + rows.map(function (x) { return '<div style="padding:12px 16px;border-bottom:1px solid var(--soft)"><div style="display:flex;gap:10px;align-items:center"><input type="checkbox" data-s="' + x.ID_Jamaah + '"' + (sel[x.ID_Jamaah] ? ' checked' : '') + '><div class="person" style="flex:1">' + JM.avatar(x) + '<div style="min-width:0"><b>' + esc(x.Nama_Lengkap) + '</b><small>' + esc(x.No_Induk) + ' • ' + esc(x.Kelompok) + '</small></div></div>' + JM.pill(x.Status_Keaktifan) + '</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">' + JM.pill(x.Jenjang, 'p-in') + aksi(x) + '</div></div>'; }).join('') + '</div>';
      L.appendChild(JM.pager(r.total, r.page, r.size, function (p) { st.page = p; muat(); window.scrollTo({ top: 0, behavior: 'smooth' }); }, 'jamaah'));
      $$('[data-v]', L).forEach(function (b) { b.onclick = function () { detail(rows.filter(function (x) { return x.ID_Jamaah === b.dataset.v; })[0]); }; });
      $$('[data-e]', L).forEach(function (b) { b.onclick = function () { form(rows.filter(function (x) { return x.ID_Jamaah === b.dataset.e; })[0], muat); }; });
      $$('[data-d]', L).forEach(function (b) { b.onclick = async function () { const x = rows.filter(function (y) { return y.ID_Jamaah === b.dataset.d; })[0]; if (await JM.confirm('Hapus data ' + x.Nama_Lengkap + '? Tindakan ini tidak dapat dibatalkan.', 'Hapus', true)) { try { await JMAPI.write('hapus', { tabel: 'jamaah', id: x.ID_Jamaah }); JM.toast('Data dihapus.', 'ok'); muat(); } catch (e) { JM.toast(e.message, 'err'); } } }; });
      $$('[data-s]', L).forEach(function (c) { c.onchange = function () { if (c.checked) sel[c.dataset.s] = 1; else delete sel[c.dataset.s]; selBar(); }; });
      const all = $('#j-all', L); if (all) all.onchange = function () { rows.forEach(function (x) { if (all.checked) sel[x.ID_Jamaah] = 1; else delete sel[x.ID_Jamaah]; }); $$('[data-s]', L).forEach(function (c) { c.checked = all.checked; }); selBar(); };
    };
    const selBar = function () { const n = Object.keys(sel).length, b = $('#j-sel', root); b.hidden = !n; b.innerHTML = '<span>' + n + ' dipilih</span><span style="flex:1"></span>' + (mutasi ? '<button class="btn sm sec" id="s-mut">Mutasi</button>' : '') + (JM.can('jamaah', 'u') ? '<button class="btn sm sec" id="s-naik">Ubah jenjang</button>' : '') + '<button class="btn sm sec" id="s-x">Batal</button>'; const m = $('#s-mut', b), nk = $('#s-naik', b); if (m) m.onclick = mutasiModal; if (nk) nk.onclick = naikModal; $('#s-x', b).onclick = function () { Object.keys(sel).forEach(function (k) { delete sel[k]; }); selBar(); $$('[data-s],#j-all', root).forEach(function (c) { c.checked = false; }); }; };
    const muat = function () { JMAPI.swr('list', args(), render, { ttl: 15000 }).then(function (r) { if (ctx.alive() && !rows.length) render(r); }).catch(function (e) { if (ctx.alive()) { $('#j-list', root).innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; } }); };

    const mutasiModal = function () {
      const ids = Object.keys(sel); if (!ids.length) return JM.toast('Pilih jamaah terlebih dahulu.', 'err');
      const f = [].concat(adm ? [{ k: 'Desa', label: 'Desa tujuan', t: 'select', opts: JM.desaList(), req: true }] : [], [{ k: 'Kelompok', label: 'Kelompok tujuan', t: 'select', opts: adm ? [] : JM.kelompokList(u.desa), req: true }]);
      JM.formModal({ title: 'Mutasi ' + ids.length + ' jamaah', size: 'sm', fields: f, simpan: 'Pindahkan', ok: 'Mutasi berhasil.', pre: function (r) { JM.tautDesaKelompok(r, 'Desa', 'Kelompok', JM.kelompokList); },
        save: async function (v) { await JMAPI.write('mutasi', { ids: ids, Desa: v.Desa, Kelompok: v.Kelompok }); Object.keys(sel).forEach(function (k) { delete sel[k]; }); selBar(); muat(); } });
    };
    const naikModal = function () {
      const ids = Object.keys(sel);
      JM.formModal({ title: 'Kenaikan / ubah jenjang', size: 'sm', fields: [{ k: 'jenjang', label: ids.length ? 'Jenjang baru untuk ' + ids.length + ' jamaah terpilih' : 'Jenjang baru', t: 'select', opts: JM.jenjangList() }],
        top: '<div class="note" style="margin-bottom:12px">' + ic('auto_awesome') + '<span>Atau naikkan <b>otomatis semua</b> jamaah aktif di wilayah Anda sesuai usia & rentang jenjang.</span></div><button class="btn sec" style="width:100%;margin-bottom:14px" id="n-auto">' + ic('bolt') + 'Naikkan otomatis sesuai usia</button>', simpan: 'Terapkan', ok: 'Jenjang diperbarui.',
        pre: function (r, m) { $('#n-auto', r).onclick = async function () { if (!(await JM.confirm('Perbarui jenjang semua jamaah aktif sesuai usia?', 'Ya, perbarui'))) return; try { const x = await JMAPI.write('naikJenjang', { mode: 'usia' }); m.close(); JM.toast(x.diubah + ' jamaah naik jenjang.', 'ok'); muat(); } catch (e) { JM.toast(e.message, 'err'); } }; },
        save: async function (v) { if (!v.jenjang || !ids.length) throw new Error('Pilih jamaah di tabel dan jenjang tujuan.'); await JMAPI.write('naikJenjang', { ids: ids, jenjang: v.jenjang }); Object.keys(sel).forEach(function (k) { delete sel[k]; }); selBar(); muat(); } });
    };

    const bind = function (id, key) { const e = $(id, root); if (e) e.onchange = function () { st[key] = e.value; st.page = 1; if (key === 'Desa') { st.Kelompok = ''; const k = $('#j-k', root); if (k) k.innerHTML = JM.opts(JM.kelompokList(e.value), 'Semua Kelompok'); } muat(); }; };
    bind('#j-d', 'Desa'); bind('#j-k', 'Kelompok'); bind('#j-j', 'Jenjang'); bind('#j-s', 'Status_Keaktifan');
    $('#j-q', root).oninput = JM.debounce(function (e) { st.q = e.target.value; st.page = 1; muat(); }, 280);
    const add = $('#j-add', root); if (add) add.onclick = function () { form(null, muat); };
    const mm = $('#j-mut', root); if (mm) mm.onclick = function () { if (!Object.keys(sel).length) JM.toast('Centang jamaah di tabel lalu klik Mutasi.', ''); else mutasiModal(); };
    const nn = $('#j-naik', root); if (nn) nn.onclick = naikModal;
    $('#j-exp', root).appendChild(JM.tombolEkspor(async function () {
      const r = await JMAPI.post('laporan', { jenis: 'jamaah', Desa: st.Desa, Kelompok: st.Kelompok, Jenjang: st.Jenjang, Status: st.Status_Keaktifan });
      const q = st.q.toLowerCase(), baris = q ? r.baris.filter(function (b) { return b.join(' ').toLowerCase().indexOf(q) > -1; }) : r.baris;
      return { judul: r.judul, kolom: r.kolom, baris: baris };
    }, 'data_jamaah'));
    muat(); if (ctx.params.baru && JM.can('jamaah', 'c')) form(null, muat);
  } });
})();
