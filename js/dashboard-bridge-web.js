const DashBridge = (() => {
  function fb() {
    return window.PatSecFirebase;
  }

  let cachedSession = null;

  async function ensureReady() {
    if (window.PatSecFirebase) return;
    await new Promise((resolve) => {
      window.addEventListener("patsec-firebase-ready", resolve, { once: true });
    });
  }

  async function getSession() {
    if (cachedSession) return cachedSession;
    const stored = SessionGuard.getStoredSession();
    if (!stored) throw "NOT_SIGNED_IN";
    cachedSession = stored;
    return stored;
  }

  async function getExamSchedule() {
    await ensureReady();
    const { db, doc, getDoc } = fb();
    const session = await getSession();
    try {
      const snap = await getDoc(doc(db, "exams_schedule", "published"));
      const items = (snap.exists() ? snap.data().items : []) || [];
      const filtered = items.filter((item) => {
        const targets = item.kelasTargets || [];
        if (targets.length === 0) return true;
        return targets.includes(extractGrade(session.kelas || ""));
      });
      return { items: filtered };
    } catch (e) {
      return { items: [] };
    }
  }

  function extractGrade(kelas) {
    const trimmed = kelas.trim().toUpperCase();
    if (trimmed.startsWith("XII")) return "XII";
    if (trimmed.startsWith("XI")) return "XI";
    if (trimmed.startsWith("X")) return "X";
    return null;
  }

  async function getLeaderboard() {
    await ensureReady();
    const { db, doc, getDoc } = fb();
    try {
      const snap = await getDoc(doc(db, "public_stats", "leaderboard"));
      if (!snap.exists()) return { published: false, top10: [] };
      const data = snap.data();
      return { published: !!data.published, top10: data.top10 || [] };
    } catch (e) {
      return { published: false, top10: [] };
    }
  }

  async function attemptStartExam(examId) {
    window.location.href = "../exam/index.html?examId=" + encodeURIComponent(examId);
  }

  async function getMyResults() {
    await ensureReady();
    const { db, collection, query, where, getDocs } = fb();
    const session = await getSession();
    try {
      const q = query(collection(db, "users", session.uid, "results"), where("published", "==", true));
      const snap = await getDocs(q);
      const items = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({
          subject: data.subject || "",
          score: data.score || 0,
          supervisor: data.supervisor || "",
          completedAt: data.completedAt || ""
        });
      });
      return { items };
    } catch (e) {
      return { items: [] };
    }
  }

  async function getLoginHistory() {
    await ensureReady();
    const { db, collection, query, orderBy, limit, getDocs } = fb();
    const session = await getSession();
    try {
      const q = query(
        collection(db, "users", session.uid, "login_history"),
        orderBy("timestamp", "desc"),
        limit(30)
      );
      const snap = await getDocs(q);
      const items = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({
          timestamp: data.timestamp || "",
          deviceModel: data.deviceModel || "",
          androidVersion: data.androidVersion || "",
          ipAddress: data.ipAddress || null
        });
      });
      return { items };
    } catch (e) {
      return { items: [] };
    }
  }

  async function getAccountInfo() {
    await ensureReady();
    const { db, doc, getDoc } = fb();
    const session = await getSession();
    try {
      const snap = await getDoc(doc(db, "users", session.uid));
      const data = snap.exists() ? snap.data() : {};
      return { username: data.username || null, biometricMethod: null };
    } catch (e) {
      return {};
    }
  }

  async function setUsername(username) {
    await ensureReady();
    const { db, doc, getDoc, runTransaction } = fb();
    const session = await getSession();
    const trimmed = username.trim();

    if (trimmed.length < 4) throw "TOO_SHORT";
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) throw "INVALID_FORMAT";

    const newKey = trimmed.toLowerCase();
    const userRef = doc(db, "users", session.uid);
    const newUsernameRef = doc(db, "usernames", newKey);

    try {
      await runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userRef);
        const currentUsername = userSnap.data().username;

        if (currentUsername && currentUsername.toLowerCase() === newKey) return;

        const newUsernameSnap = await tx.get(newUsernameRef);
        if (newUsernameSnap.exists()) throw "USERNAME_TAKEN";

        const now = Date.now();
        const weekMillis = 7 * 24 * 60 * 60 * 1000;
        const weekStart = userSnap.data().usernameChangeWeekStart || 0;
        const countRaw = userSnap.data().usernameChangeCount || 0;
        const inSameWeek = (now - weekStart) < weekMillis;
        const effectiveCount = inSameWeek ? countRaw : 0;
        const effectiveWeekStart = inSameWeek ? weekStart : now;

        if (effectiveCount >= 2) throw "LIMIT_REACHED";

        tx.set(newUsernameRef, { uid: session.uid, nisNip: userSnap.data().nisNip || "" });

        if (currentUsername) {
          const oldRef = doc(db, "usernames", currentUsername.toLowerCase());
          tx.delete(oldRef);
        }

        tx.update(userRef, {
          username: trimmed,
          usernameChangeCount: effectiveCount + 1,
          usernameChangeWeekStart: effectiveWeekStart,
          updatedAt: now
        });
      });
    } catch (e) {
      if (typeof e === "string") throw e;
      throw "NETWORK_ERROR";
    }

    return { username: trimmed };
  }

  async function changePassword(oldPassword, newPassword) {
    await ensureReady();
    const { auth, EmailAuthProvider, reauthenticateWithCredential, updatePassword, db, doc, updateDoc } = fb();
    const user = auth.currentUser;
    if (!user || !user.email) throw "NOT_SIGNED_IN";
    if (newPassword.length < 6) throw "WEAK_PASSWORD";

    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
    } catch (e) {
      throw "WRONG_OLD_PASSWORD";
    }

    try {
      await updatePassword(user, newPassword);
    } catch (e) {
      throw "WEAK_PASSWORD";
    }

    try {
      await updateDoc(doc(db, "users", user.uid), { passwordIsDefault: false, updatedAt: Date.now() });
    } catch (e) {}

    return { changed: true };
  }

  async function checkBiometricAvailability() {
    return { faceAvailable: false, fingerprintAvailable: false };
  }

  async function setBiometricEnabled() {
    throw "NOT_SUPPORTED_ON_WEB";
  }

  async function getSchoolInfo() {
    return {
      name: AppConfig.SCHOOL_NAME_FALLBACK,
      address: AppConfig.SCHOOL_ADDRESS,
      phone: AppConfig.SCHOOL_PHONE,
      email: AppConfig.SCHOOL_EMAIL,
      instagramHandle: AppConfig.SCHOOL_INSTAGRAM_HANDLE,
      instagramUrl: AppConfig.SCHOOL_INSTAGRAM_URL,
      osisInstagramHandle: AppConfig.OSIS_INSTAGRAM_HANDLE,
      osisInstagramUrl: AppConfig.OSIS_INSTAGRAM_URL,
      developerName: AppConfig.DEVELOPER_NAME,
      developerUrl: AppConfig.DEVELOPER_PORTFOLIO_URL
    };
  }

  async function openExternal(url) {
    window.open(url, "_blank", "noopener");
    return { opened: true };
  }

  async function logout() {
    await ensureReady();
    await AuthRepository.logout();
    SessionGuard.clear();
    return { loggedOut: true };
  }

  return {
    getSession,
    getExamSchedule,
    getLeaderboard,
    attemptStartExam,
    getMyResults,
    getLoginHistory,
    getAccountInfo,
    setUsername,
    changePassword,
    checkBiometricAvailability,
    setBiometricEnabled,
    getSchoolInfo,
    getTheme: () => Promise.resolve({ theme: localStorage.getItem("patsec_theme") || "dark" }),
    setTheme: (theme) => { localStorage.setItem("patsec_theme", theme); return Promise.resolve({ saved: true }); },
    openExternal,
    logout
  };
})();
