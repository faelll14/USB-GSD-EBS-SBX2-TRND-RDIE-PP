(async function () {
  await SessionGuard.requireRole("siswa");
  await ThemeController.init();
  ThemeController.bindSheet("btnTheme", "themeScrim", "themeCloseX", "themeCloseBottom", "themeGrid");

  let session = null;
  let scheduleCache = null;
  const loadedSections = new Set();

  const navButtons = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".section");

  function switchSection(target) {
    navButtons.forEach((b) => b.classList.toggle("active", b.dataset.target === target));
    sections.forEach((s) => s.classList.toggle("active", s.id === "section-" + target));
    if (!loadedSections.has(target)) {
      loadedSections.add(target);
      loadSection(target);
    }
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchSection(btn.dataset.target));
  });

  function formatExamWindow(item) {
    return item.date + " &middot; " + item.startLabel + " (" + item.durationMinutes + " menit)";
  }

  function examStatus(item, now) {
    const start = new Date(item.startTimestamp);
    const end = new Date(item.startTimestamp + item.durationMinutes * 60000);
    if (now < start) return "belum-mulai";
    if (now >= start && now <= end) return "berlangsung";
    return "selesai";
  }

  async function ensureSchedule() {
    if (scheduleCache) return scheduleCache;
    try {
      scheduleCache = await DashBridge.getExamSchedule();
    } catch (e) {
      scheduleCache = { items: [] };
    }
    return scheduleCache;
  }

  async function loadSection(target) {
    if (target === "dashboard") return loadDashboard();
    if (target === "ujian") return loadUjian();
    if (target === "nilai") return loadNilai();
    if (target === "pengaturan") return loadPengaturan();
  }

  async function loadDashboard() {
    GreetingHelper.apply("greetingIcon", "greetingSub", "greetingName", session.fullName, "Siswa");
    document.getElementById("greetingDetail").innerHTML = "Kelas " + (session.kelas || "-") + " &middot; NIS " + session.nisNip;

    const statAvgEl = document.getElementById("statAvg");
    const avgIsNumeric = session.avgScorePublished && session.avgScore != null;
    statAvgEl.textContent = avgIsNumeric ? session.avgScore.toFixed(1) : "Belum tersedia";
    statAvgEl.classList.toggle("stat-value-small", !avgIsNumeric);

    try {
      const board = await DashBridge.getLeaderboard();
      renderLeaderboard(board, "leaderboardList");
      const rankEl = document.getElementById("statRank");
      if (board && board.published && Array.isArray(board.top10)) {
        const mine = board.top10.findIndex((r) => r.uid === session.uid);
        const rankIsNumeric = mine >= 0;
        rankEl.textContent = rankIsNumeric ? "#" + (mine + 1) : "Tidak masuk 10 besar";
        rankEl.classList.toggle("stat-value-small", !rankIsNumeric);
      } else {
        rankEl.textContent = "Belum dipublikasikan";
        rankEl.classList.add("stat-value-small");
      }
    } catch (e) {
      document.getElementById("leaderboardList").innerHTML = '<div class="empty-state">Peringkat belum tersedia.</div>';
    }

    const schedule = await ensureSchedule();
    renderScheduleList(schedule, "dashboardScheduleList", 3);
  }

  function renderLeaderboard(board, containerId) {
    const el = document.getElementById(containerId);
    if (!board || !board.published || !Array.isArray(board.top10) || board.top10.length === 0) {
      el.innerHTML = '<div class="empty-state">Peringkat belum dipublikasikan admin.</div>';
      return;
    }
    el.innerHTML = board.top10.map((row, i) => `
      <div class="leaderboard-row">
        <div class="rank-badge">${i + 1}</div>
        <div class="leaderboard-name">${escapeHtml(row.name)}</div>
        <div class="leaderboard-score">${row.score.toFixed(1)}</div>
      </div>
    `).join("");
  }

  function renderScheduleList(schedule, containerId, limit) {
    const el = document.getElementById(containerId);
    const items = (schedule.items || []).slice(0, limit || 100);
    if (items.length === 0) {
      el.innerHTML = '<div class="empty-state">Belum ada jadwal ujian.</div>';
      return;
    }
    const now = Date.now();
    el.innerHTML = items.map((item) => {
      const status = examStatus(item, now);
      const badgeText = status === "belum-mulai" ? "Belum mulai" : status === "berlangsung" ? "Berlangsung" : "Selesai";
      return `
      <div class="exam-card-top">
        <div>
          <p class="exam-subject">${escapeHtml(item.subject)}</p>
          <p class="exam-meta">${formatExamWindow(item)}</p>
        </div>
        <span class="exam-badge">${badgeText}</span>
      </div>`;
    }).join("");
  }

  async function loadUjian() {
    const schedule = await ensureSchedule();
    const el = document.getElementById("examList");
    const items = schedule.items || [];
    if (items.length === 0) {
      el.innerHTML = '<div class="empty-state">Belum ada jadwal ujian untuk kelasmu.</div>';
      return;
    }
    el.innerHTML = items.map((item) => `
      <div class="card exam-card" data-exam-id="${item.id}">
        <div class="exam-card-top">
          <div>
            <p class="exam-subject">${escapeHtml(item.subject)}</p>
            <p class="exam-meta">${formatExamWindow(item)}</p>
          </div>
        </div>
        <button class="btn btn-primary" data-start="${item.id}">Mulai</button>
      </div>
    `).join("");

    el.querySelectorAll("[data-start]").forEach((btn) => {
      btn.addEventListener("click", () => handleStartExam(btn.dataset.start));
    });
  }

  function handleStartExam(examId) {
    const schedule = scheduleCache;
    const item = (schedule.items || []).find((x) => x.id === examId);
    if (!item) return;
    const status = examStatus(item, Date.now());
    if (status === "belum-mulai") {
      showToast("Ujian belum dimulai. Kembali lagi saat jadwal tiba.");
      return;
    }
    if (status === "selesai") {
      showToast("Waktu ujian ini sudah berakhir.");
      return;
    }
    DashBridge.attemptStartExam(examId).catch(() => {
      showToast("Gagal membuka ujian. Periksa koneksi internet.");
    });
  }

  async function loadNilai() {
    const el = document.getElementById("resultsList");
    try {
      const results = await DashBridge.getMyResults();
      if (!results || !results.items || results.items.length === 0) {
        el.innerHTML = '<div class="empty-state">Belum ada nilai yang dipublikasikan.</div>';
        return;
      }
      el.innerHTML = results.items.map((r) => `
        <div class="card result-card">
          <div class="result-top">
            <span class="result-subject">${escapeHtml(r.subject)}</span>
            <span class="result-score">${r.score.toFixed(1)}</span>
          </div>
          <div class="result-detail-row"><span>Pengawas</span><span>${escapeHtml(r.supervisor || "-")}</span></div>
          <div class="result-detail-row"><span>Waktu pengerjaan</span><span>${escapeHtml(r.completedAt || "-")}</span></div>
        </div>
      `).join("");
    } catch (e) {
      el.innerHTML = '<div class="empty-state">Belum ada nilai yang dipublikasikan.</div>';
    }
  }

  async function loadPengaturan() {
    document.getElementById("accountInfoSub").textContent = "NIS " + session.nisNip + " &middot; " + (session.kelas || "-");
    try {
      const account = await DashBridge.getAccountInfo();
      document.getElementById("usernameSub").textContent = account.username || "Belum diatur";
      document.getElementById("biometricSub").textContent = account.biometricMethod
        ? (account.biometricMethod === "face" ? "Face ID aktif" : "Sidik jari aktif")
        : "Nonaktif";
    } catch (e) {}
  }

  const usernameScrim = document.getElementById("usernameScrim");
  document.getElementById("rowUsername").addEventListener("click", () => {
    document.getElementById("usernameFormError").textContent = "";
    document.getElementById("usernameInputNew").value = "";
    usernameScrim.classList.add("open");
  });
  document.getElementById("usernameCloseX").addEventListener("click", () => usernameScrim.classList.remove("open"));
  document.getElementById("usernameCloseBottom").addEventListener("click", () => usernameScrim.classList.remove("open"));
  usernameScrim.addEventListener("click", (e) => { if (e.target === usernameScrim) usernameScrim.classList.remove("open"); });

  document.getElementById("usernameSubmit").addEventListener("click", async () => {
    const val = document.getElementById("usernameInputNew").value.trim();
    const errorEl = document.getElementById("usernameFormError");
    errorEl.textContent = "";
    try {
      await DashBridge.setUsername(val);
      usernameScrim.classList.remove("open");
      loadedSections.delete("pengaturan");
      loadPengaturan();
      showToast("Username berhasil disimpan.");
    } catch (e) {
      const messages = {
        TOO_SHORT: "Username minimal 4 karakter.",
        INVALID_FORMAT: "Hanya boleh huruf, angka, underscore, dan strip.",
        USERNAME_TAKEN: "Username sudah dipakai orang lain.",
        LIMIT_REACHED: "Kamu sudah mengganti username 2 kali minggu ini.",
        NETWORK_ERROR: "Tidak ada koneksi internet."
      };
      errorEl.textContent = messages[e] || "Gagal menyimpan username.";
    }
  });

  const accountInfoScrim = document.getElementById("accountInfoScrim");
  document.getElementById("rowAccountInfo").addEventListener("click", async () => {
    document.getElementById("infoFullName").textContent = session.fullName || "-";
    document.getElementById("infoNis").textContent = session.nisNip || "-";
    document.getElementById("infoKelas").textContent = session.kelas || "-";
    document.getElementById("infoRole").textContent = "Siswa";
    document.getElementById("infoUsername").textContent = "Memuat...";
    accountInfoScrim.classList.add("open");
    try {
      const account = await DashBridge.getAccountInfo();
      document.getElementById("infoUsername").textContent = account.username || "Belum diatur";
    } catch (e) {
      document.getElementById("infoUsername").textContent = "-";
    }
  });
  document.getElementById("accountInfoCloseX").addEventListener("click", () => accountInfoScrim.classList.remove("open"));
  document.getElementById("accountInfoCloseBottom").addEventListener("click", () => accountInfoScrim.classList.remove("open"));
  accountInfoScrim.addEventListener("click", (e) => { if (e.target === accountInfoScrim) accountInfoScrim.classList.remove("open"); });

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
    const submitBtn = document.getElementById("passwordSubmit");
    errorEl.textContent = "";

    if (!oldPw || !newPw) {
      errorEl.textContent = "Isi kata sandi lama dan baru.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Menyimpan...";
    try {
      await DashBridge.changePassword(oldPw, newPw);
      passwordScrim.classList.remove("open");
      showToast("Kata sandi berhasil diubah.");
    } catch (e) {
      const messages = {
        WRONG_OLD_PASSWORD: "Kata sandi saat ini salah.",
        WEAK_PASSWORD: "Kata sandi baru minimal 6 karakter.",
        NETWORK_ERROR: "Tidak ada koneksi internet.",
        NOT_SIGNED_IN: "Sesi login bermasalah. Coba logout lalu masuk kembali.",
        UNKNOWN_ERROR: "Terjadi kesalahan. Coba lagi dalam beberapa saat.",
        BRIDGE_UNAVAILABLE: "Fitur ini tidak tersedia. Perbarui aplikasi."
      };
      errorEl.textContent = messages[e] || ("Gagal mengubah kata sandi (" + e + ").");
    }
    submitBtn.disabled = false;
    submitBtn.textContent = "Simpan";
  });

  const biometricScrim = document.getElementById("biometricScrim");
  document.getElementById("rowBiometric").addEventListener("click", async () => {
    document.getElementById("biometricFormError").textContent = "";
    biometricScrim.classList.add("open");
    const faceBtn = document.getElementById("modalBtnFaceId");
    const fpBtn = document.getElementById("modalBtnFingerprint");
    const statusEl = document.getElementById("a2lStatus");
    const turnOffBtn = document.getElementById("biometricTurnOff");

    try {
      const account = await DashBridge.getAccountInfo();
      if (account.biometricMethod === "face") {
        statusEl.textContent = "Status: Aktif dengan Face ID";
        turnOffBtn.style.display = "block";
      } else if (account.biometricMethod === "fingerprint") {
        statusEl.textContent = "Status: Aktif dengan Sidik Jari";
        turnOffBtn.style.display = "block";
      } else {
        statusEl.textContent = "Status: Belum diatur";
        turnOffBtn.style.display = "none";
      }
    } catch (e) {
      statusEl.textContent = "Status: Belum diatur";
      turnOffBtn.style.display = "none";
    }

    try {
      const caps = await DashBridge.checkBiometricAvailability();
      faceBtn.disabled = !caps.faceAvailable;
      fpBtn.disabled = !caps.fingerprintAvailable;
    } catch (e) {
      faceBtn.disabled = true;
      fpBtn.disabled = true;
    }
  });
  document.getElementById("biometricCloseX").addEventListener("click", () => biometricScrim.classList.remove("open"));
  document.getElementById("biometricCloseBottom").addEventListener("click", () => biometricScrim.classList.remove("open"));
  biometricScrim.addEventListener("click", (e) => { if (e.target === biometricScrim) biometricScrim.classList.remove("open"); });

  async function selectBiometric(method) {
    const errorEl = document.getElementById("biometricFormError");
    errorEl.textContent = "";
    try {
      await DashBridge.setBiometricEnabled(method);
      biometricScrim.classList.remove("open");
      loadedSections.delete("pengaturan");
      loadPengaturan();
      showToast(method === "none" ? "Masuk cepat dimatikan." : "Masuk cepat diaktifkan.");
    } catch (e) {
      errorEl.textContent = e === "BIOMETRIC_FAILED" ? "Verifikasi gagal. Coba lagi." : "Gagal menyimpan pengaturan.";
    }
  }

  document.getElementById("modalBtnFaceId").addEventListener("click", () => selectBiometric("face"));
  document.getElementById("modalBtnFingerprint").addEventListener("click", () => selectBiometric("fingerprint"));
  document.getElementById("biometricTurnOff").addEventListener("click", () => selectBiometric("none"));

  const historyScrim = document.getElementById("historyScrim");
  document.getElementById("rowLoginHistory").addEventListener("click", async () => {
    historyScrim.classList.add("open");
    const listEl = document.getElementById("historyList");
    listEl.innerHTML = '<div class="skeleton"></div>';
    try {
      const history = await DashBridge.getLoginHistory();
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
      el.style.cssText = "position:fixed;left:50%;bottom:100px;transform:translateX(-50%);background:var(--surface-solid);color:var(--text-primary);padding:12px 18px;border-radius:var(--radius-md);border:1px solid var(--surface-border);font-size:13px;z-index:99;box-shadow:var(--shadow-elev);max-width:80%;text-align:center;";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = "0"; }, 2600);
  }

  document.getElementById("btnLogout").addEventListener("click", async () => {
    try {
      await DashBridge.logout();
      window.location.href = "../index.html";
    } catch (e) {
      showToast(e === "EXAM_IN_PROGRESS" ? "Tidak bisa keluar saat sedang ujian." : "Gagal keluar.");
    }
  });

  try {
    session = await DashBridge.getSession();
  } catch (e) {
    session = { fullName: "", role: "siswa", kelas: "", nisNip: "", uid: "" };
  }

  let schoolInfo = {};
  try {
    schoolInfo = await DashBridge.getSchoolInfo();
    if (schoolInfo && schoolInfo.name) document.getElementById("schoolName").textContent = schoolInfo.name;
    SiteFooter.render("siteFooter", schoolInfo, (url) => DashBridge.openExternal(url).catch(() => {}));
  } catch (e) {}

  document.getElementById("rowDeveloper").addEventListener("click", () => {
    SiteFooter.confirmAndOpen(schoolInfo.developerUrl, (url) => DashBridge.openExternal(url).catch(() => {}));
  });

  switchSection("dashboard");
})();
