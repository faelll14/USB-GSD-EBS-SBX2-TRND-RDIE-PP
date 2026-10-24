const QuestionPrompt = (() => {
  const TEXT = [
    "Ubah SELURUH isi file atau pesan yang saya berikan bersama prompt ini menjadi teks soal dengan format PERSIS seperti di bawah.",
    "",
    "CARA MEMBALAS:",
    "- Balas HANYA dengan teks hasil format. Tanpa salam, tanpa basa-basi, tanpa penjelasan, tanpa komentar, tanpa judul tambahan, tanpa penutup.",
    "- Jangan gunakan code block atau tanda ``` . Langsung mulai dari baris [SOAL 1].",
    "- Jika teks terlalu panjang dan terpotong, lanjutkan saat saya mengetik \"lanjut\", mulai dari soal berikutnya, tetap dengan format yang sama.",
    "",
    "ATURAN MUTLAK (tidak boleh dilanggar):",
    "1. Salin teks soal dan SEMUA pilihan jawaban SECARA PERSIS seperti di sumber (copy-paste). Dilarang menghapus, mengubah, meringkas, memperbaiki, memparafrase, atau menambah kata, huruf, angka, simbol, tanda baca, atau ejaan apa pun, termasuk jika ada salah ketik.",
    "2. Pertahankan struktur teks soal apa adanya: baris baru, baris kosong antar paragraf, spasi atau indentasi, judul, teks bacaan/wacana, daftar, tabel, dan kalimat pertanyaan. Semuanya tetap berada di dalam soal yang sama, dengan jarak baris yang sama persis seperti di sumber.",
    "3. Satu soal = satu blok. Jika beberapa soal memakai satu wacana yang sama, ulangi wacana itu secara utuh di setiap soal yang memakainya.",
    "4. Setiap pilihan jawaban ditulis di baris sendiri dengan huruf kapital, titik, dan satu spasi: A. isi pilihan / B. isi pilihan / C. ... dan seterusnya, berurutan sesuai sumber (jumlah pilihan bebas, A sampai J). Isi pilihan tidak boleh diubah. Jika penanda aslinya berbeda (misalnya a), (a), 1.), hanya penanda hurufnya yang diseragamkan menjadi A. B. C. dst.",
    "5. Kunci jawaban ditulis pada baris terakhir tiap blok: KUNCI: X (X = satu huruf saja). Ambil dari kunci jawaban di sumber. Jika sumber tidak memuat kunci untuk soal itu, tulis KUNCI: - dan jangan menebak.",
    "6. Yang boleh dibuang hanya penanda format asli soal (nomor soal seperti \"1.\" atau \"Soal 1\" di awal, dan baris \"Kunci jawaban: ...\") karena sudah digantikan format di bawah. Teks lain tidak boleh hilang.",
    "7. Urutan dan jumlah soal harus sama dengan sumber. Nomor pada [SOAL n] berurutan sesuai kemunculan soal (1, 2, 3, ...).",
    "8. [SOAL n] WAJIB berdiri sendiri di barisnya sendiri (tidak ada teks lain di baris yang sama). Teks soal dimulai di baris berikutnya.",
    "9. SETIAP pilihan jawaban WAJIB di baris terpisah. DILARANG menggabungkan beberapa pilihan dalam satu baris. KUNCI juga di baris sendiri.",
    "10. Jika ada gambar, rumus, atau tabel yang tidak bisa disalin sebagai teks, tulis [GAMBAR] atau salin isinya sebagai teks apa adanya di posisi aslinya, dan jangan menghilangkannya.",
    "",
    "FORMAT:",
    "[SOAL 1]",
    "(teks soal lengkap, persis seperti sumber, boleh banyak baris dan baris kosong)",
    "A. (isi pilihan A)",
    "B. (isi pilihan B)",
    "C. (isi pilihan C)",
    "D. (isi pilihan D)",
    "KUNCI: D",
    "",
    "[SOAL 2]",
    "(teks soal berikutnya)",
    "A. ...",
    "B. ...",
    "C. ...",
    "D. ...",
    "KUNCI: A",
    "",
    "Sekarang proses file atau pesan yang saya kirim setelah ini, dan langsung balas dengan hasil format di atas."
  ].join("\n");

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

  return { TEXT, copy };
})();
