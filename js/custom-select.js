const CustomSelect = (() => {
  function enhance(selectEl) {
    if (!selectEl || selectEl.dataset.enhanced === "1") return;
    selectEl.dataset.enhanced = "1";

    const wrap = document.createElement("div");
    wrap.className = "custom-select";
    if (selectEl.classList.contains("select-compact")) wrap.classList.add("custom-select-compact");
    selectEl.parentNode.insertBefore(wrap, selectEl);
    wrap.appendChild(selectEl);
    selectEl.classList.add("custom-select-native-hidden");

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "custom-select-trigger";
    const label = document.createElement("span");
    label.className = "custom-select-label";
    const chevron = document.createElement("svg");
    chevron.setAttribute("viewBox", "0 0 24 24");
    chevron.setAttribute("fill", "none");
    chevron.setAttribute("stroke", "currentColor");
    chevron.setAttribute("stroke-width", "2");
    chevron.setAttribute("stroke-linecap", "round");
    chevron.setAttribute("stroke-linejoin", "round");
    chevron.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
    trigger.appendChild(label);
    trigger.appendChild(chevron);
    wrap.appendChild(trigger);

    const panel = document.createElement("div");
    panel.className = "custom-select-panel";
    wrap.appendChild(panel);

    function buildOptions() {
      panel.innerHTML = "";
      Array.from(selectEl.options).forEach((opt) => {
        const item = document.createElement("div");
        item.className = "custom-select-option";
        item.textContent = opt.textContent;
        item.dataset.value = opt.value;
        if (opt.disabled) item.classList.add("disabled");
        if (opt.value === selectEl.value) item.classList.add("selected");
        item.addEventListener("click", () => {
          if (opt.disabled) return;
          selectEl.value = opt.value;
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));
          syncLabel();
          closePanel();
        });
        panel.appendChild(item);
      });
    }

    function syncLabel() {
      const selectedOpt = selectEl.options[selectEl.selectedIndex];
      label.textContent = selectedOpt ? selectedOpt.textContent : "";
      panel.querySelectorAll(".custom-select-option").forEach((el) => {
        el.classList.toggle("selected", el.dataset.value === selectEl.value);
      });
    }

    function openPanel() {
      document.querySelectorAll(".custom-select.open").forEach((el) => {
        if (el !== wrap) el.classList.remove("open");
      });
      buildOptions();
      wrap.classList.add("open");
    }

    function closePanel() {
      wrap.classList.remove("open");
    }

    trigger.addEventListener("click", () => {
      if (selectEl.disabled) return;
      if (wrap.classList.contains("open")) closePanel();
      else openPanel();
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) closePanel();
    });

    const mo = new MutationObserver(() => {
      syncLabel();
      if (wrap.classList.contains("open")) buildOptions();
    });
    mo.observe(selectEl, { childList: true, subtree: true });

    selectEl.addEventListener("patsec-refresh-options", () => {
      syncLabel();
    });

    syncLabel();
  }

  function enhanceAll(root) {
    const scope = root || document;
    scope.querySelectorAll("select.select-native:not(.custom-select-native-hidden)").forEach(enhance);
  }

  document.addEventListener("DOMContentLoaded", () => enhanceAll());

  return { enhance, enhanceAll };
})();
