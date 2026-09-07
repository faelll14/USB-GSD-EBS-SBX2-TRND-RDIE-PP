(function () {
  let firebaseReady = window.PatSecFirebase != null;
  if (!firebaseReady) {
    window.addEventListener("patsec-firebase-ready", () => { firebaseReady = true; }, { once: true });
  }

  function waitForFirebase() {
    return new Promise((resolve) => {
      if (window.PatSecFirebase) return resolve();
      window.addEventListener("patsec-firebase-ready", () => resolve(), { once: true });
    });
  }

  async function init() {
    await ThemeController.init();
    ThemeController.bindSheet("btnTheme", "themeScrim", "themeCloseX", "themeCloseBottom", "themeGrid");

    document.getElementById("schoolName").textContent = AppConfig.SCHOOL_NAME_FALLBACK;
    SiteFooter.render("siteFooter", {
      name: AppConfig.SCHOOL_NAME_FALLBACK,
      address: AppConfig.SCHOOL_ADDRESS,
      phone: AppConfig.SCHOOL_PHONE,
      email: AppConfig.SCHOOL_EMAIL,
      instagramHandle: AppConfig.SCHOOL_INSTAGRAM_HANDLE,
      instagramUrl: AppConfig.SCHOOL_INSTAGRAM_URL,
      osisInstagramHandle: AppConfig.OSIS_INSTAGRAM_HANDLE,
      osisInstagramUrl: AppConfig.OSIS_INSTAGRAM_URL,
      developerName: AppConfig.DEVELOPER_NAME,
      developerUrl: AppConfig.DEVELOPER_PORTFOLIO_URL
    }, (url) => window.open(url, "_blank", "noopener"));

    const tabButtons = document.querySelectorAll("#loginTabSwitch button");
    const tabThumb = document.getElementById("tabThumb");
    const panels = {
      id: document.querySelector('[data-panel="id"]'),
      username: document.querySelector('[data-panel="username"]')
    };
    let activeTab = "id";

    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        tabButtons.forEach((b) => b.classList.toggle("active", b === btn));
        tabThumb.style.transform = activeTab === "username" ? "translateX(100%)" : "translateX(0)";
        panels.id.style.display = activeTab === "id" ? "block" : "none";
        panels.username.style.display = activeTab === "username" ? "block" : "none";
        document.getElementById("loginError").textContent = "";
      });
    });

    const form = document.getElementById("loginForm");
    const btnSubmit = document.getElementById("btnSubmit");
    const btnSubmitLabel = document.getElementById("btnSubmitLabel");
    const errorEl = document.getElementById("loginError");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.textContent = "";

      const identifier = activeTab === "id"
        ? document.getElementById("inputId").value.trim()
        : document.getElementById("inputUsername").value.trim();
      const password = document.getElementById("inputPassword").value;

      if (!identifier) {
        errorEl.textContent = activeTab === "id" ? "Masukkan NIS atau NIP." : "Masukkan username.";
        return;
      }
      if (!password) {
        errorEl.textContent = "Masukkan kata sandi.";
        return;
      }

      btnSubmit.disabled = true;
      btnSubmitLabel.textContent = "Memeriksa...";

      await waitForFirebase();

      try {
        const session = await AuthRepository.login(activeTab, identifier, password);
        sessionStorage.setItem("patsec_session", JSON.stringify(session));
        routeToRoleDashboard(session.role);
      } catch (err) {
        const code = err && err.code ? err.code : "UNKNOWN_ERROR";
        const messages = {
          USER_NOT_FOUND: "Akun tidak ditemukan. Periksa kembali data yang dimasukkan.",
          WRONG_PASSWORD: "Kata sandi salah.",
          ACCOUNT_DISABLED: "Akun ini dinonaktifkan. Hubungi admin sekolah.",
          NETWORK_ERROR: "Tidak ada koneksi internet. Periksa jaringan kamu.",
          LOGIN_DISABLED_PLATFORM: "Login melalui website sedang dinonaktifkan admin.",
          UNKNOWN_ERROR: "Terjadi kesalahan saat masuk. Coba lagi."
        };
        errorEl.textContent = messages[code] || ("Gagal masuk (" + code + ").");
        btnSubmit.disabled = false;
        btnSubmitLabel.textContent = "Masuk";
      }
    });
  }

  function routeToRoleDashboard(role) {
    const pages = {
      siswa: "dashboard/index.html",
      guru: "guru/index.html",
      panitia: "panitia/index.html",
      admin: "admin/index.html"
    };
    window.location.href = pages[role] || "dashboard/index.html";
  }

  init();
})();
