const SessionGuard = (() => {
  const STORAGE_KEY = "patsec_session";
  const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;
  const REMEMBER_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  function getStoredSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.expiresAt || Date.now() > parsed.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveSession(session, rememberLong) {
    try {
      const ttl = rememberLong ? REMEMBER_TTL_MS : DEFAULT_TTL_MS;
      const withExpiry = Object.assign({}, session, { expiresAt: Date.now() + ttl });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(withExpiry));
    } catch (e) {}
  }

  function updateStoredSession(patch) {
    try {
      const current = getStoredSession();
      if (!current) return;
      const merged = Object.assign({}, current, patch);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {}
  }

  function requireRole(expectedRole) {
    return new Promise((resolve) => {
      const stored = getStoredSession();
      const additionalRoles = (stored && stored.additionalRoles) || [];
      const hasAccess = stored && (stored.role === expectedRole || additionalRoles.includes(expectedRole));
      if (!hasAccess) {
        window.location.href = "/";
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
    localStorage.removeItem(STORAGE_KEY);
  }

  return { getStoredSession, saveSession, updateStoredSession, requireRole, clear };
})();
