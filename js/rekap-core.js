// Rekap nilai per jadwal: dihitung dari jawaban tersimpan, disimpan permanen di koleksi "rekap",
// dan tetap ada walaupun jadwalnya dihapus. Dipakai guru (jadwal buatannya) dan admin.
const RekapCore = (() => {
  const gradeOf = (kelas) => {
    const t = String(kelas || "").trim().toUpperCase();
    if (t.startsWith("XII")) return "XII";
    if (t.startsWith("XI")) return "XI";
    if (t.startsWith("X")) return "X";
    return null;
  };

  async function loadMeta(f, examId) {
    const { db, doc, getDoc } = f;
    const d = await getDoc(doc(db, "daily_exams", examId));
    if (d.exists()) {
      const x = d.data();
      return { kind: x.kind === "quiz" ? "quiz" : "ulangan", subject: x.subject || "", date: x.date || "", startLabel: x.startLabel || "",
        startTimestamp: x.startTimestamp || 0, durationMinutes: x.durationMinutes || 0, kelasTargets: x.kelasTargets || [], daily: true,
        createdBy: x.createdBy || "", createdByName: x.createdByName || "" };
    }
    const s = await getDoc(doc(db, "exams_schedule", "published"));
    const it = ((s.exists() ? s.data().items : []) || []).find((m) => m.id === examId);
    if (!it) return null;
    return { kind: "ujian", subject: it.subject || "", date: it.date || "", startLabel: it.startLabel || "", startTimestamp: it.startTimestamp || 0,
      durationMinutes: it.durationMinutes || 0, kelasTargets: it.kelasTargets || [], daily: false, createdBy: "", createdByName: "" };
  }

  async function sync(f, examId, session) {
    const { db, doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch } = f;
    const meta = await loadMeta(f, examId);
    if (!meta) throw "NOT_FOUND";
    const keysSnap = await getDoc(doc(db, "exam_answer_keys", examId));
    const keyMap = {};
    ((keysSnap.exists() ? keysSnap.data().items : []) || []).forEach((k) => { if (k && k.id) keyMap[k.id] = AnswerScoring.spec(k); });
    const ids = Object.keys(keyMap);
    const total = ids.length;
    if (!total) throw "NO_ANSWER_KEY";

    const [subs, parts] = await Promise.all([
      getDocs(collection(db, "submissions", examId, "entries")),
      getDocs(collection(db, "exam_sessions", examId, "participants"))
    ]);
    const partMap = {};
    parts.forEach((p) => { partMap[p.id] = p.data(); });

    const roster = [];
    try {
      const targets = meta.kelasTargets || [];
      const base = collection(db, "users");
      const uq = meta.daily && targets.length
        ? query(base, where("role", "==", "siswa"), where("kelas", "in", targets.slice(0, 30)))
        : query(base, where("role", "==", "siswa"));
      const us = await getDocs(uq);
      us.forEach((u) => {
        const d = u.data();
        if (!meta.daily && targets.length && !targets.includes(gradeOf(d.kelas))) return;
        roster.push({ uid: u.id, n: d.fullName || "", k: d.kelas || "" });
      });
    } catch (e) {}
    const rosterMap = {};
    roster.forEach((r) => { rosterMap[r.uid] = r; });

    const rows = {};
    const subUids = [];
    const results = [];
    const now = Date.now();
    subs.forEach((sd) => {
      const uid = sd.id;
      const a = sd.data().answers || {};
      const ct = sd.data().completedAt || now;
      let sum = 0;
      ids.forEach((q) => { sum += AnswerScoring.score(keyMap[q], a[q]); });
      const p = partMap[uid] || {};
      const st = p.startedAt || 0;
      const d = st > 0 && ct >= st ? ct - st : 0;
      const c = Math.round(sum);
      const s = (sum / total) * 100;
      const n = p.fullName || (rosterMap[uid] && rosterMap[uid].n) || "";
      const k = p.kelas || (rosterMap[uid] && rosterMap[uid].k) || "";
      rows[uid] = { n, k, s, c, w: total - c, t: total, st, ct, d };
      subUids.push(uid);
      results.push({ uid, data: {
        subject: meta.subject, score: s, supervisor: meta.createdByName || session.fullName || "Guru",
        completedAt: new Date(ct).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        gradedAt: now, correct: c, total, durationMs: d } });
    });

    for (let i = 0; i < results.length; i += 400) {
      const batch = writeBatch(db);
      results.slice(i, i + 400).forEach((r) => batch.set(doc(db, "users", r.uid, "results", examId), r.data, { merge: true }));
      await batch.commit();
    }
    await setDoc(doc(db, "exam_results_index", examId), { uids: subUids, subject: meta.subject, computedAt: now }, { merge: true });

    const absent = roster.filter((r) => !rows[r.uid]).map((r) => ({ n: r.n, k: r.k }));
    const rekap = {
      examId, subject: meta.subject, kind: meta.kind,
      createdBy: meta.createdBy || session.uid, createdByName: meta.createdByName || session.fullName || "",
      kelasTargets: meta.kelasTargets, date: meta.date, startLabel: meta.startLabel,
      startTimestamp: meta.startTimestamp, durationMinutes: meta.durationMinutes,
      total, rows, absent, participants: subUids.length, computedAt: now
    };
    await setDoc(doc(db, "rekap", examId), rekap);
    return rekap;
  }

  // Baca rekap; hitung ulang bila jadwal belum pernah direkap atau direkap sebelum jadwal selesai.
  async function get(f, examId, session, force) {
    const { db, doc, getDoc } = f;
    const cur = await getDoc(doc(db, "rekap", examId));
    const meta = await loadMeta(f, examId);
    if (!meta) {
      if (!cur.exists()) throw "NOT_FOUND";
      return Object.assign({ archived: true }, cur.data());
    }
    const end = meta.startTimestamp + meta.durationMinutes * 60000;
    if (cur.exists() && (cur.data().computedAt || 0) > end && !force) return cur.data();
    return sync(f, examId, session);
  }

  async function list(f, session) {
    const { db, collection, getDocs, query, where, limit } = f;
    const out = {};
    const rs = await getDocs(query(collection(db, "rekap"), where("createdBy", "==", session.uid), limit(200)));
    rs.forEach((d) => {
      const x = d.data();
      out[d.id] = { examId: d.id, subject: x.subject || "", kind: x.kind || "ulangan", date: x.date || "", startLabel: x.startLabel || "", startTimestamp: x.startTimestamp || 0, archived: true };
    });
    const ds = await getDocs(query(collection(db, "daily_exams"), where("createdBy", "==", session.uid), limit(200)));
    ds.forEach((d) => {
      const x = d.data();
      out[d.id] = { examId: d.id, subject: x.subject || "", kind: x.kind === "quiz" ? "quiz" : "ulangan", date: x.date || "", startLabel: x.startLabel || "", startTimestamp: x.startTimestamp || 0, archived: false };
    });
    return Object.keys(out).map((k) => out[k]).sort((a, b) => b.startTimestamp - a.startTimestamp);
  }

  // Otomatis menyimpan nilai jadwal yang sudah selesai (maks 3 sekali jalan). candidates: [{id, end}]
  async function syncRecent(f, session, candidates) {
    const { db, doc, getDoc } = f;
    const now = Date.now();
    let n = 0;
    for (const c of candidates || []) {
      if (n >= 3) break;
      if (!c || !c.id || c.end > now || now - c.end > 7 * 86400000) continue;
      try {
        const cur = await getDoc(doc(db, "rekap", c.id));
        if (cur.exists() && (cur.data().computedAt || 0) > c.end) continue;
        await sync(f, c.id, session);
        n++;
      } catch (e) {}
    }
    return { synced: n };
  }

  // Hapus jadwal beserta semua data turunannya; nilai tetap tersimpan di koleksi rekap.
  async function cascadeDelete(f, examId, session) {
    const { db, doc, collection, getDocs, writeBatch } = f;
    try { await sync(f, examId, session); } catch (e) { if (e !== "NO_ANSWER_KEY") throw e; }
    const subs = await getDocs(collection(db, "submissions", examId, "entries"));
    const parts = await getDocs(collection(db, "exam_sessions", examId, "participants"));
    const refs = [];
    const uids = {};
    subs.forEach((d) => { refs.push(d.ref); uids[d.id] = 1; });
    parts.forEach((d) => { refs.push(d.ref); uids[d.id] = 1; });
    Object.keys(uids).forEach((u) => refs.push(doc(db, "users", u, "results", examId)));
    refs.push(doc(db, "scoreboards", examId));
    refs.push(doc(db, "exam_results_index", examId));
    for (let i = 0; i < refs.length; i += 400) {
      const batch = writeBatch(db);
      refs.slice(i, i + 400).forEach((r) => batch.delete(r));
      await batch.commit();
    }
  }

  return { sync, get, list, syncRecent, cascadeDelete };
})();
if (typeof window !== "undefined") window.RekapCore = RekapCore;
