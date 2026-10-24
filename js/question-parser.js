const QuestionParser = (() => {
  const OPTION_LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
  const START_RE = /^\s*\[\s*SOAL\s+(\d+)\s*\]\s?(.*)$/i;
  const LEGACY_START_RE = /^\s*(\d+)\s*\.\s?(.*)$/;
  const KUNCI_RE = /^\s*kunci(?:\s+jawaban)?\s*:\s*(.*)$/i;
  const OPT_RE = /^\s*([a-j])\s*[.)]\s?(.*)$/i;

  const isBlank = (l) => l.trim() === "";

  function trimBlankEdges(lines) {
    let s = 0;
    let e = lines.length;
    while (s < e && isBlank(lines[s])) s++;
    while (e > s && isBlank(lines[e - 1])) e--;
    return lines.slice(s, e);
  }

  // Pilihan satu baris: "A. x B. y C. z D. w" -> dipecah jadi satu pilihan per baris.
  // Hanya penanda yang berurutan (A, B, C, ...) yang dipakai; "x." biasa di dalam teks diabaikan.
  function expandInlineOptions(line) {
    if (!/^\s*a\s*[.)]/i.test(line)) return [line];
    const re = /(?:^|\s)([a-j])\s*[.)]\s*/gi;
    const marks = [];
    let m;
    while ((m = re.exec(line)) !== null) {
      if (m[1].toLowerCase() === OPTION_LETTERS[marks.length]) {
        marks.push({ letter: m[1].toLowerCase(), index: m.index, end: re.lastIndex });
      }
    }
    if (marks.length < 3) return [line];
    const out = [];
    for (let i = 0; i < marks.length; i++) {
      const end = i + 1 < marks.length ? marks[i + 1].index : line.length;
      out.push(marks[i].letter.toUpperCase() + ". " + line.slice(marks[i].end, end).replace(/\s+$/, ""));
    }
    return out;
  }

  function parseBlock(number, rawLines, legacy) {
    const errors = [];
    let lines = rawLines.slice();

    let correctKey = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const km = lines[i].match(KUNCI_RE);
      if (km) {
        const letter = km[1].match(/^\(?\s*([a-j])(?![a-z])/i);
        correctKey = letter ? letter[1].toLowerCase() : null;
        lines = lines.slice(0, i);
        break;
      }
    }

    {
      const expanded = [];
      lines.forEach((l) => expandInlineOptions(l).forEach((x) => expanded.push(x)));
      lines = expanded;
    }

    // Blok pilihan = deret terakhir yang diawali "A." lalu berurutan B, C, D, ...
    let optStart = -1;
    for (let s = lines.length - 1; s >= 0; s--) {
      const m = lines[s].match(OPT_RE);
      if (!m || m[1].toLowerCase() !== "a") continue;
      let expected = 1;
      let ok = true;
      for (let j = s + 1; j < lines.length; j++) {
        const mj = lines[j].match(OPT_RE);
        if (mj && mj[1].toLowerCase() === OPTION_LETTERS[expected]) {
          expected++;
        } else if (mj && OPTION_LETTERS.indexOf(mj[1].toLowerCase()) > expected) {
          ok = false;
          break;
        }
      }
      if (ok) { optStart = s; break; }
    }

    const options = {};
    let textLines = lines;
    if (optStart >= 0) {
      textLines = lines.slice(0, optStart);
      let idx = -1;
      let buffer = [];
      const flush = () => {
        if (idx < 0) return;
        options[OPTION_LETTERS[idx]] = trimBlankEdges(buffer).join("\n");
      };
      for (let j = optStart; j < lines.length; j++) {
        const mj = lines[j].match(OPT_RE);
        if (mj && mj[1].toLowerCase() === OPTION_LETTERS[idx + 1]) {
          flush();
          idx++;
          buffer = [mj[2]];
        } else {
          buffer.push(lines[j]);
        }
      }
      flush();
    }

    const text = trimBlankEdges(textLines).join("\n");

    if (Object.keys(options).length < 4) {
      errors.push({ questionNumber: number, message: "Minimal 4 pilihan (A-D) diperlukan." });
    }
    if (!correctKey) {
      errors.push({ questionNumber: number, message: "Kunci jawaban tidak ditemukan." });
    } else if (!options[correctKey]) {
      errors.push({ questionNumber: number, message: "Kunci jawaban '" + correctKey.toUpperCase() + "' tidak ada di pilihan." });
    }
    if (!text.trim()) {
      errors.push({ questionNumber: number, message: "Teks pertanyaan kosong." });
    }

    return {
      question: {
        id: "q" + number + "_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
        number: number,
        text: text,
        options: options,
        correctKey: correctKey
      },
      errors
    };
  }

  function parse(rawText) {
    // backslash di akhir baris adalah artefak "hard line break" markdown saat menyalin dari chat AI
    const lines = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map((l) => l.replace(/\\+[ \t]*$/, ""));
    const questions = [];
    const errors = [];
    const legacy = !lines.some((l) => START_RE.test(l));

    let current = null;
    const finish = () => {
      if (!current) return;
      const res = parseBlock(current.number, current.lines, legacy);
      questions.push(res.question);
      res.errors.forEach((e) => errors.push(e));
      current = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!legacy) {
        const sm = line.match(START_RE);
        if (sm) {
          finish();
          current = { number: parseInt(sm[1], 10), lines: sm[2] ? [sm[2]] : [] };
          continue;
        }
      } else {
        const lm = line.match(LEGACY_START_RE);
        if (lm) {
          finish();
          current = { number: parseInt(lm[1], 10), lines: [lm[2]] };
          continue;
        }
      }
      if (!current) {
        if (!isBlank(line)) {
          errors.push({ questionNumber: null, message: "Baris tidak dikenali sebelum nomor soal: \"" + line.trim().slice(0, 40) + "\"" });
        }
        continue;
      }
      current.lines.push(line);
    }
    finish();

    return { questions, errors };
  }

  return { parse, OPTION_LETTERS };
})();
