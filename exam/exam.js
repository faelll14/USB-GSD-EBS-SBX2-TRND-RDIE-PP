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

  try {
    const stored = SessionGuard.getStoredSession();
    await ExamBridge.markStarted(stored ? stored.fullName : "");
  } catch (e) {}

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
      <div class="exam-question-text" id="questionTextArea">${escapeHtml(q.text)}</div>
      ${q.imageUrl ? `<img src="${escapeHtml(q.imageUrl)}" style="max-width:100%;border-radius:var(--radius-md);margin-bottom:var(--space-4);" />` : ""}
      <div id="optionsArea">
        ${optionKeys.map((k) => `
          <div class="exam-option ${answers[q.id] === k ? "selected" : ""}" data-key="${k}">
            <div class="exam-option-letter">${k.toUpperCase()}</div>
            <div class="exam-option-text">${escapeHtml(q.options[k])}</div>
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

  async function doSubmit() {
    if (submitted) return;
    submitted = true;
    ExamTools.disable();
    clearInterval(timerInterval);
    document.getElementById("examBody").innerHTML = '<div class="empty-state">Mengirim jawaban...</div>';
    try {
      await ExamBridge.submitExam(answers);
      const finishMsg = examData.endMessage ? escapeHtml(examData.endMessage) : ModeLabels.t("Ujian selesai.", "Ulangan selesai.") + " Jawaban kamu sudah tersimpan. Kamu bisa menutup halaman ini.";
      document.getElementById("examBody").innerHTML = '<div class="empty-state">' + finishMsg + '</div>';
      document.querySelector(".exam-bottombar").style.display = "none";
      document.getElementById("examNavStrip").style.display = "none";
    } catch (e) {
      document.getElementById("examBody").innerHTML = '<div class="empty-state">Gagal mengirim jawaban. Periksa koneksi internet dan coba lagi.</div>';
      submitted = false;
    }
  }

  function autoSubmit() {
    if (!submitted) doSubmit();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !submitted) {
      ExamBridge.reportViolation("app_backgrounded").then(checkAndHandleLock).catch(() => {});
    }
  });

  let lockPollInterval = null;

  function checkAndHandleLock(result) {
    if (result && result.locked) {
      showLockOverlay();
    }
  }

  function showLockOverlay() {
    ExamTools.disable();
    document.getElementById("lockOverlay").style.display = "flex";
    clearInterval(timerInterval);
    startLockPolling();
  }

  window.__showLockOverlay = showLockOverlay;

  function startLockPolling() {
    if (lockPollInterval) return;
    lockPollInterval = setInterval(async () => {
      try {
        const status = await ExamBridge.checkLockStatus();
        if (!status.locked) {
          clearInterval(lockPollInterval);
          lockPollInterval = null;
          document.getElementById("lockOverlay").style.display = "none";
          startTimer();
        } else {
          document.getElementById("lockReasonText").textContent = status.lockReason || ModeLabels.t("Hubungi guru penjaga ruang untuk membuka kembali.", "Hubungi guru pembuat ulangan untuk membuka kembali.");
        }
      } catch (e) {}
    }, 8000);
  }

  renderNavStrip();
  renderQuestion();
  startTimer();
})();
