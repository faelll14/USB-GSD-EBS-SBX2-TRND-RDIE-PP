// Tab Rekap Nilai (guru): nilai per jadwal, termasuk siswa yang belum mengikuti, dan ekspor CSV.
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (v) => (Math.round((Number(v) || 0) * 10) / 10).toString().replace(".", ",");
  const dur = (ms) => { if (!ms || ms <= 0) return "-"; const t = Math.round(ms / 1000); const m = Math.floor(t / 60); return (m ? m + " mnt " : "") + (t % 60) + " dtk"; };
  const clock = (t) => (t ? new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-");
  const KIND = { ulangan: "Ulangan", quiz: "Quiz", ujian: "Ujian" };
  let current = null;
  let loaded = false;

  // Nilai jadwal yang sudah selesai disimpan otomatis begitu halaman guru dibuka.
  window.__onDailyExamsLoaded = (items) => {
    const cand = (items || []).map((x) => ({ id: x.id, end: (x.startTimestamp || 0) + (x.durationMinutes || 0) * 60000 })).filter((x) => x.id && x.end > 0).sort((a, b) => b.end - a.end).slice(0, 12);
    if (cand.length && typeof GuruBridge.syncRecentRekap === "function") GuruBridge.syncRecentRekap(cand).catch(() => {});
  };

  function setTab(t) {
    $("tabPanel").style.display = t === "panel" ? "" : "none";
    $("tabRekap").style.display = t === "rekap" ? "" : "none";
    document.querySelectorAll("#guruTabs .gtab").forEach((b) => {
      const on = b.dataset.t === t;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (t === "rekap" && !loaded) loadList();
  }
  document.querySelectorAll("#guruTabs .gtab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.t)));

  async function loadList() {
    const sel = $("rekapSelect");
    try {
      const r = await GuruBridge.listRekap();
      loaded = true;
      const items = (r && r.items) || [];
      sel.innerHTML = '<option value="">Pilih jadwal...</option>' + items.map((x) =>
        '<option value="' + esc(x.examId) + '">' + esc(x.subject || "Tanpa nama") + " (" + (KIND[x.kind] || "Ulangan") + ") - " + esc(x.date || "") + " " + esc(x.startLabel || "") + (x.archived ? " - arsip" : "") + "</option>").join("");
      sel.dispatchEvent(new Event("patsec-refresh-options"));
      if (!items.length) $("rekapBody").innerHTML = '<div class="empty-state">Belum ada jadwal buatan Anda.</div>';
    } catch (e) {
      $("rekapBody").innerHTML = '<div class="empty-state">Gagal memuat daftar jadwal. Periksa koneksi internet.</div>';
    }
  }

  $("rekapSelect").addEventListener("change", (e) => { if (e.target.value) open(e.target.value, false); else $("rekapBody").innerHTML = ""; });

  async function open(id, force) {
    const body = $("rekapBody");
    body.innerHTML = '<div class="skeleton"></div>';
    try {
      const r = await GuruBridge.getRekap(id, !!force);
      current = r;
      render(r);
    } catch (e) {
      body.innerHTML = '<div class="empty-state">' + (e === "NO_ANSWER_KEY" ? "Kunci jawaban belum ada, nilai belum bisa dihitung." : "Gagal menghitung rekap. Periksa koneksi internet.") + "</div>";
    }
  }

  function render(r) {
    const rows = Object.keys(r.rows || {}).map((u) => Object.assign({ uid: u }, r.rows[u]));
    rows.sort((a, b) => (b.s - a.s) || ((a.d > 0 ? a.d : 1e15) - (b.d > 0 ? b.d : 1e15)) || (a.ct - b.ct));
    const absent = (r.absent || []).slice().sort((a, b) => String(a.k).localeCompare(String(b.k)) || String(a.n).localeCompare(String(b.n)));
    const scores = rows.map((x) => x.s);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const hi = scores.length ? Math.max.apply(null, scores) : 0;
    const lo = scores.length ? Math.min.apply(null, scores) : 0;
    const body = $("rekapBody");
    body.innerHTML =
      '<div class="rk-chips">' +
      '<div class="rk-chip"><b>' + rows.length + "</b><span>Sudah mengerjakan</span></div>" +
      '<div class="rk-chip"><b>' + absent.length + "</b><span>Belum mengikuti</span></div>" +
      '<div class="rk-chip"><b>' + num(avg) + "</b><span>Rata-rata</span></div>" +
      '<div class="rk-chip"><b>' + num(hi) + "</b><span>Tertinggi</span></div>" +
      '<div class="rk-chip"><b>' + num(lo) + "</b><span>Terendah</span></div></div>" +
      '<div class="rk-bar">' +
      '<button class="btn btn-ghost" id="rkExport" type="button">' + Scoreboard.icon("download") + "Ekspor CSV</button>" +
      (r.archived ? "" : '<button class="btn btn-ghost" id="rkRefresh" type="button">' + Scoreboard.icon("refresh") + "Hitung ulang</button>") +
      '<span class="rk-note">' + (r.archived ? "Jadwal sudah dihapus. Ini arsip nilai yang tersimpan." : "Disimpan otomatis, diperbarui " + clock(r.computedAt) + ".") + " " + (r.total || 0) + " soal.</span></div>" +
      (rows.length
        ? '<div class="rk-wrap"><table class="rk-table"><thead><tr><th>#</th><th>Nama</th><th>Kelas</th><th class="num">Benar</th><th class="num">Salah</th><th class="num">Nilai</th><th class="num">Durasi</th></tr></thead><tbody>' +
          rows.map((x, i) => "<tr><td>" + (i + 1) + '</td><td class="n">' + esc(x.n || "-") + "</td><td>" + esc(x.k || "-") + '</td><td class="num rk-ok">' + x.c + '</td><td class="num rk-no">' + (x.w != null ? x.w : (x.t - x.c)) + '</td><td class="num rk-score">' + num(x.s) + '</td><td class="num">' + dur(x.d) + "</td></tr>").join("") +
          "</tbody></table></div>"
        : '<div class="empty-state">Belum ada siswa yang mengumpulkan jawaban.</div>') +
      '<div class="rk-sub">Belum mengikuti (' + absent.length + ")</div>" +
      (absent.length ? '<div class="rk-absent">' + absent.map((a) => '<span class="rk-pill">' + esc(a.n || "-") + "<small>" + esc(a.k || "") + "</small></span>").join("") + "</div>" : '<div class="login-subtitle">Semua siswa target sudah mengikuti.</div>');
    $("rkExport").addEventListener("click", exportCsv);
    const rf = $("rkRefresh");
    if (rf) rf.addEventListener("click", async () => { rf.disabled = true; await open(r.examId, true); });
  }

  async function exportCsv() {
    const r = current;
    if (!r) return;
    const safe = (v) => { const s = String(v == null ? "" : v); return /^[=+\-@]/.test(s) ? "'" + s : s; };
    const q = (v) => '"' + safe(v).replace(/"/g, '""') + '"';
    const fmt = (t) => (t ? new Date(t).toLocaleString("id-ID") : "");
    const rows = Object.keys(r.rows || {}).map((u) => r.rows[u]).sort((a, b) => (b.s - a.s) || ((a.d > 0 ? a.d : 1e15) - (b.d > 0 ? b.d : 1e15)));
    let csv = "Peringkat,Nama,Kelas,Status,Benar,Salah,Nilai,Durasi (detik),Mulai,Selesai\n";
    rows.forEach((x, i) => { csv += [i + 1, x.n, x.k, "Mengerjakan", x.c, x.w != null ? x.w : x.t - x.c, Math.round(x.s * 10) / 10, x.d > 0 ? Math.round(x.d / 1000) : "", fmt(x.st), fmt(x.ct)].map(q).join(",") + "\n"; });
    (r.absent || []).forEach((a) => { csv += ["", a.n, a.k, "Belum mengikuti", "", "", "", "", "", ""].map(q).join(",") + "\n"; });
    try { await GuruBridge.exportCsv("rekap_" + String(r.subject || r.examId).replace(/[^A-Za-z0-9]+/g, "_") + ".csv", csv); } catch (e) {}
  }
})();
