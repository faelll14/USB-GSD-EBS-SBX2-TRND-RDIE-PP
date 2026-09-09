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

  function getSession() {
    const stored = SessionGuard.getStoredSession();
    if (!stored) throw "NOT_SIGNED_IN";
    return Promise.resolve({ uid: stored.uid, fullName: stored.fullName, role: stored.role, nisNip: stored.nisNip });
  }

  async function listExamSchedule() {
    await ensureReady();
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
        highlightEnabled: !!contentSnap.data()?.highlightEnabled
      };
    } catch (e) {
      return { items: [] };
    }
  }

  async function saveQuestions(examId, questions) {
    await ensureReady();
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
          highlightEnabled: !!contentSnap.data()?.highlightEnabled
        });
        tx.set(keysRef, { items: existingKeys });
      });
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
      input.accept = "image/png,image/jpeg";
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) { reject("CANCELLED"); return; }
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
    getQuestions,
    saveQuestions,
    updateQuestion,
    deleteQuestion,
    setExamToggles,
    computeGrades,
    pickImage,
    changePassword,
    getLoginHistory,
    getSchoolInfo,
    getTheme: () => Promise.resolve({ theme: localStorage.getItem("patsec_theme") || "dark" }),
    setTheme: (theme) => { localStorage.setItem("patsec_theme", theme); return Promise.resolve({ saved: true }); },
    openExternal,
    logout
  };
})();
