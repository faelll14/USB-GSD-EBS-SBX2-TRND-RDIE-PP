(() => {
  const sec = document.getElementById("section-nilai");
  if (!sec || typeof DashBridge === "undefined" || typeof Scoreboard === "undefined") return;

  let built = false, timer = null, ui = null, myUid = "", curId = "", unavailable = false;
  let selEl, bodyEl;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function build() {
    built = true;
    try { const s = await DashBridge.getSession(); myUid = (s && s.uid) || ""; } catch (e) {}
    const card = document.createElement("div");
    card.className = "card";
    card.style.marginTop = "var(--space-4)";
    card.innerHTML = `<div class="sb-titlebar"><h2 class="section-title sb-title">${Scoreboard.icon("trophy")}Scoreboard</h2><button class="icon-btn sb-refresh" id="sbRefresh" type="button" aria-label="Segarkan scoreboard">${Scoreboard.icon("refresh")}</button></div>
      <div class="sb-pick" id="sbPick" style="display:none"><div class="sb-pick-label">Jadwal</div><select class="select-native" id="sbExamSelect"></select></div>
      <div id="sbStudentBody" style="margin-top:12px"></div>`;
    sec.appendChild(card);
    const rb = card.querySelector("#sbRefresh");
    rb.addEventListener("click", async () => {
      if (rb.disabled) return;
      rb.disabled = true;
      rb.classList.add("spin");
      await tick(true);
      rb.classList.remove("spin");
      setTimeout(() => { rb.disabled = false; }, 15000);
    });
    selEl = card.querySelector("#sbExamSelect");
    bodyEl = card.querySelector("#sbStudentBody");
    try {
      const r = await DashBridge.getExamSchedule();
      const now = Date.now();
      const items = ((r && r.items) || []).filter((x) => x.startTimestamp && x.startTimestamp <= now).sort((a, b) => b.startTimestamp - a.startTimestamp);
      selEl.innerHTML = items.map((x, i) => `<option value="${esc(x.id)}">${esc(x.subject)} - ${esc(x.date || "")} ${esc(x.startLabel || "")}${i === 0 ? " (terbaru)" : ""}</option>`).join("");
      if (!items.length) bodyEl.innerHTML = '<div class="empty-state">Belum ada ujian yang sudah dimulai.</div>';
      else {
        selEl.value = items[0].id;
        curId = items[0].id;
        if (items.length > 1) {
          card.querySelector("#sbPick").style.display = "";
          if (window.CustomSelect) CustomSelect.enhance(selEl);
        }
        start();
      }
    } catch (e) {}
    selEl.addEventListener("change", () => { curId = selEl.value; ui = null; unavailable = false; bodyEl.innerHTML = ""; stop(); if (curId) start(); });
  }

  function stop() { if (timer) clearInterval(timer); timer = null; }

  async function tick(force) {
    if (document.hidden || !curId || !sec.classList.contains("active")) return;
    try {
      const r = await DashBridge.getScoreboard(curId, !!force);
      if (!r || r.ready === false) return;
      if (!r.available) {
        if (!unavailable) {
          unavailable = true; ui = null;
          bodyEl.innerHTML = '<div class="sb-empty">' + Scoreboard.icon("lock", "sb-empty-ic") + '<div>Scoreboard belum dibuka oleh guru.</div></div>';
        }
        return;
      }
      if (unavailable || !ui) { unavailable = false; bodyEl.innerHTML = ""; ui = Scoreboard.mount(bodyEl, { myUid }); }
      ui.update(r.entries || []);
    } catch (e) {}
  }

  function start() { stop(); tick(); timer = setInterval(() => tick(), 20000); }

  function onSection() {
    if (sec.classList.contains("active")) {
      if (!built) build(); else if (curId && !timer) start();
    } else {
      stop();
    }
  }
  new MutationObserver(onSection).observe(sec, { attributes: true, attributeFilter: ["class"] });
  onSection();
})();
