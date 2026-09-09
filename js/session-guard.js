const SessionGuard = (() => {
  function getStoredSession() {
    try {
      const raw = sessionStorage.getItem("patsec_session");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function requireRole(expectedRole) {
    return new Promise((resolve) => {
      const stored = getStoredSession();
      if (!stored || stored.role !== expectedRole) {
        window.location.href = "../";
        return;
      }

      function proceed() {
        resolve(stored);
      }

      if (window.PatSecFirebase) {
        proceed();
      } else {
        window.addEventListener("patsec-firebase-ready", proceed, { once: true });
      }
    });
  }

  function clear() {
    sessionStorage.removeItem("patsec_session");
  }

  return { getStoredSession, requireRole, clear };
})();
