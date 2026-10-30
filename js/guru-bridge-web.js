const GuruBridge = (() => {
  function fb() {
    return window.PatSecFirebase;
  }

  async function ensureReady() {
    if (window.PatSecFirebase) return;
    await new Promise((resolve) => {
      window.addEventListener("patsec-firebase-ready", resolve, { once: true });
    });
  }

  async function getAvailableKelasList() {
    await ensureReady();
    const { db, collection, query, where, limit, getDocs, doc, getDoc } = fb();
    try {
      // Hemat reads: daftar kelas disimpan admin di public_stats/kelas (1 read), scan users hanya cadangan.
      const ks = await getDoc(doc(db, "public_stats", "kelas"));
      const cached = ks.exists() ? ks.data().items : null;
      if (Array.isArray(cached) && cached.length) return { kelasList: cached };
      const q = query(collection(db, "users"), where("role", "==", "siswa"), limit(2000));
      const snap = await getDocs(q);
      const kelasSet = new Set();
      snap.forEach((d) => {
        const kelas = (d.data().kelas || "").trim();
        if (kelas) kelasSet.add(kelas);
      });
      return { kelasList: Array.from(kelasSet).sort() };
    } catch (e) {
      return { kelasList: [] };
    }
  }

  async function createDailyExam(kelasTargets, details) {
    await ensureReady();
    if (!kelasTargets || kelasTargets.length === 0) throw "INVALID_INPUT";
    if ((await getOperationMode()).operationMode !== "harian") throw "MODE_RESTRICTED";
    const { db, doc, setDoc } = fb();
    const session = await getSession();
    const newId = (crypto.randomUUID ? crypto.randomUUID() : "id_" + Date.now() + "_" + Math.random().toString(36).slice(2));
    const dt = details || {};
    const complete = !!(dt.subject && dt.startTimestamp > 0 && dt.durationMinutes > 0);
    try {
      await setDoc(doc(db, "daily_exams", newId), {
        id: newId,
        subject: dt.subject || "",
        kelasTargets,
        date: dt.date || "",
        startLabel: dt.startLabel || "",
        startTimestamp: dt.startTimestamp || 0,
        durationMinutes: dt.durationMinutes || 0,
        createdBy: session.uid,
        createdByName: session.fullName,
        status: complete ? "ready" : "draft",
        createdAt: Date.now()
      });
      if (complete) {
        await setDoc(doc(db, "exam_timing", newId), { startTimestamp: dt.startTimestamp, durationMinutes: dt.durationMinutes });
      }
      return { id: newId };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  async function updateDailyExamDetails(examId, payload) {
    await ensureReady();
    if (!examId) throw "INVALID_INPUT";
    if ((await getOperationMode()).operationMode !== "harian") throw "MODE_RESTRICTED";
    const { db, doc, setDoc } = fb();
    try {
      const isComplete = !!(payload.subject && payload.startTimestamp > 0 && payload.durationMinutes > 0);
      await setDoc(doc(db, "daily_exams", examId), {
        subject: payload.subject || "",
        date: payload.date || "",
        startLabel: payload.startLabel || "",
        startTimestamp: payload.startTimestamp || 0,
        durationMinutes: payload.durationMinutes || 0,
        status: isComplete ? "ready" : "draft"
      }, { merge: true });

      if (payload.startTimestamp > 0 && payload.durationMinutes > 0) {
        await setDoc(doc(db, "exam_timing", examId), {
          startTimestamp: payload.startTimestamp,
          durationMinutes: payload.durationMinutes
        });
      }
      return { saved: true };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  async function getMyDailyExams() {
    await ensureReady();
    const { db, collection, query, where, limit, getDocs } = fb();
    const session = await getSession();
    try {
      const q = query(collection(db, "daily_exams"), where("createdBy", "==", session.uid), limit(200));
      const snap = await getDocs(q);
      const items = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          subject: data.subject || "",
          kelasTargets: data.kelasTargets || [],
          date: data.date || "",
          startLabel: data.startLabel || "",
          startTimestamp: data.startTimestamp || 0,
          durationMinutes: data.durationMinutes || 0,
          status: data.status || "draft"
        });
      });
      return { items };
    } catch (e) {
      return { items: [] };
    }
  }

  async function getOperationMode() {
    await ensureReady();
    const { db, doc, getDoc } = fb();
    try {
      const snap = await getDoc(doc(db, "system_config", "access"));
      const mode = snap.exists() ? (snap.data().operationMode || "ujian") : "ujian";
      return { operationMode: mode };
    } catch (e) {
      return { operationMode: "ujian" };
    }
  }

  function getSession() {
    const stored = SessionGuard.getStoredSession();
    if (!stored) throw "NOT_SIGNED_IN";
    return Promise.resolve({
      uid: stored.uid,
      fullName: stored.fullName,
      role: stored.role,
      nisNip: stored.nisNip,
      passwordIsDefault: !!stored.passwordIsDefault
    });
  }

  async function getMyDutySchedule() {
    await ensureReady();
    const { db, collection, getDocs, doc, getDoc } = fb();
    const session = await getSession();
    try {
      const dutySnap = await getDocs(collection(db, "duty_schedule"));
      const myAssignments = [];
      dutySnap.forEach((d) => {
        (d.data().assignments || []).forEach((a) => {
          if (a && a.panitiaUid === session.uid) myAssignments.push({ examId: d.id, room: a.room || "" });
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
        items.push({
          examId: a.examId,
          subject: meta.subject || "",
          date: meta.date || "",
          startLabel: meta.startLabel || "",
          startTimestamp: meta.startTimestamp || 0,
          durationMinutes: meta.durationMinutes || 0,
          kelasTargets: meta.kelasTargets || [],
          room: a.room
        });
      });
      return { items };
    } catch (e) {
      return { items: [] };
    }
  }

  let rcExamId = null;
  let rcUnsub = null;
  let rcDocs = [];
  let rcReady = false;
  let rcKey = "";

  // Satu listener realtime per ujian: reads = jumlah peserta sekali + 1 per perubahan, bukan polling.
  async function getRoomControl(examId, rooms) {
    await ensureReady();
    if (!examId) return { items: [], ready: true };
    const { db, collection, onSnapshot, query, where } = fb();
    const roomList = (rooms || []).filter(Boolean);
    const key = examId + "|" + roomList.slice().sort().join(",");
    if (rcKey !== key) {
      if (rcUnsub) rcUnsub();
      rcKey = key;
      rcExamId = examId;
      rcReady = false;
      rcDocs = [];
      // Hanya peserta di ruang guru ini yang dibaca (hemat reads); tanpa ruang (admin) = semua.
      const base = collection(db, "exam_sessions", examId, "participants");
      const q = roomList.length > 0 && roomList.length <= 30 ? query(base, where("noRuang", "in", roomList)) : base;
      rcUnsub = onSnapshot(
        q,
        (snap) => { rcDocs = snap.docs; rcReady = true; },
        () => { rcReady = true; }
      );
    }
    const roomSet = new Set(rooms || []);
    const items = [];
    rcDocs.forEach((d) => {
      const data = d.data();
      if (roomSet.size > 0 && !roomSet.has(data.noRuang || "")) return;
      items.push({
        uid: d.id,
        fullName: data.fullName || "",
        kelas: data.kelas || "",
        status: data.status || "not_started",
        violationCount: data.violationCount || 0,
        locked: !!data.locked,
        lockReason: data.lockReason || "",
        violations: (data.violations || []).slice(-15)
      });
    });
    return { items, ready: rcReady };
  }

  // Hapus ulangan harian buatan sendiri (jadwal + waktu + soal + kunci): 4 write, tanpa read.
  async function deleteDailyExam(examId) {
    await ensureReady();
    if (!examId) throw "INVALID_INPUT";
    const { db, doc, writeBatch } = fb();
    try {
      const batch = writeBatch(db);
      ["daily_exams", "exam_timing", "exam_content", "exam_answer_keys"].forEach((c) => batch.delete(doc(db, c, examId)));
      await batch.commit();
      return { deleted: true };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  // Daftar siswa untuk menandai siapa yang sudah/belum masuk. 1 read.
  async function getRoster() {
    await ensureReady();
    const { db, doc, getDoc } = fb();
    try {
      const snap = await getDoc(doc(db, "class_rosters", "all"));
      return { items: snap.exists() ? (snap.data().items || []) : [] };
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
        violationCount: 0,
        unlockedBy: session.fullName,
        unlockedReason: reason,
        unlockedAt: Date.now()
      }, { merge: true });
      return { unlocked: true };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  async function listExamSchedule() {
    await ensureReady();
    if ((await getOperationMode()).operationMode === "harian") return { items: [] };
    const { db, doc, getDoc } = fb();
    try {
      const snap = await getDoc(doc(db, "exams_schedule", "published"));
      const items = (snap.exists() ? snap.data().items : []) || [];
      return { items: items.map((m) => ({ id: m.id || "", subject: m.subject || "", date: m.date || "", startLabel: m.startLabel || "" })) };
    } catch (e) {
      return { items: [] };
    }
  }

  async function getQuestions(examId) {
    await ensureReady();
    if (!examId) return { items: [] };
    const { db, doc, getDoc } = fb();
    try {
      const contentSnap = await getDoc(doc(db, "exam_content", examId));
      const keysSnap = await getDoc(doc(db, "exam_answer_keys", examId));
      const contentItems = contentSnap.exists() ? (contentSnap.data().items || []) : [];
      const keyItems = keysSnap.exists() ? (keysSnap.data().items || []) : [];
      const keyMap = {};
      keyItems.forEach((k) => { if (k && k.id) keyMap[k.id] = k.correctKey || ""; });

      const items = contentItems.filter((m) => m && m.id).map((m) => ({
        id: m.id,
        text: m.text || "",
        options: m.options || {},
        correctKey: keyMap[m.id] || "",
        imageUrl: m.imageUrl || null
      }));

      return {
        items,
        calculatorEnabled: !!contentSnap.data()?.calculatorEnabled,
        highlightEnabled: !!contentSnap.data()?.highlightEnabled,
        startMessage: contentSnap.data()?.startMessage || "",
        endMessage: contentSnap.data()?.endMessage || ""
      };
    } catch (e) {
      return { items: [] };
    }
  }

  async function saveQuestions(examId, questions) {
    await ensureReady();
    {
      const { db: d0, doc: doc0, getDoc: get0 } = fb();
      const isDaily = (await get0(doc0(d0, "daily_exams", examId))).exists();
      const harian = (await getOperationMode()).operationMode === "harian";
      if (harian !== isDaily) throw "MODE_RESTRICTED";
    }
    const { db, doc, runTransaction } = fb();
    const contentRef = doc(db, "exam_content", examId);
    const keysRef = doc(db, "exam_answer_keys", examId);
    try {
      await runTransaction(db, async (tx) => {
        const contentSnap = await tx.get(contentRef);
        const keysSnap = await tx.get(keysRef);
        const existingContent = (contentSnap.exists() ? contentSnap.data().items : []) || [];
        const existingKeys = (keysSnap.exists() ? keysSnap.data().items : []) || [];

        questions.forEach((q) => {
          existingContent.push({ id: q.id, text: q.text, options: q.options, imageUrl: null });
          existingKeys.push({ id: q.id, correctKey: q.correctKey });
        });

        tx.set(contentRef, {
          items: existingContent,
          calculatorEnabled: !!contentSnap.data()?.calculatorEnabled,
          highlightEnabled: !!contentSnap.data()?.highlightEnabled,
          startMessage: contentSnap.data()?.startMessage || "",
          endMessage: contentSnap.data()?.endMessage || ""
        });
        tx.set(keysRef, { items: existingKeys });
      });

      const { getDoc, updateDoc } = fb();
      const dailyRef = doc(db, "daily_exams", examId);
      const dailySnap = await getDoc(dailyRef);
      if (dailySnap.exists() && questions.length > 0) {
        await updateDoc(dailyRef, { status: "published" });
      }

      return { saved: questions.length };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  async function updateQuestion(examId, question) {
    await ensureReady();
    const { db, doc, runTransaction } = fb();
    const contentRef = doc(db, "exam_content", examId);
    const keysRef = doc(db, "exam_answer_keys", examId);
    try {
      await runTransaction(db, async (tx) => {
        const contentSnap = await tx.get(contentRef);
        const keysSnap = await tx.get(keysRef);
        const contentList = (contentSnap.exists() ? contentSnap.data().items : []) || [];
        const keysList = (keysSnap.exists() ? keysSnap.data().items : []) || [];

        const updatedItem = { id: question.id, text: question.text, options: question.options, imageUrl: question.imageUrl || null };
        const cIdx = contentList.findIndex((x) => x.id === question.id);
        if (cIdx >= 0) contentList[cIdx] = updatedItem; else contentList.push(updatedItem);

        const updatedKey = { id: question.id, correctKey: question.correctKey };
        const kIdx = keysList.findIndex((x) => x.id === question.id);
        if (kIdx >= 0) keysList[kIdx] = updatedKey; else keysList.push(updatedKey);

        tx.update(contentRef, { items: contentList });
        tx.update(keysRef, { items: keysList });
      });
      return { updated: true };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  async function deleteQuestion(examId, questionId) {
    await ensureReady();
    const { db, doc, runTransaction } = fb();
    const contentRef = doc(db, "exam_content", examId);
    const keysRef = doc(db, "exam_answer_keys", examId);
    try {
      await runTransaction(db, async (tx) => {
        const contentSnap = await tx.get(contentRef);
        const keysSnap = await tx.get(keysRef);
        const contentList = ((contentSnap.exists() ? contentSnap.data().items : []) || []).filter((x) => x.id !== questionId);
        const keysList = ((keysSnap.exists() ? keysSnap.data().items : []) || []).filter((x) => x.id !== questionId);
        tx.update(contentRef, { items: contentList });
        tx.update(keysRef, { items: keysList });
      });
      return { deleted: true };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  async function setExamToggles(examId, calculatorEnabled, highlightEnabled) {
    await ensureReady();
    const { db, doc, setDoc } = fb();
    try {
      await setDoc(doc(db, "exam_content", examId), { calculatorEnabled, highlightEnabled }, { merge: true });
      return { saved: true };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  async function setExamMessages(examId, startMessage, endMessage) {
    await ensureReady();
    const { db, doc, setDoc } = fb();
    try {
      await setDoc(doc(db, "exam_content", examId), { startMessage, endMessage }, { merge: true });
      return { saved: true };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  async function computeGrades(examId) {
    await ensureReady();
    if (!examId) throw "INVALID_EXAM";
    const { db, doc, getDoc, setDoc, collection, getDocs } = fb();
    const session = await getSession();
    try {
      const scheduleSnap = await getDoc(doc(db, "exams_schedule", "published"));
      const items = (scheduleSnap.exists() ? scheduleSnap.data().items : []) || [];
      const scheduleItem = items.find((x) => x.id === examId);
      const subject = scheduleItem ? (scheduleItem.subject || "") : "";

      const keysSnap = await getDoc(doc(db, "exam_answer_keys", examId));
      const keyItems = (keysSnap.exists() ? keysSnap.data().items : []) || [];
      const keyMap = {};
      keyItems.forEach((k) => { if (k && k.id) keyMap[k.id] = k.correctKey || ""; });
      const totalQuestions = Object.keys(keyMap).length;
      if (totalQuestions === 0) throw "NO_ANSWER_KEY";

      const submissionsSnap = await getDocs(collection(db, "submissions", examId, "entries"));
      const gradedUids = [];

      for (const subDoc of submissionsSnap.docs) {
        const uid = subDoc.id;
        const answersMap = subDoc.data().answers || {};
        let correctCount = 0;
        Object.keys(keyMap).forEach((qid) => {
          const studentAnswer = answersMap[qid];
          if (studentAnswer != null && String(studentAnswer).toLowerCase() === String(keyMap[qid]).toLowerCase()) {
            correctCount++;
          }
        });
        const score = (correctCount / totalQuestions) * 100;
        const completedAtMillis = subDoc.data().completedAt || Date.now();
        const completedAtLabel = new Date(completedAtMillis).toLocaleString("id-ID", {
          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
        });

        await setDoc(doc(db, "users", uid, "results", examId), {
          subject,
          score,
          supervisor: session.fullName,
          completedAt: completedAtLabel,
          published: false,
          gradedAt: Date.now()
        });

        gradedUids.push(uid);
      }

      await setDoc(doc(db, "exam_results_index", examId), {
        uids: gradedUids,
        subject,
        computedAt: Date.now()
      });

      return { gradedCount: gradedUids.length };
    } catch (e) {
      if (typeof e === "string") throw e;
      throw "NETWORK_ERROR";
    }
  }

  async function pickImage() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp";
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) { reject("CANCELLED"); return; }
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          reject("INVALID_TYPE");
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          reject("FILE_TOO_LARGE");
          return;
        }
        try {
          const url = await uploadToCloudinary(file);
          resolve({ url });
        } catch (e) {
          reject("UPLOAD_FAILED");
        }
      };
      input.oncancel = () => reject("CANCELLED");
      input.click();
    });
  }

  async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("upload_preset", AppConfig.CLOUDINARY_UPLOAD_PRESET);
    formData.append("file", file);
    const res = await fetch("https://api.cloudinary.com/v1_1/" + AppConfig.CLOUDINARY_CLOUD_NAME + "/image/upload", {
      method: "POST",
      body: formData
    });
    if (!res.ok) throw new Error("Cloudinary upload failed");
    const json = await res.json();
    return json.secure_url;
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
    SessionGuard.updateStoredSession({ passwordIsDefault: false });
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

  async function getAccountInfo() {
    return { username: null, biometricMethod: null };
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
    if (!/^https:\/\//i.test(String(url || ""))) throw new Error("BLOCKED_URL");
    window.open(url, "_blank", "noopener,noreferrer");
    return { opened: true };
  }

  async function logout() {
    await ensureReady();
    await AuthRepository.logout();
    SessionGuard.clear();
    return { loggedOut: true };
  }

  // ---------- penilaian langsung + scoreboard ----------
  // Guru yang membuka kontrol ruang menjadi "penilai": tiap jawaban baru dinilai & dicatat otomatis.
  // Hemat: 3 read awal (kunci, jadwal, scoreboard) + 1 read tiap jawaban baru. Listener, bukan polling.
  const lg = { examId: null, unsub: null, keyMap: {}, subject: "", done: {}, queue: [], busy: false, gen: 0 };
  const sb = { examId: null, unsub: null, data: null, ready: false };

  // Satu penilai per ujian: guru pertama memegang "sewa" di dokumen scoreboard (diperbarui tiap panggilan, kedaluwarsa 150 dtk).
  // Guru lain tidak menilai ulang, jadi reads/writes tidak berlipat.
  async function leaseOk(examId) {
    const { db, doc, runTransaction } = fb();
    const session = await getSession();
    const ref = doc(db, "scoreboards", examId);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists() ? snap.data() : {};
      const now = Date.now();
      if (d.graderUid && d.graderUid !== session.uid && now - (d.graderAt || 0) < 150000) return false;
      tx.set(ref, { graderUid: session.uid, graderAt: now }, { merge: true });
      return true;
    });
  }

  // Nilai ke scoreboard ditulis berkelompok tiap 8 detik (bukan 1 write per siswa).
  let sbPending = { examId: null, entries: {} };
  let sbFlushTimer = null;
  function scheduleFlush() {
    if (sbFlushTimer) return;
    sbFlushTimer = setTimeout(() => { sbFlushTimer = null; flushScoreboard(); }, 3000);
  }
  async function flushScoreboard() {
    const p = sbPending;
    if (!p.examId || Object.keys(p.entries).length === 0) return;
    sbPending = { examId: null, entries: {} };
    try {
      const { db, doc, setDoc } = fb();
      const session = await getSession();
      await setDoc(doc(db, "scoreboards", p.examId), { entries: p.entries, graderUid: session.uid, graderAt: Date.now() }, { merge: true });
    } catch (e) {
      if (!sbPending.examId) sbPending = { examId: p.examId, entries: {} };
      if (sbPending.examId === p.examId) { Object.assign(sbPending.entries, p.entries); scheduleFlush(); }
    }
  }

  function stopGrading() {
    flushScoreboard();
    if (lg.unsub) { lg.unsub(); lg.unsub = null; }
    lg.examId = null;
    lg.queue = [];
    lg.gen += 1;
  }

  async function startLiveGrading(examId) {
    await ensureReady();
    if (!examId) throw "INVALID_INPUT";
    let leader = false;
    try { leader = await leaseOk(examId); } catch (e) { throw "NETWORK_ERROR"; }
    if (!leader) {
      if (lg.examId === examId) stopGrading();
      return { started: false, leader: false };
    }
    if (lg.examId === examId && lg.unsub) return { started: true, leader: true };
    const { db, doc, getDoc, collection, onSnapshot } = fb();
    try {
      if (lg.unsub) stopGrading();
      const keysSnap = await getDoc(doc(db, "exam_answer_keys", examId));
      const keyMap = {};
      ((keysSnap.exists() ? keysSnap.data().items : []) || []).forEach((k) => { if (k && k.id) keyMap[k.id] = String(k.correctKey || "").toLowerCase(); });
      if (Object.keys(keyMap).length === 0) throw "NO_ANSWER_KEY";
      let subject = "";
      const dSnap = await getDoc(doc(db, "daily_exams", examId));
      if (dSnap.exists()) {
        subject = dSnap.data().subject || "";
      } else {
        const sSnap = await getDoc(doc(db, "exams_schedule", "published"));
        const it = ((sSnap.exists() ? sSnap.data().items : []) || []).find((x) => x.id === examId);
        subject = it ? (it.subject || "") : "";
      }
      const sbSnap = await getDoc(doc(db, "scoreboards", examId));
      const done = {};
      const ent = (sbSnap.exists() && sbSnap.data().entries) || {};
      Object.keys(ent).forEach((u) => { done[u] = ent[u].ct || 0; });
      lg.gen += 1;
      Object.assign(lg, { examId, keyMap, subject, done, queue: [] });
      const gen = lg.gen;
      lg.unsub = onSnapshot(collection(db, "submissions", examId, "entries"), (snap) => {
        snap.docChanges().forEach((ch) => {
          if (ch.type === "removed") return;
          const d = ch.doc.data();
          const ct = d.completedAt || 0;
          if (lg.done[ch.doc.id] === ct) return;
          lg.done[ch.doc.id] = ct;
          lg.queue.push({ uid: ch.doc.id, answers: d.answers || {}, ct, gen });
        });
        drainGrading();
      }, () => {});
      return { started: true, leader: true };
    } catch (e) {
      if (typeof e === "string") throw e;
      throw "NETWORK_ERROR";
    }
  }

  async function gradeOne(job) {
    if (job.gen !== lg.gen) return;
    const { db, doc, getDoc, setDoc } = fb();
    const session = await getSession();
    const examId = lg.examId;
    const ids = Object.keys(lg.keyMap);
    const total = ids.length;
    let correct = 0;
    ids.forEach((q) => {
      const a = job.answers[q];
      if (a != null && String(a).toLowerCase() === lg.keyMap[q]) correct++;
    });
    const score = (correct / total) * 100;
    const pSnap = await getDoc(doc(db, "exam_sessions", examId, "participants", job.uid));
    const p = pSnap.exists() ? pSnap.data() : {};
    let name = p.fullName || "";
    let kelas = p.kelas || "";
    if (!name) {
      const u = await getDoc(doc(db, "users", job.uid));
      if (u.exists()) { name = u.data().fullName || ""; kelas = kelas || u.data().kelas || ""; }
    }
    const st = p.startedAt || 0;
    const ct = job.ct || Date.now();
    const d = st > 0 && ct >= st ? ct - st : 0;
    await setDoc(doc(db, "users", job.uid, "results", examId), {
      subject: lg.subject,
      score,
      supervisor: session.fullName,
      completedAt: new Date(ct).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      gradedAt: Date.now(),
      correct,
      total,
      durationMs: d
    }, { merge: true });
    if (sbPending.examId !== examId) sbPending = { examId, entries: {} };
    sbPending.entries[job.uid] = { n: name, k: kelas, s: score, c: correct, t: total, st, ct, d };
    scheduleFlush();
  }

  async function drainGrading() {
    if (lg.busy) return;
    lg.busy = true;
    const { db, doc, setDoc } = fb();
    let any = false;
    const gen = lg.gen;
    try {
      while (lg.queue.length) {
        const job = lg.queue.shift();
        try {
          await gradeOne(job);
          any = true;
        } catch (e) {
          delete lg.done[job.uid];
          job.n = (job.n || 0) + 1;
          if (job.n < 3) setTimeout(() => { if (job.gen === lg.gen) { lg.done[job.uid] = job.ct; lg.queue.push(job); drainGrading(); } }, 4000);
        }
      }
      if (any && gen === lg.gen) {
        await setDoc(doc(db, "exam_results_index", lg.examId), { uids: Object.keys(lg.done), subject: lg.subject, computedAt: Date.now() });
      }
    } catch (e) {
    } finally {
      lg.busy = false;
    }
  }

  async function getScoreboard(examId) {
    await ensureReady();
    if (!examId) return { ready: true, enabled: false, entries: [] };
    const { db, doc, getDoc } = fb();
    if (sb.examId !== examId) Object.assign(sb, { examId, data: null, ready: false, at: 0 });
    // Dibaca ulang paling cepat tiap 15 detik (bukan listener): reads kecil walau banyak guru membuka.
    if (Date.now() - (sb.at || 0) > 15000 && !sb.busy) {
      sb.busy = true;
      try {
        const snap = await getDoc(doc(db, "scoreboards", examId));
        sb.data = snap.exists() ? snap.data() : {};
      } catch (e) {}
      sb.at = Date.now();
      sb.ready = true;
      sb.busy = false;
    }
    const d = sb.data || {};
    const entries = Object.keys(d.entries || {}).map((u) => Object.assign({ uid: u }, d.entries[u]));
    return { ready: sb.ready, enabled: !!d.enabled, entries };
  }

  function exportCsv(filename, csv) {
    const name = String(filename || "nilai.csv").replace(/[^A-Za-z0-9_.-]/g, "_");
    const blob = new Blob(["\ufeff" + String(csv || "")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return Promise.resolve({ saved: true });
  }

  async function setScoreboardVisible(examId, enabled) {
    await ensureReady();
    if (!examId) throw "INVALID_INPUT";
    const { db, doc, setDoc } = fb();
    try {
      await setDoc(doc(db, "scoreboards", examId), { enabled: !!enabled, updatedAt: Date.now() }, { merge: true });
      sb.at = 0;
      return { enabled: !!enabled };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  return {
    getSession,
    listExamSchedule,
    getAvailableKelasList,
    createDailyExam,
    updateDailyExamDetails,
    getMyDailyExams,
    getOperationMode,
    getQuestions,
    saveQuestions,
    updateQuestion,
    deleteQuestion,
    setExamToggles,
    setExamMessages,
    computeGrades,
    pickImage,
    changePassword,
    getLoginHistory,
    getAccountInfo,
    checkBiometricAvailability,
    setBiometricEnabled,
    getSchoolInfo,
    getTheme: () => Promise.resolve({ theme: localStorage.getItem("patsec_theme") || "dark" }),
    setTheme: (theme) => { localStorage.setItem("patsec_theme", theme); return Promise.resolve({ saved: true }); },
    openExternal,
    logout,
    getMyDutySchedule,
    getRoomControl,
    startLiveGrading,
    getScoreboard,
    setScoreboardVisible,
    exportCsv,
    unlockParticipant,
    deleteDailyExam,
    getRoster
  };
})();
