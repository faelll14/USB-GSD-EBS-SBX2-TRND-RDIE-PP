(async function () {
  await ThemeController.init();
  ThemeController.bindSheet("btnTheme", "themeScrim", "themeCloseX", "themeCloseBottom", "themeGrid");

  let session = null;
  let scheduleItems = [];
  let selectedExamId = "";
  let pendingParsed = [];
  let currentQuestions = [];

  try {
    session = await GuruBridge.getSession();
  } catch (e) {
    session = { fullName: "Guru" };
  }
  GreetingHelper.apply("greetingIcon", "greetingSub", "greetingName", session.fullName, "Guru");

  let operationMode = "ujian";
  try {
    const modeResult = await GuruBridge.getOperationMode();
    operationMode = (modeResult && modeResult.operationMode) || "ujian";
  } catch (e) {}
  document.getElementById("dailyExamCard").style.display = operationMode === "harian" ? "block" : "none";
  document.getElementById("examScheduleCard").style.display = operationMode === "harian" ? "none" : "block";

  if (session.canSwitchToPanitia) {
    const btnSwitch = document.getElementById("btnSwitchRole");
    btnSwitch.style.display = "flex";
    btnSwitch.addEventListener("click", () => {
      GuruBridge.switchRole().catch(() => {});
    });
  }

  if (session.passwordIsDefault) {
    document.getElementById("passwordFormError").textContent = "";
    document.getElementById("oldPasswordInput").value = "";
    document.getElementById("newPasswordInput").value = "";
    document.getElementById("passwordCloseX").style.display = "none";
    document.getElementById("passwordCloseBottom").style.display = "none";
    document.getElementById("forcePasswordNotice").style.display = "block";
    document.getElementById("passwordScrim").classList.add("open", "force-open");
  }

  try {
    const info = await GuruBridge.getSchoolInfo();
    if (info && info.name) document.getElementById("schoolName").textContent = info.name;
    SiteFooter.render("siteFooter", info, (url) => GuruBridge.openExternal(url).catch(() => {}));
  } catch (e) {}

  document.getElementById("btnLogout").addEventListener("click", async () => {
    try { await GuruBridge.logout(); window.location.href = "../index.html"; } catch (e) {}
  });

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  let toastTimer = null;
  function showToast(message) {
    let el = document.getElementById("appToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "appToast";
      el.style.cssText = "position:fixed;left:50%;bottom:30px;transform:translateX(-50%);background:var(--surface-solid);color:var(--text-primary);padding:12px 18px;border-radius:var(--radius-md);border:1px solid var(--surface-border);font-size:13px;z-index:99;box-shadow:var(--shadow-elev);max-width:80%;text-align:center;";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = "0"; }, 2600);
  }

  const examSelect = document.getElementById("examSelect");

  async function loadSchedule() {
    try {
      const result = await GuruBridge.listExamSchedule();
      scheduleItems = (result && result.items) || [];
      if (scheduleItems.length === 0) {
        examSelect.innerHTML = '<option value="">Belum ada jadwal ujian dari admin</option>';
        return;
      }
      examSelect.innerHTML = '<option value="">Pilih jadwal...</option>' +
        scheduleItems.map((item) => `<option value="${item.id}">${escapeHtml(item.subject)} &mdash; ${escapeHtml(item.date)} ${escapeHtml(item.startLabel)}</option>`).join("");
    } catch (e) {
      examSelect.innerHTML = '<option value="">Gagal memuat jadwal</option>';
    }
  }

  examSelect.addEventListener("change", async () => {
    selectedExamId = examSelect.value;
    const showPanels = !!selectedExamId;
    document.getElementById("importCard").style.display = showPanels ? "block" : "none";
    document.getElementById("togglesCard").style.display = showPanels ? "block" : "none";
    document.getElementById("gradingCard").style.display = showPanels ? "block" : "none";
    document.getElementById("questionListWrap").style.display = showPanels ? "block" : "none";
    document.getElementById("importPreviewWrap").style.display = "none";
    document.getElementById("importTextarea").value = "";
    document.getElementById("parseErrorList").innerHTML = "";
    pendingParsed = [];
    if (showPanels) {
      loadQuestions();
    }
  });

  document.getElementById("btnProcessImport").addEventListener("click", () => {
    const raw = document.getElementById("importTextarea").value;
    const result = QuestionParser.parse(raw);
    const errEl = document.getElementById("parseErrorList");

    if (result.errors.length > 0) {
      errEl.innerHTML = '<div class="parse-error-list">' +
        result.errors.map((e) => `<div class="parse-error-item">Soal #${e.questionNumber != null ? e.questionNumber : "?"}: ${escapeHtml(e.message)}</div>`).join("") +
        '</div>';
    } else {
      errEl.innerHTML = "";
    }

    pendingParsed = result.questions.filter((q) => {
      const optionKeys = Object.keys(q.options);
      return optionKeys.length >= 4 && q.correctKey && q.options[q.correctKey] && q.text.trim();
    });

    document.getElementById("previewCount").textContent = pendingParsed.length;
    document.getElementById("importPreviewWrap").style.display = pendingParsed.length > 0 ? "block" : "none";
  });

  document.getElementById("btnSaveImport").addEventListener("click", async () => {
    if (!selectedExamId || pendingParsed.length === 0) return;
    const btn = document.getElementById("btnSaveImport");
    btn.disabled = true;
    try {
      await GuruBridge.saveQuestions(selectedExamId, pendingParsed);
      showToast(pendingParsed.length + " soal berhasil disimpan.");
      document.getElementById("importTextarea").value = "";
      document.getElementById("importPreviewWrap").style.display = "none";
      pendingParsed = [];
      loadQuestions();
    } catch (e) {
      showToast("Gagal menyimpan soal.");
    }
    btn.disabled = false;
  });

  let currentExamMeta = { calculatorEnabled: false, highlightEnabled: false, startMessage: "", endMessage: "" };

  async function loadQuestions() {
    const el = document.getElementById("questionList");
    el.innerHTML = '<div class="skeleton"></div>';
    try {
      const result = await GuruBridge.getQuestions(selectedExamId);
      currentQuestions = (result && result.items) || [];
      currentExamMeta.calculatorEnabled = !!(result && result.calculatorEnabled);
      currentExamMeta.highlightEnabled = !!(result && result.highlightEnabled);
      currentExamMeta.startMessage = (result && result.startMessage) || "";
      currentExamMeta.endMessage = (result && result.endMessage) || "";
      document.getElementById("toggleCalculator").checked = currentExamMeta.calculatorEnabled;
      document.getElementById("toggleHighlight").checked = currentExamMeta.highlightEnabled;
      document.getElementById("examStartMessage").value = currentExamMeta.startMessage;
      document.getElementById("examEndMessage").value = currentExamMeta.endMessage;
      renderQuestions();
    } catch (e) {
      el.innerHTML = '<div class="empty-state">Belum ada soal untuk jadwal ini.</div>';
    }
  }

  function renderQuestions() {
    const el = document.getElementById("questionList");
    if (currentQuestions.length === 0) {
      el.innerHTML = '<div class="empty-state">Belum ada soal untuk jadwal ini.</div>';
      return;
    }
    el.innerHTML = currentQuestions.map((q, idx) => `
      <div class="card question-card">
        <div class="question-number">Soal ${idx + 1}</div>
        <div class="question-text">${escapeHtml(q.text)}</div>
        ${Object.keys(q.options).sort().map((k) => `
          <div class="option-row ${k === q.correctKey ? "correct" : ""}">
            <span class="option-letter">${k.toUpperCase()}</span>
            <span>${escapeHtml(q.options[k])}</span>
          </div>
        `).join("")}
        <div class="question-actions">
          <button class="btn btn-ghost" data-edit="${q.id}">Edit</button>
          <button class="btn btn-ghost" data-delete="${q.id}" style="color:var(--danger);">Hapus</button>
        </div>
      </div>
    `).join("");

    el.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => openEdit(btn.dataset.edit));
    });
    el.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => handleDelete(btn.dataset.delete));
    });
  }

  async function handleDelete(questionId) {
    try {
      await GuruBridge.deleteQuestion(selectedExamId, questionId);
      showToast("Soal dihapus.");
      loadQuestions();
    } catch (e) {
      showToast("Gagal menghapus soal.");
    }
  }

  const editScrim = document.getElementById("editScrim");
  let editingId = null;
  let pendingImageUrl = null;

  function openEdit(questionId) {
    const q = currentQuestions.find((x) => x.id === questionId);
    if (!q) return;
    editingId = questionId;
    pendingImageUrl = q.imageUrl || null;
    document.getElementById("editText").value = q.text;
    document.getElementById("editFormError").textContent = "";

    const previewImg = document.getElementById("editImagePreview");
    if (pendingImageUrl) {
      previewImg.src = pendingImageUrl;
      previewImg.style.display = "block";
    } else {
      previewImg.style.display = "none";
    }

    const optionsWrap = document.getElementById("editOptionsWrap");
    const letters = ["a", "b", "c", "d", "e"];
    optionsWrap.innerHTML = letters.map((l) => `
      <div class="field">
        <label class="field-label">Pilihan ${l.toUpperCase()}</label>
        <input class="field-input" data-option="${l}" type="text" value="${escapeHtml(q.options[l] || "")}" />
      </div>
    `).join("");

    const keySelect = document.getElementById("editCorrectKey");
    keySelect.innerHTML = letters.map((l) => `<option value="${l}" ${l === q.correctKey ? "selected" : ""}>${l.toUpperCase()}</option>`).join("");

    editScrim.classList.add("open");
  }

  document.getElementById("btnAddPhoto").addEventListener("click", async () => {
    const btn = document.getElementById("btnAddPhoto");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Mengunggah...";
    try {
      const result = await GuruBridge.pickImage();
      pendingImageUrl = result.url;
      const previewImg = document.getElementById("editImagePreview");
      previewImg.src = pendingImageUrl;
      previewImg.style.display = "block";
      showToast("Foto berhasil diunggah.");
    } catch (e) {
      const messages = {
        INVALID_TYPE: "Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.",
        FILE_TOO_LARGE: "Ukuran foto maksimal 5MB.",
        UPLOAD_FAILED: "Gagal mengunggah foto."
      };
      if (e !== "CANCELLED") showToast(messages[e] || "Gagal mengunggah foto.");
    }
    btn.disabled = false;
    btn.textContent = originalText;
  });

  document.getElementById("editCloseX").addEventListener("click", () => editScrim.classList.remove("open"));
  document.getElementById("editCloseBottom").addEventListener("click", () => editScrim.classList.remove("open"));
  editScrim.addEventListener("click", (e) => { if (e.target === editScrim) editScrim.classList.remove("open"); });

  document.getElementById("editSubmit").addEventListener("click", async () => {
    const errorEl = document.getElementById("editFormError");
    errorEl.textContent = "";
    const text = document.getElementById("editText").value.trim();
    if (!text) {
      errorEl.textContent = "Teks pertanyaan tidak boleh kosong.";
      return;
    }
    const options = {};
    document.querySelectorAll("[data-option]").forEach((input) => {
      const val = input.value.trim();
      if (val) options[input.dataset.option] = val;
    });
    const correctKey = document.getElementById("editCorrectKey").value;
    if (!options[correctKey]) {
      errorEl.textContent = "Kunci jawaban harus mengarah ke pilihan yang terisi.";
      return;
    }

    try {
      await GuruBridge.updateQuestion(selectedExamId, { id: editingId, text, options, correctKey, imageUrl: pendingImageUrl });
      editScrim.classList.remove("open");
      showToast("Soal berhasil diperbarui.");
      loadQuestions();
    } catch (e) {
      errorEl.textContent = "Gagal menyimpan perubahan.";
    }
  });

  function bindToggle(id) {
    document.getElementById(id).addEventListener("change", async () => {
      const calc = document.getElementById("toggleCalculator").checked;
      const hl = document.getElementById("toggleHighlight").checked;
      try {
        await GuruBridge.setExamToggles(selectedExamId, calc, hl);
      } catch (e) {
        showToast("Gagal menyimpan pengaturan.");
      }
    });
  }
  bindToggle("toggleCalculator");
  bindToggle("toggleHighlight");

  document.getElementById("btnSaveExamMessages").addEventListener("click", async () => {
    const btn = document.getElementById("btnSaveExamMessages");
    const startMsg = document.getElementById("examStartMessage").value.trim();
    const endMsg = document.getElementById("examEndMessage").value.trim();
    btn.disabled = true;
    try {
      await GuruBridge.setExamMessages(selectedExamId, startMsg, endMsg);
      currentExamMeta.startMessage = startMsg;
      currentExamMeta.endMessage = endMsg;
      showToast("Pesan ujian berhasil disimpan.");
    } catch (e) {
      showToast("Gagal menyimpan pesan.");
    }
    btn.disabled = false;
  });

  document.getElementById("btnComputeGrades").addEventListener("click", async () => {
    if (!selectedExamId) return;
    const btn = document.getElementById("btnComputeGrades");
    const summaryEl = document.getElementById("gradingSummaryText");
    btn.disabled = true;
    summaryEl.textContent = "Menghitung nilai...";
    try {
      const result = await GuruBridge.computeGrades(selectedExamId);
      summaryEl.textContent = result.gradedCount + " siswa berhasil dinilai. Nilai belum terlihat siswa sampai admin publikasikan.";
      showToast("Nilai berhasil dihitung dan disimpan.");
    } catch (e) {
      summaryEl.textContent = "Gagal menghitung nilai.";
    }
    btn.disabled = false;
  });

  document.getElementById("accountInfoSub").textContent = "NIP " + (session.nisNip || "-");

  const passwordScrim = document.getElementById("passwordScrim");
  document.getElementById("rowPassword").addEventListener("click", () => {
    document.getElementById("passwordFormError").textContent = "";
    document.getElementById("oldPasswordInput").value = "";
    document.getElementById("newPasswordInput").value = "";
    passwordScrim.classList.add("open");
  });
  document.getElementById("passwordCloseX").addEventListener("click", () => passwordScrim.classList.remove("open"));
  document.getElementById("passwordCloseBottom").addEventListener("click", () => passwordScrim.classList.remove("open"));
  passwordScrim.addEventListener("click", (e) => {
    if (e.target === passwordScrim && !passwordScrim.classList.contains("force-open")) {
      passwordScrim.classList.remove("open");
    }
  });

  document.getElementById("passwordSubmit").addEventListener("click", async () => {
    const oldPw = document.getElementById("oldPasswordInput").value;
    const newPw = document.getElementById("newPasswordInput").value;
    const errorEl = document.getElementById("passwordFormError");
    errorEl.textContent = "";
    try {
      await GuruBridge.changePassword(oldPw, newPw);
      passwordScrim.classList.remove("open", "force-open");
      document.getElementById("passwordCloseX").style.display = "";
      document.getElementById("passwordCloseBottom").style.display = "";
      document.getElementById("forcePasswordNotice").style.display = "none";
      session.passwordIsDefault = false;
      showToast("Kata sandi berhasil diubah.");
    } catch (e) {
      const messages = {
        WRONG_OLD_PASSWORD: "Kata sandi saat ini salah.",
        WEAK_PASSWORD: "Kata sandi baru minimal 6 karakter.",
        NETWORK_ERROR: "Tidak ada koneksi internet."
      };
      errorEl.textContent = messages[e] || "Gagal mengubah kata sandi.";
    }
  });

  const historyScrim = document.getElementById("historyScrim");
  document.getElementById("rowLoginHistory").addEventListener("click", async () => {
    historyScrim.classList.add("open");
    const listEl = document.getElementById("historyList");
    listEl.innerHTML = '<div class="skeleton"></div>';
    try {
      const history = await GuruBridge.getLoginHistory();
      const items = history.items || [];
      if (items.length === 0) {
        listEl.innerHTML = '<div class="empty-state">Belum ada riwayat login.</div>';
        return;
      }
      listEl.innerHTML = items.map((h) => `
        <div class="leaderboard-row" style="flex-direction:column;align-items:flex-start;gap:2px;">
          <div style="font-weight:700;font-size:13.5px;">${escapeHtml(h.timestamp)}</div>
          <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(h.deviceModel)} &middot; ${escapeHtml(h.androidVersion)}</div>
          <div style="font-size:12px;color:var(--text-tertiary);">IP ${escapeHtml(h.ipAddress || "tidak diketahui")}</div>
        </div>
      `).join("");
    } catch (e) {
      listEl.innerHTML = '<div class="empty-state">Gagal memuat riwayat login.</div>';
    }
  });
  document.getElementById("historyCloseX").addEventListener("click", () => historyScrim.classList.remove("open"));
  document.getElementById("historyCloseBottom").addEventListener("click", () => historyScrim.classList.remove("open"));
  historyScrim.addEventListener("click", (e) => { if (e.target === historyScrim) historyScrim.classList.remove("open"); });

  let pendingDailyKelasTargets = new Set();
  let pendingDailyExamId = null;

  async function loadMyDailyExams() {
    const el = document.getElementById("myDailyExamsList");
    try {
      const result = await GuruBridge.getMyDailyExams();
      const items = (result && result.items) || [];
      if (items.length === 0) {
        el.innerHTML = "";
        return;
      }
      const statusLabel = { draft: "Belum lengkap", ready: "Belum ada soal", published: "Sudah tayang ke siswa" };
      const statusColor = { draft: "var(--warning)", ready: "var(--accent)", published: "var(--success)" };
      el.innerHTML = items.map((item) => `
        <div class="leaderboard-row" style="flex-direction:column;align-items:flex-start;gap:2px;cursor:pointer;" data-open-daily="${item.id}">
          <div style="font-weight:700;font-size:13.5px;">${escapeHtml(item.subject || "(belum diberi nama)")}</div>
          <div style="font-size:12px;color:var(--text-secondary);">Kelas: ${item.kelasTargets.join(", ")}</div>
          <div style="font-size:11px;color:${statusColor[item.status] || "var(--text-tertiary)"};">${statusLabel[item.status] || item.status}</div>
        </div>
      `).join("");
      el.querySelectorAll("[data-open-daily]").forEach((row) => {
        row.addEventListener("click", () => openDailyExamInEditor(row.dataset.openDaily, items));
      });
    } catch (e) {
      el.innerHTML = "";
    }
  }
  loadMyDailyExams();

  function openDailyExamInEditor(examId, items) {
    const item = items.find((x) => x.id === examId);
    if (!item) return;
    if (item.status === "draft") {
      pendingDailyExamId = examId;
      openDailyDetailModal(item.kelasTargets, item.subject, item.startTimestamp, item.durationMinutes);
      return;
    }
    if (!scheduleItems.find((x) => x.id === examId)) {
      scheduleItems.push({ id: item.id, subject: item.subject, date: item.date, startLabel: item.startLabel });
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.subject + " (Ulangan) — " + item.date + " " + item.startLabel;
      examSelect.appendChild(opt);
    }
    examSelect.value = examId;
    examSelect.dispatchEvent(new Event("change"));
    document.getElementById("importCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.getElementById("btnCreateDailyExam").addEventListener("click", async () => {
    const grid = document.getElementById("pickKelasGrid");
    const errEl = document.getElementById("pickKelasError");
    errEl.textContent = "";
    pendingDailyKelasTargets = new Set();
    grid.innerHTML = '<div class="skeleton"></div>';
    document.getElementById("pickKelasScrim").classList.add("open");
    try {
      const result = await GuruBridge.getAvailableKelasList();
      const kelasList = (result && result.kelasList) || [];
      if (kelasList.length === 0) {
        grid.innerHTML = '<div class="empty-state">Belum ada kelas terdaftar dari data siswa.</div>';
        return;
      }
      grid.innerHTML = kelasList.map((k) => `<button type="button" class="grade-select-btn" data-kelas="${escapeHtml(k)}" style="opacity:0.55;">${escapeHtml(k)}</button>`).join("");
      grid.querySelectorAll("[data-kelas]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const k = btn.dataset.kelas;
          if (pendingDailyKelasTargets.has(k)) {
            pendingDailyKelasTargets.delete(k);
            btn.style.opacity = "0.55";
          } else {
            pendingDailyKelasTargets.add(k);
            btn.style.opacity = "1";
          }
        });
      });
    } catch (e) {
      grid.innerHTML = '<div class="empty-state">Gagal memuat daftar kelas.</div>';
    }
  });

  document.getElementById("pickKelasCloseX").addEventListener("click", () => document.getElementById("pickKelasScrim").classList.remove("open"));
  document.getElementById("pickKelasCloseBottom").addEventListener("click", () => document.getElementById("pickKelasScrim").classList.remove("open"));
  document.getElementById("pickKelasScrim").addEventListener("click", (e) => {
    if (e.target === document.getElementById("pickKelasScrim")) document.getElementById("pickKelasScrim").classList.remove("open");
  });

  document.getElementById("pickKelasSubmit").addEventListener("click", async () => {
    const errEl = document.getElementById("pickKelasError");
    if (pendingDailyKelasTargets.size === 0) {
      errEl.textContent = "Pilih minimal satu kelas.";
      return;
    }
    const btn = document.getElementById("pickKelasSubmit");
    btn.disabled = true;
    try {
      const result = await GuruBridge.createDailyExam(Array.from(pendingDailyKelasTargets));
      pendingDailyExamId = result.id;
      document.getElementById("pickKelasScrim").classList.remove("open");
      openDailyDetailModal(Array.from(pendingDailyKelasTargets), "", 0, 0);
      loadMyDailyExams();
    } catch (e) {
      errEl.textContent = "Gagal membuat ulangan. Coba lagi.";
    }
    btn.disabled = false;
  });

  function openDailyDetailModal(kelasTargets, subject, startTimestamp, durationMinutes) {
    document.getElementById("dailyDetailKelasLabel").textContent = "Target kelas: " + kelasTargets.join(", ");
    document.getElementById("dailySubject").value = subject || "";
    document.getElementById("dailyDuration").value = durationMinutes || "";
    if (startTimestamp) {
      const dt = new Date(startTimestamp);
      document.getElementById("dailyDate").value = dt.toISOString().slice(0, 10);
      let hour = dt.getHours();
      const ampm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12;
      if (hour === 0) hour = 12;
      document.getElementById("dailyHour").value = hour;
      document.getElementById("dailyMinute").value = dt.getMinutes();
      document.getElementById("dailyAmPm").value = ampm;
    } else {
      document.getElementById("dailyDate").value = "";
      document.getElementById("dailyHour").value = "";
      document.getElementById("dailyMinute").value = "";
      document.getElementById("dailyAmPm").value = "AM";
    }
    document.getElementById("dailyDetailError").textContent = "";
    document.getElementById("dailyDetailScrim").classList.add("open");
  }

  document.getElementById("dailyDetailSubmit").addEventListener("click", async () => {
    const errEl = document.getElementById("dailyDetailError");
    const subject = document.getElementById("dailySubject").value.trim();
    const dateVal = document.getElementById("dailyDate").value;
    const hour = parseInt(document.getElementById("dailyHour").value, 10);
    const minute = parseInt(document.getElementById("dailyMinute").value, 10);
    const ampm = document.getElementById("dailyAmPm").value;
    const duration = parseInt(document.getElementById("dailyDuration").value, 10);

    if (!subject || !dateVal || isNaN(hour) || hour < 1 || hour > 12 || isNaN(minute) || minute < 0 || minute > 59 || isNaN(duration) || duration < 1) {
      errEl.textContent = "Lengkapi semua data dengan benar.";
      return;
    }

    let hour24 = hour % 12;
    if (ampm === "PM") hour24 += 12;
    const [y, m, d] = dateVal.split("-").map((n) => parseInt(n, 10));
    const startDate = new Date(y, m - 1, d, hour24, minute, 0, 0);
    const startLabel = (hour < 10 ? "0" + hour : hour) + ":" + (minute < 10 ? "0" + minute : minute) + " " + ampm;

    const btn = document.getElementById("dailyDetailSubmit");
    btn.disabled = true;
    try {
      await GuruBridge.updateDailyExamDetails(pendingDailyExamId, {
        subject,
        date: dateVal,
        startLabel,
        startTimestamp: startDate.getTime(),
        durationMinutes: duration
      });
      document.getElementById("dailyDetailScrim").classList.remove("open");
      showToast("Detail ulangan tersimpan. Sekarang isi soalnya.");
      loadMyDailyExams();
      if (!scheduleItems.find((x) => x.id === pendingDailyExamId)) {
        scheduleItems.push({ id: pendingDailyExamId, subject, date: dateVal, startLabel });
        const opt = document.createElement("option");
        opt.value = pendingDailyExamId;
        opt.textContent = subject + " (Ulangan) — " + dateVal + " " + startLabel;
        examSelect.appendChild(opt);
      }
      examSelect.value = pendingDailyExamId;
      examSelect.dispatchEvent(new Event("change"));
      setTimeout(() => {
        document.getElementById("importCard").scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } catch (e) {
      errEl.textContent = "Gagal menyimpan detail ulangan.";
    }
    btn.disabled = false;
  });

  loadSchedule();
})();
