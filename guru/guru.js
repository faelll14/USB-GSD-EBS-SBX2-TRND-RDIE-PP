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
  ModeLabels.set(operationMode);

  AccountExtras.init({ bridge: GuruBridge, session, a2l: true, developer: true });

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
      el.style.cssText = "position:fixed;left:50%;bottom:96px;pointer-events:none;transform:translateX(-50%);background:var(--surface-solid);color:var(--text-primary);padding:12px 18px;border-radius:var(--radius-md);border:1px solid var(--surface-border);font-size:13px;z-index:99;box-shadow:var(--shadow-elev);max-width:80%;text-align:center;";
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
    document.querySelectorAll("[data-open-daily]").forEach((b) => b.classList.toggle("active", showPanels && b.dataset.openDaily === selectedExamId));
    const banner = document.getElementById("managingBanner");
    banner.style.display = showPanels ? "flex" : "none";
    if (showPanels) {
      const meta = scheduleItems.find((x) => x.id === selectedExamId) || {};
      const daily = (typeof guruMyDailyItems !== "undefined" ? guruMyDailyItems : []).find((x) => x.id === selectedExamId);
      const kelas = daily && daily.kelasTargets && daily.kelasTargets.length ? " · " + daily.kelasTargets.join(", ") : "";
      document.getElementById("managingText").textContent = "Mengelola: " + (meta.subject || (daily && daily.subject) || "-") + kelas;
      loadQuestions();
    }
  });

  document.getElementById("btnCloseManaging").addEventListener("click", () => {
    examSelect.value = "";
    examSelect.dispatchEvent(new Event("change"));
  });

  document.getElementById("btnCopyQuestionPrompt").addEventListener("click", async () => {
    const ok = await QuestionPrompt.copy();
    showToast(ok ? "Prompt AI disalin. Tempel ke AI bersama file soalmu." : "Gagal menyalin prompt.");
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
      showToast(e === "MODE_RESTRICTED" ? "Mode saat ini tidak mengizinkan aksi ini. Ujian: tambah soal ke jadwal admin. Harian: buat ulangan sendiri." : "Gagal menyimpan soal.");
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
        <div class="question-text">${PatMath.html(q.text)}</div>
        ${Object.keys(q.options).sort().map((k) => `
          <div class="option-row ${k === q.correctKey ? "correct" : ""}">
            <span class="option-letter">${k.toUpperCase()}</span>
            <span>${PatMath.html(q.options[k])}</span>
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
    const maxIdx = Math.max(4, ...Object.keys(q.options).map((k) => k.charCodeAt(0) - 97));
    const letters = "abcdefghij".split("").slice(0, Math.min(maxIdx, 9) + 1);
    optionsWrap.innerHTML = letters.map((l) => `
      <div class="field">
        <label class="field-label">Pilihan ${l.toUpperCase()}</label>
        <textarea class="field-input" data-option="${l}" rows="2" style="min-height:48px;resize:vertical;">${escapeHtml(q.options[l] || "")}</textarea>
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
        READ_FAILED: "Gagal membaca file.",
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
    const text = document.getElementById("editText").value.replace(/^(\s*\n)+|(\n\s*)+$/g, "");
    if (!text.trim()) {
      errorEl.textContent = "Teks pertanyaan tidak boleh kosong.";
      return;
    }
    const options = {};
    document.querySelectorAll("[data-option]").forEach((input) => {
      const val = input.value.replace(/^(\s*\n)+|(\n\s*)+$/g, "");
      if (val.trim()) options[input.dataset.option] = val;
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

  loadSchedule();

  async function loadGuruMyDuty() {
    const el = document.getElementById("guruMyDutyList");
    try {
      const result = await GuruBridge.getMyDutySchedule();
      const items = (result && result.items) || [];
      guruDutyItems = items;
      populateGuruDutySelect();
      if (items.length === 0) {
        el.innerHTML = '<div class="empty-state">Belum ada jadwal jaga untukmu.</div>';
        return;
      }
      el.innerHTML = items.map((d) => `
        <div class="leaderboard-row" style="flex-direction:column;align-items:flex-start;gap:2px;">
          <div style="font-weight:700;font-size:13.5px;">${escapeHtml(d.subject)}</div>
          <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(d.date)} &middot; ${escapeHtml(d.startLabel)} &middot; Ruang ${escapeHtml(d.room)}</div>
        </div>
      `).join("");
    } catch (e) {
      el.innerHTML = '<div class="empty-state">Gagal memuat jadwal jaga.</div>';
    }
  }
  if (operationMode !== "harian") loadGuruMyDuty();

  let guruScheduleItems = [];
  let guruSelectedExam = null;
  let guruParticipants = [];
  let guruActiveStatusFilter = "all";
  let guruPollInterval = null;
  const guruDutyExamSelect = document.getElementById("guruDutyExamSelect");

  let guruDutyItems = [];
  let guruMyDailyItems = [];

  // Dropdown kontrol: mode ujian = jadwal tempat guru ditunjuk admin (per ruang),
  // mode harian = ulangan yang dibuat guru sendiri (per kelas, otomatis tanpa penunjukan)
  function populateGuruDutySelect() {
    const harian = ModeLabels.mode === "harian";
    const seen = {};
    guruScheduleItems = [];
    if (harian) {
      guruMyDailyItems.forEach((d) => {
        if (!d.id || !d.startTimestamp) return;
        guruScheduleItems.push({
          id: d.id,
          subject: d.subject || "(tanpa judul)",
          date: d.date,
          startLabel: d.startLabel,
          startTimestamp: d.startTimestamp,
          durationMinutes: d.durationMinutes,
          kelasTargets: d.kelasTargets || []
        });
      });
    } else {
      guruDutyItems.forEach((d) => {
        if (!d.examId || seen[d.examId]) return;
        seen[d.examId] = true;
        guruScheduleItems.push({
          id: d.examId,
          subject: d.subject,
          date: d.date,
          startLabel: d.startLabel,
          startTimestamp: d.startTimestamp,
          durationMinutes: d.durationMinutes,
          gradeTargets: d.kelasTargets || []
        });
      });
    }
    if (guruScheduleItems.length === 0) {
      guruDutyExamSelect.innerHTML = '<option value="">' + ModeLabels.t("Belum ada jadwal jaga untukmu", "Belum ada ulangan yang kamu buat") + "</option>";
      return;
    }
    guruDutyExamSelect.innerHTML = '<option value="">' + ModeLabels.t("Pilih jadwal untuk kontrol ruang...", "Pilih ulangan untuk kontrol kelas...") + "</option>" +
      guruScheduleItems.map((item) => {
        const kelas = item.kelasTargets && item.kelasTargets.length ? " (" + item.kelasTargets.join(", ") + ")" : "";
        return `<option value="${item.id}">${escapeHtml(item.subject)}${escapeHtml(kelas)} &mdash; ${escapeHtml(item.date)} ${escapeHtml(item.startLabel)}</option>`;
      }).join("");
  }

  function guruWithinControlWindow(item) {
    const now = Date.now();
    const gateOpen = item.startTimestamp - 15 * 60 * 1000;
    const gateClose = item.startTimestamp + item.durationMinutes * 60000;
    return now >= gateOpen && now <= gateClose;
  }

  guruDutyExamSelect.addEventListener("change", () => {
    clearInterval(guruPollInterval);
    const id = guruDutyExamSelect.value;
    guruSelectedExam = guruScheduleItems.find((x) => x.id === id) || null;
    renderGuruControlArea();
    if (guruSelectedExam && guruWithinControlWindow(guruSelectedExam)) {
      refreshGuruParticipants();
      guruPollInterval = setInterval(refreshGuruParticipants, 4000);
    }
  });

  function renderGuruControlArea() {
    const el = document.getElementById("guruControlArea");
    if (!guruSelectedExam) {
      el.innerHTML = "";
      return;
    }
    if (!guruWithinControlWindow(guruSelectedExam)) {
      const now = Date.now();
      const message = now < guruSelectedExam.startTimestamp - 15 * 60 * 1000
        ? ModeLabels.t("Kontrol ruang untuk jadwal ini akan terbuka 15 menit sebelum ujian dimulai.", "Kontrol kelas untuk ulangan ini akan terbuka 15 menit sebelum ulangan dimulai.")
        : ModeLabels.t("Waktu kontrol untuk jadwal ini sudah berakhir.", "Waktu kontrol untuk ulangan ini sudah berakhir.");
      el.innerHTML = `<div class="time-gate-notice">${message}</div>`;
      return;
    }
    el.innerHTML = `
      <div class="status-tabs" id="guruStatusTabs">
        <button class="status-tab active" data-status="all">Semua</button>
        <button class="status-tab" data-status="not_started">Belum Mulai</button>
        <button class="status-tab" data-status="in_progress">${ModeLabels.t("Sedang Ujian", "Sedang Ulangan")}</button>
        <button class="status-tab" data-status="completed">Selesai</button>
        <button class="status-tab" data-status="violations">Melanggar</button>
      </div>
      <div id="guruParticipantList"><div class="skeleton"></div></div>
    `;
    document.querySelectorAll("#guruStatusTabs .status-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("#guruStatusTabs .status-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        guruActiveStatusFilter = tab.dataset.status;
        renderGuruParticipantList();
      });
    });
  }

  async function refreshGuruParticipants() {
    if (!guruSelectedExam) return;
    try {
      const myRooms = ModeLabels.mode === "harian" ? [] : guruDutyItems.filter((d) => d.examId === guruSelectedExam.id).map((d) => d.room);
      const result = await GuruBridge.getRoomControl(guruSelectedExam.id, myRooms);
      if (result && result.ready === false) return;
      const joined = (result && result.items) || [];
      const roster = await ensureGuruRoster();
      guruParticipants = mergeRoster(joined, roster, guruSelectedExam, myRooms);
      renderGuruParticipantList();
    } catch (e) {}
  }

  let guruRoster = null;
  async function ensureGuruRoster() {
    if (guruRoster) return guruRoster;
    try {
      const r = await GuruBridge.getRoster();
      guruRoster = (r && r.items) || [];
    } catch (e) {
      guruRoster = [];
    }
    return guruRoster;
  }

  function gradeOf(kelas) {
    const m = String(kelas || "").trim().match(/^(XII|XI|X)/i);
    return m ? m[1].toUpperCase() : "";
  }

  // Gabungkan daftar siswa (nama + absen) dengan peserta yang sudah masuk: yang belum masuk tetap tampil
  function mergeRoster(joined, roster, exam, rooms) {
    if (!roster || roster.length === 0) return joined;
    const roomSet = new Set(rooms || []);
    let rows;
    if (ModeLabels.mode === "harian") {
      const targets = new Set((exam && exam.kelasTargets) || []);
      rows = roster.filter((r) => targets.has(r.k));
    } else {
      const grades = new Set(((exam && exam.gradeTargets) || []).map((g) => String(g).toUpperCase()));
      rows = roster.filter((r) => roomSet.has(r.r) && (grades.size === 0 || grades.has(gradeOf(r.k))));
    }
    const byUid = new Map(joined.map((p) => [p.uid, p]));
    const known = new Set();
    const merged = rows.map((r) => {
      known.add(r.u);
      const p = byUid.get(r.u);
      if (p) return Object.assign({}, p, { absen: r.a, fullName: r.n || p.fullName, kelas: r.k || p.kelas, joined: true });
      return { uid: r.u, fullName: r.n, kelas: r.k, absen: r.a, status: "not_started", joined: false, violationCount: 0, locked: false, violations: [] };
    });
    joined.forEach((p) => { if (!known.has(p.uid)) merged.push(Object.assign({}, p, { absen: null, joined: true })); });
    return merged;
  }

  const VIOLATION_LABEL = {
    app_backgrounded: "Keluar dari aplikasi",
    focus_lost: "Layar tertutup (notifikasi / jendela lain)",
    multi_window: "Layar terbagi / jendela mengambang",
    screenshot: "Percobaan screenshot",
    screen_recording: "Perekaman layar",
    vpn_revoked: "Kontrol jaringan ujian dimatikan",
    copy_paste: "Salin / tempel"
  };
  const guruExpanded = new Set();

  function guruStatusLabel(p) {
    if (p.locked) return { text: "Terkunci", cls: "locked" };
    if (p.joined === false) return { text: "Belum Masuk", cls: "not-started" };
    if (p.status === "completed") return { text: "Selesai", cls: "completed" };
    if (p.status === "in_progress") return { text: ModeLabels.t("Sedang Ujian", "Sedang Ulangan"), cls: "in-progress" };
    return { text: "Belum Mulai", cls: "not-started" };
  }

  function renderGuruParticipantList() {
    const el = document.getElementById("guruParticipantList");
    if (!el) return;
    let items = guruParticipants;
    if (guruActiveStatusFilter === "violations") {
      items = items.filter((p) => (p.violationCount || 0) > 0);
    } else if (guruActiveStatusFilter !== "all") {
      items = items.filter((p) => (p.status || "not_started") === guruActiveStatusFilter);
    }
    items = items.slice().sort((a, b) =>
      String(a.kelas || "").localeCompare(String(b.kelas || ""), undefined, { numeric: true }) ||
      (a.absen || 999) - (b.absen || 999) ||
      (a.fullName || "").localeCompare(b.fullName || ""));

    if (items.length === 0) {
      el.innerHTML = '<div class="empty-state">Tidak ada siswa pada kategori ini.</div>';
      return;
    }

    el.innerHTML = items.map((p) => {
      const st = guruStatusLabel(p);
      const open = guruExpanded.has(p.uid);
      const log = (p.violations || []).slice().reverse().map((v) => {
        const d = new Date(v.t || 0);
        const hh = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0");
        return `<div><b>${hh}</b> &middot; ${escapeHtml(VIOLATION_LABEL[v.r] || v.r)}</div>`;
      }).join("");
      const detail = open
        ? `<div class="participant-detail">${p.lockReason ? `<div><b>Alasan kunci:</b> ${escapeHtml(p.lockReason)}</div>` : ""}${log || "<div>Belum ada pelanggaran tercatat.</div>"}</div>`
        : "";
      return `
      <div class="participant-wrap">
        <div class="participant-row" data-toggle="${p.uid}">
          <span class="participant-name">${p.absen ? `<span class="participant-absen">${p.absen}.</span> ` : ""}${escapeHtml(p.fullName || "(tanpa nama)")}${p.kelas ? ` <small style="opacity:.6;">${escapeHtml(p.kelas)}</small>` : ""}</span>
          ${(p.violationCount || 0) > 0 || (p.violations || []).length ? `<span class="violation-count">${(p.violations || []).length || p.violationCount}x</span>` : ""}
          <span class="status-pill ${st.cls}">${st.text}</span>
          ${p.locked ? `<button class="unlock-btn" data-unlock="${p.uid}">Buka</button>` : ""}
        </div>
        ${detail}
      </div>`;
    }).join("");

    el.querySelectorAll("[data-toggle]").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest("[data-unlock]")) return;
        const uid = row.dataset.toggle;
        if (guruExpanded.has(uid)) guruExpanded.delete(uid); else guruExpanded.add(uid);
        renderGuruParticipantList();
      });
    });
    el.querySelectorAll("[data-unlock]").forEach((btn) => {
      btn.addEventListener("click", () => openGuruUnlockModal(btn.dataset.unlock));
    });
  }

  const guruUnlockScrim = document.getElementById("unlockScrim");
  let guruUnlockTargetUid = null;

  function openGuruUnlockModal(uid) {
    const p = guruParticipants.find((x) => x.uid === uid);
    guruUnlockTargetUid = uid;
    document.getElementById("unlockStudentName").textContent = p ? p.fullName : "";
    document.getElementById("unlockReasonInput").value = "";
    document.getElementById("unlockFormError").textContent = "";
    guruUnlockScrim.classList.add("open");
  }

  document.getElementById("unlockCloseX").addEventListener("click", () => guruUnlockScrim.classList.remove("open"));
  document.getElementById("unlockCloseBottom").addEventListener("click", () => guruUnlockScrim.classList.remove("open"));
  guruUnlockScrim.addEventListener("click", (e) => { if (e.target === guruUnlockScrim) guruUnlockScrim.classList.remove("open"); });

  document.getElementById("unlockSubmit").addEventListener("click", async () => {
    const reason = document.getElementById("unlockReasonInput").value.trim();
    const errorEl = document.getElementById("unlockFormError");
    if (!reason) {
      errorEl.textContent = "Alasan wajib diisi.";
      return;
    }
    try {
      await GuruBridge.unlockParticipant(guruSelectedExam.id, guruUnlockTargetUid, reason);
      guruUnlockScrim.classList.remove("open");
      showToast("Siswa berhasil dibuka kuncinya.");
      refreshGuruParticipants();
    } catch (e) {
      errorEl.textContent = "Gagal membuka kunci siswa.";
    }
  });

  let pendingDailyKelasTargets = new Set();
  let kelasListCache = null;
  let pendingDailyExamId = null;

  function confirmDialog(title, message, okLabel) {
    return new Promise((resolve) => {
      const scrim = document.createElement("div");
      scrim.className = "modal-scrim";
      scrim.innerHTML = '<div class="modal-sheet"><h2 class="sheet-title"></h2><p class="login-subtitle" style="margin-bottom:var(--space-4);"></p>' +
        '<button class="btn btn-primary" data-ok type="button" style="background:var(--danger);"></button><button class="btn btn-ghost" data-cancel type="button">Batal</button></div>';
      scrim.querySelector(".sheet-title").textContent = title;
      scrim.querySelector(".login-subtitle").textContent = message;
      scrim.querySelector("[data-ok]").textContent = okLabel || "Ya";
      const done = (v) => { scrim.classList.remove("open"); setTimeout(() => scrim.remove(), 250); resolve(v); };
      scrim.querySelector("[data-ok]").addEventListener("click", () => done(true));
      scrim.querySelector("[data-cancel]").addEventListener("click", () => done(false));
      scrim.addEventListener("click", (e) => { if (e.target === scrim) done(false); });
      document.body.appendChild(scrim);
      requestAnimationFrame(() => requestAnimationFrame(() => scrim.classList.add("open")));
    });
  }

  async function loadMyDailyExams() {
    const el = document.getElementById("myDailyExamsList");
    try {
      const result = await GuruBridge.getMyDailyExams();
      const items = (result && result.items) || [];
      guruMyDailyItems = items;
      if (ModeLabels.mode === "harian") populateGuruDutySelect();
      if (items.length === 0) {
        el.innerHTML = "";
        return;
      }
      const statusLabel = { draft: "Belum lengkap (ketuk untuk melengkapi)", ready: "Belum ada soal", published: "Sudah tayang ke siswa" };
      const statusColor = { draft: "var(--warning)", ready: "var(--accent)", published: "var(--success)" };
      const sorted = items.slice().sort((a, b) => (b.startTimestamp || 0) - (a.startTimestamp || 0));
      el.innerHTML = '<p class="daily-hint">Pilih ulangan untuk mengelola soal, fasilitas, dan penilaian.</p>' + sorted.map((item) => `
        <div class="daily-row"><button type="button" class="daily-item${item.id === selectedExamId ? " active" : ""}" data-open-daily="${item.id}">
          <span class="daily-item-title">${escapeHtml(item.subject || "(belum diberi nama)")}</span>
          <span class="daily-item-meta">${(item.kelasTargets || []).map((k) => `<span class="daily-chip">${escapeHtml(k)}</span>`).join("")}</span>
          <span class="daily-item-meta">${escapeHtml(item.date || "-")} &middot; ${escapeHtml(item.startLabel || "-")}${item.durationMinutes ? " &middot; " + item.durationMinutes + " menit" : ""}</span>
          <span class="daily-item-status" style="color:${statusColor[item.status] || "var(--text-tertiary)"};">${statusLabel[item.status] || escapeHtml(item.status || "")}</span>
        </button>
        <button type="button" class="daily-del" data-del-daily="${item.id}" aria-label="Hapus jadwal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg></button>
        </div>
      `).join("");
      el.querySelectorAll("[data-del-daily]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const id = btn.dataset.delDaily;
          const item = items.find((x) => x.id === id) || {};
          const ok = await confirmDialog("Hapus jadwal ulangan?", `"${item.subject || "(tanpa judul)"}" beserta soal dan pengaturannya akan dihapus permanen. Siswa tidak bisa lagi melihatnya.`, "Hapus");
          if (!ok) return;
          try {
            await GuruBridge.deleteDailyExam(id);
            showToast("Jadwal ulangan dihapus.");
            if (selectedExamId === id) {
              examSelect.value = "";
              examSelect.dispatchEvent(new Event("change"));
            }
            Array.from(examSelect.options).forEach((o) => { if (o.value === id) o.remove(); });
            loadMyDailyExams();
          } catch (err) {
            showToast("Gagal menghapus jadwal. Coba lagi.");
          }
        });
      });
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
    pendingDailyExamId = null;
    grid.innerHTML = '<div class="skeleton"></div>';
    document.getElementById("pickKelasScrim").classList.add("open");
    try {
      if (!kelasListCache) {
        const result = await GuruBridge.getAvailableKelasList();
        kelasListCache = (result && result.kelasList) || [];
      }
      const kelasList = kelasListCache;
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
    // Belum ada write ke Firestore di langkah ini; ulangan baru dibuat sekali saat detail disimpan.
    pendingDailyExamId = null;
    document.getElementById("pickKelasScrim").classList.remove("open");
    openDailyDetailModal(Array.from(pendingDailyKelasTargets), "", 0, 0);
  });

  function openDailyDetailModal(kelasTargets, subject, startTimestamp, durationMinutes) {
    document.getElementById("dailyDetailKelasLabel").textContent = "Target kelas: " + kelasTargets.join(", ");
    document.getElementById("dailySubject").value = subject || "";
    document.getElementById("dailyDuration").value = durationMinutes || "";
    if (startTimestamp) {
      const dt = new Date(startTimestamp);
      document.getElementById("dailyDate").value = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
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

    if (!subject || !dateVal || isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59 || isNaN(duration) || duration < 1) {
      errEl.textContent = "Lengkapi semua data dengan benar.";
      return;
    }

    const hour24 = ClockInput.to24(hour, ampm);
    const [y, m, d] = dateVal.split("-").map((n) => parseInt(n, 10));
    const startDate = new Date(y, m - 1, d, hour24, minute, 0, 0);
    const startLabel = ClockInput.label(hour24, minute);

    const btn = document.getElementById("dailyDetailSubmit");
    btn.disabled = true;
    try {
      const details = {
        subject,
        date: dateVal,
        startLabel,
        startTimestamp: startDate.getTime(),
        durationMinutes: duration
      };
      if (!pendingDailyExamId) {
        const created = await GuruBridge.createDailyExam(Array.from(pendingDailyKelasTargets), details);
        pendingDailyExamId = created.id;
      } else {
        await GuruBridge.updateDailyExamDetails(pendingDailyExamId, details);
      }
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
      errEl.textContent = e === "MODE_RESTRICTED" ? "Mode saat ini tidak mengizinkan aksi ini. Ujian: tambah soal ke jadwal admin. Harian: buat ulangan sendiri." : "Gagal menyimpan detail ulangan.";
    }
    btn.disabled = false;
  });
})();
