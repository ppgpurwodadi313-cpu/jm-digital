/* Direktori Guru & Mubaligh */
(function () {
  'use strict';
  const JM = window.JM, $ = JM.$, $$ = JM.$$, esc = JM.esc, ic = JM.ic;
  const KAT = ['Muballigh Tugasan', 'Muballigh Setempat', 'Guru Bantu'], SING = { 'Muballigh Tugasan': 'MT', 'Muballigh Setempat': 'MS', 'Guru Bantu': 'GB' };
  const KCLS = { 'Muballigh Tugasan': 'p-wr', 'Muballigh Setempat': 'p-ok', 'Guru Bantu': 'p-in' };

  function form(d, done) {
    const u = JM.user, adm = u.role === 'Admin_Daerah', kelTetap = u.role === 'Pengurus_Kelompok', desaVal = (d && d.Desa) || (adm ? '' : u.desa);
    const f = [
      { k: 'Nama_Lengkap', label: 'Nama lengkap & gelar', req: true, full: true },
      { k: 'Kategori', label: 'Kategori', t: 'select', opts: KAT, req: true },
      { k: 'Asal_Pondok', label: 'Asal pondok / jalur', ph: 'mis. Ponpes Walibarokah' },
      { k: 'Desa', label: 'Desa', t: 'select', opts: adm ? JM.desaList() : [u.desa], req: true, def: desaVal, blank: adm },
      { k: 'Kelompok', label: 'Kelompok penugasan', t: 'select', opts: kelTetap ? [u.kelompok] : JM.kelompokList(desaVal), def: kelTetap ? u.kelompok : undefined, blank: !kelTetap },
      { k: 'No_WA', label: 'No. WhatsApp', t: 'tel' },
      { k: 'Status_Aktif', label: 'Status', t: 'select', opts: ['Aktif', 'Nonaktif'], blank: false, def: 'Aktif' },
      { k: 'Jenjang_Ampuan', label: 'Jenjang ampuan', t: 'multi', opts: JM.jenjangList(), full: true }
    ];
    if (u.role === 'Pengurus_Kelompok') f.splice(6, 1);
    JM.formModal({ title: d ? 'Ubah Data Guru / Mubaligh' : 'Tambah Guru / Mubaligh', fields: f, data: d, size: 'lg',
      top: u.role === 'Pengurus_Kelompok' && !d ? '<div class="note wr" style="margin-bottom:12px">' + ic('info') + '<span>Data baru dari Pengurus Kelompok berstatus <b>Diajukan</b> dan menunggu persetujuan Pengurus Desa.</span></div>' : '',
      pre: function (r) { JM.tautDesaKelompok(r, 'Desa', 'Kelompok', JM.kelompokList); },
      save: async function (v) { if (d) v.ID_Guru = d.ID_Guru; await JMAPI.write('simpan', { tabel: 'guru', data: v }); done(); } });
  }

  JM.view('guru', { title: 'Guru & Mubaligh', render: function (root, ctx) {
    const u = JM.user, adm = u.role === 'Admin_Daerah', desaLvl = adm || u.role === 'Pengurus_Desa', st = { q: '', Kategori: '', Desa: '', Kelompok: '' }; let all = [];
    root.innerHTML = JM.head({ eyebrow: 'Manajemen SDM & dakwah', title: 'Direktori Guru & Mubaligh', desc: 'Pemetaan penugasan mubaligh, jenjang ampuan, dan kontak pengajar.', actions: '<span id="g-exp"></span>' + (JM.can('guru', 'c') ? '<button class="btn" id="g-add">' + ic('person_add') + 'Tambah Guru / Mubaligh</button>' : '') }) +
      '<div class="grid g4" id="g-stat" style="margin-bottom:16px"></div><div class="card toolbar" style="margin-bottom:16px"><div class="search">' + ic('search') + '<input class="inp" id="g-q" type="search" placeholder="Cari nama, asal pondok, penugasan…"></div>' +
      '<select class="inp" id="g-k">' + JM.opts(KAT, 'Semua Kategori') + '</select>' + (adm ? '<select class="inp" id="g-d">' + JM.opts(JM.desaList(), 'Seluruh Desa') + '</select>' : '') + (desaLvl ? '<select class="inp" id="g-l">' + JM.opts(JM.kelompokList(adm ? '' : u.desa), 'Semua Kelompok') + '</select>' : '') + '</div><div class="grid g2" id="g-list">' + '<div class="card pad">' + JM.skel(4) + '</div><div class="card pad">' + JM.skel(4) + '</div></div>';
    const tampil = function () {
      const q = st.q.toLowerCase();
      const rows = all.filter(function (g) { return (!st.Kategori || g.Kategori === st.Kategori) && (!st.Desa || g.Desa === st.Desa) && (!st.Kelompok || g.Kelompok === st.Kelompok) && (!q || (g.Nama_Lengkap + ' ' + g.Asal_Pondok + ' ' + g.Kelompok).toLowerCase().indexOf(q) > -1); });
      const cnt = function (k) { return all.filter(function (g) { return g.Kategori === k && g.Status_Aktif === 'Aktif'; }).length; }, aktif = all.filter(function (g) { return g.Status_Aktif === 'Aktif'; }).length;
      $('#g-stat', root).innerHTML = [['Total tenaga pendidik', aktif, 'school', 't-pri'], ['Muballigh Tugasan (MT)', cnt(KAT[0]), 'directions_walk', 't-amb'], ['Muballigh Setempat (MS)', cnt(KAT[1]), 'location_on', 't-grn'], ['Guru Bantu', cnt(KAT[2]), 'record_voice_over', 't-blue']]
        .map(function (c) { return '<div class="card kpi"><div class="row"><div><div class="lab">' + c[0] + '</div><div class="val num">' + c[1] + '<small>orang</small></div></div><span class="tile ' + c[3] + '">' + ic(c[2]) + '</span></div></div>'; }).join('');
      $('#g-list', root).innerHTML = rows.length ? rows.map(function (g) {
        const amp = (g.Jenjang_Ampuan || '').split(',').map(function (s) { return s.trim(); }).filter(String);
        return '<div class="card gcard"><div class="top2"><div class="person">' + JM.avatar(g) + '<div><b>' + esc(g.Nama_Lengkap) + '</b><small>' + esc(g.Kategori) + '</small></div></div><div style="text-align:right">' + JM.pill(SING[g.Kategori] || g.Kategori, KCLS[g.Kategori]) + '<div style="margin-top:4px">' + (g.Status_Aktif === 'Aktif' ? '' : JM.pill(g.Status_Aktif)) + '</div></div></div>' +
          '<dl><div><dt>Asal pondok</dt><dd>' + esc(g.Asal_Pondok || '-') + '</dd></div><div><dt>Penugasan</dt><dd>' + esc(g.Desa) + (g.Kelompok ? ' (Kel. ' + esc(g.Kelompok) + ')' : '') + '</dd></div><div style="grid-column:1/-1"><dt>Jenjang ampuan</dt><dd>' + (amp.length ? amp.map(function (a) { return JM.pill(a, 'p-gr'); }).join(' ') : '-') + '</dd></div></dl>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (g.No_WA ? '<a class="btn wa sm" target="_blank" rel="noopener" href="' + esc(JM.wa(g.No_WA)) + '">' + ic('chat') + 'Hubungi WA</a>' : '') +
          (g.Status_Aktif === 'Diajukan' && JM.can('guru', 'u') ? '<button class="btn sm" data-ok="' + g.ID_Guru + '">' + ic('check') + 'Setujui</button>' : '') + '<span style="flex:1"></span>' +
          (JM.can('guru', 'u') ? '<button class="btn sec sm" data-e="' + g.ID_Guru + '">' + ic('edit') + 'Ubah</button>' : '') + (JM.can('guru', 'd') ? '<button class="btn del sm" data-d="' + g.ID_Guru + '" aria-label="Hapus">' + ic('delete') + '</button>' : '') + '</div></div>';
      }).join('') : '<div class="card empty" style="grid-column:1/-1">Belum ada data guru / mubaligh.</div>';
      const by = function (id) { return all.filter(function (g) { return g.ID_Guru === id; })[0]; };
      $$('[data-e]', root).forEach(function (b) { b.onclick = function () { form(by(b.dataset.e), muat); }; });
      $$('[data-ok]', root).forEach(function (b) { b.onclick = async function () { try { await JMAPI.write('simpan', { tabel: 'guru', data: { ID_Guru: b.dataset.ok, Status_Aktif: 'Aktif' } }); JM.toast('Pengajuan disetujui.', 'ok'); muat(); } catch (e) { JM.toast(e.message, 'err'); } }; });
      $$('[data-d]', root).forEach(function (b) { b.onclick = async function () { if (await JM.confirm('Hapus data ' + by(b.dataset.d).Nama_Lengkap + '?', 'Hapus', true)) { try { await JMAPI.write('hapus', { tabel: 'guru', id: b.dataset.d }); JM.toast('Data dihapus.', 'ok'); muat(); } catch (e) { JM.toast(e.message, 'err'); } } }; });
    };
    const muat = function () { JMAPI.swr('list', { tabel: 'guru', all: true }, function (r) { if (ctx.alive()) { all = r.rows; tampil(); } }, { ttl: 20000 }).then(function (r) { if (ctx.alive() && !all.length) { all = r.rows; tampil(); } }).catch(function (e) { if (ctx.alive()) JM.toast(e.message, 'err'); }); };
    const bind = function (id, k) { const e = $(id, root); if (e) e.onchange = function () { st[k] = e.value; if (k === 'Desa') { st.Kelompok = ''; $('#g-l', root).innerHTML = JM.opts(JM.kelompokList(e.value), 'Semua Kelompok'); } tampil(); }; };
    bind('#g-k', 'Kategori'); bind('#g-d', 'Desa'); bind('#g-l', 'Kelompok'); $('#g-q', root).oninput = JM.debounce(function (e) { st.q = e.target.value; tampil(); }, 200);
    const add = $('#g-add', root); if (add) add.onclick = function () { form(null, muat); };
    $('#g-exp', root).appendChild(JM.tombolEkspor(async function () { const r = await JMAPI.post('laporan', { jenis: 'guru', Desa: st.Desa, Kelompok: st.Kelompok }); return { judul: r.judul, kolom: r.kolom, baris: r.baris }; }, 'data_guru'));
    muat();
  } });
})();
