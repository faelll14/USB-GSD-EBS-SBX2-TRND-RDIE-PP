const QuestionPrompt = (() => {
  const TEXT = [
    "Ubah SELURUH isi file atau pesan yang saya berikan bersama prompt ini menjadi teks soal dengan format PERSIS seperti di bawah. Ada tiga jenis soal: PG (pilihan ganda), ISIAN (isian singkat), dan ESSAY (uraian).",
    "",
    "CARA MEMBALAS:",
    "- Balas HANYA dengan teks hasil format. Tanpa salam, tanpa basa-basi, tanpa penjelasan, tanpa komentar, tanpa judul tambahan, tanpa penutup.",
    "- Jangan gunakan code block atau tanda ``` . Langsung mulai dari baris [SOAL 1].",
    "- Jika teks terlalu panjang dan terpotong, lanjutkan saat saya mengetik \"lanjut\", mulai dari soal berikutnya, tetap dengan format yang sama.",
    "",
    "MENENTUKAN JENIS SOAL (TIPE):",
    "- Jika sumber menyebutkan jenis soalnya (misalnya \"Pilihan Ganda\", \"Isian Singkat\", \"Essay\", \"Uraian\"), ikuti sumber.",
    "- Jika tidak disebutkan, tentukan sendiri: ada pilihan jawaban bertanda huruf (A, B, C, ...) = PG. Pertanyaan yang jawabannya satu kata, angka, atau frasa pendek = ISIAN. Pertanyaan yang perlu dijelaskan dengan kalimat atau paragraf = ESSAY.",
    "- Satu file boleh berisi campuran ketiga jenis. Tulis baris TIPE: di baris pertama setelah [SOAL n] untuk SEMUA soal, termasuk PG.",
    "",
    "ATURAN MUTLAK (tidak boleh dilanggar):",
    "1. Salin teks soal dan SEMUA pilihan jawaban SECARA PERSIS seperti di sumber (copy-paste). Dilarang menghapus, mengubah, meringkas, memperbaiki, memparafrase, atau menambah kata, huruf, angka, simbol, tanda baca, atau ejaan apa pun, termasuk jika ada salah ketik.",
    "2. Pertahankan struktur teks soal apa adanya: baris baru, baris kosong antar paragraf, spasi atau indentasi, judul, teks bacaan/wacana, daftar, tabel, dan kalimat pertanyaan. Semuanya tetap berada di dalam soal yang sama, dengan jarak baris yang sama persis seperti di sumber.",
    "3. Satu soal = satu blok. Jika beberapa soal memakai satu wacana yang sama, ulangi wacana itu secara utuh di setiap soal yang memakainya.",
    "4. PG: setiap pilihan jawaban ditulis di baris sendiri dengan huruf kapital, titik, dan satu spasi: A. isi pilihan / B. isi pilihan / C. ... dan seterusnya, berurutan sesuai sumber (jumlah pilihan bebas, A sampai J, minimal 4). Isi pilihan tidak boleh diubah. Jika penanda aslinya berbeda (misalnya a), (a), 1.), hanya penanda hurufnya yang diseragamkan menjadi A. B. C. dst.",
    "5. PG: kunci jawaban ditulis pada baris terakhir blok: KUNCI: X (X = satu huruf saja). Ambil dari kunci jawaban di sumber. Jika sumber tidak memuat kunci untuk soal itu, tulis KUNCI: - dan jangan menebak.",
    "6. ISIAN: tulis JAWABAN: diikuti jawaban yang benar sesuai sumber. Jika ada beberapa penulisan yang dianggap benar (misalnya angka dan kata, atau singkatan dan nama lengkap), tulis semuanya dalam satu baris dipisah tanda | , contoh: JAWABAN: 56 | lima puluh enam. Jika sumber tidak memuat jawabannya, tulis JAWABAN: - dan jangan menebak.",
    "7. ESSAY: tulis dua baris di akhir blok. JAWABAN: berisi jawaban ideal/pembahasan dari sumber (jika sumber tidak memuatnya, tulis jawaban ideal singkat 1 sampai 3 kalimat yang benar). KATA KUNCI: berisi 3 sampai 8 kata atau frasa penting yang harus muncul pada jawaban siswa yang benar, dipisah tanda | , contoh: KATA KUNCI: cahaya | klorofil | glukosa. Kata kunci boleh Anda susun sendiri dari jawaban ideal, tulis dalam huruf kecil dan bentuk dasar.",
    "8. Yang boleh dibuang hanya penanda format asli soal (nomor soal seperti \"1.\" atau \"Soal 1\" di awal, baris \"Kunci jawaban: ...\", dan keterangan jenis soal di sumber) karena sudah digantikan format di bawah. Teks soal lain tidak boleh hilang.",
    "9. Urutan dan jumlah soal harus sama dengan sumber. Nomor pada [SOAL n] berurutan sesuai kemunculan soal (1, 2, 3, ...).",
    "10. [SOAL n] WAJIB berdiri sendiri di barisnya sendiri (tidak ada teks lain di baris yang sama). Baris TIPE: tepat di bawahnya, lalu teks soal di baris berikutnya.",
    "11. SETIAP pilihan jawaban PG WAJIB di baris terpisah. DILARANG menggabungkan beberapa pilihan dalam satu baris. KUNCI, JAWABAN, dan KATA KUNCI juga di baris sendiri.",
    "12. Jika ada gambar, rumus, atau tabel yang tidak bisa disalin sebagai teks, tulis [GAMBAR] atau salin isinya sebagai teks apa adanya di posisi aslinya, dan jangan menghilangkannya.",
    "",
    "FORMAT:",
    "",
    "[SOAL 1]",
    "TIPE: PG",
    "(teks soal lengkap, persis seperti sumber, boleh banyak baris dan baris kosong)",
    "A. (isi pilihan A)",
    "B. (isi pilihan B)",
    "C. (isi pilihan C)",
    "D. (isi pilihan D)",
    "KUNCI: D",
    "",
    "[SOAL 2]",
    "TIPE: ISIAN",
    "(teks soal isian singkat)",
    "JAWABAN: (jawaban benar) | (penulisan lain yang juga benar, jika ada)",
    "",
    "[SOAL 3]",
    "TIPE: ESSAY",
    "(teks soal essay)",
    "JAWABAN: (jawaban ideal atau pembahasan)",
    "KATA KUNCI: (kata penting 1) | (kata penting 2) | (kata penting 3)",
    "",
    "Sekarang proses file atau pesan yang saya kirim setelah ini, dan langsung balas dengan hasil format di atas."
  ].join("\n");

  const GUIDE = [
    "1. Siapkan soal. Boleh berupa file (Word, PDF, foto) atau teks yang ditempel. Soal boleh campuran pilihan ganda, isian singkat, dan essay. Jika ada kunci jawaban, sertakan di file yang sama. Jika jenis soal tidak ditulis, AI akan menentukannya sendiri.",
    "2. Tekan Salin Prompt AI di bawah. Prompt lengkap otomatis tersalin.",
    "3. Buka AI favorit Anda (ChatGPT, Gemini, Claude, dan sebagainya). Tempel prompt tadi, lalu lampirkan file soal atau tempel teks soalnya, kirim.",
    "4. Tunggu AI selesai. Jika jawabannya terpotong, ketik \"lanjut\" sampai semua soal keluar.",
    "5. Salin SELURUH jawaban AI, tempel ke kotak import di bawah, lalu tekan Proses Import.",
    "6. Periksa pratinjau. Jika ada soal yang ditolak, pesan kesalahan menyebutkan nomor dan penyebabnya. Perbaiki di kotak import atau minta AI memperbaiki soal itu, lalu proses ulang.",
    "7. Tekan Simpan Semua ke Bank Soal. Soal yang sudah tersimpan bisa diedit satu per satu.",
    "",
    "Catatan penilaian: pilihan ganda dan isian singkat dinilai otomatis (isian: cocok dengan salah satu jawaban yang diterima, huruf besar/kecil dan spasi berlebih diabaikan). Essay dinilai otomatis dari persentase kata kunci yang muncul di jawaban siswa, jadi pilih kata kunci yang benar-benar menentukan. Essay tetap bisa dikoreksi manual oleh guru dari jawaban yang tersimpan."
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(TEXT);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = TEXT;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;left:-9999px;top:0;";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return !!ok;
      } catch (e2) {
        return false;
      }
    }
  }

  return { TEXT, GUIDE, copy };
})();
