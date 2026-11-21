/* Pusat Laporan (PDF/Excel/CSV) & Rapor Santri untuk wali murid */
(function () {
  'use strict';
  const JM = window.JM, $ = JM.$, $$ = JM.$$, esc = JM.esc, ic = JM.ic;
  const JENIS = [['jamaah', 'Data Jamaah & Generus', 'groups'], ['guru', 'Data Guru & Mubaligh', 'school'], ['presensi', 'Rekap Presensi', 'fact_check'], ['kbm', 'Capaian KBM / GBPM', 'menu_book'], ['infaq', 'Rekap Infaq', 'volunteer_activism']];

  function laporan(root, ctx) {
    const u = JM.user, adm = u.role === 'Admin_Daerah', des = adm || u.role === 'Pengurus_Desa';
    const st = { jenis: 'presensi', from: JM.hariIni().slice(0, 8) + '01', to: JM.hariIni(), Desa: '', Kelompok: '', Jenjang: '', Status: '' }; let hasil = null;
    root.innerHTML = '<div class="grid g3 one" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:16px" id="l-j">' + JENIS.filter(function (j) { return j[0] !== 'infaq' || JM.can('infaq'); }).map(function (j) { return '<button class="card pad qa" style="flex-direction:column;align-items:flex-start;margin:0" data-j="' + j[0] + '"><span class="tile t-pri">' + ic(j[2]) + '</span><b>' + j[1] + '</b></button>'; }).join('') + '</div>' +
      '<div class="card toolbar" style="margin-bottom:16px"><div class="fld"><label>Dari</label><input class="inp" type="date" id="l-f" value="' + st.from + '"></div><div class="fld"><label>Sampai</label><input class="inp" type="date" id="l-t" value="' + st.to + '"></div>' +
      (adm ? '<div class="fld"><label>Desa</label><select class="inp" id="l-d">' + JM.opts(JM.desaList(), 'Semua') + '</select></div>' : '') + (des ? '<div class="fld"><label>Kelompok</label><select class="inp" id="l-k">' + JM.opts(JM.kelompokList(adm ? '' : u.desa), 'Semua') + '</select></div>' : '') +
      '<div class="fld" id="l-jw"><label>Jenjang</label><select class="inp" id="l-n">' + JM.opts(JM.jenjangList(), 'Semua') + '</select></div><div class="fld" id="l-sw"><label>Status</label><select class="inp" id="l-s">' + JM.opts(['Aktif', 'Pindah', 'Non-Aktif'], 'Semua') + '</select></div>' +
      '<span style="flex:1"></span><button class="btn" id="l-go" style="align-self:flex-end">' + ic('play_arrow') + 'Tampilkan</button></div><div class="card" id="l-out"><div class="empty">Pilih jenis laporan lalu klik <b>Tampilkan</b>.</div></div>';
    const sync = function () { $$('#l-j [data-j]', root).forEach(function (b) { b.style.borderColor = b.dataset.j === st.jenis ? 'var(--primary)' : ''; b.style.boxShadow = b.dataset.j === st.jenis ? '0 0 0 3px rgba(15,118,110,.15)' : ''; }); $('#l-sw', root).hidden = st.jenis !== 'jamaah'; $('#l-jw', root).hidden = ['jamaah', 'presensi', 'kbm'].indexOf(st.jenis) < 0; };
    $$('#l-j [data-j]', root).forEach(function (b) { b.onclick = function () { st.jenis = b.dataset.j; sync(); }; }); sync();
    const bind = function (id, k) { const e = $(id, root); if (e) e.onchange = function () { st[k] = e.value; if (k === 'Desa') { st.Kelompok = ''; const l = $('#l-k', root); if (l) l.innerHTML = JM.opts(JM.kelompokList(e.value), 'Semua'); } }; };
    bind('#l-f', 'from'); bind('#l-t', 'to'); bind('#l-d', 'Desa'); bind('#l-k', 'Kelompok'); bind('#l-n', 'Jenjang'); bind('#l-s', 'Status');
    $('#l-go', root).onclick = async function () {
      const b = this; b.disabled = true; $('#l-out', root).innerHTML = '<div style="padding:16px">' + JM.skel(5) + '</div>';
      try {
        hasil = await JMAPI.post('laporan', st);
        $('#l-out', root).innerHTML = '<div class="toolbar"><div><b>' + esc(hasil.judul) + '</b><span class="sub">' + hasil.total + ' baris • dicetak ' + esc(hasil.dicetak) + '</span></div><span style="flex:1"></span><span id="l-ex"></span></div>' +
          (hasil.baris.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + hasil.kolom.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>' + hasil.baris.slice(0, 100).map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' + (hasil.baris.length > 100 ? '<p class="sub" style="padding:12px 16px">Pratinjau 100 baris pertama — unduhan memuat seluruh ' + hasil.baris.length + ' baris.</p>' : '') : '<div class="empty">Tidak ada data pada filter ini.</div>');
        $('#l-ex', root).appendChild(JM.tombolEkspor(async function () { return hasil; }, 'laporan_' + st.jenis));
      } catch (e) { $('#l-out', root).innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; } finally { b.disabled = false; }
    };
  }

  /* ----- Rapor ----- */
  function ringkasWA(r) {
    const j = r.jamaah, p = r.presensi, c = r.capaian;
    return "Assalamu'alaikum Bapak/Ibu " + (j.Nama_Wali || 'Wali Murid') + ',\n\nBerikut ringkasan perkembangan *' + j.Nama_Lengkap + '* (' + j.Jenjang + ') periode ' + JM.tgl(r.periode.from) + ' – ' + JM.tgl(r.periode.to) + ':\n\n📋 Kehadiran: *' + p.persen + '%* (Hadir ' + p.Hadir + ', Izin ' + p.Izin + ', Sakit ' + p.Sakit + ', Alpa ' + p.Alpa + ')\n📖 Capaian materi GBPM: *' + c.persen + '%* (' + c.tuntas + ' dari ' + c.total + ' materi tuntas)\n\nJazakumullahu khairan atas perhatian dan dukungannya.\n— JM Digital';
  }
  async function pdfRapor(r) {
    await JM.loadScript('jspdf'); await JM.loadScript('autotable');
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' }), W = doc.internal.pageSize.getWidth(), j = r.jamaah, k = JM.kop();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(15, 118, 110); doc.text(k.lembaga, W / 2, 44, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139); doc.text(k.wilayah, W / 2, 58, { align: 'center' }); doc.setDrawColor(15, 118, 110); doc.setLineWidth(1.5); doc.line(40, 66, W - 40, 66);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(30, 41, 59); doc.text('RAPOR CAPAIAN GENERUS', W / 2, 90, { align: 'center' });
    doc.autoTable({ startY: 102, theme: 'plain', styles: { fontSize: 10, cellPadding: 2 }, columnStyles: { 0: { cellWidth: 90, textColor: [100, 116, 139] }, 1: { cellWidth: 10 } }, margin: { left: 40, right: 40 },
      body: [['Nama', ':', j.Nama_Lengkap, 'Jenjang', ':', j.Jenjang], ['No. Induk', ':', j.No_Induk, 'Kelompok', ':', j.Desa + ' / ' + j.Kelompok], ['Wali', ':', j.Nama_Wali || '-', 'Periode', ':', JM.tgl(r.periode.from) + ' – ' + JM.tgl(r.periode.to)]] });
    let y = doc.lastAutoTable.finalY + 14; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('A. Kehadiran — ' + r.presensi.persen + '%', 40, y);
    doc.autoTable({ startY: y + 6, head: [['Hadir', 'Izin', 'Sakit', 'Alpa', 'Total sesi']], body: [[r.presensi.Hadir, r.presensi.Izin, r.presensi.Sakit, r.presensi.Alpa, r.presensi.total]], styles: { fontSize: 10, halign: 'center' }, headStyles: { fillColor: [15, 118, 110] }, margin: { left: 40, right: 40 } });
    y = doc.lastAutoTable.finalY + 16; doc.setFontSize(11); doc.text('B. Capaian Materi GBPM — ' + r.capaian.persen + '% (' + r.capaian.tuntas + '/' + r.capaian.total + ' materi tuntas)', 40, y);
    const body = []; r.capaian.bidang.forEach(function (b) { b.materi.forEach(function (m, i) { body.push([i ? '' : b.bidang, m.judul, m.status, m.nilai === '' ? '-' : m.nilai, m.catatan || '']); }); });
    doc.autoTable({ startY: y + 6, head: [['Bidang', 'Materi', 'Status', 'Nilai', 'Catatan guru']], body: body, styles: { fontSize: 9 }, headStyles: { fillColor: [15, 118, 110] }, margin: { left: 40, right: 40 },
      didParseCell: function (h) { if (h.section === 'body' && h.column.index === 2) { h.cell.styles.textColor = h.cell.raw === 'Tuntas' ? [22, 101, 52] : h.cell.raw === 'Proses' ? [180, 83, 9] : [153, 27, 27]; h.cell.styles.fontStyle = 'bold'; } } });
    y = doc.lastAutoTable.finalY + 36; if (y > 720) { doc.addPage(); y = 80; } doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text('Wali Murid', 90, y, { align: 'center' }); doc.text('Guru / Pengurus', W - 100, y, { align: 'center' }); doc.text('(……………………….)', 90, y + 56, { align: 'center' }); doc.text('(……………………….)', W - 100, y + 56, { align: 'center' });
    doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('Dicetak ' + r.cetak + ' • JM Digital', 40, doc.internal.pageSize.getHeight() - 24);
    doc.save('rapor_' + j.Nama_Lengkap.replace(/\s+/g, '_') + '_' + JM.hariIni() + '.pdf');
  }
  function rapor(root, ctx) {
    const st = { from: JM.hariIni().slice(0, 8) + '01', to: JM.hariIni() };
    root.innerHTML = '<div class="card toolbar" style="margin-bottom:16px"><div class="search">' + ic('search') + '<input class="inp" id="r-q" type="search" placeholder="Cari santri (nama / No. induk)…"></div><div class="fld"><label>Dari</label><input class="inp" type="date" id="r-f" value="' + st.from + '"></div><div class="fld"><label>Sampai</label><input class="inp" type="date" id="r-t" value="' + st.to + '"></div></div><div id="r-res"></div><div id="r-out"></div>';
    const cari = JM.debounce(function () {
      const q = $('#r-q', root).value.trim(); if (q.length < 2) { $('#r-res', root).innerHTML = ''; return; }
      JMAPI.post('list', { tabel: 'jamaah', q: q, size: 8, filters: { Status_Keaktifan: 'Aktif' } }).then(function (r) {
        $('#r-res', root).innerHTML = '<div class="card" style="margin-bottom:16px">' + (r.rows.length ? r.rows.map(function (x) { return '<button class="qa" style="margin:0;border-radius:0;border-bottom:1px solid var(--soft)" data-i="' + x.ID_Jamaah + '"><span class="person">' + JM.avatar(x) + '<span><b>' + esc(x.Nama_Lengkap) + '</b><small>' + esc(x.No_Induk) + ' • ' + esc(x.Jenjang) + ' • ' + esc(x.Kelompok) + '</small></span></span></button>'; }).join('') : '<div class="empty">Tidak ditemukan.</div>') + '</div>';
        $$('[data-i]', root).forEach(function (b) { b.onclick = function () { $('#r-res', root).innerHTML = ''; tampil(b.dataset.i); }; });
      }).catch(function (e) { JM.toast(e.message, 'err'); });
    }, 300);
    $('#r-q', root).oninput = cari; $('#r-f', root).onchange = function (e) { st.from = e.target.value; }; $('#r-t', root).onchange = function (e) { st.to = e.target.value; };
    const tampil = async function (id) {
      const O = $('#r-out', root); O.innerHTML = '<div class="card pad">' + JM.skel(6) + '</div>';
      try {
        const r = await JMAPI.post('rapor', { idJamaah: id, from: st.from, to: st.to }), j = r.jamaah;
        O.innerHTML = '<div class="card pad"><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:16px">' + JM.avatar(j, '') + '<div style="flex:1;min-width:160px"><h3>' + esc(j.Nama_Lengkap) + '</h3><span class="sub">' + esc(j.No_Induk) + ' • ' + esc(j.Jenjang) + ' • ' + esc(j.Desa) + ' / ' + esc(j.Kelompok) + '</span></div><div class="actions"><button class="btn sec" id="r-pdf">' + ic('picture_as_pdf') + 'Unduh PDF</button>' + (j.No_WA_Wali ? '<a class="btn wa" target="_blank" rel="noopener" href="' + esc(JM.wa(j.No_WA_Wali, ringkasWA(r))) + '">' + ic('send') + 'Kirim ke wali via WA</a>' : '') + '</div></div>' +
          '<div class="grid g2" style="margin-bottom:16px"><div class="gb"><div class="eyebrow" style="color:var(--muted)">Kehadiran</div><div class="val num" style="font:700 28px var(--fh)">' + r.presensi.persen + '%</div><span class="sub">Hadir ' + r.presensi.Hadir + ' • Izin ' + r.presensi.Izin + ' • Sakit ' + r.presensi.Sakit + ' • Alpa ' + r.presensi.Alpa + '</span></div><div class="gb"><div class="eyebrow" style="color:var(--muted)">Capaian materi GBPM</div><div class="val num" style="font:700 28px var(--fh)">' + r.capaian.persen + '%</div><span class="sub">' + r.capaian.tuntas + ' dari ' + r.capaian.total + ' materi tuntas</span></div></div>' +
          (r.capaian.bidang.length ? r.capaian.bidang.map(function (b) { return '<h4 style="margin:12px 0 6px">' + esc(b.bidang) + ' <span class="sub" style="display:inline">(' + b.tuntas + '/' + b.materi.length + ')</span></h4><div class="tbl-wrap"><table class="tbl"><tbody>' + b.materi.map(function (m) { return '<tr><td>' + esc(m.judul) + '</td><td>' + JM.pill(m.status) + '</td><td class="num">' + (m.nilai === '' ? '' : esc(m.nilai)) + '</td><td class="sub">' + esc(m.catatan) + '</td></tr>'; }).join('') + '</tbody></table></div>'; }).join('') : '<div class="empty">Belum ada materi kurikulum untuk jenjang ini.</div>') + '</div>';
        $('#r-pdf', O).onclick = async function () { try { await pdfRapor(r); JM.toast('Rapor siap diunduh.', 'ok'); } catch (e) { JM.toast(e.message, 'err'); } };
      } catch (e) { O.innerHTML = '<div class="card empty">' + esc(e.message) + '</div>'; }
    };
    if (ctx.params.id) tampil(ctx.params.id);
  }

  JM.view('laporan', { title: 'Pusat Laporan', render: function (root, ctx) {
    root.innerHTML = JM.head({ eyebrow: 'Pelaporan instan', title: 'Pusat Laporan & Rapor', desc: 'Unduh rekap resmi (PDF), tabel olah data (Excel/CSV), dan rapor santri untuk wali murid.' }) + '<div class="tabs"><button data-t="lap">Laporan & Ekspor</button><button data-t="rapor">Rapor Santri</button></div><div id="lp"></div>';
    const go = function (t) { $$('.tabs button', root).forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); }); const B = $('#lp', root); B.innerHTML = ''; (t === 'rapor' ? rapor : laporan)(B, ctx); };
    $$('.tabs button', root).forEach(function (b) { b.onclick = function () { go(b.dataset.t); }; }); go(ctx.params.tab === 'rapor' ? 'rapor' : 'lap');
  } });
})();
