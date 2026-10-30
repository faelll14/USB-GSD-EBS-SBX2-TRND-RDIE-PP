const ClockInput = (() => {
  const pad = (n) => String(n).padStart(2, "0");
  function to24(hour, ampm) {
    if (hour >= 13) return hour;
    if (hour === 0) return 0;
    let h = hour % 12;
    if (ampm === "PM") h += 12;
    return h;
  }
  function label(h24, minute) {
    return pad(h24 % 12 || 12) + ":" + pad(minute) + " " + (h24 >= 12 ? "PM" : "AM");
  }
  function wire(hourId, ampmId) {
    const h = document.getElementById(hourId), sel = document.getElementById(ampmId);
    if (!h || !sel) return;
    h.min = "0"; h.max = "23";
    const fix = (final) => {
      const v = parseInt(h.value, 10);
      if (isNaN(v)) return;
      if (v >= 13 && v <= 23) { h.value = String(v - 12); sel.value = "PM"; }
      else if (final && v === 0) { h.value = "12"; sel.value = "AM"; }
    };
    h.addEventListener("input", () => fix(false));
    h.addEventListener("change", () => fix(true));
    h.addEventListener("blur", () => fix(true));
  }
  wire("dailyHour", "dailyAmPm");
  wire("jadwalHour", "jadwalAmPm");
  return { to24, label, wire };
})();
window.ClockInput = ClockInput;
