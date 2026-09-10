const AdminBridge = (() => {
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

  function extractGrade(kelas) {
    const trimmed = (kelas || "").trim().toUpperCase();
    if (trimmed.startsWith("XII")) return "XII";
    if (trimmed.startsWith("XI")) return "XI";
    if (trimmed.startsWith("X")) return "X";
    return null;
  }

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function csvField(v) {
    return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  }

  // ---------- Account creation ----------

  async function createAccountInternal(request, existingNisNipSet) {
    await ensureReady();
    const { db, doc, setDoc, createAuthAccountSecondary } = fb();

    const nisNip = (request.nisNip || "").trim();
    const fullName = (request.fullName || "").trim();
    if (!nisNip || !fullName) throw "INVALID_INPUT";
    if (request.role === "siswa" && (!request.kelas || request.noAbsen == null)) throw "INVALID_INPUT";

    if (existingNisNipSet) {
      if (existingNisNipSet.has(nisNip)) throw "IDENTIFIER_TAKEN";
    } else {
      const { collection, query, where, limit, getDocs } = fb();
      let existing;
      try {
        const q = query(collection(db, "users"), where("nisNip", "==", nisNip), limit(1));
        existing = await getDocs(q);
      } catch (e) {
        throw "NETWORK_ERROR";
      }
      if (!existing.empty) throw "IDENTIFIER_TAKEN";
    }

    const email = AppConfig.syntheticEmail(nisNip);
    const defaultPassword = request.role === "siswa" ? AppConfig.DEFAULT_PASSWORD_SISWA : AppConfig.DEFAULT_PASSWORD_STAFF;

    let uid;
    try {
      uid = await createAuthAccountSecondary(email, defaultPassword);
    } catch (e) {
      const code = e && e.code ? e.code : "";
      if (code === "auth/email-already-in-use") throw "IDENTIFIER_TAKEN";
      if (code === "auth/too-many-requests" || code === "auth/network-request-failed") throw "RATE_LIMITED";
      throw "NETWORK_ERROR";
    }

    const profile = {
      fullName,
      role: request.role,
      nisNip,
      kelas: request.kelas || null,
      noAbsen: request.noAbsen != null ? request.noAbsen : null,
      noRuang: request.noRuang || null,
      username: null,
      disabled: false,
      passwordIsDefault: true,
      avgScore: null,
      avgScorePublished: false,
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, "users", uid), profile);
    } catch (e) {
      throw "NETWORK_ERROR";
    }

    if (existingNisNipSet) existingNisNipSet.add(nisNip);

    return { uid, fullName, role: request.role, nisNip, kelas: request.kelas || null, username: null, passwordIsDefault: true, disabled: false };
  }

  async function createAccount(args) {
    const request = {
      role: args.role || "siswa",
      fullName: args.fullName || "",
      nisNip: args.nisNip || "",
      kelas: args.kelas != null ? args.kelas : null,
      noAbsen: args.noAbsen != null ? args.noAbsen : null
    };
    const summary = await createAccountInternal(request, null);
    return { uid: summary.uid };
  }

  async function fetchAllNisNip() {
    await ensureReady();
    const { db, collection, getDocs, query, limit } = fb();
    const set = new Set();
    let lastLen = -1;
    try {
      const snap = await getDocs(query(collection(db, "users"), limit(5000)));
      snap.forEach((d) => {
        const v = d.data().nisNip;
        if (v) set.add(v);
      });
    } catch (e) {}
    return set;
  }

  async function createAccountsBulk(accounts, onProgress) {
    await ensureReady();

    const existingNisNipSet = await fetchAllNisNip();

    const CONCURRENCY = 2;
    const MAX_RETRIES = 6;
    let created = 0;
    let failed = 0;
    const failures = [];
    let cursor = 0;
    let done = 0;
    const total = accounts.length;

    async function worker() {
      while (cursor < accounts.length) {
        const idx = cursor++;
        const row = accounts[idx];
        const request = {
          role: row.role || "siswa",
          fullName: row.fullName || "",
          nisNip: row.nisNip || "",
          kelas: row.kelas != null ? row.kelas : null,
          noAbsen: row.noAbsen != null ? row.noAbsen : null,
          noRuang: row.noRuang != null ? row.noRuang : null
        };

        let attempt = 0;
        let lastError = null;
        while (attempt <= MAX_RETRIES) {
          try {
            await createAccountInternal(request, existingNisNipSet);
            created++;
            lastError = null;
            break;
          } catch (e) {
            lastError = e;
            if (e === "RATE_LIMITED" && attempt < MAX_RETRIES) {
              await new Promise((r) => setTimeout(r, 1500 * Math.pow(2, attempt)));
              attempt++;
              continue;
            }
            break;
          }
        }
        if (lastError) {
          failed++;
          failures.push({ nisNip: request.nisNip, reason: typeof lastError === "string" ? lastError : "UNKNOWN_ERROR" });
        }

        done++;
        if (typeof onProgress === "function") {
          try { onProgress({ done, total, created, failed }); } catch (e) {}
        }
      }
    }

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
    await Promise.all(workers);

    return { created, failed, failures };
  }

  async function assignRooms(pairs) {
    await ensureReady();
    const { db, collection, query, where, limit, getDocs, doc, updateDoc } = fb();
    let updated = 0;
    for (const pair of pairs) {
      const nisNip = pair.nisNip || "";
      const ruang = pair.ruang || "";
      if (!nisNip) continue;
      try {
        const q = query(collection(db, "users"), where("nisNip", "==", nisNip), limit(1));
        const snap = await getDocs(q);
        const d = snap.docs[0];
        if (!d) continue;
        await updateDoc(doc(db, "users", d.id), { noRuang: ruang });
        updated++;
      } catch (e) {}
    }
    return { updated };
  }

  async function listAccounts() {
    await ensureReady();
    const { db, collection, query, limit, getDocs } = fb();
    try {
      const q = query(collection(db, "users"), limit(1000));
      const snap = await getDocs(q);
      const items = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({
          uid: d.id,
          fullName: data.fullName || "",
          role: data.role || "",
          nisNip: data.nisNip || "",
          kelas: data.kelas || null,
          noAbsen: data.noAbsen != null ? data.noAbsen : null,
          username: data.username || null,
          passwordIsDefault: !!data.passwordIsDefault,
          disabled: !!data.disabled
        });
      });
      return { items };
    } catch (e) {
      return { items: [] };
    }
  }

  // ---------- Exam schedule ----------

  async function createExamSchedule(args) {
    await ensureReady();
    const { db, doc, runTransaction } = fb();
    const newItem = {
      id: (crypto.randomUUID ? crypto.randomUUID() : "id_" + Date.now() + "_" + Math.random().toString(36).slice(2)),
      subject: args.subject || "",
      kelasTargets: args.kelasTargets || [],
      date: args.date || "",
      startLabel: args.startLabel || "",
      startTimestamp: args.startTimestamp || 0,
      durationMinutes: args.durationMinutes || 0
    };
    try {
      const docRef = doc(db, "exams_schedule", "published");
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        const existing = (snap.exists() ? snap.data().items : []) || [];
        existing.push(newItem);
        tx.set(docRef, { items: existing });
      });
      return { id: newItem.id };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  async function listExamSchedule() {
    await ensureReady();
    const { db, doc, getDoc } = fb();
    try {
      const snap = await getDoc(doc(db, "exams_schedule", "published"));
      const items = (snap.exists() ? snap.data().items : []) || [];
      return {
        items: items.map((m) => ({
          id: m.id || "",
          subject: m.subject || "",
          kelasTargets: m.kelasTargets || [],
          date: m.date || "",
          startLabel: m.startLabel || "",
          startTimestamp: m.startTimestamp || 0,
          durationMinutes: m.durationMinutes || 0
        }))
      };
    } catch (e) {
      return { items: [] };
    }
  }

  async function setResultsPublished(examId, published) {
    await ensureReady();
    const { db, doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } = fb();
    try {
      const indexSnap = await getDoc(doc(db, "exam_results_index", examId));
      const uids = (indexSnap.exists() ? indexSnap.data().uids : []) || [];
      let affected = 0;

      for (const uid of uids) {
        await setDoc(doc(db, "users", uid, "results", examId), { published }, { merge: true });
        affected++;

        const q = query(collection(db, "users", uid, "results"), where("published", "==", true));
        const publishedResults = await getDocs(q);
        if (publishedResults.empty) {
          await updateDoc(doc(db, "users", uid), { avgScore: null, avgScorePublished: false });
        } else {
          const scores = [];
          publishedResults.forEach((r) => { if (typeof r.data().score === "number") scores.push(r.data().score); });
          const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          await updateDoc(doc(db, "users", uid), { avgScore: avg, avgScorePublished: true });
        }
      }
      return { affected };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  // ---------- Duty planning ----------

  async function getDutyPlanningData(examId) {
    await ensureReady();
    const { db, doc, getDoc, collection, query, where, limit, getDocs } = fb();
    try {
      const scheduleSnap = await getDoc(doc(db, "exams_schedule", "published"));
      const rawItems = (scheduleSnap.exists() ? scheduleSnap.data().items : []) || [];
      const examItem = rawItems.find((x) => x.id === examId);
      if (!examItem) throw "EXAM_NOT_FOUND";

      const kelasTargets = examItem.kelasTargets || [];
      const examStart = examItem.startTimestamp || 0;
      const examDuration = examItem.durationMinutes || 0;
      const examEnd = examStart + examDuration * 60000;

      const siswaQ = query(collection(db, "users"), where("role", "==", "siswa"), limit(2000));
      const siswaSnap = await getDocs(siswaQ);
      const rooms = new Set();
      siswaSnap.forEach((d) => {
        const data = d.data();
        const kelas = data.kelas;
        if (!kelas) return;
        const grade = extractGrade(kelas);
        if (!grade || !kelasTargets.includes(grade)) return;
        if (data.noRuang) rooms.add(data.noRuang);
      });

      const panitiaQ = query(collection(db, "users"), where("role", "==", "panitia"), limit(500));
      const panitiaSnap = await getDocs(panitiaQ);
      const allPanitia = [];
      panitiaSnap.forEach((d) => allPanitia.push({ uid: d.id, fullName: d.data().fullName || "" }));

      const dutySnap = await getDocs(collection(db, "duty_schedule"));
      const busyUids = new Set();
      dutySnap.forEach((d) => {
        if (d.id === examId) return;
        const data = d.data();
        const otherStart = data.examStart;
        const otherEnd = data.examEnd;
        if (otherStart == null || otherEnd == null) return;
        const overlaps = examStart < otherEnd && otherStart < examEnd;
        if (!overlaps) return;
        (data.assignments || []).forEach((a) => { if (a && a.panitiaUid) busyUids.add(a.panitiaUid); });
      });

      const freePanitia = allPanitia.filter((p) => !busyUids.has(p.uid));

      const existingSnap = await getDoc(doc(db, "duty_schedule", examId));
      const existingAssignments = {};
      const existingList = (existingSnap.exists() ? existingSnap.data().assignments : []) || [];
      existingList.forEach((a) => { if (a && a.room) existingAssignments[a.room] = a.panitiaUid || ""; });

      return { rooms: Array.from(rooms).sort(), freePanitia, existingAssignments };
    } catch (e) {
      if (typeof e === "string") throw e;
      throw "NETWORK_ERROR";
    }
  }

  async function saveDutyAssignments(examId, assignments) {
    await ensureReady();
    const { db, doc, getDoc, setDoc, collection, query, where, getDocs } = fb();
    try {
      const scheduleSnap = await getDoc(doc(db, "exams_schedule", "published"));
      const rawItems = (scheduleSnap.exists() ? scheduleSnap.data().items : []) || [];
      const examItem = rawItems.find((x) => x.id === examId);
      const examStart = examItem ? (examItem.startTimestamp || 0) : 0;
      const examDuration = examItem ? (examItem.durationMinutes || 0) : 0;
      const examEnd = examStart + examDuration * 60000;

      const panitiaQ = query(collection(db, "users"), where("role", "==", "panitia"));
      const panitiaSnap = await getDocs(panitiaQ);
      const nameByUid = {};
      panitiaSnap.forEach((d) => { nameByUid[d.id] = d.data().fullName || ""; });

      const assignmentsList = [];
      Object.keys(assignments).forEach((room) => {
        const uid = assignments[room];
        if (uid) assignmentsList.push({ room, panitiaUid: uid, panitiaName: nameByUid[uid] || "" });
      });

      await setDoc(doc(db, "duty_schedule", examId), {
        assignments: assignmentsList,
        examStart,
        examEnd
      });
      return { saved: true };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  // ---------- Export ----------

  async function collectResultRows(kelasFilter) {
    const { db, collection, query, where, limit, getDocs } = fb();
    const siswaQ = query(collection(db, "users"), where("role", "==", "siswa"), limit(2000));
    const siswaSnap = await getDocs(siswaQ);
    const rows = [];
    for (const userDoc of siswaSnap.docs) {
      const data = userDoc.data();
      const kelas = data.kelas;
      if (!kelas) continue;
      if (kelasFilter !== "all" && extractGrade(kelas) !== kelasFilter) continue;
      const fullName = data.fullName || "";
      const nisNip = data.nisNip || "";
      const q = query(collection(db, "users", userDoc.id, "results"), where("published", "==", true));
      const resultsSnap = await getDocs(q);
      resultsSnap.forEach((r) => {
        const rd = r.data();
        rows.push({ fullName, nisNip, kelas, subject: rd.subject || "", score: rd.score || 0 });
      });
    }
    return rows;
  }

  async function exportResults(kelasFilter, format) {
    await ensureReady();
    const rows = await collectResultRows(kelasFilter || "all");
    if (rows.length === 0) throw "NO_DATA";

    if (format === "pdf") {
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rekap Nilai</title>
        <style>body{font-family:sans-serif;font-size:12px;}table{border-collapse:collapse;width:100%;}
        th,td{border:1px solid #999;padding:6px 8px;text-align:left;}th{background:#eee;}</style></head><body>
        <h2>Rekap Nilai Ujian</h2><table><thead><tr><th>NIS/NIP</th><th>Nama</th><th>Kelas</th><th>Mapel</th><th>Nilai</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${r.nisNip}</td><td>${r.fullName}</td><td>${r.kelas}</td><td>${r.subject}</td><td>${r.score.toFixed(1)}</td></tr>`).join("")}
        </tbody></table><script>window.onload=()=>window.print();</script></body></html>`;
      const w = window.open("", "_blank");
      w.document.write(html);
      w.document.close();
    } else {
      let csv = "NIS/NIP,Nama Lengkap,Kelas,Mata Pelajaran,Nilai\n";
      rows.forEach((r) => {
        csv += [r.nisNip, r.fullName, r.kelas, r.subject, r.score.toFixed(1)].map(csvField).join(",") + "\n";
      });
      downloadFile(csv, "nilai_" + Date.now() + ".csv", "text/csv");
    }
    return { rowCount: rows.length };
  }

  async function getViolations() {
    await ensureReady();
    const { db, doc, getDoc, collectionGroup, query, where, getDocs } = fb();
    try {
      const scheduleSnap = await getDoc(doc(db, "exams_schedule", "published"));
      const rawItems = (scheduleSnap.exists() ? scheduleSnap.data().items : []) || [];
      const subjectById = {};
      rawItems.forEach((m) => { subjectById[m.id] = m.subject || ""; });

      if (!collectionGroup) return { items: [] };
      const q = query(collectionGroup(db, "participants"), where("violationCount", ">", 0));
      const snap = await getDocs(q);
      const items = [];
      snap.forEach((d) => {
        const examId = d.ref.parent.parent ? d.ref.parent.parent.id : "";
        const data = d.data();
        items.push({
          examId,
          subject: subjectById[examId] || "",
          uid: d.id,
          fullName: data.fullName || "",
          violationCount: data.violationCount || 0,
          locked: !!data.locked,
          unlockedBy: data.unlockedBy || null,
          unlockedReason: data.unlockedReason || null
        });
      });
      return { items };
    } catch (e) {
      return { items: [] };
    }
  }

  async function exportViolations() {
    const result = await getViolations();
    const items = result.items;
    if (items.length === 0) throw "NO_DATA";
    let csv = "Mapel,Nama,Jumlah Pelanggaran,Status,Dibuka Oleh,Alasan\n";
    items.forEach((v) => {
      csv += [v.subject, v.fullName, v.violationCount, v.locked ? "Terkunci" : "Pernah Melanggar", v.unlockedBy || "", v.unlockedReason || ""].map(csvField).join(",") + "\n";
    });
    downloadFile(csv, "pelanggaran_" + Date.now() + ".csv", "text/csv");
    return { rowCount: items.length };
  }

  // ---------- Password / security ----------

  async function verifyPassword(password) {
    await ensureReady();
    const { auth, EmailAuthProvider, reauthenticateWithCredential } = fb();
    const user = auth.currentUser;
    if (!user || !user.email) throw "NOT_SIGNED_IN";
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      return { verified: true };
    } catch (e) {
      throw "WRONG_PASSWORD";
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

  // ---------- Backups ----------

  async function getBackupSettings() {
    await ensureReady();
    const { db, doc, getDoc } = fb();
    try {
      const snap = await getDoc(doc(db, "system_config", "backup_settings"));
      return { autoSaveEnabled: !!(snap.exists() && snap.data().autoSaveEnabled) };
    } catch (e) {
      return { autoSaveEnabled: false };
    }
  }

  async function setAutoSaveEnabled(enabled) {
    await ensureReady();
    const { db, doc, setDoc } = fb();
    try {
      await setDoc(doc(db, "system_config", "backup_settings"), { autoSaveEnabled: enabled }, { merge: true });
      return { saved: true };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  async function createManualBackup(name) {
    await ensureReady();
    const { db, doc, setDoc, getDoc, collection, query, limit, getDocs } = fb();
    try {
      const backupId = "manual_" + Date.now();
      const backupRef = doc(db, "backups", backupId);
      await setDoc(backupRef, { name: name || "backup", createdAt: Date.now(), isAuto: false });

      const usersQ = query(collection(db, "users"), limit(2000));
      const usersSnap = await getDocs(usersQ);
      for (const u of usersSnap.docs) {
        await setDoc(doc(db, "backups", backupId, "users", u.id), u.data());
      }

      const scheduleSnap = await getDoc(doc(db, "exams_schedule", "published"));
      const items = (scheduleSnap.exists() ? scheduleSnap.data().items : []) || [];
      await setDoc(doc(db, "backups", backupId, "singletons", "exams_schedule"), { items });

      const examIds = items.map((m) => m.id).filter(Boolean);
      for (const examId of examIds) {
        const contentSnap = await getDoc(doc(db, "exam_content", examId));
        if (contentSnap.exists()) await setDoc(doc(db, "backups", backupId, "exam_content", examId), contentSnap.data());
        const keysSnap = await getDoc(doc(db, "exam_answer_keys", examId));
        if (keysSnap.exists()) await setDoc(doc(db, "backups", backupId, "exam_answer_keys", examId), keysSnap.data());
      }

      const configSnap = await getDoc(doc(db, "system_config", "access"));
      if (configSnap.exists()) await setDoc(doc(db, "backups", backupId, "singletons", "system_config"), configSnap.data());

      return { backupId };
    } catch (e) {
      throw "BACKUP_FAILED";
    }
  }

  async function listBackups() {
    await ensureReady();
    const { db, collection, query, orderBy, getDocs } = fb();
    try {
      const q = query(collection(db, "backups"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const items = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({ id: d.id, name: data.name || d.id, createdAt: data.createdAt || 0, isAuto: !!data.isAuto });
      });
      return { items };
    } catch (e) {
      return { items: [] };
    }
  }

  async function restoreBackup(backupId) {
    await ensureReady();
    const { db, doc, getDoc, setDoc, collection, getDocs } = fb();
    try {
      const usersSnap = await getDocs(collection(db, "backups", backupId, "users"));
      for (const u of usersSnap.docs) {
        await setDoc(doc(db, "users", u.id), u.data());
      }
      const scheduleSingleton = await getDoc(doc(db, "backups", backupId, "singletons", "exams_schedule"));
      if (scheduleSingleton.exists()) {
        await setDoc(doc(db, "exams_schedule", "published"), { items: scheduleSingleton.data().items || [] });
      }
      const contentSnap = await getDocs(collection(db, "backups", backupId, "exam_content"));
      for (const c of contentSnap.docs) {
        await setDoc(doc(db, "exam_content", c.id), c.data());
      }
      const keysSnap = await getDocs(collection(db, "backups", backupId, "exam_answer_keys"));
      for (const k of keysSnap.docs) {
        await setDoc(doc(db, "exam_answer_keys", k.id), k.data());
      }
      const configSingleton = await getDoc(doc(db, "backups", backupId, "singletons", "system_config"));
      if (configSingleton.exists()) {
        await setDoc(doc(db, "system_config", "access"), configSingleton.data());
      }
      return { restored: true };
    } catch (e) {
      throw "RESTORE_FAILED";
    }
  }

  async function deleteAllInSubcollection(pathSegments) {
    const { db, collection, getDocs, doc, deleteDoc } = fb();
    const snap = await getDocs(collection(db, ...pathSegments));
    for (const d of snap.docs) {
      await deleteDoc(doc(db, ...pathSegments, d.id));
    }
  }

  async function deleteBackup(backupId) {
    await ensureReady();
    const { db, doc, deleteDoc } = fb();
    try {
      await deleteAllInSubcollection(["backups", backupId, "users"]);
      await deleteAllInSubcollection(["backups", backupId, "exam_content"]);
      await deleteAllInSubcollection(["backups", backupId, "exam_answer_keys"]);
      await deleteAllInSubcollection(["backups", backupId, "singletons"]);
      await deleteDoc(doc(db, "backups", backupId));
      return { deleted: true };
    } catch (e) {
      throw "DELETE_FAILED";
    }
  }

  async function deleteAllBackups(keepNewest) {
    try {
      const all = (await listBackups()).items;
      const targets = keepNewest ? all.slice(1) : all;
      for (const b of targets) {
        await deleteBackup(b.id);
      }
      return { deleted: true };
    } catch (e) {
      throw "DELETE_FAILED";
    }
  }

  // ---------- Reset ----------

  async function getExamIds() {
    const { db, doc, getDoc } = fb();
    const snap = await getDoc(doc(db, "exams_schedule", "published"));
    const items = (snap.exists() ? snap.data().items : []) || [];
    return items.map((m) => m.id).filter(Boolean);
  }

  async function resetExamsAndQuestions() {
    const { db, doc, deleteDoc, setDoc } = fb();
    const examIds = await getExamIds();
    for (const examId of examIds) {
      await deleteDoc(doc(db, "exam_content", examId));
      await deleteDoc(doc(db, "exam_answer_keys", examId));
      await deleteDoc(doc(db, "exam_results_index", examId));
      await deleteDoc(doc(db, "duty_schedule", examId));
    }
    await setDoc(doc(db, "exams_schedule", "published"), { items: [] });
  }

  async function resetSessionsAndSubmissions() {
    const { db, doc, collection, getDocs, deleteDoc } = fb();
    const examIds = await getExamIds();
    for (const examId of examIds) {
      const sessionsSnap = await getDocs(collection(db, "exam_sessions", examId, "participants"));
      for (const d of sessionsSnap.docs) await deleteDoc(doc(db, "exam_sessions", examId, "participants", d.id));
      const submissionsSnap = await getDocs(collection(db, "submissions", examId, "entries"));
      for (const d of submissionsSnap.docs) await deleteDoc(doc(db, "submissions", examId, "entries", d.id));
    }
  }

  async function resetResults() {
    const { db, doc, collection, query, limit, getDocs, deleteDoc, updateDoc, setDoc } = fb();
    const usersQ = query(collection(db, "users"), limit(2000));
    const usersSnap = await getDocs(usersQ);
    for (const u of usersSnap.docs) {
      const resultsSnap = await getDocs(collection(db, "users", u.id, "results"));
      for (const r of resultsSnap.docs) await deleteDoc(doc(db, "users", u.id, "results", r.id));
      await updateDoc(doc(db, "users", u.id), { avgScore: null, avgScorePublished: false });
    }
    await setDoc(doc(db, "public_stats", "leaderboard"), { published: false, top10: [] });
  }

  async function resetAccountsExceptSelf(selfUid) {
    const { db, doc, collection, query, limit, getDocs, deleteDoc } = fb();
    const usersQ = query(collection(db, "users"), limit(2000));
    const usersSnap = await getDocs(usersQ);
    for (const u of usersSnap.docs) {
      if (u.id === selfUid) continue;
      const username = u.data().username;
      if (username) await deleteDoc(doc(db, "usernames", username.toLowerCase()));
      await deleteDoc(doc(db, "users", u.id));
    }
  }

  async function resetDataCategory(category) {
    await ensureReady();
    const session = await getSession();
    try {
      if (category === "exams") await resetExamsAndQuestions();
      else if (category === "sessions") await resetSessionsAndSubmissions();
      else if (category === "results") await resetResults();
      else if (category === "accounts") await resetAccountsExceptSelf(session.uid);
      else throw "INVALID_CATEGORY";
      return { done: true };
    } catch (e) {
      if (e === "INVALID_CATEGORY") throw e;
      throw "RESET_FAILED";
    }
  }

  // ---------- Access settings ----------

  async function getAccessSettings() {
    await ensureReady();
    const { db, doc, getDoc } = fb();
    try {
      const snap = await getDoc(doc(db, "system_config", "access"));
      const data = snap.exists() ? snap.data() : {};
      return {
        androidLoginEnabled: data.androidLoginEnabled !== undefined ? data.androidLoginEnabled : true,
        webLoginEnabled: data.webLoginEnabled !== undefined ? data.webLoginEnabled : true,
        exeLoginEnabled: data.exeLoginEnabled !== undefined ? data.exeLoginEnabled : true,
        operationMode: data.operationMode || "ujian"
      };
    } catch (e) {
      return { androidLoginEnabled: true, webLoginEnabled: true, exeLoginEnabled: true, operationMode: "ujian" };
    }
  }

  async function setAccessSetting(key, value) {
    await ensureReady();
    const { db, doc, setDoc } = fb();
    const validKeys = ["androidLoginEnabled", "webLoginEnabled", "exeLoginEnabled", "operationMode"];
    if (!validKeys.includes(key)) throw "INVALID_KEY";
    try {
      await setDoc(doc(db, "system_config", "access"), { [key]: value }, { merge: true });
      return { saved: true };
    } catch (e) {
      throw "NETWORK_ERROR";
    }
  }

  // ---------- Misc ----------

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
    createAccount,
    createAccountsBulk,
    assignRooms,
    listAccounts,
    createExamSchedule,
    listExamSchedule,
    setResultsPublished,
    getDutyPlanningData,
    saveDutyAssignments,
    exportResults,
    getViolations,
    exportViolations,
    verifyPassword,
    getBackupSettings,
    setAutoSaveEnabled,
    createManualBackup,
    listBackups,
    restoreBackup,
    deleteBackup,
    deleteAllBackups,
    resetDataCategory,
    changePassword,
    getAccessSettings,
    setAccessSetting,
    getSchoolInfo,
    getTheme: () => Promise.resolve({ theme: localStorage.getItem("patsec_theme") || "dark" }),
    setTheme: (theme) => { localStorage.setItem("patsec_theme", theme); return Promise.resolve({ saved: true }); },
    openExternal,
    logout
  };
})();
