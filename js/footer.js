const SiteFooter = (() => {
  const SELF_SRC = (document.currentScript && document.currentScript.src) || "";
  const PORTFOLIO_URL = SELF_SRC ? new URL("../portofolio/index.html", SELF_SRC).href : "../portofolio/index.html";
  const IN_APP = typeof window.AndroidBridge !== "undefined";
  let portfolioEl = null;
  let frameEl = null;
  let closing = false;
  let origin = { x: innerWidth / 2, y: innerHeight - 40 };
  const THEME_VARS = ["--bg-base","--bg-elevated","--surface","--surface-solid","--surface-border","--text-primary","--text-secondary","--text-tertiary","--accent","--accent-text","--accent-soft","--danger","--success","--warning","--divider","--radius-sm","--radius-md","--radius-lg","--font-body","--font-mono","--font-ui","--font-display","--font-pixel","--gradient-hero","--shadow-elev","--input-bg","--gold"];
  const reduceMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.addEventListener("pointerdown", (e) => { origin = { x: e.clientX, y: e.clientY }; }, true);

  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    const vars = {};
    THEME_VARS.forEach((k) => { const v = cs.getPropertyValue(k).trim(); if (v) vars[k] = v; });
    return { theme: document.documentElement.getAttribute("data-theme") || "dark", vars };
  }

  function radius() {
    return Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y)) + 40;
  }

  function post(msg) {
    try { if (frameEl && frameEl.contentWindow) frameEl.contentWindow.postMessage(msg, "*"); } catch (_) {}
  }

  // --- brankas sertifikat terenkripsi (certs.bin) ---
  let vault = null;
  function loadKeyScript() {
    if (window.__PF_KEY) return Promise.resolve();
    return new Promise((res, rej) => {
      const sc = document.createElement("script");
      sc.src = SELF_SRC ? new URL("cert-key.js", SELF_SRC).href : "../js/cert-key.js";
      sc.onload = () => res();
      sc.onerror = () => rej(new Error("key"));
      document.head.appendChild(sc);
    });
  }
  async function loadVault() {
    if (vault) return vault;
    await loadKeyScript();
    const r = await fetch(new URL("certs.bin", PORTFOLIO_URL).href, { cache: "force-cache" });
    if (!r.ok) throw new Error("bin");
    const buf = await r.arrayBuffer();
    const dv = new DataView(buf);
    if (new TextDecoder().decode(new Uint8Array(buf, 0, 4)) !== "PFC1") throw new Error("magic");
    const n = dv.getUint32(4);
    const idx = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, n))).files;
    const raw = Uint8Array.from(atob(window.__PF_KEY), (c) => c.charCodeAt(0));
    try { delete window.__PF_KEY; } catch (_) { window.__PF_KEY = undefined; }
    const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    vault = { buf, idx, base: 8 + n, key };
    return vault;
  }
  async function webCertBuf(name) {
    const v = await loadVault();
    const e = v.idx[name];
    if (!e) return null;
    const st = v.base + e[0];
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(v.buf, st, 12) }, v.key, new Uint8Array(v.buf, st + 12, e[1] - 12));
  }
  function appCertBuf(name) {
    const b64 = window.PfSecure.getCert(name);
    if (!b64) return null;
    const bin = atob(b64);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  let imgQ = Promise.resolve();
  function serveImg(id, name) {
    imgQ = imgQ.then(async () => {
      await new Promise((r) => setTimeout(r, 0));
      let buf = null;
      try {
        buf = (IN_APP && window.PfSecure && window.PfSecure.getCert) ? appCertBuf(name) : await webCertBuf(name);
      } catch (_) { buf = null; }
      try {
        if (!frameEl || !frameEl.contentWindow) return;
        if (buf) frameEl.contentWindow.postMessage({ type: "pf-img-res", id, ok: true, buf }, "*", [buf]);
        else frameEl.contentWindow.postMessage({ type: "pf-img-res", id, ok: false }, "*");
      } catch (_) {}
    });
  }

  function onMessage(e) {
    if (!frameEl || e.source !== frameEl.contentWindow) return;
    const m = e.data;
    if (!m || typeof m !== "object") return;
    if (m.type === "pf-ready") {
      const wait = Math.max(0, 200 - (performance.now() - openedAt));
      setTimeout(() => post(Object.assign({ type: "pf-init", app: IN_APP, base: PORTFOLIO_URL.replace(/index\.html$/, "") }, readTheme())), reduceMotion() ? 0 : wait);
    } else if (m.type === "pf-img") {
      if (Number.isInteger(m.id) && typeof m.name === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(m.name)) serveImg(m.id, m.name);
    } else if (m.type === "pf-close") {
      closePortfolio(false);
    }
  }
  let openedAt = 0;
  window.addEventListener("message", onMessage);

  function secureSet(on) {
    try { if (window.PfSecure && window.PfSecure.setSecure) window.PfSecure.setSecure(!!on); } catch (_) {}
  }
  const blockWhileOpen = (e) => { if (portfolioEl) e.preventDefault(); };
  ["copy", "cut", "contextmenu", "dragstart", "selectstart"].forEach((t) => document.addEventListener(t, blockWhileOpen, true));
  document.addEventListener("keydown", (e) => {
    if (!portfolioEl) return;
    const k = (e.key || "").toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ["c", "x", "a", "s", "p", "u"].includes(k)) e.preventDefault();
  }, true);

  function finishClose() {
    secureSet(false);
    const np = document.getElementById("pfNoPrint");
    if (np) np.remove();
    if (portfolioEl) portfolioEl.remove();
    portfolioEl = null; frameEl = null; closing = false;
    document.documentElement.style.overflow = "";
  }

  function closePortfolio(fromPop) {
    if (!portfolioEl) return false;
    if (closing) return true;
    if (!IN_APP && !fromPop && history.state && history.state.pf) { history.back(); return true; }
    closing = true;
    post({ type: "pf-leave" });
    const el = portfolioEl;
    if (reduceMotion() || !el.animate) { finishClose(); return true; }
    setTimeout(() => {
      const a = el.animate([
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "translateY(10px)" }
      ], { duration: 200, easing: "ease-in", fill: "forwards" });
      a.onfinish = finishClose;
    }, 120);
    return true;
  }
  window.__closePortfolio = () => closePortfolio(false);
  window.addEventListener("popstate", () => closePortfolio(true));

  function doOpenPortfolio() {
    if (portfolioEl) return;
    const wrap = document.createElement("div");
    wrap.id = "portfolioOverlay";
    wrap.style.cssText = "position:fixed;inset:0;z-index:2147483000;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;background:var(--bg-base,#000);";
    wrap.innerHTML = `
      <iframe id="portfolioFrame" title="Portofolio" sandbox="${IN_APP ? "allow-scripts allow-same-origin" : "allow-scripts allow-forms"}" style="position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;"></iframe>
      <button type="button" id="portfolioBack" aria-label="Kembali" style="all:unset;cursor:pointer;position:absolute;left:12px;top:calc(env(safe-area-inset-top,0px) + 10px);width:42px;height:42px;border-radius:50%;background:var(--surface-solid,#1c1c1e);color:var(--text-primary,#fff);border:1px solid var(--surface-border,rgba(255,255,255,.1));display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.35);z-index:2;"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>`;
    document.body.appendChild(wrap);
    secureSet(true);
    if (!document.getElementById("pfNoPrint")) {
      const st = document.createElement("style");
      st.id = "pfNoPrint";
      st.textContent = "@media print{html{display:none!important}}";
      document.head.appendChild(st);
    }
    portfolioEl = wrap;
    frameEl = wrap.querySelector("#portfolioFrame");
    const back = wrap.querySelector("#portfolioBack");
    back.addEventListener("click", () => closePortfolio(false));
    document.documentElement.style.overflow = "hidden";
    openedAt = performance.now();
    frameEl.src = PORTFOLIO_URL;
    if (!IN_APP) history.pushState({ pf: 1 }, "");
    if (!reduceMotion() && wrap.animate) {
      wrap.animate([
        { opacity: 0, transform: "translateY(14px)" },
        { opacity: 1, transform: "none" }
      ], { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" });
    }
  }

  function openPortfolio() {
    if (portfolioEl) return;
    if (!document.getElementById("portfolioConfirmScrim")) {
      const w = document.createElement("div");
      w.innerHTML = `
      <div class="modal-scrim" id="portfolioConfirmScrim">
        <div class="modal-sheet">
          <button class="icon-btn modal-close-x" id="portfolioConfirmX" aria-label="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2 class="sheet-title">Buka Portofolio?</h2>
          <p class="login-subtitle" style="margin-bottom:var(--space-4);">Anda akan membuka halaman portofolio pengembang. Lanjutkan?</p>
          <button class="btn btn-primary" id="portfolioConfirmOk" type="button">Lanjutkan</button>
          <button class="btn btn-ghost modal-close-bottom" id="portfolioConfirmNo" type="button">Batal</button>
        </div>
      </div>`;
      document.body.appendChild(w.firstElementChild);
      const sc = document.getElementById("portfolioConfirmScrim");
      const hide = () => sc.classList.remove("open");
      document.getElementById("portfolioConfirmX").addEventListener("click", hide);
      document.getElementById("portfolioConfirmNo").addEventListener("click", hide);
      sc.addEventListener("click", (e) => { if (e.target === sc) hide(); });
      document.getElementById("portfolioConfirmOk").addEventListener("click", () => { hide(); doOpenPortfolio(); });
    }
    document.getElementById("portfolioConfirmScrim").classList.add("open");
  }

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
        openPortfolio();
      });
    }
  }

  return { render, confirmAndOpen, openPortfolio, isOpen: () => !!portfolioEl };
})();
