(() => {
  if (typeof ExamBridge === "undefined" || typeof Scoreboard === "undefined") return;
  const ic = (n) => Scoreboard.icon(n);

  // tombol scoreboard di bilah atas ujian
  const topRight = document.querySelector(".exam-topbar > div");
  if (topRight && !document.getElementById("btnScoreboard")) {
    const b = document.createElement("button");
    b.className = "icon-btn";
    b.id = "btnScoreboard";
    b.type = "button";
    b.setAttribute("aria-label", "Scoreboard");
    b.style.cssText = "width:32px;height:32px;";
    b.innerHTML = ic("trophy");
    b.querySelector("svg").style.cssText = "width:16px;height:16px;";
    topRight.insertBefore(b, document.getElementById("btnTheme") || topRight.firstChild);
    b.addEventListener("click", () => open());
  }

  // tombol segarkan pengaturan: kalkulator dan stabilo bisa diaktifkan atau dinonaktifkan guru kapan saja
  function cfgToast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 110px);transform:translateX(-50%);z-index:300;background:var(--surface-solid);color:var(--text-primary);border:1px solid var(--surface-border);padding:10px 16px;border-radius:99px;font-size:13px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.3);max-width:90%;text-align:center";
    document.body.appendChild(t);
    t.animate([{ opacity: 0, transform: "translate(-50%,10px)" }, { opacity: 1, transform: "translate(-50%,0)" }], { duration: 240, easing: "cubic-bezier(.22,1,.36,1)" });
    setTimeout(() => { t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220 }).onfinish = () => t.remove(); }, 2600);
  }
  if (topRight && !document.getElementById("btnRefreshConfig") && typeof ExamBridge.refreshConfig === "function") {
    const rf = document.createElement("button");
    rf.className = "icon-btn";
    rf.id = "btnRefreshConfig";
    rf.type = "button";
    rf.setAttribute("aria-label", "Segarkan pengaturan ujian");
    rf.style.cssText = "width:32px;height:32px;";
    rf.innerHTML = ic("refresh");
    rf.querySelector("svg").style.cssText = "width:16px;height:16px;";
    topRight.insertBefore(rf, document.getElementById("btnScoreboard") || topRight.firstChild);
    rf.addEventListener("click", async () => {
      if (rf.disabled) return;
      rf.disabled = true;
      rf.classList.add("spin");
      try {
        const r = await ExamBridge.refreshConfig();
        const changed = typeof ExamTools !== "undefined" && ExamTools.update ? ExamTools.update(r) : false;
        cfgToast(changed ? "Alat bantu diperbarui oleh guru." : "Tidak ada perubahan dari guru.");
      } catch (_) {
        cfgToast("Gagal memeriksa. Periksa koneksi internet.");
      }
      rf.classList.remove("spin");
      setTimeout(() => { rf.disabled = false; }, 15000);
    });
  }

  // panel scoreboard: di dalam halaman yang sama, jadi tidak dihitung pelanggaran
  const sheet = document.createElement("div");
  sheet.className = "sb-sheet";
  sheet.id = "sbSheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-label", "Scoreboard");
  sheet.innerHTML = `
    <div class="sb-sheet-top">
      <h2>${ic("trophy")}Scoreboard</h2>
      <span class="sb-sheet-timer">${ic("timer")}<span id="sbSheetTimer">--:--</span></span>
      <button class="icon-btn" id="sbSheetRefresh" type="button" aria-label="Segarkan" style="width:34px;height:34px;">${ic("refresh")}</button>
      <button class="icon-btn" id="sbSheetClose" type="button" aria-label="Tutup" style="width:34px;height:34px;">${ic("close")}</button>
    </div>
    <div class="sb-sheet-body"><div id="sbSheetBody"></div></div>`;
  document.body.appendChild(sheet);
  sheet.querySelector("svg.sb-ic").style.cssText = "";
  sheet.querySelector("#sbSheetClose svg").style.cssText = "width:18px;height:18px;";
  sheet.querySelector("#sbSheetRefresh svg").style.cssText = "width:18px;height:18px;";

  let poll = null, clockT = null, ui = null, unavailable = false, myUid = "";
  try { const s = window.SessionGuard && SessionGuard.getStoredSession && SessionGuard.getStoredSession(); myUid = (s && s.uid) || ""; } catch (_) {}

  async function tick(force) {
    if (!sheet.classList.contains("open") || document.hidden) return;
    try {
      const r = await ExamBridge.getScoreboard(!!force);
      if (!r || r.ready === false) return;
      const body = document.getElementById("sbSheetBody");
      if (!r.available) {
        if (!unavailable) {
          unavailable = true; ui = null;
          body.innerHTML = '<div class="sb-empty">' + Scoreboard.icon("lock", "sb-empty-ic") + "<div>Scoreboard belum dibuka oleh guru.</div></div>";
        }
        return;
      }
      if (unavailable || !ui) { unavailable = false; body.innerHTML = ""; ui = Scoreboard.mount(body, { myUid }); }
      ui.update(r.entries || []);
    } catch (_) {}
  }

  function mirrorTimer() {
    const src = document.getElementById("examTimer");
    const dst = document.getElementById("sbSheetTimer");
    if (src && dst) dst.textContent = src.textContent;
  }

  function open() {
    sheet.classList.add("open");
    ui = null; unavailable = false;
    document.getElementById("sbSheetBody").innerHTML = "";
    mirrorTimer();
    clockT = setInterval(mirrorTimer, 1000);
    tick();
    poll = setInterval(() => tick(), 20000);
  }

  function close() {
    sheet.classList.remove("open");
    if (poll) clearInterval(poll);
    if (clockT) clearInterval(clockT);
    poll = clockT = null;
  }

  sheet.querySelector("#sbSheetClose").addEventListener("click", close);
  const rbtn = sheet.querySelector("#sbSheetRefresh");
  rbtn.addEventListener("click", async () => {
    if (rbtn.disabled) return;
    rbtn.disabled = true;
    rbtn.classList.add("spin");
    await tick(true);
    rbtn.classList.remove("spin");
    setTimeout(() => { rbtn.disabled = false; }, 15000);
  });
  window.ExamScoreboard = { open, close };

  // nama pengembang tetap tampil di paling bawah selama ujian
  if (!document.getElementById("examCredit")) {
    const c = document.createElement("div");
    c.id = "examCredit";
    c.className = "exam-credit";
    c.innerHTML = '<button type="button" class="exam-credit-btn" id="btnDevCredit">' + ic("code") + "<span>Dikembangkan oleh <b>Raffael</b></span>" + ic("chevron").replace('class="sb-ic"', 'class="sb-ic sb-chev"') + "</button>";
    document.body.appendChild(c);
    c.querySelector("button").addEventListener("click", () => {
      if (typeof SiteFooter !== "undefined" && SiteFooter.openPortfolio) SiteFooter.openPortfolio();
    });
  }
})();
