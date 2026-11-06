// Pemutar quiz siswa: satu soal per layar, waktu per soal, poin dan beruntun untuk keseruan saja.
// Tidak ada umpan balik benar/salah: siswa tidak diberi tahu apakah jawabannya tepat.
const QuizPlay = (() => {
  const PATHS = {
    star: '<path d="M12 3l2.700 5.600 6.100.900-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100-4.400-4.300 6.100-.900z"/>',
    flame: '<path d="M12 3c.800 3.200 4.500 4.600 4.500 9a4.500 4.500 0 0 1-9 0c0-1.700.800-2.900 1.700-3.900.300 1.200 1 1.900 1.800 2C11 8.400 11.600 6 12 3z"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.500 2M9 2h6"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>'
  };
  const ic = (n) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (PATHS[n] || "") + "</svg>";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const math = (s) => (window.PatMath && PatMath.html ? PatMath.html(s) : esc(s));
  const NOTE = ["Jawaban tercatat", "Tersimpan", "Oke, lanjut"];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  let ctx = null;
  let idx = 0, points = 0, streak = 0, best = 0, answeredN = 0, skipped = 0, timeSum = 0;
  let timer = null, endAt = 0, secPerQ = 30, locked = false, started = false, advance = null;

  const root = () => document.getElementById("examBody");
  const qs = () => ctx.questions;
  const cur = () => ctx.questions[idx];

  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } if (advance) { clearTimeout(advance); advance = null; } }

  function init(c) {
    ctx = c;
    secPerQ = Math.max(5, Math.min(300, parseInt(c.examData.quiz && c.examData.quiz.secPerQ, 10) || 30));
    idx = 0; points = 0; streak = 0; best = 0; answeredN = 0; skipped = 0; timeSum = 0; started = false; locked = false;
  }
  const active = () => ctx !== null;

  function render() {
    if (!ctx) return;
    if (!started) return intro();
    if (idx >= qs().length) return;
    question();
  }

  function intro() {
    stopTimer();
    const sec = ctx.examData.security || {};
    const lv = window.QuizSecurity ? QuizSecurity.find(sec.level) : { name: "-", tone: "var(--accent)", icon: "shield" };
    root().innerHTML =
      '<div class="qz"><div class="qz-intro">' +
      '<span class="qz-tag">' + ic("star") + "Quiz</span>" +
      '<h1 class="qz-title">' + esc(ctx.examData.subject || "Quiz") + "</h1>" +
      '<div class="qz-chips">' +
      '<span class="qz-chip">' + ic("list") + qs().length + " soal</span>" +
      '<span class="qz-chip">' + ic("timer") + secPerQ + " detik per soal</span>" +
      '<span class="qz-chip" style="border-color:' + lv.tone + '">' + (window.QuizSecurity ? QuizSecurity.icon(lv.icon, "qs-ic") : "") + "Keamanan " + esc(lv.name) + "</span></div>" +
      '<p class="login-subtitle" style="max-width:30rem;">Jawab sebelum waktu habis. Setiap jawaban yang terkirim tepat waktu menambah poin dan beruntun, tapi kamu baru tahu hasilnya setelah guru memeriksa.</p>' +
      '<button class="qz-go" id="qzGo" type="button">Mulai quiz</button></div></div>';
    document.getElementById("qzGo").addEventListener("click", () => { started = true; question(); });
  }

  function header() {
    const n = qs().length;
    return '<div class="qz-top"><div class="qz-prog"><span>Soal ' + (idx + 1) + " dari " + n + '</span><div class="qz-progbar"><i style="width:' + ((idx / n) * 100) + '%"></i></div></div>' +
      '<div class="qz-stats"><span class="qz-pill pts">' + ic("star") + '<span id="qzPts">' + points.toLocaleString("id-ID") + "</span></span>" +
      (streak >= 2 ? '<span class="qz-pill streak">' + ic("flame") + streak + "x</span>" : "") + "</div></div>" +
      '<div class="qz-timer" id="qzTimer"><div class="qz-timer-bar"><i id="qzBar"></i></div><span class="qz-timer-num" id="qzNum">' + secPerQ + "</span></div>";
  }

  function question() {
    stopTimer();
    const q = cur();
    if (!q) return;
    locked = false;
    const type = q.type || "pg";
    let body = "";
    if (type === "pg") {
      const keys = Object.keys(q.options || {}).sort();
      body = '<div class="qz-options ' + (keys.length === 2 || keys.length === 4 ? "two" : "") + '" id="qzOpts">' +
        keys.map((k, i) =>
          '<button type="button" class="qz-opt c' + ((i % 10) + 1) + '" data-k="' + k + '" style="--i:' + i + '">' +
          '<span class="qz-letter">' + k.toUpperCase() + "</span>" +
          '<span class="qz-opt-text">' + math(q.options[k]) + "</span>" +
          '<span class="qz-mark">' + ic("check") + "</span></button>").join("") + "</div>";
    } else {
      body = '<div class="qz-type" id="qzOpts">' +
        (type === "isian"
          ? '<input class="field-input exam-fill" id="qzIn" type="text" maxlength="200" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ketik jawabanmu" />'
          : '<textarea class="field-input exam-essay" id="qzIn" rows="6" maxlength="4000" placeholder="Tulis jawabanmu di sini" style="min-height:140px;"></textarea>') +
        '<button type="button" class="qz-send" id="qzSend">' + (type === "isian" ? "Jawab" : "Kirim jawaban") + "</button></div>";
    }
    root().innerHTML = '<div class="qz">' + header() +
      '<div class="qz-card">' + math(q.text) + (q.imageUrl ? '<img src="' + esc(q.imageUrl) + '" alt="" />' : "") + "</div>" +
      body + '<div class="qz-feed" id="qzFeed" role="status" aria-live="polite"></div></div>';

    if (type === "pg") {
      root().querySelectorAll(".qz-opt").forEach((b) => b.addEventListener("click", () => answer(b.dataset.k)));
    } else {
      const inp = document.getElementById("qzIn");
      const send = document.getElementById("qzSend");
      const go = () => { if (inp.value.trim()) answer(inp.value); };
      send.addEventListener("click", go);
      if (type === "isian") inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
      setTimeout(() => { try { inp.focus(); } catch (_) {} }, 250);
    }
    startTimer();
  }

  function startTimer() {
    endAt = Date.now() + secPerQ * 1000;
    const bar = document.getElementById("qzBar");
    const num = document.getElementById("qzNum");
    const box = document.getElementById("qzTimer");
    const tickT = () => {
      const rem = Math.max(0, endAt - Date.now());
      if (bar) bar.style.transform = "scaleX(" + (rem / (secPerQ * 1000)) + ")";
      if (num) num.textContent = Math.ceil(rem / 1000);
      if (box) box.classList.toggle("low", rem <= 5000);
      if (rem <= 0) { stopTimer(); answer(null); }
    };
    tickT();
    timer = setInterval(tickT, 100);
  }

  // value null = waktu habis. Poin dan beruntun murni dari kecepatan/partisipasi, bukan dari benar-salah,
  // supaya tidak membocorkan jawaban yang tepat ke siswa.
  function answer(value) {
    if (locked) return;
    locked = true;
    stopTimer();
    const q = cur();
    const type = q.type || "pg";
    const remMs = Math.max(0, endAt - Date.now());
    timeSum += Math.min(secPerQ, secPerQ - remMs / 1000);

    let gain = 0;
    if (value != null) {
      ctx.answers[q.id] = value;
      answeredN++;
      streak++;
      best = Math.max(best, streak);
      gain = Math.round(500 * (0.4 + 0.6 * (remMs / (secPerQ * 1000)))) + Math.min(streak - 1, 5) * 30;
      points += gain;
    } else {
      skipped++;
      streak = 0;
    }

    const opts = document.getElementById("qzOpts");
    if (type === "pg") {
      opts.classList.add("done");
      opts.querySelectorAll(".qz-opt").forEach((b) => { if (value != null && b.dataset.k === value) b.classList.add("sel"); });
    } else {
      const inp = document.getElementById("qzIn");
      const send = document.getElementById("qzSend");
      if (inp) inp.disabled = true;
      if (send) send.disabled = true;
    }

    const feed = document.getElementById("qzFeed");
    const text = value == null ? "Waktu habis, soal dilewati" : pick(NOTE) + (streak >= 3 ? ". Beruntun " + streak + "x" : "");
    feed.className = "qz-feed show note";
    feed.innerHTML = "<span>" + esc(text) + "</span>" + (gain ? '<span class="gain">+' + gain.toLocaleString("id-ID") + "</span>" : "");
    if (gain) {
      const p = document.getElementById("qzPts");
      if (p) p.textContent = points.toLocaleString("id-ID");
    }
    advance = setTimeout(next, value == null ? 1400 : 1100);
  }

  function next() {
    if (advance) { clearTimeout(advance); advance = null; }
    idx++;
    if (idx >= qs().length) { stopTimer(); ctx.finish(); return; }
    question();
  }

  function finishHtml(msg) {
    const n = qs().length;
    const avg = (answeredN + skipped) ? (timeSum / (answeredN + skipped)).toFixed(1).replace(".", ",") + " dtk" : "-";
    return '<div class="qz"><div class="qz-end">' +
      '<span class="qz-tag">' + ic("star") + "Quiz selesai</span>" +
      '<h2 class="qz-title">Jawabanmu sudah tersimpan</h2>' +
      '<div class="qz-grid">' +
      '<div class="qz-stat"><b>' + n + '</b><span>Total soal</span></div>' +
      '<div class="qz-stat"><b>' + answeredN + '</b><span>Dijawab</span></div>' +
      '<div class="qz-stat"><b>' + points.toLocaleString("id-ID") + "</b><span>Poin</span></div>" +
      '<div class="qz-stat"><b>' + best + "x</b><span>Beruntun terbaik</span></div></div>" +
      '<p class="login-subtitle" style="max-width:30rem;">Poin dan beruntun di sini hanya untuk keseruan. Nilai resmi masuk scoreboard setelah guru memeriksa.</p>' +
      (msg ? '<div class="qz-msg"><b>Pesan dari guru</b><div>' + esc(msg) + "</div></div>" : "") +
      '<button class="btn btn-ghost finish-btn" id="btnFinishScoreboard" type="button">Lihat Scoreboard</button>' +
      '<button class="btn btn-primary finish-btn" id="btnBackHome" type="button">Kembali ke Beranda</button>' +
      "</div></div>";
  }

  return { init, active, render, finishHtml, stop: stopTimer };
})();
if (typeof window !== "undefined") window.QuizPlay = QuizPlay;
