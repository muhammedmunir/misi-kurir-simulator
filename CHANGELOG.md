# CHANGELOG

Semua perubahan penting dalam projek ini dicatatkan di sini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/) (v1.1.0).

## [0.1.0-alpha] — 2026-11-25

### Ditambah
- **Serah terima**: Panel handover dengan ambil bukti, sahkan penghantaran, laporkan penerima tiada, dan batal.
- **Ringkasan manifest**: Panel ringkasan selepas penghantaran lengkap.
- **Simpan/muat**: Autosave di titik selamat (menu utama, gudang, selepas serahan); Teruskan dari menu utama.
- **E2E**: Playwright E2E (desktop-chrome + Pixel 7), API ujian dev (`window.__mks`).
- **B15**: Panel serah terima & manifest boleh diklik (`pointerEvents: auto`).
- **B16**: Susunan `confirmHandover` — ganjaran (`addMoney`/`addXP`) sebelum `set session` untuk autosave betul.

### Baik Dipulihkan
- B15: `<dialog>` panel tidak lagi menembusi klik ke kanvas 3D.
- B16: Wang dan XP serahan kini disimpan dengan betul selepas muat semula.
