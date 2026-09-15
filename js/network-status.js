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

  function makeSpace() {
    document.body.classList.add("nsb-space");
  }

  function releaseSpace() {
    document.body.classList.remove("nsb-space");
  }

  function showOffline() {
    const bar = ensureBar();
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    bar.textContent = "Internet terputus, cek koneksimu";
    bar.classList.remove("online");
    bar.classList.add("offline", "visible");
    makeSpace();
  }

  function showOnline() {
    const bar = ensureBar();
    bar.textContent = "Internet terhubung!";
    bar.classList.remove("offline");
    bar.classList.add("online", "visible");
    makeSpace();
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      bar.classList.remove("visible");
      releaseSpace();
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

  function init() {
    if (!navigator.onLine) {
      wasOffline = true;
      showOffline();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
