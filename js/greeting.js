const GreetingHelper = (() => {
  function getPhraseAndIcon() {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) {
      return {
        phrase: "Selamat pagi",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`
      };
    }
    if (hour >= 11 && hour < 15) {
      return {
        phrase: "Selamat siang",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="5"/><path d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5 19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>`
      };
    }
    if (hour >= 15 && hour < 18) {
      return {
        phrase: "Selamat sore",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 2v7M4.2 10.2l1.4 1.4M19.8 10.2l-1.4 1.4M1 18h2M21 18h2M12 22h.01"/><path d="M4 22h16"/></svg>`
      };
    }
    return {
      phrase: "Selamat malam",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
    };
  }

  function apply(iconElId, subElId, nameElId, fullName, roleLabel) {
    const { phrase, icon } = getPhraseAndIcon();
    const iconEl = document.getElementById(iconElId);
    const subEl = document.getElementById(subElId);
    const nameEl = document.getElementById(nameElId);
    const firstName = (fullName || roleLabel).trim().split(" ")[0];
    if (iconEl) iconEl.innerHTML = icon;
    if (subEl) subEl.textContent = phrase + ",";
    if (nameEl) nameEl.textContent = firstName;
  }

  return { apply, getPhraseAndIcon };
})();
