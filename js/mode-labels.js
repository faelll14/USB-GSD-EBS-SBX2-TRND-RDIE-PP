const ModeLabels = (() => {
  const KEY = "patsec_mode";
  let mode = "ujian";

  function applyDom() {
    document.documentElement.setAttribute("data-mode", mode);
    document.querySelectorAll("[data-t-harian]").forEach((el) => {
      if (!el.hasAttribute("data-t-ujian")) el.setAttribute("data-t-ujian", el.textContent);
      el.textContent = el.getAttribute(mode === "harian" ? "data-t-harian" : "data-t-ujian");
    });
  }

  // return true jika mode berubah (atau pertama kali diterapkan)
  function set(m) {
    const next = m === "harian" ? "harian" : "ujian";
    const first = !document.documentElement.hasAttribute("data-mode");
    if (!first && next === mode) return false;
    mode = next;
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    applyDom();
    window.dispatchEvent(new CustomEvent("modechange", { detail: mode }));
    return true;
  }

  function t(ujianText, harianText) {
    return mode === "harian" ? harianText : ujianText;
  }

  // terapkan mode terakhir yang diketahui secepat mungkin (sebelum bridge menjawab)
  document.addEventListener("DOMContentLoaded", () => {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved) set(saved);
  });

  return { set, t, get mode() { return mode; } };
})();
