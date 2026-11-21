/* Dashboard Analitik: KPI, donut presensi (Chart.js), capaian GBPM, agenda terdekat */
(function () {
  'use strict';
  const JM = window.JM, $ = JM.$, esc = JM.esc, ic = JM.ic;
  const WARNA = { Hadir: '#0F766E', Izin: '#1D4ED8', Sakit: '#D97706', Alpa: '#991B1B' };

  function kpi(lab, val, small, tile, icon, foot) {
    return '<div class="card kpi"><div class="row"><div><div class="lab">' + lab + '</div><div class="val num">' + val + (small ? '<small>' + small + '</small>' : '') + '</div></div><span class="tile ' + tile + '">' + ic(icon) + '</span></div><div class="foot">' + foot + '</div></div>';
  }
  const singk = function (j) { return j.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase(); };

  function renderData(root, d) {
    const k = d.kpi, jn = JM.refs().jenjang;
    const delta = Math.round((k.presensiBulanIni - k.presensiBulanLalu) * 10) / 10;
    const kat = Object.keys(k.guru.per).map(function (x) { return JM.pill(x.replace('Muballigh ', 'M. ') + ': ' + k.guru.per[x], 'p-gr'); }).join('');
    const perJ = jn.map(function (j) { return JM.pill(singk(j.Nama_Jenjang) + ': ' + (k.perJenjang[j.Nama_Jenjang] || 0), 'p-gr'); }).join('');
    $('#d-kpi', root).innerHTML =
      kpi('Total Jamaah Aktif', k.jamaahAktif.toLocaleString('id-ID'), '', 't-pri', 'groups', '<span class="pill p-pri">' + k.kelompok + ' Kelompok binaan</span>') +
      kpi('Total Generus Binaan', k.generus.toLocaleString('id-ID'), 'Santri', 't-blue', 'school', perJ) +
      kpi('Tenaga Pengajar & Mubaligh', k.guru.total, 'Orang', 't-amb', 'person', kat || '<span>Belum ada data guru</span>') +
      kpi('Rata-rata Presensi Bulan Ini', k.presensiBulanIni + '%', '/ target ' + k.targetPresensi + '%', 't-grn', 'verified', (delta >= 0 ? '<span class="pill p-ok">▲ +' + delta + '%</span>' : '<span class="pill p-er">▼ ' + delta + '%</span>') + '<span>' + k.totalSesi + ' sesi bulan ini</span>');

    // Donut
    const tot = d.donut.Hadir + d.donut.Izin + d.donut.Sakit + d.donut.Alpa, pct = function (n) { return tot ? Math.round(n / tot * 1000) / 10 : 0; };
    $('#d-leg', root).innerHTML = ['Hadir', 'Izin', 'Sakit', 'Alpa'].map(function (s) { return '<div><span class="legend"><span><i style="background:' + WARNA[s] + '"></i>' + s + '</span></span><b class="num">' + pct(d.donut[s]) + '%</b></div>'; }).join('');
    $('#d-pct', root).textContent = tot ? pct(d.donut.Hadir) + '%' : '–';
    $('#d-lbl', root).textContent = !tot ? 'Belum ada data' : pct(d.donut.Hadir) >= k.targetPresensi ? 'Sangat baik' : 'Perlu ditingkatkan';
    gambarDonut(root, d.donut, tot);
    $('#d-tren', root).innerHTML = d.tren.map(function (t) { return '<div style="flex:1;text-align:center"><div style="height:44px;display:flex;align-items:flex-end"><i style="display:block;width:100%;border-radius:4px 4px 0 0;background:' + (t.persen >= k.targetPresensi ? 'var(--primary)' : '#99d6cf') + ';height:' + Math.max(t.persen, 3) + '%" title="' + t.persen + '%"></i></div><small class="sub">' + (JM.tgl(t.bulan + '-01').split(' ')[1]) + '</small></div>'; }).join('');

    // GBPM
    $('#d-gbpm', root).innerHTML = d.gbpm.length ? d.gbpm.map(function (g) {
      const bar = function (cls, lab, v) { return '<div class="bar ' + cls + '"><span>' + lab + '</span><i><s style="width:' + Math.min(v.capaian, 100) + '%"></s></i><span class="v num">' + v.capaian + '%</span></div>'; };
      return '<div class="gb"><div class="gb-h"><b>Jenjang ' + esc(g.jenjang) + ' <span class="sub" style="display:inline">(Usia ' + g.usiaMin + '–' + g.usiaMaks + ')</span></b>' + JM.pill(g.santri + ' santri aktif', g.santri ? 'p-pri' : 'p-gr') + '</div>' +
        '<div class="bars">' + bar('', 'Prota', g.prota) + bar('b2', 'Promes', g.promes) + bar('b3', 'Probul', g.probul) + '</div>' +
        '<small class="sub">' + (g.totalMateri ? g.totalMateri + ' materi • ' + esc(g.materiUtama.join(', ')) : 'Belum ada materi kurikulum untuk jenjang ini') + '</small></div>';
    }).join('') : '<div class="empty">Belum ada kurikulum GBPM.</div>';

    // Agenda
    $('#d-ev', root).innerHTML = d.jadwalTerdekat.slice(0, 2).map(function (j) {
      return '<div class="card ev"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">' + JM.pill(j.Status_Broadcast === 'Terkirim' ? 'Sudah broadcast' : 'Belum broadcast', j.Status_Broadcast === 'Terkirim' ? 'p-ok' : 'p-wr') + '<span class="sub">Tingkat ' + esc(j.Tingkat) + '</span></div><h3>' + esc(j.Judul_Kegiatan) + '</h3>' +
        '<div class="meta"><div>' + ic('event') + '<span>' + esc(JM.hariTgl(j.Tanggal)) + ' • ' + esc(j.Waktu_Mulai) + (j.Waktu_Selesai ? '–' + esc(j.Waktu_Selesai) : '') + '</span></div>' +
        '<div>' + ic('location_on') + '<span>' + esc(j.Lokasi || '-') + '</span></div><div>' + ic('record_voice_over') + '<span>Pemateri: <b>' + esc(j.Pemateri || '-') + '</b></span></div></div>' +
        '<div class="btns">' + (JM.can('wa', 'c') ? '<button class="btn wa" data-wa="' + esc(j.ID_Jadwal) + '">' + ic('send') + 'Broadcast WA</button>' : '') + (JM.can('presensi', 'c') ? '<button class="btn" data-pr="' + esc(j.ID_Jadwal) + '">' + ic('qr_code_scanner') + 'Buka Presensi</button>' : '') + '</div></div>';
    }).join('') || '<div class="card pad empty" style="grid-column:span 2">Belum ada agenda mendatang.' + (JM.can('jadwal', 'c') ? '<br><br><button class="btn" id="d-new">' + ic('add') + 'Jadwalkan kegiatan</button>' : '') + '</div>';
    JM.$$('[data-wa]', root).forEach(function (b) { b.onclick = function () { JM.go('jadwal', { wa: b.dataset.wa }); }; });
    JM.$$('[data-pr]', root).forEach(function (b) { b.onclick = function () { JM.go('presensi', { j: b.dataset.pr }); }; });
    const nb = $('#d-new', root); if (nb) nb.onclick = function () { JM.go('jadwal', { baru: 1 }); };
    $('#d-sync', root).textContent = 'Data sinkron: ' + d.sinkron.slice(11, 16) + ' WIB';
  }

  let chart = null;
  async function gambarDonut(root, donut, tot) {
    const host = $('#d-donut', root); if (!host) return;
    if (chart) { try { chart.destroy(); } catch (e) {} chart = null; }
    const labels = ['Hadir', 'Izin', 'Sakit', 'Alpa'], data = labels.map(function (l) { return donut[l]; });
    try {
      await JM.loadScript('chart');
      host.innerHTML = '<canvas aria-label="Grafik donat presensi" role="img"></canvas>';
      chart = new Chart(host.firstChild, { type: 'doughnut', data: { labels: labels, datasets: [{ data: tot ? data : [1], backgroundColor: tot ? labels.map(function (l) { return WARNA[l]; }) : ['#E2E8F0'], borderWidth: 0 }] },
        options: { cutout: '74%', plugins: { legend: { display: false }, tooltip: { enabled: !!tot } }, animation: { duration: 400 } } });
    } catch (e) { // Cadangan tanpa pustaka (offline): donat dari CSS conic-gradient
      let a = 0; const seg = tot ? labels.map(function (l) { const s = a, n = donut[l] / tot * 100; a += n; return WARNA[l] + ' ' + s + '% ' + a + '%'; }).join(',') : '#E2E8F0 0 100%';
      host.innerHTML = '<div style="aspect-ratio:1;border-radius:50%;background:conic-gradient(' + seg + ');-webkit-mask:radial-gradient(circle,transparent 62%,#000 63%);mask:radial-gradient(circle,transparent 62%,#000 63%)"></div>';
    }
  }

  JM.view('dashboard', { title: 'Dashboard', render: function (root, ctx) {
    const u = JM.user, f = { desa: '', kelompok: '' };
    const adm = u.role === 'Admin_Daerah', des = adm || u.role === 'Pengurus_Desa';
    root.innerHTML = JM.head({ eyebrow: 'Ringkasan ' + (adm ? 'Daerah' : u.role === 'Pengurus_Desa' ? 'Desa' : 'Kelompok'), title: 'Dashboard Analitik', desc: 'Pantau jamaah, kehadiran, dan capaian kurikulum GBPM secara berjenjang.', actions: '<span class="pill p-ok" id="d-sync">Memuat…</span>' }) +
      (des ? '<div class="card toolbar" style="margin-bottom:16px"><span class="eyebrow" style="color:var(--muted)">Wilayah</span>' +
        (adm ? '<select class="inp" id="d-desa">' + JM.opts(JM.desaList(), 'Semua Desa') + '</select>' : '') +
        '<select class="inp" id="d-kel">' + JM.opts(JM.kelompokList(adm ? '' : u.desa), 'Semua Kelompok') + '</select><span style="flex:1"></span><span id="d-exp"></span></div>' : '') +
      '<div class="grid g4" id="d-kpi" style="margin-bottom:16px">' + [1, 2, 3, 4].map(function () { return '<div class="card kpi">' + JM.skel(3) + '</div>'; }).join('') + '</div>' +
      '<div class="grid g-dash" style="margin-bottom:16px"><div class="card pad"><div class="eyebrow" style="color:var(--muted)">Komposisi kedisiplinan</div><h3 style="margin-bottom:4px">Presensi Kegiatan Bulan Ini</h3>' +
      '<div class="donut-wrap"><div id="d-donut"></div><div class="donut-c"><div><b id="d-pct">–</b><small>Tingkat hadir</small><div id="d-lbl" class="sub"></div></div></div></div><div class="stat4" id="d-leg"></div>' +
      '<div style="margin-top:14px"><small class="sub">Tren kehadiran 6 bulan terakhir (garis target ' + 85 + '%)</small><div id="d-tren" style="display:flex;gap:6px;margin-top:6px"></div></div></div>' +
      '<div class="card pad"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:12px"><div><div class="eyebrow" style="color:var(--muted)">Standar capaian pembelajaran</div><h3>Capaian Target Kurikulum GBPM</h3></div>' +
      '<div class="legend"><span><i style="background:#0F766E"></i>Prota</span><span><i style="background:#5eead4"></i>Promes</span><span><i style="background:#D97706"></i>Probul</span></div></div><div id="d-gbpm">' + JM.skel(5) + '</div></div></div>' +
      '<div class="grid g-dash3"><div id="d-ev" style="display:contents"></div>' +
      '<div class="card pad"><div class="eyebrow" style="color:var(--muted)">Tindakan lapangan cepat</div><h3 style="margin-bottom:12px">Pusat Eksekusi Operasional</h3>' +
      (JM.can('jadwal', 'c') ? '<button class="qa" data-g="jadwal?baru=1"><span class="tile">' + ic('add_circle') + '</span><span><b>Jadwalkan Pengajian Baru</b><small>Buat agenda desa atau kelompok</small></span></button>' : '') +
      (JM.can('wa', 'c') ? '<button class="qa" data-g="jadwal"><span class="tile">' + ic('forum') + '</span><span><b>Buat Pengumuman Massal</b><small>Templat pesan ke wali via WA</small></span></button>' : '') +
      (JM.can('laporan') ? '<button class="qa" data-g="laporan?tab=rapor"><span class="tile">' + ic('fact_check') + '</span><span><b>Rekap Rapor</b><small>Hitung nilai GBPM otomatis</small></span></button>' : '') + '</div></div>';
    JM.$$('[data-g]', root).forEach(function (b) { b.onclick = function () { const p = b.dataset.g.split('?'); JM.go(p[0], p[1] ? Object.fromEntries(new URLSearchParams(p[1])) : null); }; });

    let last = null;
    const tampil = function (d) { if (ctx.alive()) { last = d; renderData(root, d); } };
    if (JM.boot && JM.boot.dashboard && !f.desa) tampil(JM.boot.dashboard);   // instan dari boot
    const muat = function (paksa) {
      JMAPI.swr('dashboard', { desa: f.desa, kelompok: f.kelompok }, function (r) { tampil(r.data); }, { ttl: paksa ? 0 : 20000 }).then(function (r) { if (!last && ctx.alive()) tampil(r.data); }).catch(function (e) { if (ctx.alive() && !last) JM.toast(e.message, 'err'); });
    };
    muat();
    const ds = $('#d-desa', root), ks = $('#d-kel', root);
    if (ds) ds.onchange = function () { f.desa = ds.value; f.kelompok = ''; ks.innerHTML = JM.opts(JM.kelompokList(f.desa), 'Semua Kelompok'); muat(true); };
    if (ks) ks.onchange = function () { f.kelompok = ks.value; muat(true); };
    const ex = $('#d-exp', root);
    if (ex) ex.appendChild(JM.tombolEkspor(async function () {
      const d = last; if (!d) return null;
      return { judul: 'Ringkasan Capaian GBPM', kolom: ['Jenjang', 'Santri Aktif', 'Total Materi', 'Prota %', 'Promes %', 'Probul %'], baris: d.gbpm.map(function (g) { return [g.jenjang, g.santri, g.totalMateri, g.prota.capaian, g.promes.capaian, g.probul.capaian]; }) };
    }, 'ringkasan_gbpm'));
    return function () { if (chart) { try { chart.destroy(); } catch (e) {} chart = null; } };
  } });
})();
