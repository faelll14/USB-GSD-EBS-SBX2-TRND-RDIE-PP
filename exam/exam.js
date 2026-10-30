(async function () {
  await ThemeController.init();
  ThemeController.bindSheet("btnTheme", "themeScrim", "themeCloseX", "themeCloseBottom", "themeGrid");

  document.getElementById("btnRefreshExam").addEventListener("click", () => {
    const el = document.getElementById("examTimer");
    el.style.opacity = "0.4";
    setTimeout(() => { el.style.opacity = "1"; }, 300);
  });

  let examData = null;
  let questions = [];
  let currentIndex = 0;
  const answers = {};
  let endTimestamp = 0;
  let timerInterval = null;
  let submitted = false;

  document.getElementById("btnCloseStartMessage").addEventListener("click", () => {
    document.getElementById("startMessageScrim").classList.remove("open");
  });

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  try {
    examData = await ExamBridge.getExamData();
  } catch (e) {
    document.getElementById("examBody").innerHTML = '<div class="empty-state">' + ModeLabels.t("Gagal memuat data ujian.", "Gagal memuat data ulangan.") + ' Periksa koneksi internet.</div>';
    return;
  }

  questions = examData.questions || [];
  endTimestamp = examData.startTimestamp + examData.durationMinutes * 60000;
  document.getElementById("examSubjectLabel").textContent = examData.subject || ModeLabels.t("Ujian", "Ulangan");

  if (examData.startMessage) {
    document.getElementById("startMessageText").textContent = examData.startMessage;
    document.getElementById("startMessageScrim").classList.add("open");
  }

  ExamTools.init(examData);

  let alreadyDone = false;
  try {
    const stored = SessionGuard.getStoredSession();
    await ExamBridge.markStarted(stored ? stored.fullName : "");
  } catch (e) { if (e === "ALREADY_COMPLETED") alreadyDone = true; }
  if (alreadyDone) {
    document.getElementById("startMessageScrim").classList.remove("open");
    try { ExamTools.disable(); } catch (_) {}
    const bar = document.querySelector(".exam-bottombar");
    if (bar) bar.style.display = "none";
    document.getElementById("examNavStrip").style.display = "none";
    document.getElementById("examBody").innerHTML =
      '<div class="finish-card"><h2 class="finish-title">' +
      ModeLabels.t("Ujian Sudah Dikerjakan", "Ulangan Sudah Dikerjakan") +
      '</h2><p class="finish-sub">Jawaban kamu sudah tersimpan dan tidak bisa dikerjakan ulang.</p>' +
      '<button class="btn btn-primary finish-btn" id="btnBackHome" type="button">Kembali ke Beranda</button></div>';
    document.getElementById("btnBackHome").addEventListener("click", () => { ExamBridge.finishExam().catch(() => {}); });
    return;
  }

  function renderNavStrip() {
    const el = document.getElementById("examNavStrip");
    el.innerHTML = questions.map((q, i) => `
      <div class="exam-nav-dot ${answers[q.id] ? "answered" : ""} ${i === currentIndex ? "current" : ""}" data-index="${i}">${i + 1}</div>
    `).join("");
    el.querySelectorAll("[data-index]").forEach((dot) => {
      dot.addEventListener("click", () => {
        currentIndex = parseInt(dot.dataset.index, 10);
        renderQuestion();
      });
    });
  }

  function renderQuestion() {
    const q = questions[currentIndex];
    const el = document.getElementById("examBody");
    if (!q) {
      el.innerHTML = '<div class="empty-state">Tidak ada soal.</div>';
      return;
    }
    const optionKeys = Object.keys(q.options).sort();
    el.innerHTML = `
      <div class="exam-question-text" id="questionTextArea">${PatMath.html(q.text)}</div>
      ${q.imageUrl ? `<img src="${escapeHtml(q.imageUrl)}" style="max-width:100%;border-radius:var(--radius-md);margin-bottom:var(--space-4);" />` : ""}
      <div id="optionsArea">
        ${optionKeys.map((k) => `
          <div class="exam-option ${answers[q.id] === k ? "selected" : ""}" data-key="${k}">
            <div class="exam-option-letter">${k.toUpperCase()}</div>
            <div class="exam-option-text">${PatMath.html(q.options[k])}</div>
          </div>
        `).join("")}
      </div>
    `;

    el.querySelectorAll("[data-key]").forEach((row) => {
      row.addEventListener("click", () => {
        answers[q.id] = row.dataset.key;
        renderQuestion();
        renderNavStrip();
      });
    });

    document.getElementById("btnPrevQuestion").disabled = currentIndex === 0;
    document.getElementById("btnNextQuestion").textContent = currentIndex === questions.length - 1 ? "Selesai" : "Selanjutnya";

    ExamTools.onRender(q.id);
  }

  document.getElementById("btnPrevQuestion").addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderQuestion();
      renderNavStrip();
    }
  });

  document.getElementById("btnNextQuestion").addEventListener("click", () => {
    if (currentIndex < questions.length - 1) {
      currentIndex++;
      renderQuestion();
      renderNavStrip();
    } else {
      openSubmitConfirm();
    }
  });

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  function tick() {
    const remaining = endTimestamp - Date.now();
    const timerEl = document.getElementById("examTimer");
    timerEl.textContent = formatTime(remaining);
    timerEl.classList.toggle("low", remaining < 5 * 60 * 1000);
    if (remaining <= 0) {
      clearInterval(timerInterval);
      autoSubmit();
    }
  }

  function startTimer() {
    tick();
    timerInterval = setInterval(tick, 1000);
  }

  function openSubmitConfirm() {
    const answeredCount = Object.keys(answers).length;
    document.getElementById("submitAnsweredCount").textContent = answeredCount;
    document.getElementById("submitTotalCount").textContent = questions.length;
    document.getElementById("submitScrim").classList.add("open");
  }

  document.getElementById("btnCancelSubmit").addEventListener("click", () => {
    document.getElementById("submitScrim").classList.remove("open");
  });

  document.getElementById("btnConfirmSubmit").addEventListener("click", () => {
    document.getElementById("submitScrim").classList.remove("open");
    doSubmit();
  });

  let leaving = false;
  function leaveExam() {
    if (leaving) return;
    leaving = true;
    ExamBridge.finishExam().catch(() => { leaving = false; });
  }

  function showFinish() {
    ExamTools.disable();
    clearInterval(timerInterval);
    if (lockPollInterval) { clearInterval(lockPollInterval); lockPollInterval = null; }
    const lo = document.getElementById("lockOverlay");
    if (lo) lo.style.display = "none";
    document.querySelector(".exam-bottombar").style.display = "none";
    document.getElementById("examNavStrip").style.display = "none";
    const msg = (examData.endMessage || "").trim();
    document.getElementById("examBody").innerHTML =
      '<div class="finish-card">' +
      '<div class="finish-icon"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>' +
      '<h2 class="finish-title">' + ModeLabels.t("Ujian Selesai", "Ulangan Selesai") + '</h2>' +
      '<p class="finish-sub">Jawaban kamu sudah tersimpan.</p>' +
      (msg ? '<div class="finish-message"><div class="finish-message-label">Pesan dari guru</div><div class="finish-message-text">' + escapeHtml(msg) + '</div></div>' : "") +
      '<button class="btn btn-ghost finish-btn" id="btnFinishScoreboard" type="button">Lihat Scoreboard</button>' +
      '<button class="btn btn-primary finish-btn" id="btnBackHome" type="button">Kembali ke Beranda</button>' +
      '</div>';
    document.getElementById("btnBackHome").addEventListener("click", leaveExam);
    let finishTimer = null;
    document.getElementById("btnFinishScoreboard").addEventListener("click", () => {
      if (finishTimer) { clearTimeout(finishTimer); finishTimer = null; }
      if (window.ExamScoreboard) window.ExamScoreboard.open();
    });
    if (!msg) finishTimer = setTimeout(leaveExam, 6000);
  }

  async function doSubmit() {
    if (submitted) return;
    submitted = true;
    ExamTools.disable();
    clearInterval(timerInterval);
    document.getElementById("examBody").innerHTML = '<div class="empty-state">Mengirim jawaban...</div>';
    try {
      await ExamBridge.submitExam(answers);
      showFinish();
    } catch (e) {
      document.getElementById("examBody").innerHTML = '<div class="empty-state">Gagal mengirim jawaban. Periksa koneksi internet dan coba lagi.</div>';
      submitted = false;
    }
  }

  function autoSubmit() {
    if (!submitted) doSubmit();
  }

  let examReady = false;
  let lastAnyAt = 0;
  const lastReasonAt = {};
  function reportReason(reason) {
    if (submitted || !examReady) return;
    const now = Date.now();
    if (now - lastAnyAt < 2500 || now - (lastReasonAt[reason] || 0) < 4000) return;
    lastAnyAt = now;
    lastReasonAt[reason] = now;
    ExamBridge.reportViolation(reason).then(checkAndHandleLock).catch(() => {});
  }
  window.__reportViolationReason = reportReason;
  window.__reportAppSwitchViolation = () => reportReason("app_backgrounded");

  // anti salin/tempel dan seleksi teks selama ujian
  ["copy", "cut", "paste", "contextmenu", "dragstart", "selectstart"].forEach((ev) => {
    document.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === "copy" || ev === "cut" || ev === "paste") reportReason("copy_paste");
    }, true);
  });
  document.addEventListener("keydown", (e) => {
    const k = (e.key || "").toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "a", "p", "s", "u"].includes(k)) {
      e.preventDefault();
      if (k === "c" || k === "v" || k === "x") reportReason("copy_paste");
    }
    if (k === "printscreen") { e.preventDefault(); reportReason("screenshot"); }
  }, true);

  // penutup layar bila layar terbagi / jendela mengambang (dari native)
  window.__setBlocked = (on, msg) => {
    let el = document.getElementById("blockOverlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "blockOverlay";
      el.className = "exam-block-overlay";
      el.innerHTML = '<div class="lock-icon"><span class="lock-pulse"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M12 4v16M3 12h9"/></svg></div><p id="blockMsg"></p>';
      document.body.appendChild(el);
    }
    el.querySelector("#blockMsg").textContent = msg || "";
    el.classList.toggle("on", !!on);
  };
  document.addEventListener("visibilitychange", () => { if (document.hidden) reportReason("app_backgrounded"); });
  window.addEventListener("blur", () => {
    const a = document.activeElement;
    if ((a && a.id === "portfolioFrame") || (typeof SiteFooter !== "undefined" && SiteFooter.isOpen && SiteFooter.isOpen())) return;
    reportReason("focus_lost");
  });

  // jaga layar tetap menyala selama ujian (Screen Wake Lock API)
  let wakeSentinel = null;
  async function keepAwake() {
    try {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible" || wakeSentinel) return;
      wakeSentinel = await navigator.wakeLock.request("screen");
      wakeSentinel.addEventListener("release", () => { wakeSentinel = null; });
    } catch (e) { wakeSentinel = null; }
  }
  keepAwake();
  setInterval(keepAwake, 10000);
  document.addEventListener("visibilitychange", keepAwake);
  ["touchstart", "click", "keydown"].forEach((ev) => document.addEventListener(ev, keepAwake, { passive: true }));

  let lockPollInterval = null;

  function checkAndHandleLock(result) {
    if (result && result.locked) {
      showLockOverlay(result);
    }
  }

  function renderLockInfo(info) {
    document.getElementById("lockReasonText").textContent = (info && info.lockReason) ||
      ModeLabels.t("Hubungi guru penjaga ruang untuk membuka kembali.", "Hubungi guru pembuat ulangan untuk membuka kembali.");
    const c = document.getElementById("lockCount");
    c.textContent = info && info.violationCount ? "Pelanggaran tercatat: " + info.violationCount : "";
  }

  function showLockOverlay(info) {
    ExamTools.disable();
    const overlay = document.getElementById("lockOverlay");
    const wasHidden = overlay.style.display !== "flex";
    overlay.style.display = "flex";
    clearInterval(timerInterval);
    if (info || wasHidden) renderLockInfo(info);
    startLockPolling();
  }

  window.__showLockOverlay = () => showLockOverlay(null);

  // true bila kunci sudah dibuka
  function handleLockStatus(status) {
    if (!status || status.pending) return false;
    if (!status.locked) {
      clearInterval(lockPollInterval);
      lockPollInterval = null;
      document.getElementById("lockOverlay").style.display = "none";
      ExamTools.enable();
      startTimer();
      return true;
    }
    renderLockInfo(status);
    return false;
  }

  // membaca cache listener di native/bridge: aman dipanggil sering, tanpa reads
  function startLockPolling() {
    if (lockPollInterval) return;
    lockPollInterval = setInterval(async () => {
      try { handleLockStatus(await ExamBridge.checkLockStatus()); } catch (e) {}
    }, 4000);
  }

  document.getElementById("btnLockRefresh").addEventListener("click", async () => {
    const btn = document.getElementById("btnLockRefresh");
    btn.classList.add("spinning");
    btn.disabled = true;
    try { handleLockStatus(await ExamBridge.refreshLockState()); } catch (e) {}
    setTimeout(() => { btn.classList.remove("spinning"); btn.disabled = false; }, 800);
  });

  renderNavStrip();
  renderQuestion();
  examReady = true;
  let startLocked = false;
  try {
    const st0 = await ExamBridge.checkLockStatus();
    if (st0 && st0.locked) { startLocked = true; showLockOverlay(st0); }
  } catch (e) {}
  if (!startLocked) startTimer();
})();
