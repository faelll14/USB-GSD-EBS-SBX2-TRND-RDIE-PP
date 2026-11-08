const AccountExtras = (() => {
  const CHEVRON = '<svg class="settings-row-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
  const toast = (msg) => { try { if (typeof showToast === "function") showToast(msg); } catch (e) {} };

  function remindDefaultPassword(session) {
    if (!session || !session.passwordIsDefault) return;
    try {
      if (sessionStorage.getItem("pwRemindShown") === "1") return;
      sessionStorage.setItem("pwRemindShown", "1");
    } catch (e) {}
    const scrim = document.createElement("div");
    scrim.className = "modal-scrim";
    scrim.id = "pwRemindScrim";
    scrim.innerHTML =
      '<div class="modal-sheet">' +
      '<h2 class="sheet-title">Kata sandi masih default</h2>' +
      '<p class="login-subtitle" style="margin-bottom:var(--space-4);">Demi keamanan akun, segera ganti kata sandi kamu. Kamu juga bisa menggantinya nanti lewat menu Pengaturan.</p>' +
      '<button class="btn btn-primary" id="pwRemindNow" type="button">Ganti Sekarang</button>' +
      '<button class="btn btn-ghost" id="pwRemindLater" type="button">Nanti</button>' +
      '</div>';
    document.body.appendChild(scrim);
    const close = () => scrim.classList.remove("open");
    scrim.querySelector("#pwRemindLater").addEventListener("click", close);
    scrim.addEventListener("click", (e) => { if (e.target === scrim) close(); });
    scrim.querySelector("#pwRemindNow").addEventListener("click", () => {
      close();
      const row = document.getElementById("rowPassword");
      if (row) row.click();
    });
    requestAnimationFrame(() => requestAnimationFrame(() => scrim.classList.add("open")));
  }

  function mountA2L(bridge, passRow) {
    const row = document.createElement("div");
    row.className = "settings-row";
    row.id = "rowBiometric";
    row.innerHTML =
      '<div class="settings-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2a7 7 0 0 0-7 7c0 3 1 5 1 8M12 2a7 7 0 0 1 7 7c0 2-.2 3.5-.6 5"/></svg></div>' +
      '<div class="settings-row-text"><div class="settings-row-title">Masuk Cepat (A2L)</div><div class="settings-row-sub" id="biometricSub">Atur</div></div>' + CHEVRON;
    passRow.insertAdjacentElement("afterend", row);

    const scrim = document.createElement("div");
    scrim.className = "modal-scrim";
    scrim.id = "biometricScrim";
    scrim.innerHTML =
      '<div class="modal-sheet">' +
      '<button class="icon-btn modal-close-x" id="axBioX" aria-label="Tutup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '<h2 class="sheet-title">Masuk Cepat (A2L)</h2>' +
      '<p class="login-subtitle" style="margin-bottom:var(--space-3);">Pilih satu metode. Perangkat yang tidak mendukung akan tampil abu-abu.</p>' +
      '<div class="a2l-status" id="axStatus">Status: Belum diatur</div>' +
      '<div class="biometric-row-wrap revealed"><div class="biometric-row">' +
      '<button class="biometric-btn" id="axFace" type="button" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3M9 10v2M15 10v2M9 16c.8.7 1.9 1 3 1s2.2-.3 3-1"/></svg><span>Face ID</span></button>' +
      '<button class="biometric-btn" id="axFp" type="button" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2a7 7 0 0 0-7 7c0 3 1 5 1 8M12 2a7 7 0 0 1 7 7c0 2-.2 3.5-.6 5M8 21c1-2 1.2-4 1.2-6a2.8 2.8 0 0 1 5.6 0c0 1 0 2-.3 3M12 12a3 3 0 0 1 3 3c0 2-.4 3.6-1 5"/></svg><span>Sidik Jari</span></button>' +
      '</div></div>' +
      '<div class="field-error" id="axErr"></div>' +
      '<button class="btn btn-ghost modal-close-bottom" id="axOff" type="button" style="display:none;">Matikan</button>' +
      '<button class="btn btn-ghost" id="axClose" type="button">Tutup</button>' +
      '</div>';
    document.body.appendChild(scrim);

    const $ = (id) => scrim.querySelector("#" + id);
    const sub = row.querySelector("#biometricSub");
    const close = () => scrim.classList.remove("open");
    const label = (m) => (m === "face" ? "Aktif dengan Face ID" : m === "fingerprint" ? "Aktif dengan Sidik Jari" : null);

    async function refresh() {
      try {
        const acc = await bridge.getAccountInfo();
        const l = label(acc.biometricMethod);
        $("axStatus").textContent = l ? "Status: " + l : "Status: Belum diatur";
        $("axOff").style.display = l ? "block" : "none";
        sub.textContent = l || "Nonaktif";
      } catch (e) {
        $("axStatus").textContent = "Status: Belum diatur";
        $("axOff").style.display = "none";
      }
    }

    row.addEventListener("click", async () => {
      $("axErr").textContent = "";
      scrim.classList.add("open");
      refresh();
      try {
        const caps = await bridge.checkBiometricAvailability();
        $("axFace").disabled = !caps.faceAvailable;
        $("axFp").disabled = !caps.fingerprintAvailable;
      } catch (e) {
        $("axFace").disabled = true;
        $("axFp").disabled = true;
      }
    });
    $("axBioX").addEventListener("click", close);
    $("axClose").addEventListener("click", close);
    scrim.addEventListener("click", (e) => { if (e.target === scrim) close(); });

    async function select(method) {
      $("axErr").textContent = "";
      try {
        await bridge.setBiometricEnabled(method);
        close();
        sub.textContent = method === "none" ? "Nonaktif" : label(method);
        toast(method === "none" ? "Masuk cepat dimatikan." : "Masuk cepat diaktifkan.");
      } catch (e) {
        $("axErr").textContent = e === "BIOMETRIC_FAILED" ? "Verifikasi gagal. Coba lagi." : e === "NOT_SUPPORTED_ON_WEB" ? "Belum didukung di versi web." : "Gagal menyimpan pengaturan.";
      }
    }
    $("axFace").addEventListener("click", () => select("face"));
    $("axFp").addEventListener("click", () => select("fingerprint"));
    $("axOff").addEventListener("click", () => select("none"));
  }

  function mountDeveloper(bridge, host) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML =
      '<div class="settings-row" id="rowDeveloper" style="padding:0;">' +
      '<div class="settings-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12"/></svg></div>' +
      '<div class="settings-row-text"><div class="settings-row-title">Tentang Pengembang</div><div class="settings-row-sub" id="axDevName">Raffael Putra Hermawan</div></div>' +
      '</div>';
    if (!host.style.marginBottom) host.style.marginBottom = "var(--space-5)";
    card.style.marginBottom = "var(--space-5)";
    host.insertAdjacentElement("afterend", card);
    let info = null;
    card.querySelector("#rowDeveloper").addEventListener("click", async () => {
      try { if (!info) info = await bridge.getSchoolInfo(); } catch (e) { info = {}; }
      if (typeof SiteFooter !== "undefined" && info && info.developerUrl) {
        SiteFooter.openPortfolio();
      }
    });
  }

  function init(opts) {
    const { bridge, session, a2l, developer } = opts;
    remindDefaultPassword(session);
    const passRow = document.getElementById("rowPassword");
    if (!passRow) return;
    if (a2l && !document.getElementById("rowBiometric")) mountA2L(bridge, passRow);
    if (developer && !document.getElementById("rowDeveloper")) {
      const host = passRow.closest(".card") || passRow.parentElement;
      mountDeveloper(bridge, host);
    }
  }

  return { init, remindDefaultPassword };
})();
