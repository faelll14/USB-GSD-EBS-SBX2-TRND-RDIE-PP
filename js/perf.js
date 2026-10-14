(() => {
  const d = document.documentElement;
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (mem <= 3 || cores <= 4) d.classList.add("perf-lite");

  // probe fps singkat: kalau patah-patah, pindah ke mode ringan otomatis
  let t0 = 0, last = 0, n = 0, slow = 0;
  function frame(t) {
    if (document.hidden) { t0 = 0; return requestAnimationFrame(frame); }
    if (!t0) { t0 = t; last = t; }
    else { if (t - last > 34) slow++; last = t; n++; }
    if (t - t0 < 1500) return requestAnimationFrame(frame);
    if (n > 20 && slow / n > 0.25) d.classList.add("perf-lite");
  }
  requestAnimationFrame(frame);
})();
