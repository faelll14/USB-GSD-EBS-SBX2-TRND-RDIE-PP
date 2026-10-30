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
    c.innerHTML = '<button type="button" class="exam-credit-btn" id="btnDevCredit">' + ic("code") + "<span>Dikembangkan oleh <b>Raffael</b></span></button>";
    document.body.appendChild(c);
    c.querySelector("button").addEventListener("click", () => {
      if (typeof SiteFooter !== "undefined" && SiteFooter.openPortfolio) SiteFooter.openPortfolio();
    });
  }
})();
