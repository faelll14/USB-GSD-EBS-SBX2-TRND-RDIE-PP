(function () {
  function ensureBar() {
    let bar = document.getElementById("networkStatusBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "networkStatusBar";
      document.body.appendChild(bar);
    }
    return bar;
  }

  let hideTimer = null;
  let wasOffline = !navigator.onLine;

  function showOffline() {
    const bar = ensureBar();
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    bar.textContent = "Internet terputus, cek koneksimu";
    bar.classList.remove("online");
    bar.classList.add("offline", "visible");
  }

  function showOnline() {
    const bar = ensureBar();
    bar.textContent = "Internet terhubung!";
    bar.classList.remove("offline");
    bar.classList.add("online", "visible");
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      bar.classList.remove("visible");
      hideTimer = null;
    }, 2000);
  }

  function handleOffline() {
    wasOffline = true;
    showOffline();
  }

  function handleOnline() {
    if (wasOffline) {
      wasOffline = false;
      showOnline();
    }
  }

  window.addEventListener("offline", handleOffline);
  window.addEventListener("online", handleOnline);

  document.addEventListener("DOMContentLoaded", () => {
    if (!navigator.onLine) {
      wasOffline = true;
      showOffline();
    }
  });
})();
