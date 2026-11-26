# Changelog

Semua perubahan penting dicatat di sini. Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/ms/1.1.0/). Butiran pepijat: `BUG_TRACKER.md`. Keputusan: `TECHNICAL_DECISIONS.md`.

## [0.1.0-alpha] — Belum dikeluarkan

Vertical slice mudah alih (Pelan 004 & 005).

### Ditambah
- **Bangunan Kenney (Pelan 016):** model GLB menggantikan kotak bangunan dan rumah alamat; lot kosong ditumbuhi pokok.
- **Kereta trafik (Pelan 015):** enam jenis kereta menggunakan model 3D Kenney Car Kit (CC0).
- **Trafik pintar (Pelan 014):** kereta berhenti di garis berhenti setiap simpang, tidak merempuh kereta di hadapan, dan berhenti bila pemain berada di hadapannya dalam lorong.
- **Watak realistik dan skuter sebenar (Pelan 012c):** kurier dan penerima kini manusia realistik (Mixamo) dengan animasi berjalan, berlari, memegang dan membawa kotak, mengambil barang dan menunggang. Motor ialah skuter elektrik penghantaran (Sketchfab, CC BY 4.0) dengan kotak penghantaran di rak. Kredit dalam Tetapan.
- **Jalan bandar (Pelan 012b):** jalan, simpang, kaki lima dan lampu jalan Kenney.
- **Watak sebenar dan interaksi fizikal (Pelan 012a + 013b):** kurier dan penerima kini watak 3D beranimasi (Kenney Mini Characters, CC0): berjalan, berlari, menunggang, memegang kotak dengan dua tangan, dan menghulur tangan semasa serahan. Kotak (1–3) atau guni (≥ 4) kelihatan di tangan; penerima COD menghulur wang kertas. Kamera serah terima sinematik membingkai kurier dan penerima; pada skrin lebar panel berada di kanan.
- **Siang hari (Pelan 011):** langit bergradien, kabus jarak jauh, cahaya matahari petang dengan bayang-bayang lembut (desktop; ditutup di telefon pada tetapan Sederhana), jalan asfalt kelabu, bangunan berwarna pastel, dan HUD legap supaya mudah dibaca.
- **Angkat dan bawa paket (Pelan 013a):** selepas Berangkat kurier memegang paket dan mesti meletakkannya dalam motor sebelum menunggang. Di alamat, paket diambil dari motor dan dibawa ke penerima. Tangan kosong di pintu = "AMBIL DI MOTOR". Paket di tangan disimpan bersama simpanan permainan.
- **Kandungan (Pelan 010):** 9 alamat penghantaran (sebelum ini 3), penerima dengan baju berbeza, dan minimap bulat (arah hadapan ke atas) yang menunjukkan jalan, gudang dan sasaran. Rumah dan penanda dilukis dengan instancing; lampu titik per zon dibuang. Draw call turun walaupun alamat bertambah.
- **Model kurier dan kapcai (Pelan 008a):** kurier bersendi dengan topi keledar, jaket bergaris dan beg kurier, beranimasi berjalan dan berlari, dan duduk di atas motor. Motor kini kapcai underbone dengan perisai kaki, lampu, ekzos dan kotak penghantaran di belakang. Semuanya dibina dengan kod, tanpa fail aset.
- **Rasa memandu (Pelan 009):** pecutan beransur hingga 90 km/j, luncur dan brek, belok bergantung laju, motor dan penunggang condong semasa membelok, roda berputar, FOV kamera melebar ikut laju, bunyi enjin (Web Audio, ikut tetapan Bunyi), dan HUD dalam km/j sebenar.
- **Trafik:** kenderaan memandu di lorong kiri; motor tidak lagi tembus kereta.
- **Gudang 3D:** bangunan gudang, meja sortir dan panel gudang (imbas, muat, berangkat) dengan had kargo berat/isi padu. Status paket ikut mesin keadaan dengan sejarah.
- **Motor:** naik/turun, motor kekal di tempat ditinggalkan, turun hanya bila hampir berhenti, kotak parkir di setiap alamat.
- **Kawalan sentuh:** joystick, butang tindakan kontekstual dan BREK.
- **Navigasi:** anak panah ke sasaran seterusnya (gudang atau alamat), dengan jarak.
- **Serah terima:** pemain mesti turun dari motor. Panel menunjukkan penerima, alamat dan nombor penjejakan, dengan butang Ambil bukti → Serahkan paket, Penerima tiada dan Batal. Paket gagal dipulangkan ke gudang.
- **Ringkasan manifest:** manifest ditutup di meja gudang (TUTUP MANIFEST / PULANGKAN PAKET). Ringkasan memaparkan dihantar, dipulangkan, pendapatan RM, XP dan masa.
- **Simpan/muat:**
  - skema save v1 dengan validasi dan migrasi
  - butang Simpan
  - autosave selepas berangkat, selepas setiap serah terima, dan selepas manifest ditutup
  - butang **▶ Teruskan** di menu utama
  - simpanan rosak ditolak dengan mesej yang jelas
