/* JM Digital — utilitas UI: elemen, modal, form, toast, ekspor (PDF/Excel/CSV), kompres foto */
(function () {
  'use strict';
  const JM = window.JM = window.JM || {};
  const CDN = {
    chart: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    autotable: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
  };
  const loaded = {};
  JM.loadScript = function (name) {
    if (loaded[name]) return loaded[name];
    return loaded[name] = new Promise(function (res, rej) {
      const s = document.createElement('script'); s.src = CDN[name]; s.async = true;
      s.onload = res; s.onerror = function () { delete loaded[name]; rej(new Error('Pustaka ' + name + ' gagal dimuat. Periksa koneksi internet.')); };
      document.head.appendChild(s);
    });
  };

  JM.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const esc = JM.esc;
  JM.$ = function (s, r) { return (r || document).querySelector(s); };
  JM.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  JM.el = function (html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  JM.debounce = function (fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 250); }; };
  JM.ic = function (n, cls) { return '<span class="ms ' + (cls || '') + '">' + n + '</span>'; };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BLNF = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  JM.tgl = function (s, panjang) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? (+m[3]) + ' ' + (panjang ? BLNF : BLN)[+m[2] - 1] + ' ' + m[1] : (s || '-'); };
  JM.hariTgl = function (s) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); if (!m) return s || '-'; return HARI[new Date(+m[1], +m[2] - 1, +m[3]).getDay()] + ', ' + JM.tgl(s, true); };
  JM.hariIni = function () { const d = new Date(), p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  JM.geser = function (iso, hari) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + hari); const p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  JM.rp = function (n) { return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID'); };
  JM.initials = function (n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); };
  JM.hp = function (v) { v = String(v || ''); return v.length > 4 ? v.replace(/^(\d{4})(\d{4})(\d*)$/, '$1-$2-$3') : v; };
  JM.wa = function (no, teks) { no = String(no || '').replace(/\D/g, ''); if (no.charAt(0) === '0') no = '62' + no.slice(1); return 'https://wa.me/' + no + (teks ? '?text=' + encodeURIComponent(teks) : ''); };
  JM.avatar = function (r, cls) { return r.URL_Foto ? '<img class="avatar ' + (cls || '') + '" loading="lazy" referrerpolicy="no-referrer" src="' + esc(r.URL_Foto) + '" alt="">' : '<span class="avatar ' + (cls || '') + '">' + esc(JM.initials(r.Nama_Lengkap)) + '</span>'; };
  const PILL = { Aktif: 'p-ok', Hadir: 'p-ok', Tuntas: 'p-ok', Terkirim: 'p-ok', Selesai: 'p-ok', Izin: 'p-in', Terjadwal: 'p-in', Berjalan: 'p-in', Sakit: 'p-wr', Proses: 'p-wr', Pindah: 'p-wr', Diajukan: 'p-wr', Antri: 'p-wr', Alpa: 'p-er', Belum: 'p-er', 'Non-Aktif': 'p-er', Nonaktif: 'p-er', Gagal: 'p-er', Batal: 'p-gr', Dihentikan: 'p-gr' };
  JM.pill = function (s, cls) { return '<span class="pill ' + (cls || PILL[s] || 'p-gr') + '">' + esc(s) + '</span>'; };
  JM.skel = function (n) { let h = ''; for (let i = 0; i < (n || 4); i++) h += '<div class="skel" style="height:' + (i ? 18 : 28) + 'px;margin:12px 0;width:' + (90 - i * 8) + '%"></div>'; return h; };

  /* ----- toast ----- */
  JM.toast = function (msg, type) {
    const t = JM.el('<div class="toast ' + (type || '') + '">' + JM.ic(type === 'err' ? 'error' : type === 'ok' ? 'check_circle' : 'info') + '<span>' + esc(msg) + '</span></div>');
    JM.$('#toasts').appendChild(t); setTimeout(function () { t.remove(); }, type === 'err' ? 5500 : 3000);
  };

  /* ----- modal ----- */
  JM.modal = function (o) {
    const bg = JM.el('<div class="modal-bg"><div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true"><div class="modal-h"><h3>' + esc(o.title) + '</h3><button class="icon-btn" data-x aria-label="Tutup">' + JM.ic('close') + '</button></div><div class="modal-b"></div><div class="modal-f"></div></div></div>');
    const body = JM.$('.modal-b', bg), foot = JM.$('.modal-f', bg);
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    const api = { el: bg, body: body, close: function () { bg.remove(); document.removeEventListener('keydown', esc_); if (o.onClose) o.onClose(); }, foot: foot };
    const esc_ = function (e) { if (e.key === 'Escape') api.close(); };
    document.addEventListener('keydown', esc_);
    (o.actions || []).forEach(function (a) {
      const b = JM.el('<button class="btn ' + (a.cls || '') + '">' + (a.icon ? JM.ic(a.icon) : '') + esc(a.label) + '</button>');
      b.onclick = async function () {
        if (a.close) return api.close();
        b.disabled = true; const old = b.innerHTML; b.innerHTML = '<span>Memproses…</span>';
        try { const r = await a.onClick(api); if (r !== false && a.autoClose !== false) api.close(); }
        catch (e) { JM.toast(e.message, 'err'); }
        finally { b.disabled = false; b.innerHTML = old; }
      };
      foot.appendChild(b);
    });
    if (!(o.actions || []).length) foot.remove();
    JM.$('[data-x]', bg).onclick = api.close;
    bg.addEventListener('mousedown', function (e) { if (e.target === bg && !o.persist) api.close(); });
    document.body.appendChild(bg);
    const f = JM.$('input,select,textarea', body); if (f && window.innerWidth > 767 && !o.noFocus) f.focus();
    return api;
  };
  JM.confirm = function (msg, label, danger) {
    return new Promise(function (res) {
      let done = false; const fin = function (v) { if (!done) { done = true; res(v); } };
      JM.modal({ title: 'Konfirmasi', size: 'sm', body: '<p>' + esc(msg) + '</p>', onClose: function () { fin(false); },
        actions: [{ label: 'Batal', cls: 'sec', close: true }, { label: label || 'Ya, lanjutkan', cls: danger ? 'del' : '', onClick: function () { fin(true); } }] });
    });
  };

  /* ----- form builder ----- */
  function opt(o) { return typeof o === 'object' ? o : { v: o, l: o }; }
  JM.formHtml = function (fields, val) {
    val = val || {};
    return '<div class="frm">' + fields.map(function (f) {
      const v = val[f.k] !== undefined ? val[f.k] : (f.def !== undefined ? f.def : ''), id = 'f_' + f.k, cls = f.full ? 'fld full' : 'fld';
      let inp;
      if (f.t === 'select') inp = '<select class="inp" id="' + id + '">' + (f.blank !== false ? '<option value="">' + esc(f.ph || 'Pilih…') + '</option>' : '') + (f.opts || []).map(function (o) { o = opt(o); return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(v) ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select>';
      else if (f.t === 'textarea') inp = '<textarea class="inp" id="' + id + '" placeholder="' + esc(f.ph || '') + '">' + esc(v) + '</textarea>';
      else if (f.t === 'multi') { const cur = String(v).split(',').map(function (s) { return s.trim(); }); inp = '<div class="chips" id="' + id + '" data-multi>' + (f.opts || []).map(function (o) { o = opt(o); return '<button type="button" data-v="' + esc(o.v) + '" class="' + (cur.indexOf(String(o.v)) > -1 ? 'on' : '') + '">' + esc(o.l) + '</button>'; }).join('') + '</div>'; }
      else inp = '<input class="inp" id="' + id + '" type="' + (f.t || 'text') + '" value="' + esc(v) + '" placeholder="' + esc(f.ph || '') + '"' + (f.t === 'tel' ? ' inputmode="tel"' : '') + (f.t === 'number' ? ' inputmode="numeric"' : '') + (f.max ? ' maxlength="' + f.max + '"' : '') + (f.autocomplete ? ' autocomplete="' + f.autocomplete + '"' : '') + '>';
      return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.label) + (f.req ? ' *' : '') + '</label>' + inp + (f.help ? '<small class="sub">' + esc(f.help) + '</small>' : '') + '</div>';
    }).join('') + '</div>';
  };
  JM.formBind = function (root) {
    JM.$$('[data-multi] button', root).forEach(function (b) { b.onclick = function () { b.classList.toggle('on'); }; });
  };
  JM.formRead = function (fields, root) {
    const o = {};
    fields.forEach(function (f) {
      const e = JM.$('#f_' + f.k, root); if (!e) return;
      if (f.t === 'multi') o[f.k] = JM.$$('button.on', e).map(function (b) { return b.dataset.v; }).join(', ');
      else o[f.k] = e.value.trim();
      if (f.req && !o[f.k]) { e.focus && e.focus(); throw new Error('"' + f.label + '" wajib diisi.'); }
    });
    return o;
  };

  /* ----- pager ----- */
  JM.pager = function (total, page, size, onPage, noun) {
    const pages = Math.max(Math.ceil(total / size), 1), from = total ? (page - 1) * size + 1 : 0, to = Math.min(page * size, total);
    const nums = []; for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
    const el = JM.el('<div class="pager"><span>Menampilkan <b>' + from + '–' + to + '</b> dari <b>' + total + '</b> ' + (noun || 'data') + '</span><div class="pg"><button data-p="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + ' aria-label="Sebelumnya">' + JM.ic('chevron_left') + '</button>' +
      nums.map(function (n) { return n === '…' ? '<span style="padding:6px">…</span>' : '<button data-p="' + n + '" class="' + (n === page ? 'on' : '') + '">' + n + '</button>'; }).join('') +
      '<button data-p="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + ' aria-label="Berikutnya">' + JM.ic('chevron_right') + '</button></div></div>');
    JM.$$('button[data-p]', el).forEach(function (b) { b.onclick = function () { onPage(+b.dataset.p); }; });
    return el;
  };

  /* ----- foto: kompres Canvas < 300 KB ----- */
  JM.kompresFoto = function (file, maxKB) {
    maxKB = maxKB || 280;
    return new Promise(function (res, rej) {
      if (!/^image\//.test(file.type)) return rej(new Error('File harus berupa gambar.'));
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        let w = img.width, h = img.height; const mx = 640; if (Math.max(w, h) > mx) { const r = mx / Math.max(w, h); w = Math.round(w * r); h = Math.round(h * r); }
        const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
        let q = 0.85, d = c.toDataURL('image/jpeg', q);
        while (d.length * 0.75 > maxKB * 1024 && q > 0.3) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
        res(d);
      };
      img.onerror = function () { rej(new Error('Gambar tidak dapat dibaca.')); };
      img.src = url;
    });
  };

  /* ----- ekspor ----- */
  JM.unduh = function (nama, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  JM.eksporCSV = function (nama, kolom, baris) {
    const q = function (v) { v = v == null ? '' : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const teks = '﻿' + [kolom].concat(baris).map(function (r) { return r.map(q).join(','); }).join('\r\n');
    JM.unduh(nama + '.csv', new Blob([teks], { type: 'text/csv;charset=utf-8' }));
  };
  JM.eksporXLSX = async function (nama, kolom, baris, judul) {
    await JM.loadScript('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([kolom].concat(baris)), wb = XLSX.utils.book_new();
    ws['!cols'] = kolom.map(function (k, i) { let m = String(k).length; baris.slice(0, 200).forEach(function (r) { m = Math.max(m, String(r[i] == null ? '' : r[i]).length); }); return { wch: Math.min(m + 2, 40) }; });
    XLSX.utils.book_append_sheet(wb, ws, String(judul || 'Data').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
    XLSX.writeFile(wb, nama + '.xlsx');
  };
  JM.kop = function () {
    const u = JM.user || {}; const w = u.role === 'Admin_Daerah' ? 'Seluruh Daerah' : (u.desa || '') + (u.kelompok ? ' • Kelompok ' + u.kelompok : '');
    return { lembaga: 'JM DIGITAL — Pembinaan Jamaah & Generus', wilayah: w };
  };
  JM.eksporPDF = async function (nama, judul, kolom, baris) {
    await JM.loadScript('jspdf'); await JM.loadScript('autotable');
    const doc = new window.jspdf.jsPDF({ orientation: kolom.length > 7 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' }), k = JM.kop(), W = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(15, 118, 110); doc.text(k.lembaga, W / 2, 40, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139); doc.text(k.wilayah, W / 2, 54, { align: 'center' });
    doc.setDrawColor(15, 118, 110); doc.setLineWidth(1.2); doc.line(36, 62, W - 36, 62);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 41, 59); doc.text(judul, W / 2, 84, { align: 'center' });
    doc.autoTable({ head: [kolom], body: baris, startY: 96, styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [15, 118, 110] }, alternateRowStyles: { fillColor: [248, 250, 252] }, margin: { left: 36, right: 36 },
      didDrawPage: function () { doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('Dicetak ' + new Date().toLocaleString('id-ID') + ' oleh ' + ((JM.user && JM.user.nama) || '-'), 36, doc.internal.pageSize.getHeight() - 20); doc.text('Hal. ' + doc.internal.getNumberOfPages(), W - 36, doc.internal.pageSize.getHeight() - 20, { align: 'right' }); } });
    doc.save(nama + '.pdf');
  };
  // Tombol ekspor standar: fn() harus mengembalikan {judul,kolom,baris}
  JM.tombolEkspor = function (fn, nama) {
    const w = JM.el('<div class="actions"><button class="btn sec sm" data-t="pdf">' + JM.ic('picture_as_pdf') + 'PDF</button><button class="btn wa sm" data-t="xlsx">' + JM.ic('table_view') + 'Excel</button><button class="btn sec sm" data-t="csv">' + JM.ic('download') + 'CSV</button></div>');
    JM.$$('button', w).forEach(function (b) {
      b.onclick = async function () {
        b.disabled = true;
        try {
          const d = await fn(); if (!d || !d.baris.length) { JM.toast('Tidak ada data untuk diunduh.', 'err'); return; }
          const n = (nama || 'laporan') + '_' + JM.hariIni();
          if (b.dataset.t === 'pdf') await JM.eksporPDF(n, d.judul, d.kolom, d.baris); else if (b.dataset.t === 'xlsx') await JM.eksporXLSX(n, d.kolom, d.baris, d.judul); else JM.eksporCSV(n, d.kolom, d.baris);
          JM.toast('Unduhan siap.', 'ok');
        } catch (e) { JM.toast(e.message, 'err'); } finally { b.disabled = false; }
      };
    });
    return w;
  };

  /* ----- modal form generik: fields -> simpan ----- */
  JM.formModal = function (o) {
    const api = JM.modal({ title: o.title, size: o.size, body: (o.top || '') + JM.formHtml(o.fields, o.data) + (o.bottom || ''), noFocus: o.noFocus,
      actions: [{ label: 'Batal', cls: 'sec', close: true }, { label: o.simpan || 'Simpan', icon: 'check', autoClose: false, onClick: async function (m) {
        const v = JM.formRead(o.fields, m.body); if (o.extra) Object.assign(v, o.extra(m));
        const r = await o.save(v, m); if (r === false) return false; m.close(); JM.toast(o.ok || 'Data tersimpan.', 'ok');
      } }] });
    JM.formBind(api.body); if (o.pre) o.pre(api.body, api); return api;
  };
  // Pasangan select Desa -> Kelompok yang saling terhubung
  JM.tautDesaKelompok = function (root, kDesa, kKel, getList) {
    const d = JM.$('#f_' + kDesa, root), k = JM.$('#f_' + kKel, root); if (!d || !k || d.tagName !== 'SELECT') return;
    d.onchange = function () { const cur = k.value; k.innerHTML = '<option value="">Pilih…</option>' + getList(d.value).map(function (x) { return '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); };
  };

  /* ----- daftar CRUD generik (kurikulum, wilayah, jenjang, infaq) ----- */
  JM.crudList = function (root, o) {
    const refs = function () { if (JM.refreshRefs && ['wilayah', 'jenjang', 'kurikulum'].indexOf(o.tabel) > -1) JM.refreshRefs(); };
    let all = [], q = '', page = 1; const size = o.size || 25, alive = o.alive || function () { return true; };
    root.innerHTML = '<div class="card"><div class="toolbar"><div class="search">' + JM.ic('search') + '<input class="inp" type="search" placeholder="Cari…" data-q></div>' + (o.toolbar || '') + '<span style="flex:1"></span>' +
      (o.canC ? '<button class="btn" data-add>' + JM.ic('add') + esc(o.addLabel || 'Tambah') + '</button>' : '') + '</div><div data-body>' + JM.skel(5) + '</div></div>';
    const body = JM.$('[data-body]', root);
    const tampil = function () {
      const ql = q.toLowerCase(), rows = all.filter(function (r) { return !ql || JSON.stringify(r).toLowerCase().indexOf(ql) > -1; });
      if (o.onData) o.onData(rows, all);
      if (!rows.length) { body.innerHTML = '<div class="empty">Belum ada data.</div>'; return; }
      const sl = rows.slice((page - 1) * size, page * size);
      body.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + o.cols.map(function (c) { return '<th>' + esc(c.h) + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
        sl.map(function (r, i) { return '<tr>' + o.cols.map(function (c) { return '<td>' + c.f(r) + '</td>'; }).join('') + '<td><div class="row-act">' + (o.canU ? '<button class="icon-btn" data-e="' + i + '" aria-label="Ubah">' + JM.ic('edit') + '</button>' : '') + (o.canD ? '<button class="icon-btn" data-d="' + i + '" aria-label="Hapus">' + JM.ic('delete') + '</button>' : '') + '</div></td></tr>'; }).join('') + '</tbody></table></div>';
      body.appendChild(JM.pager(rows.length, page, size, function (p) { page = p; tampil(); }, o.noun || 'data'));
      JM.$$('[data-e]', body).forEach(function (b) { b.onclick = function () { form(sl[+b.dataset.e]); }; });
      JM.$$('[data-d]', body).forEach(function (b) { b.onclick = async function () { const r = sl[+b.dataset.d]; if (await JM.confirm('Hapus data ini?', 'Hapus', true)) { try { await JMAPI.write('hapus', { tabel: o.tabel, id: r[o.pk] }); JM.toast('Data dihapus.', 'ok'); refs(); muat(); } catch (e) { JM.toast(e.message, 'err'); } } }; });
    };
    const form = function (d) {
      JM.formModal({ title: (d ? 'Ubah ' : 'Tambah ') + (o.noun || 'data'), fields: o.fields(d), data: d, pre: o.pre,
        save: async function (v) { if (d) v[o.pk] = d[o.pk]; if (o.prep) o.prep(v); await JMAPI.write('simpan', { tabel: o.tabel, data: v }); refs(); muat(); } });
    };
    const muat = function () {
      return JMAPI.swr('list', Object.assign({ tabel: o.tabel, all: true }, o.args || {}), function (r) { if (alive()) { all = r.rows; tampil(); } }, { ttl: 20000 })
        .then(function (r) { if (alive() && !all.length) { all = r.rows; tampil(); } }).catch(function (e) { if (alive()) body.innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
    };
    JM.$('[data-q]', root).oninput = JM.debounce(function (e) { q = e.target.value; page = 1; tampil(); }, 200);
    const a = JM.$('[data-add]', root); if (a) a.onclick = function () { form(null); };
    muat(); return { reload: muat, form: form };
  };
})();
