const Scoreboard = (() => {
  const reduce = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const pad = (n) => String(n).padStart(2, "0");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clock = (ms) => { if (!ms) return "-"; const d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()); };
  function dur(ms) {
    if (!ms || ms <= 0) return "-";
    const t = Math.round(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h ? h + " jam " : "") + (h || m ? m + " mnt " : "") + s + " dtk";
  }
  const fmtScore = (s) => (Math.round((Number(s) || 0) * 10) / 10).toString().replace(".", ",");
  const dOf = (e) => (e.d > 0 ? e.d : 1e15);

  const PATHS = {
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    medal: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5 7.5 21 12 18.5 16.5 21 15 13.5"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    up: '<path d="M12 19V6M6 12l6-6 6 6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.600 9.600 0 0 0 4.400-1M9.900 9.900a3 3 0 0 0 4.200 4.200"/>'
  };
  function icon(name, cls) {
    return '<svg class="sb-ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (PATHS[name] || "") + "</svg>";
  }

  function ranked(list) {
    const arr = list.slice().sort((a, b) => (b.s - a.s) || (dOf(a) - dOf(b)) || ((a.ct || 0) - (b.ct || 0)));
    let prev = null;
    arr.forEach((e, i) => {
      e.rank = prev && prev.s === e.s && dOf(prev) === dOf(e) ? prev.rank : i + 1;
      prev = e;
    });
    return arr;
  }

  function countUp(el, from, to) {
    if (reduce() || from === to) { el.textContent = fmtScore(to); return; }
    const t0 = performance.now(), D = 650;
    (function f(t) {
      const p = Math.min(1, (t - t0) / D), v = from + (to - from) * (1 - Math.pow(1 - p, 3));
      el.textContent = fmtScore(v);
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }

  function timeLines(e) {
    return '<span class="sb-m">' + icon("timer") + esc(dur(e.d)) + "</span>" +
      '<span class="sb-m">' + icon("clock") + esc(clock(e.st)) + " - " + esc(clock(e.ct)) + "</span>" +
      '<span class="sb-m">' + icon("check") + esc(e.c) + "/" + esc(e.t) + " benar</span>";
  }

  function mount(root, opts) {
    opts = opts || {};
    root.innerHTML = `
      <div class="sb">
        <div class="sb-head">${opts.live ? '<span class="sb-live"><i></i>LIVE</span>' : '<span class="sb-upd"></span>'}<span class="sb-count">0 selesai</span></div>
        <div class="sb-rule">${icon("info")}<span>Urutan: nilai tertinggi, lalu durasi pengerjaan tercepat, lalu waktu kirim paling awal. Durasi dihitung dari mulai mengerjakan sampai jawaban dikirim.</span></div>
        <div class="sb-empty">${icon("flag", "sb-empty-ic")}<div>Belum ada yang selesai. Skor muncul di sini begitu jawaban dikirim.</div></div>
        <div class="sb-podium"></div>
        <div class="sb-list"></div>
      </div>`;
    const podium = root.querySelector(".sb-podium");
    const list = root.querySelector(".sb-list");
    const empty = root.querySelector(".sb-empty");
    const count = root.querySelector(".sb-count");
    const rows = new Map();
    let prevScores = new Map();
    let prevRanks = new Map();
    let podiumSig = "";
    let first = true;

    function podCard(e, pos) {
      const me = opts.myUid && e.uid === opts.myUid ? " me" : "";
      const tone = ["gold", "silver", "bronze"][e.rank - 1] || "plain";
      return `<div class="sb-pod p${pos}${me}" data-uid="${esc(e.uid)}">
        <div class="sb-medal ${tone}">${icon(e.rank === 1 ? "trophy" : "medal")}</div>
        <div class="sb-pname">${esc(e.n || "Siswa")}</div>
        <div class="sb-pk">${esc(e.k || "")}</div>
        <div class="sb-pscore">${fmtScore(e.s)}</div>
        <div class="sb-pt">${timeLines(e)}</div>
        <div class="sb-bar"><b>#${e.rank}</b></div>
      </div>`;
    }

    function rowHtml(e) {
      return `<div class="sb-rank">${e.rank}</div>
        <div class="sb-info"><div class="sb-name">${esc(e.n || "Siswa")} <small>${esc(e.k || "")}</small></div><div class="sb-times">${timeLines(e)}</div></div>
        <div class="sb-score">0</div><span class="sb-trend"></span>`;
    }

    function update(entries) {
      const data = ranked((entries || []).filter((e) => e && typeof e.s === "number"));
      count.textContent = data.length + " selesai";
      const upd = root.querySelector(".sb-upd");
      if (upd) upd.textContent = "Diperbarui " + clock(Date.now()).slice(0, 5);
      empty.style.display = data.length ? "none" : "";
      const top3 = data.filter((e) => e.rank <= 3).slice(0, 3);
      const rest = data.filter((e) => !top3.includes(e));

      const sig = top3.map((e) => [e.uid, e.s, e.d, e.rank, e.ct].join(":")).join("|");
      if (sig !== podiumSig) {
        podiumSig = sig;
        const order = [top3[1], top3[0], top3[2]];
        podium.innerHTML = order.map((e, i) => (e ? podCard(e, [2, 1, 3][i]) : "")).join("");
        podium.classList.toggle("on", top3.length > 0);
        if (!reduce()) podium.querySelectorAll(".sb-pod").forEach((p, i) => { p.style.animationDelay = i * 70 + "ms"; p.classList.add("rise"); });
      }

      const before = new Map();
      rows.forEach((el, uid) => before.set(uid, el.getBoundingClientRect().top));
      const live = new Set(rest.map((e) => e.uid));
      rows.forEach((el, uid) => { if (!live.has(uid)) { el.classList.add("sb-out"); setTimeout(() => el.remove(), 260); rows.delete(uid); } });

      rest.forEach((e) => {
        let el = rows.get(e.uid);
        const isNew = !el;
        if (isNew) {
          el = document.createElement("div");
          el.className = "sb-row";
          rows.set(e.uid, el);
          el.innerHTML = rowHtml(e);
        } else {
          el.querySelector(".sb-rank").textContent = e.rank;
          el.querySelector(".sb-times").innerHTML = timeLines(e);
        }
        el.classList.toggle("me", !!(opts.myUid && e.uid === opts.myUid));
        countUp(el.querySelector(".sb-score"), isNew ? 0 : (prevScores.get(e.uid) || 0), e.s);
        const pr = prevRanks.get(e.uid);
        const tr = el.querySelector(".sb-trend");
        if (pr != null && e.rank < pr) { tr.innerHTML = icon("up"); tr.className = "sb-trend up"; setTimeout(() => { tr.className = "sb-trend"; tr.innerHTML = ""; }, 4000); }
        list.appendChild(el);
        if (isNew && !first) {
          el.classList.add("sb-new");
          setTimeout(() => el.classList.remove("sb-new"), 1800);
        }
      });
      rest.forEach((e) => list.appendChild(rows.get(e.uid)));

      if (!reduce()) {
        rows.forEach((el, uid) => {
          const was = before.get(uid), now = el.getBoundingClientRect().top;
          if (was != null && Math.abs(was - now) > 1) {
            el.animate([{ transform: `translateY(${was - now}px)` }, { transform: "translateY(0)" }], { duration: 380, easing: "cubic-bezier(.22,1,.36,1)" });
          } else if (was == null) {
            el.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out" });
          }
        });
      }

      if (!first && typeof opts.onNew === "function") {
        data.forEach((e) => { if (!prevScores.has(e.uid)) opts.onNew(e); });
      }
      prevScores = new Map(data.map((e) => [e.uid, e.s]));
      prevRanks = new Map(rest.map((e) => [e.uid, e.rank]));
      first = false;
    }
    return { update };
  }

  return { mount, ranked, icon };
})();
window.Scoreboard = Scoreboard;
