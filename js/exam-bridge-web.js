const ExamBridge = (() => {
  function fb() {
    return window.PatSecFirebase;
  }

  async function ensureReady() {
    if (window.PatSecFirebase) return;
    await new Promise((resolve) => {
      window.addEventListener("patsec-firebase-ready", resolve, { once: true });
    });
  }

  function getExamId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("examId") || "";
  }

  async function getExamData() {
    await ensureReady();
    const { db, doc, getDoc } = fb();
    const examId = getExamId();
    try {
      const scheduleSnap = await getDoc(doc(db, "exams_schedule", "published"));
      const rawItems = (scheduleSnap.exists() ? scheduleSnap.data().items : []) || [];
      let scheduleItem = rawItems.find((x) => x.id === examId);

      if (!scheduleItem) {
        const dailySnap = await getDoc(doc(db, "daily_exams", examId));
        if (dailySnap.exists()) {
          const data = dailySnap.data();
          scheduleItem = {
            subject: data.subject || "",
            startTimestamp: data.startTimestamp || 0,
            durationMinutes: data.durationMinutes || 0
          };
        }
      }

      if (!scheduleItem) throw "EXAM_NOT_FOUND";

      const subject = scheduleItem.subject || "";
      const startTimestamp = scheduleItem.startTimestamp || 0;
      const durationMinutes = scheduleItem.durationMinutes || 0;

      const now = Date.now();
      const endTime = startTimestamp + durationMinutes * 60000;
      if (now < startTimestamp) throw "NOT_STARTED_YET";
      if (now > endTime) throw "ALREADY_ENDED";

      const contentSnap = await getDoc(doc(db, "exam_content", examId));
      const rawQuestions = (contentSnap.exists() ? contentSnap.data().items : []) || [];
      if (!rawQuestions.length) throw "NO_QUESTIONS";
      const questions = rawQuestions.map((m) => ({
        id: m.id || "",
        text: m.text || "",
        options: m.options || {},
        imageUrl: m.imageUrl || null
      }));

      return {
        subject,
        startTimestamp,
        durationMinutes,
        calculatorEnabled: !!contentSnap.data()?.calculatorEnabled,
        highlightEnabled: !!contentSnap.data()?.highlightEnabled,
        startMessage: contentSnap.data()?.startMessage || "",
        endMessage: contentSnap.data()?.endMessage || "",
        questions
      };
    } catch (e) {
      if (typeof e === "string") throw e;
      throw "NETWORK_ERROR";
    }
  }

  async function markStarted(studentFullName) {
    await ensureReady();
    const { auth, db, doc, getDoc, setDoc } = fb();
    const examId = getExamId();
    const uid = auth.currentUser?.uid;
    if (!uid) throw "NOT_SIGNED_IN";
    try {
      const ref = doc(db, "exam_sessions", examId, "participants", uid);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      if (data.status === "completed") throw "ALREADY_COMPLETED";
      let noRuang = data.noRuang;
      let kelas = data.kelas;
      if (noRuang === undefined || kelas === undefined) {
        try {
          const us = await getDoc(doc(db, "users", uid));
          if (noRuang === undefined) noRuang = us.exists() ? (us.data().noRuang || null) : null;
          if (kelas === undefined) kelas = us.exists() ? (us.data().kelas || null) : null;
        } catch (e) {
          if (noRuang === undefined) noRuang = null;
          if (kelas === undefined) kelas = null;
        }
      }
      await setDoc(ref, {
        status: "in_progress",
        startedAt: data.startedAt || Date.now(),
        violationCount: data.violationCount || 0,
        lastActivityAt: Date.now(),
        fullName: studentFullName,
        noRuang: noRuang,
        kelas: kelas
      }, { merge: true });
      return { started: true };
    } catch (e) {
      if (typeof e === "string") throw e;
      throw "NETWORK_ERROR";
    }
  }

  async function submitExam(answers) {
    await ensureReady();
    const { auth, db, doc, getDoc, writeBatch } = fb();
    const examId = getExamId();
    const uid = auth.currentUser?.uid;
    if (!uid) throw "NOT_SIGNED_IN";
    try {
      // Satu batch atomik: jawaban + status selesai tersimpan bersamaan atau tidak sama sekali.
      const now = Date.now();
      const batch = writeBatch(db);
      batch.set(doc(db, "submissions", examId, "entries", uid), {
        answers: answers || {},
        completedAt: now,
        submittedBy: uid
      });
      batch.set(doc(db, "exam_sessions", examId, "participants", uid), {
        status: "completed",
        lastActivityAt: now
      }, { merge: true });
      await batch.commit();
      return { submitted: true };
    } catch (e) {
      try {
        const p = await getDoc(doc(db, "exam_sessions", examId, "participants", uid));
        if (p.exists() && p.data().status === "completed") return { submitted: true };
      } catch (_) {}
      throw "SUBMIT_FAILED";
    }
  }

  // Status kunci dipantau lewat 1 listener realtime; cek status dan tombol refresh hanya membaca cache (0 reads).
  let lockCache = null;
  let lockUnsub = null;

  function ensureLockListener() {
    if (lockUnsub) return;
    const { auth, db, doc, onSnapshot } = fb();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    lockUnsub = onSnapshot(doc(db, "exam_sessions", getExamId(), "participants", uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        lockCache = { locked: !!d.locked, lockReason: d.lockReason || null, violationCount: d.violationCount || 0 };
      }
    }, () => {});
  }

  function lockMessage(reason) {
    return {
      screenshot: "Terdeteksi percobaan screenshot.",
      copy_paste: "Terdeteksi percobaan salin/tempel.",
      focus_lost: "Layar ujian tertutup aplikasi atau jendela lain."
    }[reason] || "Terdeteksi keluar dari halaman ujian berulang kali.";
  }

  // Setiap pelanggaran dicatat (alasan + waktu). Tanpa read: hitungan dari cache listener.
  async function reportViolation(reason) {
    await ensureReady();
    const { auth, db, doc, setDoc, increment, arrayUnion } = fb();
    const examId = getExamId();
    const uid = auth.currentUser?.uid;
    if (!uid) throw "NOT_SIGNED_IN";
    ensureLockListener();
    const why = typeof reason === "string" && reason ? reason : "app_backgrounded";
    const newCount = ((lockCache && lockCache.violationCount) || 0) + 1;
    const shouldLock = newCount >= 1;
    const now = Date.now();
    const updates = {
      violationCount: increment(1),
      violations: arrayUnion({ t: now, r: why }),
      lastActivityAt: now
    };
    const message = lockMessage(why);
    if (shouldLock) {
      updates.locked = true;
      updates.lockReason = message;
    }
    lockCache = {
      locked: shouldLock || !!(lockCache && lockCache.locked),
      lockReason: shouldLock ? message : (lockCache && lockCache.lockReason) || null,
      violationCount: newCount
    };
    try {
      await setDoc(doc(db, "exam_sessions", examId, "participants", uid), updates, { merge: true });
      return { violationCount: newCount, locked: shouldLock, lockReason: message };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  async function checkLockStatus() {
    await ensureReady();
    const { auth, db, doc, getDoc } = fb();
    const examId = getExamId();
    const uid = auth.currentUser?.uid;
    if (!uid) throw "NOT_SIGNED_IN";
    ensureLockListener();
    if (lockCache) return lockCache;
    try {
      const snap = await getDoc(doc(db, "exam_sessions", examId, "participants", uid));
      const data = snap.exists() ? snap.data() : {};
      return { locked: !!data.locked, lockReason: data.lockReason || null, violationCount: data.violationCount || 0 };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  // Tombol refresh layar kunci: hanya membaca cache. 0 reads, 0 writes.
  async function refreshLockState() {
    return lockCache || { locked: true, pending: true };
  }

  // Scoreboard: baca sekali saat panel dibuka (1 read), lalu hanya saat tombol segarkan atau cache lewat 5 menit.
  const sbs = { examId: null, data: null, at: 0, busy: false, ready: false };
  async function getScoreboard(force) {
    await ensureReady();
    const examId = getExamId();
    if (!examId) return { ready: true, available: false, entries: [] };
    const { db, doc, getDoc } = fb();
    if (sbs.examId !== examId) Object.assign(sbs, { examId, data: null, at: 0, ready: false });
    if ((force || Date.now() - sbs.at > 300000) && !sbs.busy) {
      sbs.busy = true;
      try {
        const snap = await getDoc(doc(db, "scoreboards", examId));
        sbs.data = snap.exists() ? snap.data() : null;
      } catch (e) {
        sbs.data = null;
      }
      sbs.at = Date.now();
      sbs.ready = true;
      sbs.busy = false;
    }
    const d = sbs.data;
    const available = !!(d && d.enabled);
    const entries = available ? Object.keys(d.entries || {}).map((u) => Object.assign({ uid: u }, d.entries[u])) : [];
    return { ready: sbs.ready, available, entries };
  }

  return {
    getScoreboard,
    getExamData,
    markStarted,
    submitExam,
    reportViolation,
    refreshLockState,
    finishExam: () => { window.location.replace("/dashboard"); return Promise.resolve({ finished: true }); },
    checkLockStatus,
    getTheme: () => Promise.resolve({ theme: localStorage.getItem("patsec_theme") || "dark" }),
    setTheme: (theme) => { localStorage.setItem("patsec_theme", theme); return Promise.resolve({ saved: true }); }
  };
})();
