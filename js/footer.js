const SiteFooter = (() => {
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function ensureConfirmModal() {
    if (document.getElementById("externalLinkScrim")) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="modal-scrim" id="externalLinkScrim">
        <div class="modal-sheet">
          <button class="icon-btn modal-close-x" id="externalLinkCloseX" aria-label="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2 class="sheet-title">Buka di Browser?</h2>
          <p class="login-subtitle" style="margin-bottom:var(--space-4);">Anda akan diarahkan keluar aplikasi menuju browser perangkat. Lanjutkan?</p>
          <button class="btn btn-primary" id="externalLinkConfirm" type="button">Lanjutkan</button>
          <button class="btn btn-ghost modal-close-bottom" id="externalLinkCancel" type="button">Batal</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap.firstElementChild);

    const scrim = document.getElementById("externalLinkScrim");
    document.getElementById("externalLinkCloseX").addEventListener("click", () => scrim.classList.remove("open"));
    document.getElementById("externalLinkCancel").addEventListener("click", () => scrim.classList.remove("open"));
    scrim.addEventListener("click", (e) => { if (e.target === scrim) scrim.classList.remove("open"); });
  }

  function confirmAndOpen(url, openExternalFn) {
    if (!url || !openExternalFn) return;
    ensureConfirmModal();
    const scrim = document.getElementById("externalLinkScrim");
    const confirmBtn = document.getElementById("externalLinkConfirm");
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener("click", () => {
      scrim.classList.remove("open");
      openExternalFn(url);
    });
    scrim.classList.add("open");
  }

  function render(containerId, info, openExternalFn) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const school = info || {};

    el.innerHTML = `
      <div class="site-footer-inner">
        <div class="site-footer-school">${escapeHtml(school.name || "")}</div>
        <div class="site-footer-line">${escapeHtml(school.address || "")}</div>
        <div class="site-footer-line">
          ${school.phone ? escapeHtml(school.phone) : ""}${school.phone && school.email ? " &middot; " : ""}${school.email ? escapeHtml(school.email) : ""}
        </div>
        <div class="site-footer-social">
          ${school.instagramUrl ? `<button class="footer-social-chip" data-url="${escapeHtml(school.instagramUrl)}">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>
            ${escapeHtml(school.instagramHandle || "")}
          </button>` : ""}
          ${school.osisInstagramUrl ? `<button class="footer-social-chip" data-url="${escapeHtml(school.osisInstagramUrl)}">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>
            ${escapeHtml(school.osisInstagramHandle || "")}
          </button>` : ""}
        </div>
        <div class="site-footer-divider"></div>
        <div class="site-footer-dev">
          Sistem dikembangkan oleh <button class="footer-dev-link" id="footerDevLink">${escapeHtml(school.developerName || "")}</button>
        </div>
      </div>
    `;

    el.querySelectorAll(".footer-social-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        confirmAndOpen(btn.dataset.url, openExternalFn);
      });
    });

    const devLink = document.getElementById("footerDevLink");
    if (devLink) {
      devLink.addEventListener("click", () => {
        confirmAndOpen(school.developerUrl, openExternalFn);
      });
    }
  }

  return { render, confirmAndOpen };
})();
