(async function () {
  await ThemeController.init();
  ThemeController.bindSheet("btnTheme", "themeScrim", "themeCloseX", "themeCloseBottom", "themeGrid");

  let session = null;
  let scheduleItems = [];
  let selectedExam = null;
  let participants = [];
  let activeStatusFilter = "all";
  let pollInterval = null;

  try {
    session = await PanitiaBridge.getSession();
  } catch (e) {
    session = { fullName: "Panitia" };
  }
  GreetingHelper.apply("greetingIcon", "greetingSub", "greetingName", session.fullName, "Panitia");

  try {
    const info = await PanitiaBridge.getSchoolInfo();
    if (info && info.name) document.getElementById("schoolName").textContent = info.name;
    SiteFooter.render("siteFooter", info, (url) => PanitiaBridge.openExternal(url).catch(() => {}));
  } catch (e) {}

  document.getElementById("btnLogout").addEventListener("click", async () => {
    try { await PanitiaBridge.logout(); } catch (e) {}
  });

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  const examSelect = document.getElementById("examSelect");

  async function loadMyDuty() {
    const el = document.getElementById("myDutyList");
    try {
      const result = await PanitiaBridge.getMyDutySchedule();
      const items = (result && result.items) || [];
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
  loadMyDuty();

  async function loadSchedule() {
    try {
      const result = await PanitiaBridge.listExamSchedule();
      scheduleItems = (result && result.items) || [];
      if (scheduleItems.length === 0) {
        examSelect.innerHTML = '<option value="">Belum ada jadwal ujian</option>';
        return;
      }
      examSelect.innerHTML = '<option value="">Pilih jadwal...</option>' +
        scheduleItems.map((item) => `<option value="${item.id}">${escapeHtml(item.subject)} &mdash; ${escapeHtml(item.date)} ${escapeHtml(item.startLabel)}</option>`).join("");
    } catch (e) {
      examSelect.innerHTML = '<option value="">Gagal memuat jadwal</option>';
    }
  }

  function withinControlWindow(item) {
    const now = Date.now();
    const gateOpen = item.startTimestamp - 15 * 60 * 1000;
    const gateClose = item.startTimestamp + item.durationMinutes * 60000;
    return now >= gateOpen && now <= gateClose;
  }

  examSelect.addEventListener("change", () => {
    clearInterval(pollInterval);
    const id = examSelect.value;
    selectedExam = scheduleItems.find((x) => x.id === id) || null;
    renderControlArea();
    if (selectedExam && withinControlWindow(selectedExam)) {
      refreshParticipants();
      pollInterval = setInterval(refreshParticipants, 15000);
    }
  });

  function renderControlArea() {
    const el = document.getElementById("controlArea");
    if (!selectedExam) {
      el.innerHTML = "";
      return;
    }
    if (!withinControlWindow(selectedExam)) {
      const now = Date.now();
      const message = now < selectedExam.startTimestamp - 15 * 60 * 1000
        ? "Kontrol ruang untuk jadwal ini akan terbuka 15 menit sebelum ujian dimulai."
        : "Waktu kontrol untuk jadwal ini sudah berakhir.";
      el.innerHTML = `<div class="card"><div class="time-gate-notice">${message}</div></div>`;
      return;
    }
    el.innerHTML = `
      <div class="card">
        <div class="status-tabs" id="statusTabs">
          <button class="status-tab active" data-status="all">Semua</button>
          <button class="status-tab" data-status="not_started">Belum Mulai</button>
          <button class="status-tab" data-status="in_progress">Sedang Ujian</button>
          <button class="status-tab" data-status="completed">Selesai</button>
          <button class="status-tab" data-status="violations">Melanggar</button>
        </div>
        <div id="participantList"><div class="skeleton"></div></div>
      </div>
    `;
    document.querySelectorAll(".status-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".status-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        activeStatusFilter = tab.dataset.status;
        renderParticipantList();
      });
    });
  }

  async function refreshParticipants() {
    if (!selectedExam) return;
    try {
      const result = await PanitiaBridge.getRoomControl(selectedExam.id);
      participants = (result && result.items) || [];
      renderParticipantList();
    } catch (e) {}
  }

  function statusLabel(p) {
    if (p.locked) return { text: "Terkunci", cls: "locked" };
    if (p.status === "completed") return { text: "Selesai", cls: "completed" };
    if (p.status === "in_progress") return { text: "Sedang Ujian", cls: "in-progress" };
    return { text: "Belum Mulai", cls: "not-started" };
  }

  function renderParticipantList() {
    const el = document.getElementById("participantList");
    if (!el) return;
    let items = participants;
    if (activeStatusFilter === "violations") {
      items = items.filter((p) => (p.violationCount || 0) > 0);
    } else if (activeStatusFilter !== "all") {
      items = items.filter((p) => (p.status || "not_started") === activeStatusFilter);
    }
    items = items.slice().sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));

    if (items.length === 0) {
      el.innerHTML = '<div class="empty-state">Tidak ada siswa pada kategori ini.</div>';
      return;
    }

    el.innerHTML = items.map((p) => {
      const st = statusLabel(p);
      return `
      <div class="participant-row">
        <span class="participant-name">${escapeHtml(p.fullName || "(tanpa nama)")}</span>
        ${(p.violationCount || 0) > 0 ? `<span class="violation-count">${p.violationCount}x</span>` : ""}
        <span class="status-pill ${st.cls}">${st.text}</span>
        ${p.locked ? `<button class="unlock-btn" data-unlock="${p.uid}">Buka</button>` : ""}
      </div>`;
    }).join("");

    el.querySelectorAll("[data-unlock]").forEach((btn) => {
      btn.addEventListener("click", () => openUnlockModal(btn.dataset.unlock));
    });
  }

  const unlockScrim = document.getElementById("unlockScrim");
  let unlockTargetUid = null;

  function openUnlockModal(uid) {
    const p = participants.find((x) => x.uid === uid);
    unlockTargetUid = uid;
    document.getElementById("unlockStudentName").textContent = p ? p.fullName : "";
    document.getElementById("unlockReasonInput").value = "";
    document.getElementById("unlockFormError").textContent = "";
    unlockScrim.classList.add("open");
  }

  document.getElementById("unlockCloseX").addEventListener("click", () => unlockScrim.classList.remove("open"));
  document.getElementById("unlockCloseBottom").addEventListener("click", () => unlockScrim.classList.remove("open"));
  unlockScrim.addEventListener("click", (e) => { if (e.target === unlockScrim) unlockScrim.classList.remove("open"); });

  document.getElementById("unlockSubmit").addEventListener("click", async () => {
    const reason = document.getElementById("unlockReasonInput").value.trim();
    const errorEl = document.getElementById("unlockFormError");
    if (!reason) {
      errorEl.textContent = "Alasan wajib diisi.";
      return;
    }
    try {
      await PanitiaBridge.unlockParticipant(selectedExam.id, unlockTargetUid, reason);
      unlockScrim.classList.remove("open");
      refreshParticipants();
    } catch (e) {
      errorEl.textContent = "Gagal membuka kunci. Coba lagi.";
    }
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
  passwordScrim.addEventListener("click", (e) => { if (e.target === passwordScrim) passwordScrim.classList.remove("open"); });

  document.getElementById("passwordSubmit").addEventListener("click", async () => {
    const oldPw = document.getElementById("oldPasswordInput").value;
    const newPw = document.getElementById("newPasswordInput").value;
    const errorEl = document.getElementById("passwordFormError");
    errorEl.textContent = "";
    try {
      await PanitiaBridge.changePassword(oldPw, newPw);
      passwordScrim.classList.remove("open");
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
      const history = await PanitiaBridge.getLoginHistory();
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
})();
