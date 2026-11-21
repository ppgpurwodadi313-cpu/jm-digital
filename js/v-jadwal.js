/* Jadwal Kegiatan & Broadcast WhatsApp (manual wa.me + otomatis via antrean Fonnte) */
(function () {
  'use strict';
  const JM = window.JM, $ = JM.$, $$ = JM.$$, esc = JM.esc, ic = JM.ic;

  function form(d, done) {
    const u = JM.user, adm = u.role === 'Admin_Daerah', des = u.role === 'Pengurus_Desa', tingkat = adm ? ['Daerah', 'Desa', 'Kelompok'] : des ? ['Desa', 'Kelompok'] : ['Kelompok'];
    const desaVal = (d && d.Desa) || (adm ? '' : u.desa);
    const f = [
      { k: 'Judul_Kegiatan', label: 'Judul kegiatan', req: true, full: true, ph: 'mis. Pengajian Rutin Pra Remaja & Remaja' },
      { k: 'Tingkat', label: 'Tingkat', t: 'select', opts: tingkat, blank: false, def: tingkat[tingkat.length - 1] },
      { k: 'Desa', label: 'Desa', t: 'select', opts: adm ? JM.desaList() : [u.desa], def: desaVal, blank: adm },
      { k: 'Kelompok', label: 'Kelompok', t: 'select', opts: u.role === 'Pengurus_Kelompok' || u.role === 'Guru' ? [u.kelompok] : JM.kelompokList(desaVal), def: u.role === 'Pengurus_Kelompok' ? u.kelompok : undefined, blank: !(u.role === 'Pengurus_Kelompok') },
      { k: 'Tanggal', label: 'Tanggal', t: 'date', req: true, def: JM.hariIni() },
      { k: 'Waktu_Mulai', label: 'Mulai', t: 'time', req: true, def: '08:00' },
      { k: 'Waktu_Selesai', label: 'Selesai', t: 'time' },
      { k: 'Lokasi', label: 'Lokasi' }, { k: 'Pemateri', label: 'Pemateri' },
      { k: 'Jenjang_Target', label: 'Jenjang sasaran (kosong = semua)', t: 'multi', opts: JM.jenjangList(), full: true },
      { k: 'Catatan', label: 'Catatan / agenda', t: 'textarea', full: true }
    ];
    JM.formModal({ title: d ? 'Ubah Jadwal' : 'Jadwalkan Kegiatan Baru', fields: f, data: d, size: 'lg', noFocus: true,
      pre: function (r) {
        JM.tautDesaKelompok(r, 'Desa', 'Kelompok', JM.kelompokList);
        const t = $('#f_Tingkat', r), sync = function () { $('#f_Desa', r).closest('.fld').hidden = t.value === 'Daerah'; $('#f_Kelompok', r).closest('.fld').hidden = t.value !== 'Kelompok'; };
        t.onchange = sync; sync();
      },
      save: async function (v) { if (d) v.ID_Jadwal = d.ID_Jadwal; if (v.Tingkat === 'Daerah') { v.Desa = ''; v.Kelompok = ''; } else if (v.Tingkat === 'Desa') v.Kelompok = ''; else if (!v.Desa || !v.Kelompok) throw new Error('Pilih desa dan kelompok.'); await JMAPI.write('simpan', { tabel: 'jadwal', data: v }); done(); } });
  }

  /* ----- Modal broadcast WA ----- */
  JM.waModal = function (j, opsi) {
    opsi = opsi || {}; let jenis = opsi.jenis || 'undangan', data = null, tick = 0, ditandai = j.Status_Broadcast === 'Terkirim';
    const tanda = function () { if (ditandai || !JM.can('jadwal', 'u')) return; ditandai = true; JMAPI.write('tandaiBroadcast', { id: j.ID_Jadwal }).catch(function () {}); };
    const api = JM.modal({ title: 'Broadcast WhatsApp', size: 'lg', noFocus: true, body: '<div class="note" style="margin-bottom:12px">' + ic('event') + '<span><b>' + esc(j.Judul_Kegiatan) + '</b> — ' + esc(JM.hariTgl(j.Tanggal)) + ' • ' + esc(j.Waktu_Mulai) + '</span></div>' +
      '<div class="fld" style="margin-bottom:12px"><label>Jenis pesan</label><select class="inp" id="w-j"><option value="undangan">Undangan kegiatan (ke wali murid)</option>' + (opsi.tanggal || opsi.izinkanHadir ? '<option value="tidakHadir">Pemberitahuan tidak hadir</option>' : '') + '<option value="kustom">Pesan kustom</option></select></div>' +
      '<div class="fld" id="w-kw" hidden style="margin-bottom:12px"><label>Isi pesan</label><textarea class="inp" id="w-p" placeholder="Assalamu\'alaikum {wali}, ..."></textarea><small class="sub">Variabel: {wali} {nama} {judul} {tanggal} {hari} {jam} {lokasi} {pemateri}</small></div>' +
      '<div id="w-st" style="margin-bottom:12px"></div><div id="w-ls"></div>', actions: [{ label: 'Tutup', cls: 'sec', close: true }] });
    $('#w-j', api.body).value = jenis;
    const body = api.body, S = function (id) { return $(id, body); };
    const muat = async function () {
      const my = ++tick; S('#w-kw').hidden = jenis !== 'kustom';
      if (jenis === 'kustom' && !S('#w-p').value.trim()) { S('#w-ls').innerHTML = '<div class="empty">Tulis isi pesan untuk melihat pratinjau.</div>'; S('#w-st').innerHTML = ''; return; }
      S('#w-ls').innerHTML = JM.skel(3);
      try {
        const r = await JMAPI.post('waSusun', { jenis: jenis, idJadwal: j.ID_Jadwal, tanggal: opsi.tanggal, statuses: opsi.statuses, pesan: S('#w-p').value, mode: 'pratinjau' }); if (my !== tick) return; data = r;
        const hdr = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">' + JM.pill(r.total + ' penerima', 'p-pri') + (r.dilewati.tanpaNomor ? JM.pill(r.dilewati.tanpaNomor + ' tanpa nomor WA', 'p-wr') : '') + (r.dilewati.optOut ? JM.pill(r.dilewati.optOut + ' opt-out', 'p-gr') : '') + '<span style="flex:1"></span>' +
          (jenis === 'undangan' ? '<button class="btn sec sm" id="w-cp">' + ic('content_copy') + 'Salin teks undangan</button>' : '') +
          (JM.can('wa', 'c') ? '<button class="btn sm" id="w-auto"' + (r.aktif && r.total ? '' : ' disabled') + '>' + ic('bolt') + 'Kirim semua otomatis</button>' : '') + '</div>' +
          (!r.aktif ? '<div class="note wr" style="margin-bottom:10px">' + ic('info') + '<span>Pengiriman otomatis belum aktif' + (JM.can('rahasia') ? ' — aktifkan di <a href="#/pengaturan" onclick="document.querySelector(\'.modal-bg\').remove()">Pengaturan</a>' : '; hubungi Admin Daerah') + '. Gunakan tombol WhatsApp per penerima di bawah.</span></div>' : '');
        S('#w-st').innerHTML = hdr;
        S('#w-ls').innerHTML = r.items.length ? '<div class="tbl-wrap"><table class="tbl"><tbody>' + r.items.map(function (it, i) { return '<tr><td><b style="font-weight:600">' + esc(it.wali) + '</b><span class="sub">' + esc(it.nama) + '</span></td><td class="num mhide">' + esc(JM.hp('0' + it.nomor.slice(2))) + '</td><td style="text-align:right"><a class="btn wa sm" data-i="' + i + '" target="_blank" rel="noopener" href="' + esc(it.wa) + '">' + ic('send') + 'WhatsApp</a></td></tr>'; }).join('') + '</tbody></table></div>' + (r.total > r.items.length ? '<p class="sub">Menampilkan 500 pertama.</p>' : '') : '<div class="empty">Tidak ada penerima yang memenuhi syarat (periksa nomor WA wali & jenjang sasaran).</div>';
        $$('[data-i]', S('#w-ls')).forEach(function (a) { a.onclick = function () { a.classList.add('sec'); a.innerHTML = ic('check') + 'Dibuka'; tanda(); }; });
        const cp = S('#w-cp'); if (cp) cp.onclick = async function () { try { await navigator.clipboard.writeText(r.teksUmum); JM.toast('Teks undangan disalin.', 'ok'); tanda(); } catch (e) { JM.toast('Tidak dapat menyalin otomatis.', 'err'); } };
        const au = S('#w-auto'); if (au) au.onclick = async function () {
          if (!(await JM.confirm('Antrikan ' + r.total + ' pesan WhatsApp? Pesan dikirim bertahap otomatis (jeda aman anti-blokir).', 'Ya, antrikan'))) return;
          au.disabled = true;
          try { const x = await JMAPI.write('waSusun', { jenis: jenis, idJadwal: j.ID_Jadwal, tanggal: opsi.tanggal, statuses: opsi.statuses, pesan: S('#w-p').value, mode: 'antri' }); JM.toast(x.diantrikan + ' pesan diantrikan. Terkirim bertahap dalam beberapa menit.', 'ok'); tanda(); api.close(); } catch (e) { JM.toast(e.message, 'err'); au.disabled = false; }
        };
      } catch (e) { if (my === tick) S('#w-ls').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; }
    };
    S('#w-j').onchange = function (e) { jenis = e.target.value; muat(); };
    S('#w-p').oninput = JM.debounce(muat, 500);
    muat(); return api;
  };

  function logModal() {
    const api = JM.modal({ title: 'Log Pesan WhatsApp', size: 'lg', body: JM.skel(4), actions: [JM.can('wa', 'c') ? { label: 'Proses antrean sekarang', cls: 'sec', icon: 'play_arrow', autoClose: false, onClick: async function () { const r = await JMAPI.write('waProses', {}); JM.toast((r.diproses || 0) + ' pesan diproses.', 'ok'); muat(); return false; } } : null, { label: 'Tutup', close: true }].filter(Boolean) });
    const muat = function () {
      JMAPI.post('waDaftar', {}).then(function (r) {
        api.body.innerHTML = r.blast.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Kegiatan</th><th>Jenis</th><th>Progres</th><th>Status</th><th></th></tr></thead><tbody>' + r.blast.map(function (b) {
          const sel = (+b.Terkirim || 0) + (+b.Gagal || 0); return '<tr><td class="num">' + esc(String(b.Tanggal).slice(0, 16)) + '</td><td>' + esc(b.Judul) + '<span class="sub">oleh ' + esc(b.DibuatOleh) + '</span></td><td>' + esc(b.Event) + '</td><td class="num">' + b.Terkirim + ' terkirim' + (+b.Gagal ? ' / <span style="color:var(--er)">' + b.Gagal + ' gagal</span>' : '') + ' dari ' + b.Total + '<div class="bar-prog"><s style="width:' + Math.round(sel / (b.Total || 1) * 100) + '%;background:var(--primary)"></s></div></td><td>' + JM.pill(b.Status) + '</td><td>' + (b.Status === 'Berjalan' ? '<button class="btn del sm" data-b="' + esc(b.BlastID) + '">Hentikan</button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty">Belum ada riwayat broadcast otomatis.</div>';
        $$('[data-b]', api.body).forEach(function (b) { b.onclick = async function () { if (await JM.confirm('Hentikan pengiriman yang masih antri?', 'Hentikan', true)) { try { await JMAPI.write('waBatal', { blastId: b.dataset.b }); JM.toast('Dihentikan.', 'ok'); muat(); } catch (e) { JM.toast(e.message, 'err'); } } }; });
      }).catch(function (e) { api.body.innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
    }; muat();
  }

  JM.view('jadwal', { title: 'Jadwal Kegiatan', render: function (root, ctx) {
    let tab = 'depan', rows = [];
    root.innerHTML = JM.head({ eyebrow: 'Agenda & komunikasi', title: 'Jadwal & Broadcast WhatsApp', desc: 'Buat agenda pengajian/musyawarah, lalu kirim undangan ke wali murid sekali klik.',
      actions: (JM.can('wa', 'r') ? '<button class="btn sec" id="x-log">' + ic('history') + 'Log Pesan</button>' : '') + (JM.can('jadwal', 'c') ? '<button class="btn" id="x-add">' + ic('add') + 'Jadwal Baru</button>' : '') }) +
      '<div class="tabs"><button class="on" data-t="depan">Mendatang</button><button data-t="lalu">Sudah lewat</button></div><div class="grid g3" id="x-list">' + [1, 2, 3].map(function () { return '<div class="card pad">' + JM.skel(4) + '</div>'; }).join('') + '</div>';
    const today = JM.hariIni();
    const args = function () { return tab === 'depan' ? { tabel: 'jadwal', from: today, size: 60, sort: { col: 'Tanggal', dir: 'asc' } } : { tabel: 'jadwal', to: JM.geser(today, -1), size: 60 }; };
    const render = function (r) {
      if (!ctx.alive()) return; rows = r.rows;
      $('#x-list', root).innerHTML = rows.length ? rows.map(function (j) {
        const sendiri = j.Tingkat === 'Daerah' ? 'p-in' : j.Tingkat === 'Desa' ? 'p-pri' : 'p-gr';
        return '<div class="card ev"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">' + JM.pill(j.Status_Broadcast === 'Terkirim' ? 'Sudah broadcast' : 'Belum broadcast', j.Status_Broadcast === 'Terkirim' ? 'p-ok' : 'p-wr') + JM.pill('Tingkat ' + j.Tingkat, sendiri) + '</div><h3>' + esc(j.Judul_Kegiatan) + '</h3>' +
          '<div class="meta"><div>' + ic('event') + '<span>' + esc(JM.hariTgl(j.Tanggal)) + ' • ' + esc(j.Waktu_Mulai) + (j.Waktu_Selesai ? '–' + esc(j.Waktu_Selesai) : '') + '</span></div><div>' + ic('location_on') + '<span>' + esc(j.Lokasi || '-') + (j.Kelompok ? ' • Kel. ' + esc(j.Kelompok) : j.Desa ? ' • ' + esc(j.Desa) : '') + '</span></div><div>' + ic('record_voice_over') + '<span>Pemateri: <b>' + esc(j.Pemateri || '-') + '</b></span></div>' + (j.Jenjang_Target ? '<div>' + ic('groups') + '<span>' + esc(j.Jenjang_Target) + '</span></div>' : '') + '</div>' +
          '<div class="btns">' + (JM.can('wa', 'c') ? '<button class="btn wa" data-wa="' + esc(j.ID_Jadwal) + '">' + ic('send') + 'Broadcast WA</button>' : '') + (JM.can('presensi', 'r') ? '<button class="btn" data-pr="' + esc(j.ID_Jadwal) + '">' + ic('fact_check') + 'Presensi</button>' : '') + '</div>' +
          '<div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end">' + (JM.can('jadwal', 'u') ? '<button class="btn sec sm" data-e="' + esc(j.ID_Jadwal) + '">' + ic('edit') + 'Ubah</button>' : '') + (JM.can('jadwal', 'd') ? '<button class="btn del sm" data-d="' + esc(j.ID_Jadwal) + '" aria-label="Hapus">' + ic('delete') + '</button>' : '') + '</div></div>';
      }).join('') : '<div class="card empty" style="grid-column:1/-1">' + (tab === 'depan' ? 'Belum ada agenda mendatang.' : 'Belum ada riwayat agenda.') + '</div>';
      const by = function (id) { return rows.filter(function (x) { return x.ID_Jadwal === id; })[0]; };
      $$('[data-wa]', root).forEach(function (b) { b.onclick = function () { JM.waModal(by(b.dataset.wa)); }; });
      $$('[data-pr]', root).forEach(function (b) { b.onclick = function () { JM.go('presensi', { j: b.dataset.pr }); }; });
      $$('[data-e]', root).forEach(function (b) { b.onclick = function () { form(by(b.dataset.e), muat); }; });
      $$('[data-d]', root).forEach(function (b) { b.onclick = async function () { if (await JM.confirm('Hapus jadwal "' + by(b.dataset.d).Judul_Kegiatan + '"?', 'Hapus', true)) { try { await JMAPI.write('hapus', { tabel: 'jadwal', id: b.dataset.d }); JM.toast('Jadwal dihapus.', 'ok'); muat(); } catch (e) { JM.toast(e.message, 'err'); } } }; });
    };
    const muat = function () { return JMAPI.swr('list', args(), render, { ttl: 15000 }).then(function (r) { if (ctx.alive() && !rows.length) render(r); return r; }).catch(function (e) { if (ctx.alive()) JM.toast(e.message, 'err'); }); };
    $$('.tabs button', root).forEach(function (b) { b.onclick = function () { tab = b.dataset.t; $$('.tabs button', root).forEach(function (x) { x.classList.toggle('on', x === b); }); rows = []; muat(); }; });
    const add = $('#x-add', root); if (add) add.onclick = function () { form(null, muat); };
    const lg = $('#x-log', root); if (lg) lg.onclick = logModal;
    muat().then(function () {
      if (!ctx.alive()) return;
      if (ctx.params.baru && JM.can('jadwal', 'c')) form(null, muat);
      if (ctx.params.wa) { const j = rows.filter(function (x) { return x.ID_Jadwal === ctx.params.wa; })[0]; if (j) JM.waModal(j); }
    });
  } });
})();
