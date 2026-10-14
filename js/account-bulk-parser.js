const AccountBulkParser = (() => {
  const VALID_ROLES = ["siswa", "panitia", "guru", "admin"];
  const kelasPattern = /^(X|XI|XII)(\s+(IPA|IPS))?\.\d+$/i;

  function parse(rawText) {
    const lines = rawText.replace(/\r\n/g, "\n").split("\n");
    const rows = [];
    const errors = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const parts = trimmed.split(",").map((p) => p.trim());
      const role = (parts[parts.length - 1] || "").toLowerCase();

      if (!VALID_ROLES.includes(role)) {
        errors.push({ line: idx + 1, message: "Role tidak dikenali di baris: \"" + trimmed.slice(0, 60) + "\"" });
        return;
      }

      if (role === "siswa") {
        if (parts.length < 6) {
          errors.push({ line: idx + 1, message: "Format siswa butuh 6 kolom: nis, nama, kelas, no_absen, no_ruang, siswa" });
          return;
        }
        const [nis, namaLengkap, kelas, noAbsenRaw, noRuang] = parts;
        if (!nis || !namaLengkap) {
          errors.push({ line: idx + 1, message: "NIS dan nama lengkap wajib diisi." });
          return;
        }
        if (!kelasPattern.test(kelas)) {
          errors.push({ line: idx + 1, message: "Format kelas tidak valid: \"" + kelas + "\"" });
          return;
        }
        if (!/^\d+$/.test(noAbsenRaw)) {
          errors.push({ line: idx + 1, message: "No. absen harus angka." });
          return;
        }
        rows.push({
          role: "siswa",
          nisNip: nis,
          fullName: namaLengkap,
          kelas: kelas,
          noAbsen: parseInt(noAbsenRaw, 10),
          noRuang: noRuang || null
        });
      } else {
        if (parts.length < 3) {
          errors.push({ line: idx + 1, message: "Format " + role + " butuh 3 kolom: nis/nip, nama, " + role });
          return;
        }
        const [nisNip, namaLengkap] = parts;
        if (!nisNip || !namaLengkap) {
          errors.push({ line: idx + 1, message: "NIS/NIP dan nama lengkap wajib diisi." });
          return;
        }
        rows.push({
          role: role,
          nisNip: nisNip,
          fullName: namaLengkap,
          kelas: null,
          noAbsen: null,
          noRuang: null
        });
      }
    });

    return { rows, errors };
  }

  return { parse };
})();
