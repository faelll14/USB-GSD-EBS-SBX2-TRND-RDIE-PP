const PanitiaBridge = (() => {
  function fb() {
    return window.PatSecFirebase;
  }

  async function ensureReady() {
    if (window.PatSecFirebase) return;
    await new Promise((resolve) => {
      window.addEventListener("patsec-firebase-ready", resolve, { once: true });
    });
  }

  function getSession() {
    const stored = SessionGuard.getStoredSession();
    if (!stored) throw "NOT_SIGNED_IN";
    return Promise.resolve({ uid: stored.uid, fullName: stored.fullName, role: stored.role });
  }

  async function listExamSchedule() {
    await ensureReady();
    const { db, doc, getDoc } = fb();
    try {
      const snap = await getDoc(doc(db, "exams_schedule", "published"));
      const items = (snap.exists() ? snap.data().items : []) || [];
      return { items: items.map((m) => ({ id: m.id || "", subject: m.subject || "", date: m.date || "", startLabel: m.startLabel || "", startTimestamp: m.startTimestamp || 0, durationMinutes: m.durationMinutes || 0 })) };
    } catch (e) {
      return { items: [] };
    }
  }

  async function getMyDutySchedule() {
    await ensureReady();
    const { db, collection, getDocs, doc, getDoc } = fb();
    const session = await getSession();
    try {
      const dutySnap = await getDocs(collection(db, "duty_schedule"));
      const myAssignments = [];
      dutySnap.forEach((d) => {
        const assignments = d.data().assignments || [];
        assignments.forEach((a) => {
          if (a && a.panitiaUid === session.uid) {
            myAssignments.push({ examId: d.id, room: a.room || "" });
          }
        });
      });

      if (myAssignments.length === 0) return { items: [] };

      const scheduleSnap = await getDoc(doc(db, "exams_schedule", "published"));
      const rawItems = (scheduleSnap.exists() ? scheduleSnap.data().items : []) || [];
      const byId = {};
      rawItems.forEach((m) => { if (m && m.id) byId[m.id] = m; });

      const items = [];
      myAssignments.forEach((a) => {
        const meta = byId[a.examId];
        if (!meta) return;
        items.push({ subject: meta.subject || "", date: meta.date || "", startLabel: meta.startLabel || "", room: a.room });
      });
      return { items };
    } catch (e) {
      return { items: [] };
    }
  }

  async function getRoomControl(examId) {
    await ensureReady();
    if (!examId) return { items: [] };
    const { db, collection, getDocs } = fb();
    try {
      const snap = await getDocs(collection(db, "exam_sessions", examId, "participants"));
      const items = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({
          uid: d.id,
          fullName: data.fullName || "",
          status: data.status || "not_started",
          violationCount: data.violationCount || 0,
          locked: !!data.locked
        });
      });
      return { items };
    } catch (e) {
      return { items: [] };
    }
  }

  async function unlockParticipant(examId, uid, reason) {
    await ensureReady();
    const { db, doc, setDoc } = fb();
    const session = await getSession();
    try {
      await setDoc(doc(db, "exam_sessions", examId, "participants", uid), {
        locked: false,
        lockReason: null,
        unlockedBy: session.fullName,
        unlockedReason: reason,
        unlockedAt: Date.now()
      }, { merge: true });
      return { unlocked: true };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
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

  async function getLoginHistory() {
    await ensureReady();
    const { db, collection, query, orderBy, limit, getDocs } = fb();
    const session = await getSession();
    try {
      const q = query(collection(db, "users", session.uid, "login_history"), orderBy("timestamp", "desc"), limit(30));
      const snap = await getDocs(q);
      const items = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({ timestamp: data.timestamp || "", deviceModel: data.deviceModel || "", androidVersion: data.androidVersion || "", ipAddress: data.ipAddress || null });
      });
      return { items };
    } catch (e) {
      return { items: [] };
    }
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
    listExamSchedule,
    getMyDutySchedule,
    getRoomControl,
    unlockParticipant,
    changePassword,
    getLoginHistory,
    getSchoolInfo,
    getTheme: () => Promise.resolve({ theme: localStorage.getItem("patsec_theme") || "dark" }),
    setTheme: (theme) => { localStorage.setItem("patsec_theme", theme); return Promise.resolve({ saved: true }); },
    openExternal,
    logout
  };
})();
