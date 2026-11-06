// Level keamanan quiz: tabel level, penerjemah ke bendera, dan "volume" geser untuk guru.
const QuizSecurity = (() => {
  const FLAGS = [
    { k: "copy", label: "Anti salin dan tempel", desc: "Teks soal tidak bisa disalin atau ditempel." },
    { k: "shot", label: "Anti screenshot dan rekam layar", desc: "Layar menjadi hitam saat ditangkap." },
    { k: "multi", label: "Anti dua layar", desc: "Layar terbagi dan jendela mengambang ditolak." },
    { k: "back", label: "Tombol kembali dimatikan", desc: "Tombol kembali tidak berfungsi selama quiz." },
    { k: "leave", label: "Keluar dari quiz langsung mengunci", desc: "Siswa yang keluar aplikasi terkunci sampai guru membuka." },
    { k: "resume", label: "Dibuka ulang langsung masuk quiz", desc: "Aplikasi yang dibuka lagi langsung kembali ke quiz tanpa login." },
    { k: "full", label: "Layar penuh", desc: "Bilah status dan tombol navigasi disembunyikan." },
    { k: "vpn", label: "Kontrol internet (VPN)", desc: "Internet hanya untuk PatSec selama quiz." }
  ];
  const BASE = ["copy", "shot", "multi"];
  const HIGH = BASE.concat(["back", "leave", "resume", "full"]);
  const LEVELS = [
    { id: "none", name: "Tanpa pengaman", short: "None", tone: "#34c759", icon: "off",
      desc: "Quiz santai. Siswa bebas keluar aplikasi, menyalin teks, dan tidak ada layar penuh.", flags: [] },
    { id: "low", name: "Rendah", short: "Low", tone: "#8bc34a", icon: "shield",
      desc: "Hanya anti salin dan tempel. Siswa masih bisa keluar aplikasi dan membuka aplikasi lain.", flags: ["copy"] },
    { id: "medium", name: "Sedang", short: "Medium", tone: "#ffb300", icon: "check",
      desc: "Anti salin dan tempel, anti screenshot dan rekam layar, serta anti dua layar.", flags: BASE },
    { id: "high", name: "Tinggi", short: "High", tone: "#ff6d00", icon: "lock",
      desc: "Semua pengaman Sedang, ditambah tombol kembali dimatikan, layar penuh, dan keluar dari quiz langsung mengunci. Aplikasi yang dibuka ulang langsung masuk lagi ke quiz tanpa login. Catatan: tombol Home dan Recents tidak bisa dimatikan oleh aplikasi biasa, jadi keluar lewat tombol itu dideteksi lalu langsung mengunci.", flags: HIGH },
    { id: "highend", name: "Sangat tinggi", short: "High-end", tone: "#e53935", icon: "bolt",
      desc: "Semua pengaman Tinggi, ditambah kontrol internet (VPN): hanya aplikasi PatSec yang punya akses internet selama quiz.", flags: HIGH.concat(["vpn"]) },
    { id: "custom", name: "Kustom", short: "Custom", tone: "#8e24aa", icon: "sliders",
      desc: "Pilih sendiri pengaman yang diaktifkan.", flags: null }
  ];
  const ICONS = {
    off: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" stroke-dasharray="3 3"/>',
    shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>',
    check: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    lock: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><rect x="9" y="11" width="6" height="5" rx="1"/><path d="M10 11V9.500a2 2 0 0 1 4 0V11"/>',
    bolt: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M12.500 8l-3 4.500h3L11.500 16l3.500-4.500h-3z"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'
  };
  const svg = (name, cls) =>
    '<svg class="' + (cls || "qs-ic") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";

  const find = (id) => LEVELS.find((l) => l.id === id) || LEVELS[2];

  function normalize(sec) {
    const lv = find(sec && sec.level);
    let flags = lv.flags;
    if (lv.id === "custom") {
      const set = new Set(((sec && sec.flags) || []).filter((f) => FLAGS.some((x) => x.k === f)));
      flags = Array.from(set);
    }
    return { level: lv.id, flags: flags.slice() };
  }

  // objek bendera untuk dipakai halaman quiz: { copy:true, shot:false, ... }
  function flagsFor(sec) {
    const n = normalize(sec);
    const o = {};
    FLAGS.forEach((f) => { o[f.k] = n.flags.includes(f.k); });
    return o;
  }

  function mountPicker(root, initial, onChange) {
    let cur = normalize(initial || { level: "medium" });
    root.classList.add("qs");
    root.innerHTML =
      '<div class="qs-head"><span class="qs-badge"><span class="qs-badge-ic"></span><b class="qs-badge-name"></b></span><span class="qs-count"></span></div>' +
      '<div class="qs-track" role="slider" tabindex="0" aria-label="Level keamanan quiz" aria-valuemin="0" aria-valuemax="' + (LEVELS.length - 1) + '">' +
      '<div class="qs-rail"><div class="qs-fill"></div></div>' +
      '<div class="qs-stops">' + LEVELS.map(() => "<i></i>").join("") + "</div>" +
      '<div class="qs-thumb"><span class="qs-thumb-ic"></span></div></div>' +
      '<div class="qs-labels">' + LEVELS.map((l, i) => '<button type="button" class="qs-lab" data-i="' + i + '">' + l.short + "</button>").join("") + "</div>" +
      '<p class="qs-desc" aria-live="polite"></p>' +
      '<div class="qs-custom"></div>';

    const track = root.querySelector(".qs-track");
    const thumb = root.querySelector(".qs-thumb");
    const fill = root.querySelector(".qs-fill");
    const custom = root.querySelector(".qs-custom");
    const stops = Array.from(root.querySelectorAll(".qs-stops i"));
    const labs = Array.from(root.querySelectorAll(".qs-lab"));
    const idxOf = (id) => Math.max(0, LEVELS.findIndex((l) => l.id === id));

    function render(animate) {
      const i = idxOf(cur.level);
      const lv = LEVELS[i];
      const pct = (i / (LEVELS.length - 1)) * 100;
      root.style.setProperty("--qs-tone", lv.tone);
      thumb.style.left = pct + "%";
      fill.style.width = pct + "%";
      track.setAttribute("aria-valuenow", String(i));
      track.setAttribute("aria-valuetext", lv.name);
      stops.forEach((s, k) => s.classList.toggle("on", k <= i));
      labs.forEach((b, k) => b.classList.toggle("sel", k === i));
      root.querySelector(".qs-badge-name").textContent = lv.name;
      root.querySelector(".qs-badge-ic").innerHTML = svg(lv.icon);
      root.querySelector(".qs-thumb-ic").innerHTML = svg(lv.icon);
      root.querySelector(".qs-desc").textContent = lv.desc;
      root.querySelector(".qs-count").textContent = cur.flags.length + " dari " + FLAGS.length + " pengaman aktif";
      if (lv.id === "custom") {
        custom.style.display = "";
        custom.innerHTML = FLAGS.map((f) =>
          '<button type="button" class="qs-row' + (cur.flags.includes(f.k) ? " on" : "") + '" role="switch" aria-checked="' + cur.flags.includes(f.k) + '" data-k="' + f.k + '">' +
          '<span class="qs-row-t"><b>' + f.label + "</b><small>" + f.desc + '</small></span><span class="qs-sw"><i></i></span></button>').join("");
      } else {
        custom.style.display = "none";
        custom.innerHTML = "";
      }
      if (animate) {
        thumb.classList.remove("pop");
        void thumb.offsetWidth;
        thumb.classList.add("pop");
      }
    }

    function setIndex(i, emit) {
      i = Math.max(0, Math.min(LEVELS.length - 1, i));
      const lv = LEVELS[i];
      if (lv.id === "custom") {
        const keep = cur.level === "custom" ? cur.flags : (LEVELS[idxOf(cur.level)].flags || []);
        cur = { level: "custom", flags: keep.slice() };
      } else {
        cur = { level: lv.id, flags: lv.flags.slice() };
      }
      render(true);
      if (emit && onChange) onChange(get());
    }

    function idxFromX(clientX) {
      const r = track.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width)));
      return Math.round(p * (LEVELS.length - 1));
    }

    let dragging = false;
    track.addEventListener("pointerdown", (e) => {
      dragging = true;
      track.classList.add("drag");
      try { track.setPointerCapture(e.pointerId); } catch (_) {}
      const i = idxFromX(e.clientX);
      if (i !== idxOf(cur.level)) setIndex(i, true);
      track.focus();
    });
    track.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const i = idxFromX(e.clientX);
      if (i !== idxOf(cur.level)) setIndex(i, true);
    });
    const end = () => { dragging = false; track.classList.remove("drag"); };
    track.addEventListener("pointerup", end);
    track.addEventListener("pointercancel", end);
    track.addEventListener("keydown", (e) => {
      const i = idxOf(cur.level);
      if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setIndex(i + 1, true); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setIndex(i - 1, true); }
      else if (e.key === "Home") { e.preventDefault(); setIndex(0, true); }
      else if (e.key === "End") { e.preventDefault(); setIndex(LEVELS.length - 1, true); }
    });
    labs.forEach((b) => b.addEventListener("click", () => setIndex(parseInt(b.dataset.i, 10), true)));
    custom.addEventListener("click", (e) => {
      const row = e.target.closest(".qs-row");
      if (!row) return;
      const k = row.dataset.k;
      const set = new Set(cur.flags);
      if (set.has(k)) set.delete(k); else set.add(k);
      cur = { level: "custom", flags: Array.from(set) };
      render(false);
      if (onChange) onChange(get());
    });

    function get() { return { level: cur.level, flags: cur.flags.slice() }; }
    function set(sec) { cur = normalize(sec); render(false); }
    render(false);
    return { get, set };
  }

  return { FLAGS, LEVELS, find, normalize, flagsFor, mountPicker, icon: svg };
})();
if (typeof window !== "undefined") window.QuizSecurity = QuizSecurity;
