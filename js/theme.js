const ThemeController = (() => {
  const VALID = ["dark", "light", "pink", "hacker", "minecraft"];
  const STORAGE_KEY = "patsec_theme";

  function apply(theme) {
    if (!VALID.includes(theme)) return;
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll(".theme-swatch").forEach((el) => {
      el.classList.toggle("selected", el.dataset.theme === theme);
    });
  }

  async function init() {
    let theme = "dark";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && VALID.includes(saved)) theme = saved;
    } catch (e) {}
    apply(theme);
  }

  async function set(theme) {
    apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
  }

  function bindSheet(triggerId, scrimId, closeXId, closeBottomId, gridId) {
    const scrim = document.getElementById(scrimId);
    const trigger = document.getElementById(triggerId);
    const closeX = document.getElementById(closeXId);
    const closeBottom = document.getElementById(closeBottomId);
    const grid = document.getElementById(gridId);

    const open = () => scrim.classList.add("open");
    const close = () => scrim.classList.remove("open");

    trigger.addEventListener("click", open);
    closeX.addEventListener("click", close);
    closeBottom.addEventListener("click", close);
    scrim.addEventListener("click", (e) => {
      if (e.target === scrim) close();
    });

    grid.querySelectorAll(".theme-swatch").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        set(swatch.dataset.theme);
        close();
      });
    });
  }

  return { init, apply, set, bindSheet, VALID };
})();
