(function () {
  const APP_PACKAGE = "com.patlas.ujian";
  const INTENT_URL = "intent://open#Intent;scheme=patlasapp;package=" + APP_PACKAGE + ";end";
  const DISMISS_KEY = "patsec_app_banner_dismissed";
  const banner = document.getElementById("appOpenBanner");
  if (!banner) return;

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  function alreadyDismissed() {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markDismissed() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch (e) {}
  }

  function hideBanner() {
    banner.classList.remove("visible");
  }

  function showBanner() {
    banner.classList.add("visible");
  }

  function attemptDetectApp() {
    if (!isAndroid() || alreadyDismissed()) return;

    let appOpened = false;
    const onHide = () => {
      if (document.hidden) appOpened = true;
    };
    document.addEventListener("visibilitychange", onHide);

    const frame = document.createElement("iframe");
    frame.style.display = "none";
    try {
      frame.src = INTENT_URL;
    } catch (e) {}
    document.body.appendChild(frame);

    setTimeout(() => {
      document.removeEventListener("visibilitychange", onHide);
      if (frame.parentNode) frame.parentNode.removeChild(frame);
      if (appOpened) {
        showBanner();
      }
    }, 1000);
  }

  document.getElementById("btnOpenInApp").addEventListener("click", () => {
    window.location.href = INTENT_URL;
    hideBanner();
  });

  document.getElementById("btnDismissAppBanner").addEventListener("click", () => {
    hideBanner();
    markDismissed();
  });

  attemptDetectApp();
})();
