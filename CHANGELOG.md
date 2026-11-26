# Changelog

Semua perubahan penting dicatat di sini. Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/ms/1.1.0/). Butiran pepijat: `BUG_TRACKER.md`. Keputusan: `TECHNICAL_DECISIONS.md`.

## [0.1.0-alpha] — Belum dikeluarkan

Vertical slice mudah alih (Pelan 004 & 005).

### Ditambah
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
- **E2E:** Playwright (`npm run test:e2e`) untuk vertical slice penuh pada `desktop-chrome` dan `pixel-7` (emulasi). API ujian `window.__mks` hanya wujud dalam mod dev.
- **Dev:** `npm run dev:host` untuk ujian telefon di rangkaian tempatan; paparan FPS `?fps` (dev sahaja).
- **Dokumen:** `THIRD_PARTY_NOTICES.md`, `QA_REPORT.md` dan `CHANGELOG.md`.

### Diubah
- Latar Malaysia: mata wang RM dan teks BM (TPD-016), termasuk huraian manifest PWA.
- Manifest tidak lagi ditutup secara automatik di alamat terakhir. Pemain mesti kembali ke gudang (master prompt H.10).
- **Prestasi telefon:** kesan Bloom dan pakej `@react-three/postprocessing` dibuang (~5 FPS pada Redmi 9).
- **Prestasi:** bangunan dan jalan dilukis dengan instancing (`2ad40f8`). Draw call di kedudukan mula turun daripada 265 ke 51–78 (desktop) dan daripada 127–145 ke 25–40 (emulasi Pixel 7); susun atur bandar tidak berubah.

### Dibaiki
- **Kamera (B14):** kamera berhenti di luar dinding bangunan dan rumah alamat, tidak lagi masuk ke dalam rumah di pintu (`8022722`).
- **Landskap (B21):** penunjuk arah disembunyikan semasa panel Serah Terima terbuka; menu utama boleh ditatal dan teks versi tidak lagi menutup butang Tetapan (`8022722`).
- **B1–B13:** kestabilan gelung penghantaran, butang sentuh, kamera tidak mengikut pemain (B12) dan lain-lain (Pelan 004).
- **B15:** panel serah terima dan ringkasan tidak boleh diklik kerana HUD `pointerEvents: none`.
- **B16:** autosave selepas serahan menyimpan wang lama; ganjaran hilang selepas Teruskan.
- Simpan sebelum ini gagal secara senyap (rekod IndexedDB tanpa `id`); diganti dengan backend baharu.

### Diketahui
- B14 (kamera dalam rumah), B17 (ikon PWA tiada), Rapier tidak digunakan (TPD-017). Lihat `QA_REPORT.md`.
