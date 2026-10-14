(function () {
  function ensureBar() {
    let bar = document.getElementById("networkStatusBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "networkStatusBar";
      document.body.appendChild(bar);
    }
    if (document.querySelector(".bottom-nav")) {
      document.body.classList.add("has-bottom-nav");
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
    document.body.classList.add("net-bar-visible");
  }

  function showOnline() {
    const bar = ensureBar();
    bar.textContent = "Internet terhubung!";
    bar.classList.remove("offline");
    bar.classList.add("online", "visible");
    document.body.classList.add("net-bar-visible");
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      bar.classList.remove("visible");
      document.body.classList.remove("net-bar-visible");
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
