(async function () {
  await ThemeController.init();
  ThemeController.bindSheet("btnTheme", "themeScrim", "themeCloseX", "themeCloseBottom", "themeGrid");

  let session = null;
  let allAccounts = [];
  let activeRoleFilter = "all";
  let searchTerm = "";
  let accountSortMode = "role_absen";

  try {
    session = await AdminBridge.getSession();
  } catch (e) {
    session = { fullName: "Admin" };
  }
  GreetingHelper.apply("greetingIcon", "greetingSub", "greetingName", session.fullName, "Admin");

  const navButtons = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".section");
  const loadedSections = new Set(["akun"]);

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      navButtons.forEach((b) => b.classList.toggle("active", b === btn));
      sections.forEach((s) => s.classList.toggle("active", s.id === "section-" + btn.dataset.target));
      if (btn.dataset.target === "jadwal" && !loadedSections.has("jadwal")) {
        loadedSections.add("jadwal");
        refreshJadwal();
      }
      if (btn.dataset.target === "jaga" && !loadedSections.has("jaga")) {
        loadedSections.add("jaga");
        loadDutyExamOptions();
      }
      if (btn.dataset.target === "pelanggaran" && !loadedSections.has("pelanggaran")) {
        loadedSections.add("pelanggaran");
        loadViolations();
      }
      if (btn.dataset.target === "backup" && !loadedSections.has("backup")) {
        loadedSections.add("backup");
        loadBackupSection();
      }
    });
  });

  try {
    const info = await AdminBridge.getSchoolInfo();
    if (info && info.name) document.getElementById("schoolName").textContent = info.name;
    SiteFooter.render("siteFooter", info, (url) => AdminBridge.openExternal(url).catch(() => {}));
  } catch (e) {}

  document.getElementById("btnLogout").addEventListener("click", async () => {
    try {
      await AdminBridge.logout();
    } catch (e) {}
  });

  const roleLabels = { siswa: "Siswa", panitia: "Panitia", guru: "Guru", admin: "Admin" };

  const createScrim = document.getElementById("createScrim");
  let creatingRole = "siswa";

  document.querySelectorAll(".create-role-btn").forEach((btn) => {
    btn.addEventListener("click", () => openCreateModal(btn.dataset.role));
  });

  function openCreateModal(role) {
    creatingRole = role;
    document.getElementById("createTitle").textContent = "Buat Akun " + roleLabels[role];
    document.getElementById("createIdLabel").textContent = role === "siswa" ? "NIS" : "NIP";
    document.getElementById("createFullName").value = "";
    document.getElementById("createIdentifier").value = "";
    document.getElementById("createKelas").value = "";
    document.getElementById("createAbsen").value = "";
    document.getElementById("createFormError").textContent = "";
    document.getElementById("createKelasField").style.display = role === "siswa" ? "block" : "none";
    document.getElementById("createAbsenField").style.display = role === "siswa" ? "block" : "none";
    createScrim.classList.add("open");
  }

  document.getElementById("createCloseX").addEventListener("click", () => createScrim.classList.remove("open"));
  document.getElementById("createCloseBottom").addEventListener("click", () => createScrim.classList.remove("open"));
  createScrim.addEventListener("click", (e) => { if (e.target === createScrim) createScrim.classList.remove("open"); });

  document.getElementById("createSubmit").addEventListener("click", async () => {
    const errorEl = document.getElementById("createFormError");
    errorEl.textContent = "";
    const fullName = document.getElementById("createFullName").value.trim();
    const identifier = document.getElementById("createIdentifier").value.trim();
    const kelas = document.getElementById("createKelas").value.trim();
    const absenRaw = document.getElementById("createAbsen").value;

    if (!fullName || !identifier) {
      errorEl.textContent = "Nama dan NIS/NIP wajib diisi.";
      return;
    }
    if (creatingRole === "siswa" && (!kelas || !absenRaw)) {
      errorEl.textContent = "Kelas dan nomor absen wajib diisi untuk siswa.";
      return;
    }

    const payload = {
      role: creatingRole,
      fullName: fullName,
      nisNip: identifier,
      kelas: creatingRole === "siswa" ? kelas : null,
      noAbsen: creatingRole === "siswa" ? parseInt(absenRaw, 10) : null
    };

    const btn = document.getElementById("createSubmit");
    btn.disabled = true;
    try {
      await AdminBridge.createAccount(payload);
      createScrim.classList.remove("open");
      showToast("Akun berhasil dibuat.");
      refreshAccounts();
    } catch (e) {
      const messages = {
        INVALID_INPUT: "Data belum lengkap atau tidak valid.",
        IDENTIFIER_TAKEN: "NIS/NIP ini sudah terdaftar.",
        NETWORK_ERROR: "Tidak ada koneksi internet."
      };
      errorEl.textContent = messages[e] || "Gagal membuat akun.";
    }
    btn.disabled = false;
  });

  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeRoleFilter = chip.dataset.role;
      renderAccounts();
    });
  });

  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    renderAccounts();
  });

  document.getElementById("accountSortSelect").addEventListener("change", (e) => {
    accountSortMode = e.target.value;
    renderAccounts();
  });

  async function refreshAccounts() {
    const el = document.getElementById("accountList");
    el.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    try {
      const result = await AdminBridge.listAccounts();
      allAccounts = (result && result.items) || [];
      renderAccounts();
    } catch (e) {
      el.innerHTML = '<div class="empty-state">Gagal memuat daftar akun.</div>';
    }
  }

  const ROLE_ORDER = { admin: 0, panitia: 1, guru: 2, siswa: 3 };

  function compareByKelasAbsen(a, b) {
    const ka = a.kelas || "";
    const kb = b.kelas || "";
    const kc = ka.localeCompare(kb, undefined, { numeric: true, sensitivity: "base" });
    if (kc !== 0) return kc;
    const aa = a.noAbsen != null ? a.noAbsen : 999999;
    const ab = b.noAbsen != null ? b.noAbsen : 999999;
    if (aa !== ab) return aa - ab;
    return a.fullName.localeCompare(b.fullName);
  }

  function renderAccounts() {
    const el = document.getElementById("accountList");
    let items = allAccounts;
    if (activeRoleFilter !== "all") {
      items = items.filter((a) => a.role === activeRoleFilter);
    }
    if (searchTerm) {
      items = items.filter((a) =>
        a.fullName.toLowerCase().includes(searchTerm) || a.nisNip.toLowerCase().includes(searchTerm)
      );
    }

    items = items.slice();
    if (accountSortMode === "az") {
      items.sort((a, b) => a.fullName.localeCompare(b.fullName));
    } else if (accountSortMode === "role_az") {
      items.sort((a, b) => {
        const ro = (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9);
        if (ro !== 0) return ro;
        return a.fullName.localeCompare(b.fullName);
      });
    } else {
      items.sort((a, b) => {
        const ro = (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9);
        if (ro !== 0) return ro;
        if (a.role === "siswa" && b.role === "siswa") return compareByKelasAbsen(a, b);
        return a.fullName.localeCompare(b.fullName);
      });
    }

    if (items.length === 0) {
      el.innerHTML = '<div class="empty-state">Tidak ada akun yang cocok.</div>';
      return;
    }

    el.innerHTML = items.map((a) => `
      <div class="account-row">
        <div class="account-avatar">${escapeHtml((a.fullName || "?").charAt(0).toUpperCase())}</div>
        <div class="account-info">
          <div class="account-name">${escapeHtml(a.fullName)}</div>
          <div class="account-meta">${escapeHtml(a.nisNip)}${a.kelas ? " &middot; " + escapeHtml(a.kelas) : ""}${a.username ? " &middot; @" + escapeHtml(a.username) : ""}</div>
        </div>
        ${a.passwordIsDefault ? '<span class="default-pw-flag">PW DEFAULT</span>' : ""}
        <span class="role-badge role-${a.role}">${a.role}</span>
      </div>
    `).join("");
  }

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

  const jadwalScrim = document.getElementById("jadwalScrim");
  let selectedGrades = new Set();

  document.getElementById("btnAddJadwal").addEventListener("click", () => {
    document.getElementById("jadwalSubject").value = "";
    document.getElementById("jadwalDate").value = "";
    document.getElementById("jadwalHour").value = "";
    document.getElementById("jadwalMinute").value = "";
    document.getElementById("jadwalDuration").value = "";
    document.getElementById("jadwalFormError").textContent = "";
    selectedGrades = new Set();
    document.querySelectorAll("[data-grade]").forEach((b) => b.style.opacity = "0.55");
    jadwalScrim.classList.add("open");
  });

  document.querySelectorAll("[data-grade]").forEach((btn) => {
    btn.style.opacity = "0.55";
    btn.addEventListener("click", () => {
      const g = btn.dataset.grade;
      if (selectedGrades.has(g)) {
        selectedGrades.delete(g);
        btn.style.opacity = "0.55";
      } else {
        selectedGrades.add(g);
        btn.style.opacity = "1";
      }
    });
  });

  document.getElementById("jadwalCloseX").addEventListener("click", () => jadwalScrim.classList.remove("open"));
  document.getElementById("jadwalCloseBottom").addEventListener("click", () => jadwalScrim.classList.remove("open"));
  jadwalScrim.addEventListener("click", (e) => { if (e.target === jadwalScrim) jadwalScrim.classList.remove("open"); });

  document.getElementById("jadwalSubmit").addEventListener("click", async () => {
    const errorEl = document.getElementById("jadwalFormError");
    errorEl.textContent = "";
    const subject = document.getElementById("jadwalSubject").value.trim();
    const dateVal = document.getElementById("jadwalDate").value;
    const hour = parseInt(document.getElementById("jadwalHour").value, 10);
    const minute = parseInt(document.getElementById("jadwalMinute").value, 10);
    const ampm = document.getElementById("jadwalAmPm").value;
    const duration = parseInt(document.getElementById("jadwalDuration").value, 10);

    if (!subject || !dateVal || isNaN(hour) || isNaN(minute) || isNaN(duration) || selectedGrades.size === 0) {
      errorEl.textContent = "Lengkapi semua data termasuk minimal satu target kelas.";
      return;
    }

    let hour24 = hour % 12;
    if (ampm === "PM") hour24 += 12;
    const [y, m, d] = dateVal.split("-").map((n) => parseInt(n, 10));
    const startDate = new Date(y, m - 1, d, hour24, minute, 0, 0);

    const payload = {
      subject: subject,
      kelasTargets: Array.from(selectedGrades),
      date: dateVal,
      startLabel: (hour < 10 ? "0" + hour : hour) + ":" + (minute < 10 ? "0" + minute : minute) + " " + ampm,
      startTimestamp: startDate.getTime(),
      durationMinutes: duration
    };

    const btn = document.getElementById("jadwalSubmit");
    btn.disabled = true;
    try {
      await AdminBridge.createExamSchedule(payload);
      jadwalScrim.classList.remove("open");
      showToast("Jadwal berhasil disimpan.");
      refreshJadwal();
    } catch (e) {
      errorEl.textContent = "Gagal menyimpan jadwal.";
    }
    btn.disabled = false;
  });

  async function refreshJadwal() {
    const el = document.getElementById("jadwalList");
    el.innerHTML = '<div class="skeleton"></div>';
    try {
      const result = await AdminBridge.listExamSchedule();
      const items = (result && result.items) || [];
      if (items.length === 0) {
        el.innerHTML = '<div class="empty-state">Belum ada jadwal ujian.</div>';
        return;
      }
      el.innerHTML = items.map((item) => `
        <div class="card exam-card">
          <div class="exam-card-top">
            <div>
              <p class="exam-subject">${escapeHtml(item.subject)}</p>
              <p class="exam-meta">${escapeHtml(item.date)} &middot; ${escapeHtml(item.startLabel)} &middot; ${item.durationMinutes} menit</p>
              <p class="exam-meta">Kelas: ${item.kelasTargets.join(", ")}</p>
            </div>
          </div>
          <div class="question-actions">
            <button class="btn btn-ghost" data-publish="${item.id}">Publikasikan Nilai</button>
            <button class="btn btn-ghost" data-unpublish="${item.id}" style="color:var(--text-tertiary);">Sembunyikan Nilai</button>
          </div>
        </div>
      `).join("");

      el.querySelectorAll("[data-publish]").forEach((btn) => {
        btn.addEventListener("click", () => handlePublish(btn.dataset.publish, true));
      });
      el.querySelectorAll("[data-unpublish]").forEach((btn) => {
        btn.addEventListener("click", () => handlePublish(btn.dataset.unpublish, false));
      });
    } catch (e) {
      el.innerHTML = '<div class="empty-state">Gagal memuat jadwal.</div>';
    }
  }

  async function handlePublish(examId, publish) {
    try {
      const result = await AdminBridge.setResultsPublished(examId, publish);
      showToast(publish
        ? "Nilai dipublikasikan untuk " + result.affected + " siswa."
        : "Nilai disembunyikan kembali.");
    } catch (e) {
      showToast("Gagal memperbarui status publikasi.");
    }
  }

  const ACCOUNT_AI_PROMPT = `Kamu adalah asisten yang membantu memformat data akun siswa untuk sistem CBT (Computer Based Test) sekolah.
TUGASMU: Baca data yang saya berikan (bisa dari file Excel, tabel Word, teks acak, atau format apapun), lalu konversi SELURUHNYA ke format teks yang bisa langsung di-paste ke sistem.
FORMAT OUTPUT YANG HARUS DIIKUTI:
Untuk siswa:
nis, nama_lengkap, kelas, no_absen, no_ruang, siswa
Untuk panitia:
nis, nama_lengkap, panitia
Untuk guru:
nis, nama_lengkap, guru
Untuk admin:
nis, nama_lengkap, admin
ATURAN KELAS (ikuti persis):
- Kelas 10: X.1, X.2, X.3, X.4 (bukan "10A" atau "Kelas X1")
- Kelas 11 IPA: XI IPA.1, XI IPA.2, XI IPA.3 (bukan "11 IPA1")
- Kelas 11 IPS: XI IPS.1, XI IPS.2, XI IPS.3 (bukan "11IPS1")
- Kelas 12 IPA: XII IPA.1, XII IPA.2 dll
- Kelas 12 IPS: XII IPS.1, XII IPS.2 dll
- Jika tidak ada jurusan (X): gunakan X.1, X.2 dll
ATURAN LAIN:
- no_absen harus angka, unik per kelas (tidak boleh ada dua siswa dengan absen sama di kelas yang sama)
- no_ruang hanya angka (1-99)
- NIS boleh angka panjang berapapun
- Nama tidak disingkat, tulis lengkap sesuai data
ATURAN OUTPUT:
- OUTPUT HANYA berisi baris-baris data, TIDAK ADA kalimat pembuka, penjelasan, catatan, atau basa-basi
- TIDAK ADA header tabel
- TIDAK ADA penomoran baris
- TIDAK ADA markdown (tidak ada **, tidak ada \`\`\`)
- Satu akun = satu baris
- Jika ada data yang ambigu atau tidak lengkap, gunakan nilai default yang masuk akal
- Jika ada duplikasi no absen dalam satu kelas, tambahkan nomor unik secara berurutan
CONTOH OUTPUT:
14551563624, Trio Lesnar Poe, X.2, 12, 1, siswa
76543673626, Brock Lesnar, XI IPA.1, 11, 5, siswa
74647827832, Obama Marack, XI IPS.3, 1, 1, siswa
11, Leonardo Boim, panitia
162, Joko Suli, guru
Sekarang proses data berikut ini:`;

  const ROOM_AI_PROMPT = `Kamu adalah asisten yang membantu memformat data penempatan ruang ujian siswa.
TUGASMU: Baca file atau data yang saya berikan (berisi daftar siswa dan ruang ujian mereka, dalam format apapun), lalu ubah ke format berikut yang siap di-paste ke sistem.
FORMAT OUTPUT:
nis, no_ruang
ATURAN:
- Satu siswa = satu baris
- no_ruang mengikuti data asli (boleh angka seperti 1, 2, 3 atau nama ruang jika memang begitu di data asli)
- Pastikan tidak ada duplikat baris untuk NIS yang sama
- NIS harus persis sesuai data asli, jangan diubah
ATURAN OUTPUT:
- OUTPUT HANYA berisi baris-baris data, TIDAK ADA kalimat pembuka, penjelasan, atau catatan
- TIDAK ADA header tabel, TIDAK ADA penomoran, TIDAK ADA markdown
CONTOH OUTPUT:
12345678, 1
12346578, 1
725185160, 2
Sekarang proses data berikut ini:`;

  const aiPromptScrim = document.getElementById("aiPromptScrim");
  function openAiPrompt(title, text) {
    document.getElementById("aiPromptTitle").textContent = title;
    document.getElementById("aiPromptText").value = text;
    aiPromptScrim.classList.add("open");
  }
  document.getElementById("btnShowAiPrompt").addEventListener("click", () => openAiPrompt("Prompt AI - Import Akun", ACCOUNT_AI_PROMPT));
  document.getElementById("btnShowRoomAiPrompt").addEventListener("click", () => openAiPrompt("Prompt AI - Penempatan Ruang", ROOM_AI_PROMPT));
  document.getElementById("aiPromptCloseX").addEventListener("click", () => aiPromptScrim.classList.remove("open"));
  document.getElementById("aiPromptCloseBottom").addEventListener("click", () => aiPromptScrim.classList.remove("open"));
  aiPromptScrim.addEventListener("click", (e) => { if (e.target === aiPromptScrim) aiPromptScrim.classList.remove("open"); });
  document.getElementById("btnCopyAiPrompt").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(document.getElementById("aiPromptText").value);
      showToast("Prompt disalin.");
    } catch (e) {
      showToast("Gagal menyalin. Salin manual dari kotak teks.");
    }
  });

  let pendingBulkAccounts = [];

  document.getElementById("btnProcessBulk").addEventListener("click", () => {
    const raw = document.getElementById("bulkAccountTextarea").value;
    const result = AccountBulkParser.parse(raw);
    const errEl = document.getElementById("bulkParseErrors");
    errEl.innerHTML = result.errors.length > 0
      ? '<div class="parse-error-list">' + result.errors.map((e) => `<div class="parse-error-item">Baris ${e.line}: ${escapeHtml(e.message)}</div>`).join("") + '</div>'
      : "";
    pendingBulkAccounts = result.rows;
    document.getElementById("bulkPreviewCount").textContent = pendingBulkAccounts.length;
    document.getElementById("bulkPreviewWrap").style.display = pendingBulkAccounts.length > 0 ? "block" : "none";
  });

  document.getElementById("btnSubmitBulk").addEventListener("click", async () => {
    if (pendingBulkAccounts.length === 0) return;
    const btn = document.getElementById("btnSubmitBulk");
    btn.disabled = true;
    try {
      const result = await AdminBridge.createAccountsBulk(pendingBulkAccounts, (progress) => {
        btn.textContent = `Membuat akun... ${progress.done}/${progress.total} (berhasil ${progress.created}, gagal ${progress.failed})`;
      });
      let msg = result.created + " akun berhasil dibuat" + (result.failed > 0 ? ", " + result.failed + " gagal." : ".");
      if (result.failed > 0) {
        const reasons = {};
        result.failures.forEach((f) => { reasons[f.reason] = (reasons[f.reason] || 0) + 1; });
        const detail = Object.keys(reasons).map((r) => `${r}: ${reasons[r]}`).join(", ");
        msg += " (" + detail + ")";
      }
      showToast(msg);
      document.getElementById("bulkAccountTextarea").value = "";
      document.getElementById("bulkPreviewWrap").style.display = "none";
      pendingBulkAccounts = [];
      refreshAccounts();
    } catch (e) {
      showToast("Gagal memproses import massal.");
    }
    btn.disabled = false;
    btn.textContent = "Buat Semua Akun";
  });

  document.getElementById("btnSubmitRoomAssign").addEventListener("click", async () => {
    const raw = document.getElementById("roomAssignTextarea").value;
    const lines = raw.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
    const errEl = document.getElementById("roomParseErrors");
    const pairs = [];
    const errors = [];

    lines.forEach((line, idx) => {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length < 2 || !parts[0] || !parts[1]) {
        errors.push("Baris " + (idx + 1) + ": format harus \"nis, no_ruang\"");
        return;
      }
      pairs.push({ nisNip: parts[0], ruang: parts[1] });
    });

    errEl.innerHTML = errors.length > 0
      ? '<div class="parse-error-list">' + errors.map((e) => `<div class="parse-error-item">${escapeHtml(e)}</div>`).join("") + '</div>'
      : "";

    if (pairs.length === 0) return;

    const btn = document.getElementById("btnSubmitRoomAssign");
    btn.disabled = true;
    try {
      const result = await AdminBridge.assignRooms(pairs);
      showToast(result.updated + " siswa berhasil ditempatkan.");
      document.getElementById("roomAssignTextarea").value = "";
    } catch (e) {
      showToast("Gagal menyimpan penempatan ruang.");
    }
    btn.disabled = false;
  });

  async function loadDutyExamOptions() {
    const select = document.getElementById("dutyExamSelect");
    try {
      const result = await AdminBridge.listExamSchedule();
      const items = (result && result.items) || [];
      select.innerHTML = '<option value="">Pilih jadwal ujian...</option>' +
        items.map((i) => `<option value="${i.id}">${escapeHtml(i.subject)} &mdash; ${escapeHtml(i.date)} ${escapeHtml(i.startLabel)}</option>`).join("");
    } catch (e) {
      select.innerHTML = '<option value="">Gagal memuat jadwal</option>';
    }
  }

  let currentDutyAssignments = {};

  document.getElementById("dutyExamSelect").addEventListener("change", async () => {
    const examId = document.getElementById("dutyExamSelect").value;
    const area = document.getElementById("dutyPlanningArea");
    if (!examId) {
      area.innerHTML = "";
      return;
    }
    area.innerHTML = '<div class="skeleton"></div>';
    try {
      const data = await AdminBridge.getDutyPlanningData(examId);
      currentDutyAssignments = Object.assign({}, data.existingAssignments || {});
      renderDutyPlanning(examId, data);
    } catch (e) {
      area.innerHTML = '<div class="empty-state">Gagal memuat data ruang untuk jadwal ini.</div>';
    }
  });

  function renderDutyPlanning(examId, data) {
    const area = document.getElementById("dutyPlanningArea");
    const rooms = data.rooms || [];
    const freePanitia = data.freePanitia || [];

    if (rooms.length === 0) {
      area.innerHTML = '<div class="card"><div class="empty-state">Belum ada siswa dengan ruang terdaftar untuk kelas target jadwal ini.</div></div>';
      return;
    }

    area.innerHTML = '<div class="card">' + rooms.map((room) => {
      const currentPick = currentDutyAssignments[room] || "";
      const optionsHtml = freePanitia
        .filter((p) => !Object.entries(currentDutyAssignments).some(([r, uid]) => r !== room && uid === p.uid))
        .map((p) => `<option value="${p.uid}" ${p.uid === currentPick ? "selected" : ""}>${escapeHtml(p.fullName)}</option>`)
        .join("");
      return `
        <div class="settings-row" style="padding:10px 0;">
          <div class="settings-row-text">
            <div class="settings-row-title">Ruang ${escapeHtml(room)}</div>
          </div>
          <select class="select-native select-compact" data-room="${room}">
            <option value="">Belum dipilih</option>
            ${optionsHtml}
          </select>
        </div>
      `;
    }).join("") + `<button class="btn btn-primary" id="btnSaveDuty" style="margin-top:var(--space-4);">Simpan Jadwal Jaga</button></div>`;

    area.querySelectorAll("[data-room]").forEach((select) => {
      select.addEventListener("change", () => {
        const room = select.dataset.room;
        if (select.value) {
          currentDutyAssignments[room] = select.value;
        } else {
          delete currentDutyAssignments[room];
        }
        renderDutyPlanning(examId, data);
      });
    });

    document.getElementById("btnSaveDuty").addEventListener("click", async () => {
      const saveBtn = document.getElementById("btnSaveDuty");
      saveBtn.disabled = true;
      try {
        await AdminBridge.saveDutyAssignments(examId, currentDutyAssignments);
        showToast("Jadwal jaga berhasil disimpan.");
      } catch (e) {
        showToast("Gagal menyimpan jadwal jaga.");
      }
      saveBtn.disabled = false;
    });
  }

  async function handleExport(format) {
    const kelasFilter = document.getElementById("exportKelasFilter").value;
    try {
      const result = await AdminBridge.exportResults(kelasFilter, format);
      showToast(result.rowCount + " baris nilai berhasil di-export.");
    } catch (e) {
      showToast(e === "NO_DATA" ? "Tidak ada data nilai untuk filter ini." : "Gagal export nilai.");
    }
  }
  document.getElementById("btnExportCsv").addEventListener("click", () => handleExport("csv"));
  document.getElementById("btnExportPdf").addEventListener("click", () => handleExport("pdf"));

  let violationRows = [];

  async function loadViolations() {
    const el = document.getElementById("violationList");
    el.innerHTML = '<div class="skeleton"></div>';
    try {
      const result = await AdminBridge.getViolations();
      violationRows = (result && result.items) || [];
      document.getElementById("statTotalViolations").textContent = violationRows.length;
      document.getElementById("statLockedNow").textContent = violationRows.filter((v) => v.locked).length;

      if (violationRows.length === 0) {
        el.innerHTML = '<div class="empty-state">Belum ada pelanggaran tercatat.</div>';
        return;
      }

      el.innerHTML = violationRows.map((v) => `
        <div class="participant-row" style="flex-wrap:wrap;">
          <span class="participant-name">${escapeHtml(v.fullName)}</span>
          <span class="violation-count">${v.violationCount}x</span>
          <span class="status-pill ${v.locked ? "locked" : "in-progress"}">${v.locked ? "Terkunci" : "Pernah Melanggar"}</span>
          <div style="flex-basis:100%;font-size:11.5px;color:var(--text-tertiary);margin-top:4px;">
            ${escapeHtml(v.subject)}${v.unlockedBy ? " &middot; Dibuka oleh " + escapeHtml(v.unlockedBy) + ": \"" + escapeHtml(v.unlockedReason) + "\"" : ""}
          </div>
        </div>
      `).join("");
    } catch (e) {
      el.innerHTML = '<div class="empty-state">Gagal memuat data pelanggaran.</div>';
    }
  }

  document.getElementById("btnExportViolations").addEventListener("click", async () => {
    try {
      const result = await AdminBridge.exportViolations();
      showToast(result.rowCount + " baris pelanggaran berhasil di-export.");
    } catch (e) {
      showToast(e === "NO_DATA" ? "Tidak ada data pelanggaran." : "Gagal export data.");
    }
  });

  const tripleScrim = document.getElementById("tripleConfirmScrim");
  let tripleConfirmedAction = null;

  function resetTripleConfirmUI() {
    document.getElementById("tripleConfirmStep1").style.display = "block";
    document.getElementById("tripleConfirmStep2").style.display = "none";
    document.getElementById("tripleConfirmStep3").style.display = "none";
    document.getElementById("tripleConfirmPassword").value = "";
    document.getElementById("tripleConfirmError").textContent = "";
  }

  function runTripleConfirm(title, message, action) {
    document.getElementById("tripleConfirmTitle").textContent = title;
    document.getElementById("tripleConfirmMessage").textContent = message;
    tripleConfirmedAction = action;
    resetTripleConfirmUI();
    tripleScrim.classList.add("open");
  }

  document.getElementById("tripleConfirmNext1").addEventListener("click", () => {
    document.getElementById("tripleConfirmStep1").style.display = "none";
    document.getElementById("tripleConfirmStep2").style.display = "block";
  });

  document.getElementById("tripleConfirmNext2").addEventListener("click", async () => {
    const password = document.getElementById("tripleConfirmPassword").value;
    const errEl = document.getElementById("tripleConfirmError");
    if (!password) {
      errEl.textContent = "Kata sandi wajib diisi.";
      return;
    }
    try {
      await AdminBridge.verifyPassword(password);
      document.getElementById("tripleConfirmStep2").style.display = "none";
      document.getElementById("tripleConfirmStep3").style.display = "block";
    } catch (e) {
      errEl.textContent = "Kata sandi salah.";
    }
  });

  document.getElementById("tripleConfirmFinal").addEventListener("click", async () => {
    tripleScrim.classList.remove("open");
    if (tripleConfirmedAction) await tripleConfirmedAction();
  });

  document.getElementById("tripleConfirmCloseX").addEventListener("click", () => tripleScrim.classList.remove("open"));
  document.getElementById("tripleConfirmCancel").addEventListener("click", () => tripleScrim.classList.remove("open"));
  tripleScrim.addEventListener("click", (e) => { if (e.target === tripleScrim) tripleScrim.classList.remove("open"); });

  async function loadBackupSection() {
    try {
      const settings = await AdminBridge.getBackupSettings();
      document.getElementById("toggleAutoSave").checked = !!settings.autoSaveEnabled;
    } catch (e) {}

    try {
      const access = await AdminBridge.getAccessSettings();
      document.getElementById("toggleAndroidLogin").checked = !!access.androidLoginEnabled;
      document.getElementById("toggleWebLogin").checked = !!access.webLoginEnabled;
      document.getElementById("toggleExeLogin").checked = !!access.exeLoginEnabled;
      const isUjianMode = access.operationMode !== "harian";
      document.getElementById("toggleOperationMode").checked = isUjianMode;
      document.getElementById("operationModeLabel").textContent = isUjianMode ? "Mode Ujian" : "Mode Harian";
    } catch (e) {}

    refreshBackupList();
  }

  function bindAccessToggle(elementId, settingKey, label) {
    document.getElementById(elementId).addEventListener("change", async (e) => {
      const checkbox = e.target;
      checkbox.disabled = true;
      try {
        await AdminBridge.setAccessSetting(settingKey, checkbox.checked);
        showToast(label + " " + (checkbox.checked ? "diaktifkan." : "dinonaktifkan."));
      } catch (err) {
        checkbox.checked = !checkbox.checked;
        showToast("Gagal menyimpan pengaturan akses.");
      }
      checkbox.disabled = false;
    });
  }
  bindAccessToggle("toggleAndroidLogin", "androidLoginEnabled", "Login Android");
  bindAccessToggle("toggleWebLogin", "webLoginEnabled", "Login Website");
  bindAccessToggle("toggleExeLogin", "exeLoginEnabled", "Login Windows");

  document.getElementById("toggleOperationMode").addEventListener("change", async (e) => {
    const checkbox = e.target;
    const mode = checkbox.checked ? "ujian" : "harian";
    checkbox.disabled = true;
    try {
      await AdminBridge.setAccessSetting("operationMode", mode);
      document.getElementById("operationModeLabel").textContent = checkbox.checked ? "Mode Ujian" : "Mode Harian";
      showToast("Mode operasi diubah ke " + (checkbox.checked ? "Ujian" : "Harian") + ".");
    } catch (err) {
      checkbox.checked = !checkbox.checked;
      showToast("Gagal menyimpan mode operasi.");
    }
    checkbox.disabled = false;
  });

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
      await AdminBridge.changePassword(oldPw, newPw);
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

  document.getElementById("toggleAutoSave").addEventListener("change", async (e) => {
    try {
      await AdminBridge.setAutoSaveEnabled(e.target.checked);
    } catch (err) {
      showToast("Gagal menyimpan pengaturan auto save.");
    }
  });

  document.getElementById("btnCreateBackup").addEventListener("click", async () => {
    const name = document.getElementById("backupNameInput").value.trim() || "backup";
    const btn = document.getElementById("btnCreateBackup");
    btn.disabled = true;
    btn.textContent = "Menyimpan...";
    try {
      await AdminBridge.createManualBackup(name);
      showToast("Backup berhasil disimpan.");
      document.getElementById("backupNameInput").value = "";
      refreshBackupList();
    } catch (e) {
      showToast("Gagal membuat backup.");
    }
    btn.disabled = false;
    btn.textContent = "Simpan Backup";
  });

  async function refreshBackupList() {
    const el = document.getElementById("backupList");
    el.innerHTML = '<div class="skeleton"></div>';
    try {
      const result = await AdminBridge.listBackups();
      const items = (result && result.items) || [];
      if (items.length === 0) {
        el.innerHTML = '<div class="empty-state">Belum ada backup.</div>';
        return;
      }
      el.innerHTML = items.map((b) => `
        <div class="participant-row">
          <span class="participant-name">${escapeHtml(b.name)}</span>
          <span class="account-meta">${new Date(b.createdAt).toLocaleString("id-ID")}</span>
          <button class="unlock-btn" data-restore="${b.id}">Restore</button>
          <button class="unlock-btn" data-delete-backup="${b.id}">Hapus</button>
        </div>
      `).join("");
      el.querySelectorAll("[data-restore]").forEach((btn) => {
        btn.addEventListener("click", () => {
          runTripleConfirm("Restore Data", "Data saat ini akan ditimpa dengan isi backup ini.", async () => {
            try {
              await AdminBridge.restoreBackup(btn.dataset.restore);
              showToast("Data berhasil di-restore.");
              refreshAccounts();
            } catch (e) {
              showToast("Gagal restore data.");
            }
          });
        });
      });
      el.querySelectorAll("[data-delete-backup]").forEach((btn) => {
        btn.addEventListener("click", () => {
          runTripleConfirm("Hapus Backup", "Backup ini akan dihapus permanen.", async () => {
            try {
              await AdminBridge.deleteBackup(btn.dataset.deleteBackup);
              showToast("Backup dihapus.");
              refreshBackupList();
            } catch (e) {
              showToast("Gagal menghapus backup.");
            }
          });
        });
      });
    } catch (e) {
      el.innerHTML = '<div class="empty-state">Gagal memuat daftar backup.</div>';
    }
  }

  document.getElementById("btnDeleteAllBackups").addEventListener("click", () => {
    runTripleConfirm("Hapus Semua Backup", "Seluruh backup akan dihapus permanen.", async () => {
      try {
        await AdminBridge.deleteAllBackups(false);
        showToast("Semua backup dihapus.");
        refreshBackupList();
      } catch (e) {
        showToast("Gagal menghapus backup.");
      }
    });
  });

  document.getElementById("btnDeleteOldBackups").addEventListener("click", () => {
    runTripleConfirm("Hapus Backup Lama", "Semua backup kecuali yang terbaru akan dihapus.", async () => {
      try {
        await AdminBridge.deleteAllBackups(true);
        showToast("Backup lama dihapus.");
        refreshBackupList();
      } catch (e) {
        showToast("Gagal menghapus backup.");
      }
    });
  });

  document.querySelectorAll("[data-reset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.reset;
      const labels = {
        exams: "Jadwal Ujian & Soal",
        sessions: "Sesi & Jawaban Ujian",
        results: "Semua Nilai",
        accounts: "Semua Akun"
      };
      runTripleConfirm("Reset: " + labels[category], "Data pada kategori ini akan dihapus permanen dan tidak bisa dikembalikan kecuali dari backup.", async () => {
        try {
          await AdminBridge.resetDataCategory(category);
          showToast(labels[category] + " berhasil direset.");
          refreshAccounts();
        } catch (e) {
          showToast("Gagal mereset data.");
        }
      });
    });
  });

  refreshAccounts();
})();
