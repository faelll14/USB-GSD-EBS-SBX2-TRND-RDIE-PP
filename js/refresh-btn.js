(() => {
  const theme = document.getElementById("btnTheme");
  if (!theme || document.getElementById("btnRefresh")) return;
  const btn = document.createElement("button");
  btn.className = "icon-btn";
  btn.id = "btnRefresh";
  btn.type = "button";
  btn.setAttribute("aria-label", "Segarkan");
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>';
  theme.parentNode.insertBefore(btn, theme);
  btn.addEventListener("click", async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.classList.add("spin");
    if (typeof window.__onRefresh === "function") {
      try { await window.__onRefresh(); } catch (e) {}
      btn.classList.remove("spin");
      setTimeout(() => { btn.disabled = false; }, 15000);
      return;
    }
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (e) {}
    location.reload();
  });
})();
