/* Jurnal KBM & Monitoring Kurikulum GBPM: matriks ketuntasan + master kurikulum */
(function () {
  'use strict';
  const JM = window.JM, $ = JM.$, $$ = JM.$$, esc = JM.esc, ic = JM.ic;
  const BIDANG = ["Al-Qur'an", 'Al-Hadits', 'Fiqih/Ibadah', 'Akhlakul Karimah', 'Kemandirian'], NEXT = { '': 'Proses', Belum: 'Proses', Proses: 'Tuntas', Tuntas: 'Belum' };

  function matriks(root, ctx) {
    const u = JM.user, adm = u.role === 'Admin_Daerah', desaLvl = adm || u.role === 'Pengurus_Desa', edit = JM.can('jurnal', 'c');
    const jl = JM.jenjangList().filter(function (j) { return !u.ampuan || !u.ampuan.length || u.ampuan.indexOf(j) > -1; });
    const st = { jenjang: jl[0] || '', desa: '', kelompok: '', tgl: JM.hariIni(), rinci: false }; let d = null; const chg = {};
    root.innerHTML = '<div class="card toolbar" style="margin-bottom:16px"><select class="inp" id="k-j">' + jl.map(function (j) { return '<option>' + esc(j) + '</option>'; }).join('') + '</select>' +
      (adm ? '<select class="inp" id="k-d">' + JM.opts(JM.desaList(), 'Semua Desa') + '</select>' : '') + (desaLvl ? '<select class="inp" id="k-l">' + JM.opts(JM.kelompokList(adm ? '' : u.desa), 'Semua Kelompok') + '</select>' : '') +
      (edit ? '<input class="inp" type="date" id="k-t" value="' + st.tgl + '" style="width:auto" title="Tanggal KBM"><button class="chips" style="background:none;border:0" id="k-r"><span class="pill p-gr" style="cursor:pointer" id="k-rb">Mode rinci: mati</span></button>' : '') +
      '<span style="flex:1"></span>' + (edit ? '<button class="btn" id="k-s" disabled>' + ic('save') + 'Simpan jurnal</button>' : '') + '</div><div class="note" style="margin-bottom:12px">' + ic('touch_app') + '<span>Ketuk sel untuk mengubah status: <b>Belum → Proses → Tuntas</b>. Aktifkan <b>mode rinci</b> untuk mengisi nilai & catatan guru.</span></div><div class="card"><div id="k-m">' + '<div style="padding:16px">' + JM.skel(5) + '</div>' + '</div></div>';
    const pct = function (s) {
      const sem = d.semester, bln = d.bulanAjaran, p = function (fn) { const due = d.materi.filter(fn); if (!due.length) return 0; let t = 0; due.forEach(function (m) { const c = cell(s, m); if (c.s === 'Tuntas') t++; }); return Math.round(t / due.length * 100); };
      return [p(function () { return true; }), p(function (m) { return (+m.Target_Promes || 0) <= sem; }), p(function (m) { return (+m.Target_Probul || 0) <= bln; })];
    };
    const cell = function (s, m) { const k = s.ID_Jamaah + '|' + m.ID_Materi; return chg[k] || d.cell[k] || { s: '' }; };
    const render = function () {
      if (!d || !ctx.alive()) return; const M = $('#k-m', root);
      if (!d.santri.length) { M.innerHTML = '<div class="empty">Belum ada santri aktif pada jenjang & wilayah ini.</div>'; return; }
      if (!d.materi.length) { M.innerHTML = '<div class="empty">Belum ada materi kurikulum untuk jenjang ini. Tambahkan di tab <b>Master Kurikulum</b>.</div>'; return; }
      M.innerHTML = '<div class="tbl-wrap"><table class="tbl mx"><thead><tr><th>Santri</th>' + d.materi.map(function (m) { return '<th title="' + esc(m.Bidang_Materi + ' — ' + m.Judul_Materi) + '">' + esc((m.Bidang_Materi || '').slice(0, 8)) + '<small>' + esc(m.Judul_Materi) + '</small></th>'; }).join('') + '<th>Prota</th><th>Promes</th><th>Probul</th></tr></thead><tbody>' +
        d.santri.map(function (s) { const p = pct(s); return '<tr data-r="' + s.ID_Jamaah + '"><td><b style="font-weight:600">' + esc(s.Nama_Lengkap) + '</b><span class="sub">' + esc(s.Kelompok) + '</span></td>' + d.materi.map(function (m) { const c = cell(s, m); return '<td><button class="cellb ' + (c.s === 'Tuntas' ? 't' : c.s === 'Proses' ? 'p' : '') + '" data-s="' + s.ID_Jamaah + '" data-m="' + m.ID_Materi + '"' + (edit ? '' : ' disabled') + '>' + (c.s === 'Tuntas' ? '✓' : c.s === 'Proses' ? '…' : '·') + '</button></td>'; }).join('') + '<td class="num"><b>' + p[0] + '%</b></td><td class="num"><b>' + p[1] + '%</b></td><td class="num"><b>' + p[2] + '%</b></td></tr>'; }).join('') + '</tbody></table></div>';
      $$('.cellb', M).forEach(function (b) { b.onclick = function () { const s = d.santri.filter(function (x) { return x.ID_Jamaah === b.dataset.s; })[0], m = d.materi.filter(function (x) { return x.ID_Materi === b.dataset.m; })[0]; if (st.rinci) rinci(s, m); else { const c = Object.assign({}, cell(s, m)); c.s = NEXT[c.s || '']; set(s, m, c); } }; });
    };
    const set = function (s, m, c) { chg[s.ID_Jamaah + '|' + m.ID_Materi] = c; $('#k-s', root).disabled = false; render(); };
    const rinci = function (s, m) {
      const c = cell(s, m);
      JM.formModal({ title: s.Nama_Lengkap, size: 'sm', top: '<p class="sub" style="margin-bottom:10px">' + esc(m.Bidang_Materi) + ' — <b>' + esc(m.Judul_Materi) + '</b>' + (m.Indikator_Kelulusan ? '<br>Indikator: ' + esc(m.Indikator_Kelulusan) : '') + '</p>',
        fields: [{ k: 's', label: 'Status', t: 'select', opts: ['Belum', 'Proses', 'Tuntas'], blank: false, def: c.s || 'Belum' }, { k: 'n', label: 'Nilai (0–100)', t: 'number', def: c.n }, { k: 'c', label: 'Catatan guru', t: 'textarea', def: c.c, full: true }], simpan: 'Terapkan',
        save: async function (v) { set(s, m, { s: v.s, n: v.n, c: v.c }); } });
    };
    const muat = function () {
      if (!st.jenjang) { $('#k-m', root).innerHTML = '<div class="empty">Tidak ada jenjang yang diampu.</div>'; return; }
      JMAPI.swr('matriksKBM', { jenjang: st.jenjang, desa: st.desa, kelompok: st.kelompok }, function (r) { d = r; render(); }, { ttl: 10000 }).then(function (r) { if (!d) { d = r; render(); } }).catch(function (e) { if (ctx.alive()) $('#k-m', root).innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
    };
    const reset = function () { Object.keys(chg).forEach(function (k) { delete chg[k]; }); const b = $('#k-s', root); if (b) b.disabled = true; };
    const bind = function (id, key) { const e = $(id, root); if (e) e.onchange = async function () { if (Object.keys(chg).length && !(await JM.confirm('Perubahan belum disimpan akan hilang. Lanjut?', 'Lanjut'))) { e.value = st[key]; return; } reset(); st[key] = e.value; if (key === 'desa') { st.kelompok = ''; $('#k-l', root).innerHTML = JM.opts(JM.kelompokList(e.value), 'Semua Kelompok'); } muat(); }; };
    bind('#k-j', 'jenjang'); bind('#k-d', 'desa'); bind('#k-l', 'kelompok');
    const t = $('#k-t', root); if (t) t.onchange = function () { st.tgl = t.value || st.tgl; };
    const rb = $('#k-r', root); if (rb) rb.onclick = function () { st.rinci = !st.rinci; const p = $('#k-rb', root); p.textContent = 'Mode rinci: ' + (st.rinci ? 'aktif' : 'mati'); p.className = 'pill ' + (st.rinci ? 'p-pri' : 'p-gr'); };
    const sv = $('#k-s', root); if (sv) sv.onclick = async function () {
      const items = Object.keys(chg).map(function (k) { const p = k.split('|'); return { ID_Jamaah: p[0], ID_Materi: p[1], Status_Tuntas: chg[k].s || 'Belum', Nilai_Angka: chg[k].n, Catatan_Guru: chg[k].c }; });
      sv.disabled = true;
      try { const r = await JMAPI.write('simpanCapaian', { tanggal: st.tgl, items: items }); JM.toast(r.queued ? 'Offline: jurnal tersimpan di perangkat & dikirim otomatis.' : items.length + ' capaian tersimpan.', 'ok'); Object.keys(chg).forEach(function (k) { d.cell[k] = chg[k]; delete chg[k]; }); render(); }
      catch (e) { JM.toast(e.message, 'err'); sv.disabled = false; }
    };
    muat();
  }

  function master(root, ctx) {
    const adm = JM.can('kurikulum', 'c'); let sel = '';
    root.innerHTML = '<div id="mk"></div>';
    JM.crudList($('#mk', root), { tabel: 'kurikulum', pk: 'ID_Materi', noun: 'materi', addLabel: 'Tambah materi', canC: adm, canU: adm, canD: adm, alive: ctx.alive,
      cols: [{ h: 'Jenjang', f: function (r) { return JM.pill(r.Jenjang, 'p-in'); } }, { h: 'Bidang', f: function (r) { return esc(r.Bidang_Materi); } }, { h: 'Judul materi', f: function (r) { return '<b style="font-weight:600">' + esc(r.Judul_Materi) + '</b><span class="sub">' + esc(r.Indikator_Kelulusan || '') + '</span>'; } },
        { h: 'Prota', f: function (r) { return 'Thn ' + (r.Target_Prota || 1); } }, { h: 'Promes', f: function (r) { return 'Sem ' + (r.Target_Promes || '-'); } }, { h: 'Probul', f: function (r) { return 'Bln ' + (r.Target_Probul || '-'); } }],
      fields: function (d) { return [{ k: 'Jenjang', label: 'Jenjang', t: 'select', opts: JM.jenjangList(), req: true }, { k: 'Bidang_Materi', label: 'Bidang materi', t: 'select', opts: BIDANG, req: true }, { k: 'Judul_Materi', label: 'Judul materi', req: true, full: true },
        { k: 'Target_Prota', label: 'Target Prota (tahun ke-)', t: 'number', def: 1 }, { k: 'Target_Promes', label: 'Target Promes (semester 1/2)', t: 'select', opts: [{ v: 1, l: 'Semester 1 (Jul–Des)' }, { v: 2, l: 'Semester 2 (Jan–Jun)' }] },
        { k: 'Target_Probul', label: 'Target Probul (bulan ke-, 1 = Juli)', t: 'select', opts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (n) { return { v: n, l: 'Bulan ' + n }; }) }, { k: 'Indikator_Kelulusan', label: 'Indikator kelulusan', full: true }]; } });
  }

  JM.view('kbm', { title: 'Jurnal KBM & GBPM', render: function (root, ctx) {
    root.innerHTML = JM.head({ eyebrow: 'Kurikulum GBPM', title: 'Jurnal KBM & Capaian Santri', desc: 'Catat ketuntasan materi per santri; persentase Prota, Promes, dan Probul dihitung otomatis.' }) +
      '<div class="tabs"><button data-t="mx" class="on">Matriks Capaian</button><button data-t="mk">Master Kurikulum</button></div><div id="kb"></div>';
    const go = function (t) { $$('.tabs button', root).forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); }); const B = $('#kb', root); B.innerHTML = ''; (t === 'mx' ? matriks : master)(B, ctx); };
    $$('.tabs button', root).forEach(function (b) { b.onclick = function () { go(b.dataset.t); }; }); go(ctx.params.tab === 'mk' ? 'mk' : 'mx');
  } });
})();
