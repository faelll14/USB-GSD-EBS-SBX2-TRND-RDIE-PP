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
      const scheduleItem = rawItems.find((x) => x.id === examId);
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
      await setDoc(ref, {
        status: "in_progress",
        startedAt: data.startedAt || Date.now(),
        violationCount: data.violationCount || 0,
        lastActivityAt: Date.now(),
        fullName: studentFullName
      }, { merge: true });
      return { started: true };
    } catch (e) {
      if (typeof e === "string") throw e;
      throw "NETWORK_ERROR";
    }
  }

  async function submitExam(answers) {
    await ensureReady();
    const { auth, db, doc, setDoc } = fb();
    const examId = getExamId();
    const uid = auth.currentUser?.uid;
    if (!uid) throw "NOT_SIGNED_IN";
    try {
      await setDoc(doc(db, "submissions", examId, "entries", uid), {
        answers: answers || {},
        completedAt: Date.now(),
        submittedBy: uid
      });
      await setDoc(doc(db, "exam_sessions", examId, "participants", uid), {
        status: "completed",
        lastActivityAt: Date.now()
      }, { merge: true });
      return { submitted: true };
    } catch (e) {
      throw "SUBMIT_FAILED";
    }
  }

  async function reportViolation() {
    await ensureReady();
    const { auth, db, doc, getDoc, setDoc } = fb();
    const examId = getExamId();
    const uid = auth.currentUser?.uid;
    if (!uid) throw "NOT_SIGNED_IN";
    try {
      const ref = doc(db, "exam_sessions", examId, "participants", uid);
      const snap = await getDoc(ref);
      const currentCount = (snap.exists() ? (snap.data().violationCount || 0) : 0) + 1;
      const shouldLock = currentCount >= 3;
      const updates = { violationCount: currentCount, lastActivityAt: Date.now() };
      if (shouldLock) {
        updates.locked = true;
        updates.lockReason = "Terdeteksi keluar dari aplikasi ujian berulang kali.";
      }
      await setDoc(ref, updates, { merge: true });
      return { violationCount: currentCount, locked: shouldLock };
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
    try {
      const snap = await getDoc(doc(db, "exam_sessions", examId, "participants", uid));
      const data = snap.exists() ? snap.data() : {};
      return { locked: !!data.locked, lockReason: data.lockReason || null };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  return {
    getExamData,
    markStarted,
    submitExam,
    reportViolation,
    checkLockStatus,
    getTheme: () => Promise.resolve({ theme: localStorage.getItem("patsec_theme") || "dark" }),
    setTheme: (theme) => { localStorage.setItem("patsec_theme", theme); return Promise.resolve({ saved: true }); }
  };
})();
