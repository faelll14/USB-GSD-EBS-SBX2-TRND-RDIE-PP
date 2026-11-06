(() => {
  const sel = document.getElementById("guruDutyExamSelect");
  const area = document.getElementById("guruControlArea");
  if (!sel || !area || typeof GuruBridge === "undefined" || typeof Scoreboard === "undefined") return;

  let timer = null, ui = null, shownFor = "";

  function toast(msg, ic) {
    const t = document.createElement("div");
    if (ic) t.innerHTML = Scoreboard.icon(ic);
    t.appendChild(document.createTextNode(msg));
    t.style.cssText = "position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 90px);transform:translateX(-50%);z-index:99998;display:flex;align-items:center;gap:8px;background:var(--surface-solid);color:var(--text-primary);border:1px solid var(--surface-border);padding:10px 16px;border-radius:99px;font-size:13px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.3);max-width:90%;text-align:center";
    document.body.appendChild(t);
    t.animate([{ opacity: 0, transform: "translate(-50%,10px)" }, { opacity: 1, transform: "translate(-50%,0)" }], { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" });
    setTimeout(() => t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250 }).onfinish = () => t.remove(), 3200);
  }

  // Penilaian otomatis: hanya satu guru yang menjadi penilai per ujian. Dicoba ulang tiap 60 detik
  // (memperbarui sewa penilai, atau mengambil alih bila penilai sebelumnya berhenti).
  let autoFor = "";
  async function autoGrade() {
    const id = sel.value;
    if (!id) return;
    try {
      const r = await GuruBridge.startLiveGrading(id);
      const leader = !r || r.leader !== false;
      if (leader && autoFor !== id) { autoFor = id; toast("Penilaian otomatis aktif", "check"); }
      if (!leader) autoFor = "";
    } catch (e) {
      if (e === "NO_ANSWER_KEY" && autoFor !== "x" + id) { autoFor = "x" + id; toast("Kunci jawaban belum ada, nilai belum bisa dihitung", "info"); }
    }
  }
  setInterval(() => { if (!document.hidden) autoGrade(); }, 60000);

  function stopPoll() { if (timer) clearInterval(timer); timer = null; }

  async function startGrading(id, msgEl) {
    try {
      const r = await GuruBridge.startLiveGrading(id);
      if (msgEl) msgEl.textContent = r && r.leader === false
        ? "Guru lain sedang menjadi penilai ujian ini. Nilai tetap tercatat otomatis."
        : "Penilaian otomatis aktif: nilai tercatat begitu siswa mengirim jawaban.";
    } catch (e) {
      if (msgEl) msgEl.textContent = e === "NO_ANSWER_KEY" ? "Kunci jawaban belum ada, nilai belum bisa dihitung otomatis." : "Penilaian otomatis belum aktif (koneksi). Buka ulang jadwal ini.";
    }
  }

  function open(panel) {
    const id = sel.value;
    if (!id) return;
    shownFor = id;
    panel.innerHTML = `
      <div class="sb-tools">
        <div><b>Tampilkan ke siswa</b><span id="guruSbState">Scoreboard disembunyikan dari siswa</span></div>
        <label class="switch"><input type="checkbox" id="guruSbToggle" /><span class="switch-track"><span class="switch-thumb"></span></span></label>
      </div>
      <div class="login-subtitle" id="guruSbMsg" style="margin-bottom:10px;font-size:12px;"></div>
      <div class="sb-export"><button class="btn btn-ghost" id="guruSbExport" type="button">${Scoreboard.icon("download")}Ekspor nilai (CSV)</button></div>
      <div id="guruSbBody"></div>`;
    const toggle = panel.querySelector("#guruSbToggle");
    const state = panel.querySelector("#guruSbState");
    const msg = panel.querySelector("#guruSbMsg");
    ui = Scoreboard.mount(panel.querySelector("#guruSbBody"), { live: true, onNew: (e) => toast((e.n || "Siswa") + " selesai, nilai " + (Math.round(e.s * 10) / 10), "check") });
    let busy = false;
    const paint = (on) => { state.textContent = on ? "Siswa bisa melihat peringkat sekarang" : "Scoreboard disembunyikan dari siswa"; };
    toggle.addEventListener("change", async () => {
      busy = true;
      const want = toggle.checked;
      try { await GuruBridge.setScoreboardVisible(id, want); paint(want); toast(want ? "Scoreboard dibuka untuk siswa" : "Scoreboard disembunyikan", want ? "eye" : "eyeoff"); }
      catch (e) { toggle.checked = !want; toast("Gagal mengubah, coba lagi."); }
      busy = false;
    });
    let lastEntries = [];
    panel.querySelector("#guruSbExport").addEventListener("click", async () => {
      const rows = Scoreboard.ranked(lastEntries.slice());
      if (!rows.length) { toast("Belum ada nilai untuk diekspor.", "info"); return; }
      const fmt = (t) => (t ? new Date(t).toLocaleString("id-ID") : "");
      const safe = (v) => { const s = String(v == null ? "" : v); return /^[=+\-@]/.test(s) ? "'" + s : s; };
      const q = (v) => '"' + safe(v).replace(/"/g, '""') + '"';
      let csv = "Peringkat,Nama,Kelas,Nilai,Benar,Total,Durasi (detik),Mulai,Selesai\n";
      rows.forEach((e) => {
        csv += [e.rank, e.n, e.k, Math.round(e.s * 10) / 10, e.c, e.t, e.d > 0 ? Math.round(e.d / 1000) : "", fmt(e.st), fmt(e.ct)].map(q).join(",") + "\n";
      });
      try {
        await GuruBridge.exportCsv("nilai_" + id + "_" + Date.now() + ".csv", csv);
        toast("Nilai diekspor", "check");
      } catch (e) {
        toast("Gagal mengekspor nilai.", "info");
      }
    });
    startGrading(id, msg);
    async function tick() {
      if (!document.body.contains(panel) || sel.value !== id) { stopPoll(); return; }
      if (document.hidden) return;
      try {
        const r = await GuruBridge.getScoreboard(id);
        if (!r || r.ready === false) return;
        lastEntries = r.entries || [];
        ui.update(lastEntries);
        if (!busy) { toggle.checked = !!r.enabled; paint(!!r.enabled); }
      } catch (e) {}
    }
    stopPoll();
    tick();
    timer = setInterval(tick, 3000);
  }

  function inject() {
    autoGrade();
    if (!sel.value || document.getElementById("guruSbPanel")) return;
    const panel = document.createElement("div");
    panel.id = "guruSbPanel";
    const tabs = document.getElementById("guruStatusTabs");
    const list = document.getElementById("guruParticipantList");
    if (tabs && list) {
      const b = document.createElement("button");
      b.className = "status-tab";
      b.id = "guruSbTab";
      b.dataset.status = "scoreboard";
      b.innerHTML = '<span class="sb-tab-ic">' + Scoreboard.icon("trophy") + "Scoreboard</span>";
      tabs.appendChild(b);
      panel.style.display = "none";
      list.parentNode.appendChild(panel);
      tabs.addEventListener("click", (e) => {
        const t = e.target.closest(".status-tab");
        if (!t) return;
        const on = t.id === "guruSbTab";
        if (on) {
          tabs.querySelectorAll(".status-tab").forEach((x) => x.classList.remove("active"));
          t.classList.add("active");
        }
        list.style.display = on ? "none" : "";
        panel.style.display = on ? "" : "none";
        if (on) open(panel); else stopPoll();
      });
    } else {
      // di luar jendela kontrol: scoreboard tetap bisa dibuka
      area.appendChild(panel);
      open(panel);
    }
  }

  new MutationObserver(() => inject()).observe(area, { childList: true });
  sel.addEventListener("change", () => { stopPoll(); ui = null; autoGrade(); });
})();