- **COD:** kira-kira 40% paket dibayar tunai semasa serahan. Pelanggan membayar dengan wang kertas RM20/50/100 dan pemain memilih baki yang betul daripada 3 pilihan sebelum boleh menyerahkan paket. Tunai disetor ke gudang dan ditunjukkan sebagai "COD disetor" dalam ringkasan; ia bukan pendapatan kurir (`75883b4`).
- **E2E:** Playwright (`npm run test:e2e`) untuk vertical slice penuh pada `desktop-chrome` dan `pixel-7` (emulasi). API ujian `window.__mks` hanya wujud dalam mod dev.
- **Dev:** `npm run dev:host` untuk ujian telefon di rangkaian tempatan; paparan FPS `?fps` (dev sahaja).
- **Dokumen:** `THIRD_PARTY_NOTICES.md`, `QA_REPORT.md` dan `CHANGELOG.md`.

### Diubah
- **Watak lebih ringan (Pelan 017):** model Mixamo dihadkan kepada 12,000 segi tiga setiap watak; penerima bertekstur sehingga 512 px hanya muncul berhampiran alamat dengan paket aktif.
- Latar Malaysia: mata wang RM dan teks BM (TPD-016), termasuk huraian manifest PWA.
- Manifest tidak lagi ditutup secara automatik di alamat terakhir. Pemain mesti kembali ke gudang (master prompt H.10).
- **Prestasi telefon:** kesan Bloom dan pakej `@react-three/postprocessing` dibuang (~5 FPS pada Redmi 9).
- **Prestasi:** bangunan dan jalan dilukis dengan instancing (`2ad40f8`). Draw call di kedudukan mula turun daripada 265 ke 51–78 (desktop) dan daripada 127–145 ke 25–40 (emulasi Pixel 7); susun atur bandar tidak berubah.

### Dibaiki
- **Dunia (B28, B29):** dinding hitam gergasi (Terrain yang tegak) dibuang, dan jalan utara–selatan yang berdiri tegak sebagai dinding kini rata. Separuh rangkaian jalan sebelum ini tidak wujud.
- **Kamera motor (B27):** kamera kini dikemas kini selepas motor bergerak dalam setiap frame, dengan redaman yang tidak bergantung pada FPS. Ini mengurangkan gegaran semasa memandu (Pelan 007b).
- **Pergerakan (B24–B26):** watak dan motor kini berdiri di atas jalan (tidak terapung); A/D dan joystick ikut arah skrin, termasuk stereng motor; watak dan motor tidak lagi tembus bangunan, rumah, dinding gudang, meja dan rak. Penunggang kelihatan di atas motor (Pelan 007).
- **COD (B23):** memilih baki yang salah kini memaparkan "Baki salah — kira semula" di dalam panel Serah Terima (Pelan 006b).
- **Panel (B22):** label dan nilai dalam panel kini berjarak ("Penerima: Aminah") (`75883b4`).
- **Kamera (B14):** kamera berhenti di luar dinding bangunan dan rumah alamat, tidak lagi masuk ke dalam rumah di pintu (`8022722`).
- **Landskap (B21):** penunjuk arah disembunyikan semasa panel Serah Terima terbuka; menu utama boleh ditatal dan teks versi tidak lagi menutup butang Tetapan (`8022722`).
- **B1–B13:** kestabilan gelung penghantaran, butang sentuh, kamera tidak mengikut pemain (B12) dan lain-lain (Pelan 004).
- **B15:** panel serah terima dan ringkasan tidak boleh diklik kerana HUD `pointerEvents: none`.
- **B16:** autosave selepas serahan menyimpan wang lama; ganjaran hilang selepas Teruskan.
- Simpan sebelum ini gagal secara senyap (rekod IndexedDB tanpa `id`); diganti dengan backend baharu.

### Diketahui
- B14 (kamera dalam rumah), B17 (ikon PWA tiada), Rapier tidak digunakan (TPD-017). Lihat `QA_REPORT.md`.
