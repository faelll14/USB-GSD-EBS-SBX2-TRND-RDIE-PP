const QuestionParser = (() => {
  const OPTION_LETTERS = ["a", "b", "c", "d", "e"];

  function isOptionsLine(line) {
    return /^[a-e]\s*\./i.test(line.trim());
  }

  function isKunciLine(line) {
    return /^kunci\s*:/i.test(line.trim());
  }

  function isQuestionStart(line) {
    return /^\d+\s*\./.test(line.trim());
  }

  function parseOptionsLine(line) {
    const options = {};
    const regex = /([a-e])\s*\.\s*/gi;
    const matches = [];
    let m;
    while ((m = regex.exec(line)) !== null) {
      matches.push({ letter: m[1].toLowerCase(), index: m.index, endOfMarker: regex.lastIndex });
    }
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].endOfMarker;
      const end = i + 1 < matches.length ? matches[i + 1].index : line.length;
      options[matches[i].letter] = line.slice(start, end).trim();
    }
    return options;
  }

  function parse(rawText) {
    const lines = rawText.replace(/\r\n/g, "\n").split("\n");
    const questions = [];
    const errors = [];

    let current = null;

    function pushCurrent(lineNumber) {
      if (!current) return;
      const optionKeys = Object.keys(current.options);
      if (optionKeys.length < 4) {
        errors.push({ questionNumber: current.number, message: "Minimal 4 pilihan (a-d) diperlukan." });
      }
      if (!current.correctKey) {
        errors.push({ questionNumber: current.number, message: "Kunci jawaban tidak ditemukan." });
      } else if (!current.options[current.correctKey]) {
        errors.push({ questionNumber: current.number, message: "Kunci jawaban '" + current.correctKey + "' tidak ada di pilihan." });
      }
      if (!current.text.trim()) {
        errors.push({ questionNumber: current.number, message: "Teks pertanyaan kosong." });
      }
      questions.push({
        id: "q" + current.number + "_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
        number: current.number,
        text: current.text.trim(),
        options: current.options,
        correctKey: current.correctKey
      });
      current = null;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (isQuestionStart(line)) {
        pushCurrent(i);
        const dotIndex = line.indexOf(".");
        const number = parseInt(line.slice(0, dotIndex).trim(), 10);
        const restOfLine = line.slice(dotIndex + 1).trim();
        current = { number: number, text: restOfLine, options: {}, correctKey: null };
        continue;
      }

      if (!current) {
        if (trimmed === "") continue;
        errors.push({ questionNumber: null, message: "Baris tidak dikenali sebelum nomor soal: \"" + trimmed.slice(0, 40) + "\"" });
        continue;
      }

      if (isOptionsLine(line)) {
        const parsed = parseOptionsLine(line);
        current.options = Object.assign({}, current.options, parsed);
        continue;
      }

      if (isKunciLine(line)) {
        const val = trimmed.split(":")[1] || "";
        current.correctKey = val.trim().toLowerCase();
        continue;
      }

      if (trimmed === "") {
        continue;
      }

      current.text += (current.text ? "\n" : "") + line;
    }

    pushCurrent(lines.length);

    return { questions, errors };
  }

  return { parse, OPTION_LETTERS };
})();
