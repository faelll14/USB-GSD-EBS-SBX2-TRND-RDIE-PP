// Penilaian per tipe soal: pg (huruf), isian (cocok salah satu jawaban diterima), essay (persentase kata kunci yang muncul).
const AnswerScoring = (() => {
  const norm = (s) =>
    String(s == null ? "" : s)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
      .replace(/(\d),(\d)/g, "$1.$2")
      .replace(/[.,;:!?]+$/, "")
      .trim();

  function spec(item) {
    const t = item && (item.type === "isian" || item.type === "essay") ? item.type : "pg";
    const k = String(item && item.correctKey != null ? item.correctKey : "");
    return t + ":" + (t === "pg" ? k.toLowerCase() : k);
  }

  // hasil 0..1
  function score(sp, answer) {
    if (answer == null) return 0;
    const i = sp.indexOf(":");
    const t = sp.slice(0, i);
    const key = sp.slice(i + 1);
    if (t === "isian") {
      const a = norm(answer);
      if (!a) return 0;
      return key.split("|").some((x) => norm(x) && norm(x) === a) ? 1 : 0;
    }
    if (t === "essay") {
      const kws = key.split("|").map(norm).filter(Boolean);
      if (!kws.length) return 0;
      const a = norm(answer);
      if (!a) return 0;
      let hit = 0;
      kws.forEach((k) => { if (a.includes(k)) hit++; });
      return hit / kws.length;
    }
    return String(answer).toLowerCase() === key ? 1 : 0;
  }

  return { spec, score, norm };
})();
if (typeof window !== "undefined") window.AnswerScoring = AnswerScoring;
