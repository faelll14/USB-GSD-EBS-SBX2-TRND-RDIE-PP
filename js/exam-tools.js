// exam-tools.js: alat bantu ujian (bola mengambang, kalkulator ilmiah, stabilo per kata)
const ExamTools = (() => {
  const cfg = { calc: false, hl: false };
  let built = false;
  const els = {};
  let currentQid = null;

  // ============================================================ util
  const $ = (sel, root) => (root || document).querySelector(sel);
  function h(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  const ICON = {
    calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2.5" width="16" height="19" rx="3"/><rect x="7" y="5.5" width="10" height="4" rx="1"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01"/></svg>',
    hl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l6 6M4 20l4-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5 16l-1 4z"/><path d="M14 6.5l3.5 3.5"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    hide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    eraser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H9L4.3 15.3a1.5 1.5 0 0 1 0-2.1l8.9-8.9a1.5 1.5 0 0 1 2.1 0l5.4 5.4a1.5 1.5 0 0 1 0 2.1L13 19"/><path d="M8 11l6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>'
  };

  // ============================================================ kalkulator: mesin hitung
  const FUNCS = {
    sin: (x, d) => Math.sin(d ? (x * Math.PI) / 180 : x),
    cos: (x, d) => Math.cos(d ? (x * Math.PI) / 180 : x),
    tan: (x, d) => {
      const r = d ? (x * Math.PI) / 180 : x;
      if (Math.abs(Math.cos(r)) < 1e-12) return NaN;
      return Math.tan(r);
    },
    asin: (x, d) => { const r = Math.asin(x); return d ? (r * 180) / Math.PI : r; },
    acos: (x, d) => { const r = Math.acos(x); return d ? (r * 180) / Math.PI : r; },
    atan: (x, d) => { const r = Math.atan(x); return d ? (r * 180) / Math.PI : r; },
    ln: (x) => (x > 0 ? Math.log(x) : NaN),
    log: (x) => (x > 0 ? Math.log10(x) : NaN),
    sqrt: (x) => (x >= 0 ? Math.sqrt(x) : NaN),
    abs: (x) => Math.abs(x)
  };

  function tokenize(src) {
    const s = src
      .replace(/×/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-")
      .replace(/π/g, "pi").replace(/√/g, "sqrt");
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      let m = s.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:E[+-]?\d+)?/);
      if (m) { out.push({ t: "num", v: parseFloat(m[0]) }); i += m[0].length; continue; }
      m = s.slice(i).match(/^[a-z]+/);
      if (m) {
        const id = m[0];
        if (FUNCS[id]) out.push({ t: "fn", v: id });
        else if (id === "pi") out.push({ t: "num", v: Math.PI, c: true });
        else if (id === "e") out.push({ t: "num", v: Math.E, c: true });
        else if (id === "ans") out.push({ t: "num", v: state.ans, c: true });
        else throw new Error("bad");
        i += id.length;
        continue;
      }
      if ("+-*/^!%()".includes(c)) { out.push({ t: c }); i++; continue; }
      throw new Error("bad");
    }
    // perkalian implisit: 2π, 3(4+1), (1+2)(3), 2sin(30)
    const res = [];
    out.forEach((tk, idx) => {
      const prev = res[res.length - 1];
      if (prev) {
        const prevVal = prev.t === "num" || prev.t === ")" || prev.t === "!" || prev.t === "%";
        const nextVal = tk.t === "num" || tk.t === "(" || tk.t === "fn";
        if (prevVal && nextVal) res.push({ t: "*" });
      }
      res.push(tk);
    });
    return res;
  }

  function evaluate(src) {
    const tk = tokenize(src);
    let p = 0;
    const peek = () => tk[p];
    const eat = (t) => { if (tk[p] && tk[p].t === t) { p++; return true; } return false; };

    function expr() {
      let v = term();
      while (peek() && (peek().t === "+" || peek().t === "-")) {
        const op = tk[p++].t;
        const r = term();
        v = op === "+" ? v + r : v - r;
      }
      return v;
    }
    function term() {
      let v = unary();
      while (peek() && (peek().t === "*" || peek().t === "/")) {
        const op = tk[p++].t;
        const r = unary();
        if (op === "/" && r === 0) throw new Error("div0");
        v = op === "*" ? v * r : v / r;
      }
      return v;
    }
    function unary() {
      if (eat("-")) return -unary();
      if (eat("+")) return unary();
      return power();
    }
    function power() {
      const base = postfix();
      if (eat("^")) return Math.pow(base, unary());
      return base;
    }
    function fact(n) {
      if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error("fact");
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    }
    function postfix() {
      let v = primary();
      while (peek() && (peek().t === "!" || peek().t === "%")) {
        const op = tk[p++].t;
        v = op === "!" ? fact(v) : v / 100;
      }
      return v;
    }
    function primary() {
      const t = tk[p];
      if (!t) throw new Error("eof");
      if (t.t === "num") { p++; return t.v; }
      if (t.t === "fn") {
        p++;
        if (!eat("(")) throw new Error("fn");
        const a = expr();
        eat(")"); // kurung penutup yang kurang ditutup otomatis
        const r = FUNCS[t.v](a, state.deg);
        if (!Number.isFinite(r)) throw new Error("domain");
        return Math.abs(r) < 1e-14 ? 0 : r;
      }
      if (t.t === "(") {
        p++;
        const v = expr();
        eat(")");
        return v;
      }
      throw new Error("syntax");
    }

    const v = expr();
    if (p < tk.length) throw new Error("syntax");
    if (!Number.isFinite(v)) throw new Error("range");
    return v;
  }

  function fmt(n) {
    if (!Number.isFinite(n)) return "Error";
    if (n === 0) return "0";
    const abs = Math.abs(n);
    if (abs >= 1e15 || abs < 1e-9) {
      return n.toExponential(9).replace(/\.?0+e/, "E").replace("e+", "E").replace("e", "E");
    }
    const s = String(Number(n.toPrecision(12)));
    return s.includes("e") ? n.toPrecision(12) : s;
  }

  const state = { expr: "", ans: 0, mem: 0, deg: true, fresh: false, err: false, history: [] };

  // ============================================================ kalkulator: UI
  const KEYS = [
    ["deg", "DEG", "fn"], ["mc", "MC", "mem"], ["mr", "MR", "mem"], ["m+", "M+", "mem"], ["m-", "M−", "mem"],
    ["sin(", "sin", "fn"], ["cos(", "cos", "fn"], ["tan(", "tan", "fn"], ["(", "(", "fn"], [")", ")", "fn"],
    ["asin(", "sin⁻¹", "fn"], ["acos(", "cos⁻¹", "fn"], ["atan(", "tan⁻¹", "fn"], ["π", "π", "fn"], ["e", "e", "fn"],
    ["ln(", "ln", "fn"], ["log(", "log", "fn"], ["√(", "√", "fn"], ["^2", "x²", "fn"], ["^", "xʸ", "fn"],
    ["!", "x!", "fn"], ["inv", "1/x", "fn"], ["abs(", "|x|", "fn"], ["E", "EXP", "fn"], ["%", "%", "fn"],
    ["7", "7", "num"], ["8", "8", "num"], ["9", "9", "num"], ["÷", "÷", "op"], ["C", "C", "clr"],
    ["4", "4", "num"], ["5", "5", "num"], ["6", "6", "num"], ["×", "×", "op"], ["bs", "DEL", "clr"],
    ["1", "1", "num"], ["2", "2", "num"], ["3", "3", "num"], ["−", "−", "op"], ["Ans", "Ans", "fn"],
    ["0", "0", "num"], [".", ".", "num"], ["neg", "±", "fn"], ["+", "+", "op"], ["=", "=", "eq"]
  ];
  const TOKENS_END = ["asin(", "acos(", "atan(", "sin(", "cos(", "tan(", "ln(", "log(", "√(", "abs(", "Ans"];

  function buildCalc() {
    const wrap = h("div", "et-calc");
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="et-disp"><div class="et-disp-top"><span class="et-mflag" hidden>M</span><span class="et-expr"></span></div>' +
      '<div class="et-res">0</div></div>' +
      '<button class="et-hist-btn" type="button" aria-label="Riwayat">' + ICON.history + "</button>" +
      '<div class="et-hist" hidden></div>';
    const grid = h("div", "et-keys");
    KEYS.forEach(([k, label, cls]) => {
      const b = h("button", "et-k et-k-" + cls, label);
      b.type = "button";
      b.dataset.k = k;
      if (k === "deg") b.classList.add("et-deg");
      grid.appendChild(b);
    });
    wrap.insertBefore(grid, wrap.querySelector(".et-hist-btn"));
    els.calc = wrap;
    els.exprEl = $(".et-expr", wrap);
    els.resEl = $(".et-res", wrap);
    els.mflag = $(".et-mflag", wrap);
    els.hist = $(".et-hist", wrap);
    els.degBtn = $(".et-deg", wrap);

    grid.addEventListener("click", (e) => {
      const b = e.target.closest(".et-k");
      if (b) press(b.dataset.k);
    });
    $(".et-hist-btn", wrap).addEventListener("click", () => {
      els.hist.hidden = !els.hist.hidden;
      renderHistory();
    });
    els.hist.addEventListener("click", (e) => {
      const it = e.target.closest("[data-i]");
      if (!it) return;
      const entry = state.history[parseInt(it.dataset.i, 10)];
      if (entry) { state.expr = entry.res; state.fresh = false; els.hist.hidden = true; refresh(); }
    });
    refresh();
    return wrap;
  }

  function lastNumberSegment() {
    const m = state.expr.match(/(\d*\.?\d*)$/);
    return m ? m[1] : "";
  }

  function startIfFresh(keepAns) {
    if (!state.fresh) return;
    state.expr = keepAns ? fmt(state.ans) : "";
    state.fresh = false;
  }

  function press(k) {
    if (state.err && k !== "deg" && k !== "mc" && k !== "mr" && k !== "m+" && k !== "m-") {
      state.expr = ""; state.fresh = false; state.err = false;
      els.resEl.classList.remove("et-err");
    }
    const isOp = (x) => "+−×÷^".includes(x);
    if (k === "deg") { state.deg = !state.deg; }
    else if (k === "C") { state.expr = ""; state.fresh = false; els.resEl.textContent = "0"; }
    else if (k === "bs") {
      if (state.fresh) { state.fresh = false; }
      const tok = TOKENS_END.find((t) => state.expr.endsWith(t));
      state.expr = tok ? state.expr.slice(0, -tok.length) : state.expr.slice(0, -1);
    }
    else if (k === "=") { equals(); return; }
    else if (k === "mc") { state.mem = 0; }
    else if (k === "mr") { startIfFresh(false); state.expr += fmt(state.mem); }
    else if (k === "m+" || k === "m-") {
      const v = currentValue();
      if (v !== null) state.mem += k === "m+" ? v : -v;
    }
    else if (/^[0-9]$/.test(k)) {
      startIfFresh(false);
      if (lastNumberSegment() === "0") state.expr = state.expr.slice(0, -1);
      state.expr += k;
    }
    else if (k === ".") {
      startIfFresh(false);
      if (!lastNumberSegment().includes(".")) state.expr += lastNumberSegment() === "" ? "0." : ".";
    }
    else if (isOp(k)) {
      startIfFresh(true);
      if (state.expr === "") { if (k === "−") state.expr = "−"; }
      else if (isOp(state.expr.slice(-1)) && state.expr.length > 1) state.expr = state.expr.slice(0, -1) + k;
      else if (!(state.expr === "−")) state.expr += k;
    }
    else if (k === "neg") {
      startIfFresh(true);
      if (state.expr === "") state.expr = "−";
      else if (/^−\(.*\)$/.test(state.expr)) state.expr = state.expr.slice(2, -1);
      else state.expr = "−(" + state.expr + ")";
    }
    else if (k === "inv") {
      startIfFresh(true);
      state.expr = state.expr === "" ? "1÷(" : "1÷(" + state.expr + ")";
    }
    else if (k === "^2" || k === "!" || k === "%" || k === "^") {
      startIfFresh(true);
      state.expr += k;
    }
    else { // fungsi, kurung, konstanta, Ans, E
      if (k === "E") { startIfFresh(false); if (!/\d$/.test(state.expr)) return refresh(); }
      else startIfFresh(false);
      state.expr += k;
    }
    refresh();
  }

  function currentValue() {
    try {
      if (state.fresh) return state.ans;
      if (!state.expr) return 0;
      return evaluate(state.expr);
    } catch (e) { return null; }
  }

  function equals() {
    if (!state.expr) return;
    try {
      const src = state.expr.replace(/[+−×÷^-]+$/, "");
      if (!src) return;
      const v = evaluate(src);
      const res = fmt(v);
      state.history.unshift({ expr: state.expr, res });
      if (state.history.length > 30) state.history.pop();
      state.ans = v;
      els.exprEl.textContent = state.expr + " =";
      els.resEl.textContent = res.replace("-", "−");
      els.resEl.classList.remove("et-err");
      state.err = false;
      state.fresh = true;
      els.mflag.hidden = state.mem === 0;
      els.degBtn.textContent = state.deg ? "DEG" : "RAD";
      renderHistory();
    } catch (err) {
      els.resEl.textContent = err.message === "div0" ? "Tak bisa dibagi 0" : "Error";
      els.resEl.classList.add("et-err");
      state.err = true;
    }
  }

  function refresh() {
    els.degBtn.textContent = state.deg ? "DEG" : "RAD";
    els.mflag.hidden = state.mem === 0;
    if (state.fresh) return;
    els.exprEl.textContent = state.expr;
    els.resEl.classList.remove("et-err");
    if (!state.expr) { els.resEl.textContent = "0"; return; }
    try {
      const v = evaluate(state.expr);
      const simple = /^[−-]?\d*\.?\d*$/.test(state.expr);
      els.resEl.textContent = simple ? state.expr : "= " + fmt(v).replace("-", "−");
    } catch (e) {
      const simple = /^[−-]?\d*\.?\d*$/.test(state.expr);
      els.resEl.textContent = simple ? state.expr || "0" : "…";
    }
  }

  function renderHistory() {
    if (els.hist.hidden) return;
    els.hist.innerHTML = state.history.length
      ? state.history.map((e, i) => `<button type="button" class="et-hist-item" data-i="${i}"><span>${e.expr.replace(/</g, "&lt;")}</span><b>${e.res.replace("-", "−")}</b></button>`).join("")
      : '<div class="et-hist-empty">Belum ada riwayat.</div>';
  }

  function onKey(e) {
    if (!els.panel || !els.panel.classList.contains("open") || els.calc.hidden) return;
    const k = e.key;
    let map = null;
    if (/^[0-9.]$/.test(k)) map = k;
    else if (k === "+") map = "+";
    else if (k === "-") map = "−";
    else if (k === "*") map = "×";
    else if (k === "/") { map = "÷"; e.preventDefault(); }
    else if (k === "^") map = "^";
    else if (k === "(" || k === ")") map = k;
    else if (k === "%") map = "%";
    else if (k === "!") map = "!";
    else if (k === "Enter" || k === "=") { map = "="; e.preventDefault(); }
    else if (k === "Backspace") map = "bs";
    else if (k === "Delete") map = "C";
    else if (k === "Escape") { closePanel(); return; }
    if (map) press(map);
  }

  // ============================================================ stabilo
  const hl = {
    active: false,
    tool: "pen",
    color: "rgba(255, 228, 92, 0.65)",
    colorSlot: 0, // 0,1 = template, 2 = kustom
    map: new Map(),
    history: [],
    idx: 0,
    custom: { h: 200, s: 0.7, v: 1, a: 0.6 }
  };
  const TEMPLATES = ["rgba(255, 228, 92, 0.65)", "rgba(255, 143, 199, 0.6)"];

  function hsv2rgb(hh, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (hh < 60) [r, g, b] = [c, x, 0];
    else if (hh < 120) [r, g, b] = [x, c, 0];
    else if (hh < 180) [r, g, b] = [0, c, x];
    else if (hh < 240) [r, g, b] = [0, x, c];
    else if (hh < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let hh = 0;
    if (d) {
      if (max === r) hh = ((g - b) / d) % 6;
      else if (max === g) hh = (b - r) / d + 2;
      else hh = (r - g) / d + 4;
      hh *= 60;
      if (hh < 0) hh += 360;
    }
    return [hh, max === 0 ? 0 : d / max, max];
  }
  const toHex = (n) => n.toString(16).padStart(2, "0");

  function customCss() {
    const [r, g, b] = hsv2rgb(hl.custom.h, hl.custom.s, hl.custom.v);
    return `rgba(${r}, ${g}, ${b}, ${hl.custom.a.toFixed(2)})`;
  }

  function parseRgba(c) {
    const m = String(c).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/i);
    return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : [255, 228, 92, 0.65];
  }
  function mixRgba(a, b) {
    const x = parseRgba(a), y = parseRgba(b);
    return "rgba(" + Math.round((x[0] + y[0]) / 2) + ", " + Math.round((x[1] + y[1]) / 2) + ", " + Math.round((x[2] + y[2]) / 2) + ", " + ((x[3] + y[3]) / 2).toFixed(3) + ")";
  }

  // Kata yang di-stabilo dan hanya dipisah spasi (satu baris) menyatu; beda warna -> gradient halus.
  function paintJoins(root) {
    if (!root) return;
    const items = [];
    (function walk(n) {
      Array.from(n.childNodes).forEach((ch) => {
        if (ch.nodeType === 1) {
          if (ch.classList.contains("et-w")) items.push({ k: "w", el: ch });
          else if (ch.classList.contains("et-sp")) items.push({ k: "s", el: ch, nl: /\n/.test(ch.textContent) });
          else walk(ch);
        } else if (ch.nodeType === 3 && ch.data.trim() !== "") {
          items.push({ k: "x" });
        }
      });
    })(root);
    const colorOf = (it) => (it && it.k === "w" ? hl.map.get(it.el.dataset.id) || null : null);
    const neighbor = (i, dir) => {
      const n1 = items[i + dir];
      if (!n1) return null;
      if (n1.k === "w") return colorOf(n1);
      if (n1.k === "s" && !n1.nl) return colorOf(items[i + 2 * dir]);
      return null;
    };
    items.forEach((it, i) => {
      if (it.k === "w") {
        const c = colorOf(it);
        if (!c) { it.el.style.background = ""; it.el.classList.remove("et-hl"); return; }
        const pc = neighbor(i, -1), nc = neighbor(i, 1);
        const L = pc && pc !== c ? mixRgba(pc, c) : null;
        const R = nc && nc !== c ? mixRgba(c, nc) : null;
        let bg = c;
        if (L && R) bg = "linear-gradient(90deg, " + L + " 0%, " + c + " 30%, " + c + " 70%, " + R + " 100%)";
        else if (L) bg = "linear-gradient(90deg, " + L + " 0%, " + c + " 55%)";
        else if (R) bg = "linear-gradient(90deg, " + c + " 45%, " + R + " 100%)";
        it.el.style.background = bg;
        it.el.classList.add("et-hl");
      } else if (it.k === "s") {
        const a = !it.nl ? colorOf(items[i - 1]) : null;
        const b = !it.nl ? colorOf(items[i + 1]) : null;
        it.el.style.background = a && b ? (a === b ? a : mixRgba(a, b)) : "";
      }
    });
  }

  function wrapEl(el, key) {
    if (!el || el.dataset.etWrapped) return;
    el.dataset.etWrapped = "1";
    let wi = 0;
    const nextId = () => currentQid + ":" + key + ":" + wi++;
    (function walk(node) {
      Array.from(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.data.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            const s = document.createElement("span");
            if (/^\s+$/.test(tok)) {
              s.className = "et-sp";
            } else {
              s.className = "et-w";
              s.dataset.id = nextId();
            }
            s.textContent = tok;
            frag.appendChild(s);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) {
          if (ch.classList.contains("katex-display") || ch.classList.contains("katex")) {
            const s = document.createElement("span");
            s.className = "et-w et-m" + (ch.classList.contains("katex-display") ? " et-md" : "");
            s.dataset.id = nextId();
            node.replaceChild(s, ch);
            s.appendChild(ch);
          } else {
            walk(ch);
          }
        }
      });
    })(el);
    paintJoins(el);
  }

  function setWordColor(id, color) {
    if (color) hl.map.set(id, color); else hl.map.delete(id);
    const sp = document.querySelector('.et-w[data-id="' + id.replace(/"/g, '\\"') + '"]');
    if (!sp) return;
    paintJoins(sp.closest("#questionTextArea, .exam-option-text"));
  }

  function applyWord(sp) {
    const id = sp.dataset.id;
    const prev = hl.map.get(id) || null;
    const next = hl.tool === "eraser" ? null : hl.color;
    if (prev === next) return;
    setWordColor(id, next);
    hl.history.length = hl.idx;
    hl.history.push({ id, prev, next });
    hl.idx = hl.history.length;
    syncUndo();
  }
  function undo() {
    if (hl.idx <= 0) return;
    const a = hl.history[--hl.idx];
    setWordColor(a.id, a.prev);
    syncUndo();
  }
  function redo() {
    if (hl.idx >= hl.history.length) return;
    const a = hl.history[hl.idx++];
    setWordColor(a.id, a.next);
    syncUndo();
  }
  function syncUndo() {
    if (!els.undoBtn) return;
    els.undoBtn.disabled = hl.idx <= 0;
    els.redoBtn.disabled = hl.idx >= hl.history.length;
  }

  function selectColor(slot) {
    hl.colorSlot = slot;
    hl.color = slot < 2 ? TEMPLATES[slot] : customCss();
    hl.tool = "pen";
    syncTools();
  }
  function selectEraser() {
    hl.tool = "eraser";
    syncTools();
  }
  function syncTools() {
    els.swatches.forEach((b, i) => b.classList.toggle("active", hl.tool === "pen" && hl.colorSlot === i));
    els.eraserBtn.classList.toggle("active", hl.tool === "eraser");
    const customBtn = els.swatches[2];
    customBtn.style.setProperty("--c", customCss());
  }

  function enterHl() {
    hl.active = true;
    document.body.classList.add("et-hl-mode");
    closePanel();
    els.hlTop.classList.add("open");
    els.hlBottom.classList.add("open");
    syncTools();
    syncUndo();
    wrapCurrent();
  }
  function exitHl() {
    if (!els.hlTop) return;
    hl.active = false;
    document.body.classList.remove("et-hl-mode");
    els.hlTop.classList.remove("open");
    els.hlBottom.classList.remove("open");
    els.picker.classList.remove("open");
  }

  function buildHl() {
    // bilah atas: undo / redo
    const top = h("div", "et-hl-top");
    els.undoBtn = h("button", "et-round", ICON.undo);
    els.redoBtn = h("button", "et-round", ICON.redo);
    els.undoBtn.type = els.redoBtn.type = "button";
    els.undoBtn.setAttribute("aria-label", "Urungkan");
    els.redoBtn.setAttribute("aria-label", "Ulangi");
    top.append(els.undoBtn, els.redoBtn);
    els.undoBtn.addEventListener("click", undo);
    els.redoBtn.addEventListener("click", redo);
    els.hlTop = top;

    // bilah bawah: warna template, warna kustom, penghapus, selesai
    const bottom = h("div", "et-hl-bottom");
    els.swatches = [];
    TEMPLATES.forEach((c, i) => {
      const b = h("button", "et-swatch");
      b.type = "button";
      b.style.setProperty("--c", c);
      b.setAttribute("aria-label", "Warna stabilo " + (i + 1));
      b.addEventListener("click", () => { els.picker.classList.remove("open"); selectColor(i); });
      els.swatches.push(b);
      bottom.appendChild(b);
    });
    const cb = h("button", "et-swatch et-swatch-custom");
    cb.type = "button";
    cb.setAttribute("aria-label", "Warna sendiri");
    cb.addEventListener("click", () => {
      selectColor(2);
      els.picker.classList.toggle("open");
      syncPicker();
    });
    els.swatches.push(cb);
    bottom.appendChild(cb);

    const er = h("button", "et-round et-eraser", ICON.eraser);
    er.type = "button";
    er.setAttribute("aria-label", "Penghapus stabilo");
    er.addEventListener("click", () => { els.picker.classList.remove("open"); selectEraser(); });
    els.eraserBtn = er;
    bottom.appendChild(er);

    const done = h("button", "et-round et-done", ICON.check);
    done.type = "button";
    done.setAttribute("aria-label", "Selesai");
    done.addEventListener("click", exitHl);
    bottom.appendChild(done);
    els.hlBottom = bottom;

    // pemilih warna: lingkaran hue + saturasi + kecerahan + transparansi + RGB
    const pk = h("div", "et-picker");
    pk.innerHTML =
      '<div class="et-wheel"><div class="et-wheel-knob"></div><div class="et-wheel-prev"></div></div>' +
      '<div class="et-sliders">' +
      '<label>Saturasi<input type="range" min="0" max="100" data-s="s"></label>' +
      '<label>Kecerahan<input type="range" min="0" max="100" data-s="v"></label>' +
      '<label>Transparansi<input type="range" min="15" max="100" data-s="a"></label>' +
      '<div class="et-rgb"><input type="number" min="0" max="255" data-c="r" aria-label="R"><input type="number" min="0" max="255" data-c="g" aria-label="G"><input type="number" min="0" max="255" data-c="b" aria-label="B"><input type="text" maxlength="7" data-c="hex" aria-label="HEX"></div>' +
      "</div>";
    els.picker = pk;
    els.wheel = $(".et-wheel", pk);
    els.knob = $(".et-wheel-knob", pk);
    els.wheelPrev = $(".et-wheel-prev", pk);

    const wheelMove = (e) => {
      const r = els.wheel.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      let ang = (Math.atan2(y, x) * 180) / Math.PI + 90;
      if (ang < 0) ang += 360;
      hl.custom.h = ang;
      updateCustom();
    };
    els.wheel.addEventListener("pointerdown", (e) => {
      els.wheel.setPointerCapture(e.pointerId);
      wheelMove(e);
      const mv = (ev) => wheelMove(ev);
      const up = () => { els.wheel.removeEventListener("pointermove", mv); els.wheel.removeEventListener("pointerup", up); };
      els.wheel.addEventListener("pointermove", mv);
      els.wheel.addEventListener("pointerup", up);
    });
    pk.querySelectorAll("input[data-s]").forEach((inp) => {
      inp.addEventListener("input", () => {
        const k = inp.dataset.s;
        hl.custom[k] = parseInt(inp.value, 10) / 100;
        updateCustom();
      });
    });
    pk.querySelectorAll("input[data-c]").forEach((inp) => {
      inp.addEventListener("change", () => {
        let [r, g, b] = hsv2rgb(hl.custom.h, hl.custom.s, hl.custom.v);
        const k = inp.dataset.c;
        if (k === "hex") {
          const m = inp.value.trim().match(/^#?([0-9a-f]{6})$/i);
          if (!m) return syncPicker();
          r = parseInt(m[1].slice(0, 2), 16); g = parseInt(m[1].slice(2, 4), 16); b = parseInt(m[1].slice(4, 6), 16);
        } else {
          const v = Math.max(0, Math.min(255, parseInt(inp.value || "0", 10)));
          if (k === "r") r = v; else if (k === "g") g = v; else b = v;
        }
        const [nh, ns, nv] = rgb2hsv(r, g, b);
        hl.custom.h = nh || hl.custom.h; hl.custom.s = ns; hl.custom.v = nv;
        updateCustom();
      });
    });
  }

  function updateCustom() {
    hl.colorSlot = 2;
    hl.tool = "pen";
    hl.color = customCss();
    syncPicker();
    syncTools();
  }
  function syncPicker() {
    const { h: hh, s, v, a } = hl.custom;
    const rad = ((hh - 90) * Math.PI) / 180;
    const R = els.wheel.clientWidth ? els.wheel.clientWidth / 2 - 11 : 54;
    els.knob.style.transform = `translate(${Math.cos(rad) * R}px, ${Math.sin(rad) * R}px)`;
    els.knob.style.background = `hsl(${hh}, 100%, 50%)`;
    const [r, g, b] = hsv2rgb(hh, s, v);
    els.wheelPrev.style.background = `rgb(${r}, ${g}, ${b})`;
    const set = (sel, val) => { const el = els.picker.querySelector(sel); if (el && document.activeElement !== el) el.value = val; };
    set('[data-s="s"]', Math.round(s * 100));
    set('[data-s="v"]', Math.round(v * 100));
    set('[data-s="a"]', Math.round(a * 100));
    set('[data-c="r"]', r); set('[data-c="g"]', g); set('[data-c="b"]', b);
    set('[data-c="hex"]', "#" + toHex(r) + toHex(g) + toHex(b));
    els.picker.style.setProperty("--hue", `hsl(${hh}, 100%, 50%)`);
  }

  function wrapCurrent() {
    if (!cfg.hl || currentQid === null) return;
    wrapEl(document.getElementById("questionTextArea"), "q");
    document.querySelectorAll("#optionsArea .exam-option").forEach((row) => {
      wrapEl(row.querySelector(".exam-option-text"), row.dataset.key || "o");
    });
  }

  function onClickCapture(e) {
    if (!hl.active) return;
    const t = e.target;
    if (!t || !t.closest) return;
    if (t.closest(".et-hl-top, .et-hl-bottom, .et-picker, .modal-scrim, .exam-bottombar, .exam-topbar")) return;
    const w = t.closest(".et-w");
    if (w) { e.preventDefault(); e.stopPropagation(); applyWord(w); return; }
    if (t.closest(".exam-option")) { e.preventDefault(); e.stopPropagation(); }
  }

  // ============================================================ bola mengambang + panel
  function buildBubble() {
    const b = h("button", "et-bubble");
    b.type = "button";
    b.setAttribute("aria-label", "Alat bantu");
    b.innerHTML = '<span class="et-ring"></span><span class="et-body"><span class="et-face"><i class="et-eye"></i><i class="et-eye"></i><i class="et-mouth"></i></span><span class="et-cheek l"></span><span class="et-cheek r"></span></span>';
    els.bubble = b;

    // posisi awal & drag
    let pos = null;
    try { pos = JSON.parse(sessionStorage.getItem("et_pos") || "null"); } catch (e) {}
    const size = 58;
    const place = (x, y) => {
      const maxX = window.innerWidth - size - 6;
      const maxY = window.innerHeight - size - 6;
      x = Math.max(6, Math.min(maxX, x));
      y = Math.max(6, Math.min(maxY, y));
      b.style.left = x + "px";
      b.style.top = y + "px";
      return [x, y];
    };
    const start = pos ? place(pos[0], pos[1]) : place(window.innerWidth - size - 14, window.innerHeight - size - 150);
    b._pos = start;

    let drag = null;
    b.addEventListener("pointerdown", (e) => {
      b.setPointerCapture(e.pointerId);
      drag = { sx: e.clientX, sy: e.clientY, ox: b._pos[0], oy: b._pos[1], moved: false };
      b.classList.add("grab");
    });
    b.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) > 6) drag.moved = true;
      if (drag.moved) b._pos = place(drag.ox + dx, drag.oy + dy);
    });
    const end = () => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      b.classList.remove("grab");
      if (moved) {
        // tempel ke sisi layar terdekat
        const mid = b._pos[0] + size / 2 < window.innerWidth / 2;
        b._pos = place(mid ? 10 : window.innerWidth - size - 10, b._pos[1]);
        try { sessionStorage.setItem("et_pos", JSON.stringify(b._pos)); } catch (e) {}
      } else {
        togglePanel();
      }
    };
    b.addEventListener("pointerup", end);
    b.addEventListener("pointercancel", () => { drag = null; b.classList.remove("grab"); });
    window.addEventListener("resize", () => { b._pos = place(b._pos[0], b._pos[1]); });
    return b;
  }

  function buildPanel() {
    const p = h("div", "et-panel");
    p.setAttribute("role", "dialog");
    p.innerHTML =
      '<div class="et-head"><button class="et-round et-back" type="button" aria-label="Kembali" hidden>' + ICON.back + "</button>" +
      '<div class="et-title">Alat Bantu</div>' +
      '<button class="et-round et-hide" type="button" aria-label="Sembunyikan">' + ICON.hide + "</button></div>" +
      '<div class="et-menu"></div>';
    els.panel = p;
    els.title = $(".et-title", p);
    els.back = $(".et-back", p);
    els.menu = $(".et-menu", p);

    if (cfg.calc) {
      const t = h("button", "et-tile", '<span class="et-tile-ic">' + ICON.calc + "</span><b>Kalkulator</b><small>Ilmiah lengkap</small>");
      t.type = "button";
      t.addEventListener("click", showCalc);
      els.menu.appendChild(t);
    }
    if (cfg.hl) {
      const t = h("button", "et-tile", '<span class="et-tile-ic">' + ICON.hl + "</span><b>Stabilo</b><small>Klik kata untuk menandai</small>");
      t.type = "button";
      t.addEventListener("click", enterHl);
      els.menu.appendChild(t);
    }
    p.appendChild(buildCalc());
    $(".et-hide", p).addEventListener("click", closePanel);
    els.back.addEventListener("click", showMenu);
  }

  function showMenu() {
    els.calc.hidden = true;
    els.menu.hidden = false;
    els.back.hidden = true;
    els.title.textContent = "Alat Bantu";
    els.panel.classList.remove("wide");
    positionPanel();
  }
  function showCalc() {
    els.menu.hidden = true;
    els.calc.hidden = false;
    els.back.hidden = false;
    els.title.textContent = "Kalkulator";
    els.panel.classList.add("wide");
    refresh();
    positionPanel();
  }

  function positionPanel() {
    const p = els.panel;
    const b = els.bubble;
    const pw = Math.min(p.offsetWidth || 340, window.innerWidth - 16);
    const ph = p.offsetHeight || 260;
    const [bx, by] = b._pos;
    let left = bx + 29 - pw / 2;
    left = Math.max(8, Math.min(window.innerWidth - pw - 8, left));
    let top = by - ph - 12;
    let origin = "bottom";
    if (top < 8) { top = Math.min(window.innerHeight - ph - 8, by + 58 + 12); origin = "top"; }
    top = Math.max(8, top);
    p.style.left = left + "px";
    p.style.top = top + "px";
    p.style.transformOrigin = `${bx + 29 - left}px ${origin}`;
  }

  function openPanel() {
    document.body.classList.add("et-panel-open");
    els.panel.classList.add("open");
    positionPanel();
    // jika hanya satu fasilitas, langsung tampilkan isinya
    if (cfg.calc && !cfg.hl && els.calc.hidden) showCalc();
    else positionPanel();
  }
  function closePanel() {
    if (!els.panel) return;
    els.panel.classList.remove("open");
    document.body.classList.remove("et-panel-open");
  }
  function togglePanel() {
    if (els.panel.classList.contains("open")) closePanel(); else openPanel();
  }

  // ============================================================ API publik
  function init(opts) {
    cfg.calc = !!(opts && opts.calculatorEnabled);
    cfg.hl = !!(opts && opts.highlightEnabled);
    if (built || (!cfg.calc && !cfg.hl)) return;
    built = true;
    buildBubble();
    buildPanel();
    if (cfg.hl) {
      buildHl();
      document.body.append(els.hlTop, els.hlBottom, els.picker);
      document.addEventListener("click", onClickCapture, true);
    }
    document.body.append(els.bubble, els.panel);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", () => { if (els.panel.classList.contains("open")) positionPanel(); });
    wrapCurrent();
  }

  function onRender(qid) {
    currentQid = qid;
    if (cfg.hl) wrapCurrent();
  }

  // dipanggil saat ujian terkunci / selesai
  function disable() {
    exitHl();
    closePanel();
    if (els.bubble) els.bubble.style.display = "none";
  }

  function enable() {
    if (els.bubble) els.bubble.style.display = "";
  }

  return { init, onRender, disable, enable };
})();
