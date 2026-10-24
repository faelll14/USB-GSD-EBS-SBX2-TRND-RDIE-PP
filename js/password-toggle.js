const PasswordToggle = (() => {
  const EYE_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path class="pt-lid" d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"/><circle class="pt-pupil" cx="12" cy="12" r="3"/></svg>';
  const EYE_CLOSED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path class="pt-lid" d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"/><line class="pt-lash" x1="4" y1="17" x2="20" y2="7"/></svg>';

  function wrap(input) {
    if (!input || input.dataset.ptWrapped) return;
    input.dataset.ptWrapped = "1";

    const holder = document.createElement("div");
    holder.className = "pt-field-wrap";
    input.parentNode.insertBefore(holder, input);
    holder.appendChild(input);
    input.classList.add("pt-input");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pt-toggle-btn";
    btn.setAttribute("aria-label", "Tampilkan kata sandi");
    btn.innerHTML = EYE_CLOSED;
    holder.appendChild(btn);

    btn.addEventListener("click", () => {
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      btn.classList.add("pt-pop");
      setTimeout(() => btn.classList.remove("pt-pop"), 260);
      btn.innerHTML = showing ? EYE_CLOSED : EYE_OPEN;
      btn.setAttribute("aria-label", showing ? "Tampilkan kata sandi" : "Sembunyikan kata sandi");
    });
  }

  function wrapAll(selector) {
    document.querySelectorAll(selector || 'input[type="password"]').forEach(wrap);
  }

  return { wrap, wrapAll };
})();

document.addEventListener("DOMContentLoaded", () => PasswordToggle.wrapAll());
