# Laporan QA — Misi Kurir Simulator

**Tarikh:** 2026-11-25 · **Versi:** 0.1.0-alpha (belum dikeluarkan) · **Commit diuji:** `97da0f4` (ujian awal 9b: `8bd8696`)

Laporan ini hanya merekod apa yang **benar-benar** dijalankan. "Emulasi" bermaksud Chrome desktop yang meniru saiz skrin dan sentuhan sesebuah peranti, bukan peranti itu sendiri.

## Peranti & Pelayar

| Persekitaran | Jenis | Status |
|--------------|-------|--------|
| Vitest (Node + jsdom) | Ujian unit & kontrak | DIUJI |
| Playwright `desktop-chrome` (Chrome terpasang, 1280×720, kekunci E) | E2E automatik | DIUJI |
| Playwright `pixel-7` (Chrome terpasang, **emulasi** Pixel 7, butang sentuh) | E2E automatik | DIUJI (emulasi sahaja) |
| Chrome desktop, `localhost:5179/?touch=1`, semakan manual oleh penyemak | Manual | DIUJI (aliran Langkah 5–7; tindakan melalui DOM/JS, bukan sentuhan sebenar) |
| **Redmi 9** (M2004J19C), Android 12, Chrome 158.0.8127.44, 1080×2340, DPR 2.75 | Telefon sebenar, USB | DIUJI (Langkah 9b; potret 392×767 dan landskap 823×309) |
| iPhone / Safari, Firefox, Edge | — | BELUM DIUJI |

### Cara ujian telefon (9b)

Telefon pemilik disambung melalui USB (USB debugging). Pelayan dev `vite --host --port 5181` dicapai melalui `adb reverse tcp:5181 tcp:5181`. Penyemak mengawal tab permainan melalui Chrome DevTools Protocol: **sentuhan sebenar** (`Input.dispatchTouchEvent`) pada butang, joystick dan medan nama. Teleport `__mks.goTo` hanya menggantikan perjalanan ke alamat. FPS diukur daripada selang `requestAnimationFrame` selama 3–5 s; paparan `?fps=1` menunjukkan nilai yang sama.

## Senario

### E2E automatik

Spec `tests/contract/e2e/vertical-slice.spec.ts`. Tindakan permainan dibuat melalui UI sebenar; hanya pemanduan digantikan dengan teleport (`window.__mks.goTo`, dev sahaja).

1. Menu → Permainan Baru → nama → Mula Misi.
2. Teleport ke meja gudang → BUKA GUDANG → imbas & muat 2 paket → Berangkat (2 paket).
3. Paket 1 di alamatnya → SERAH PAKET. Jika ada penerima: Ambil bukti → Serahkan paket (wang naik). Jika tiada: Penerima tiada (wang tidak berubah).
4. **Muat semula halaman → ▶ Teruskan:** fasa, wang dan status paket dipulihkan.
5. Paket 2 → SERAH PAKET → Penerima tiada → fasa `returning`.
6. Meja gudang → PULANGKAN PAKET → panel Ringkasan Manifest (dihantar, dipulangkan, pendapatan = wang yang diterima).
7. Manifest baharu → fasa `idle`.
8. Gagal jika ada `console.error` atau `pageerror`.

**Tidak diliputi oleh E2E:**
- memandu motor dengan WASD atau joystick ke alamat
- kotak parkir
- pergerakan kamera
- prestasi

### Telefon sebenar (Redmi 9)

**Potret — LULUS.** Turutan:
1. Permainan Baru → nama ditaip → Mula Misi.
2. NAIK MOTOR → joystick ditahan ke hadapan 5 s (motor bergerak; butang menjadi BERHENTI DULU).
3. Gudang: imbas & muat 2 paket → Berangkat.
4. Paket 1: Ambil bukti → Serahkan paket (RM500 → RM508).
5. Muat semula → ▶ Teruskan (fasa `delivering`, RM508, paket 1 `delivered`, paket 2 `out_for_delivery`).
6. Paket 2: Penerima tiada.
7. PULANGKAN PAKET → Ringkasan (1 dihantar, 1 dipulangkan, RM8.00, +39 XP) → Manifest baharu.

Tiada ralat konsol.

**Landskap — GAGAL pada `8bd8696` (B18), LULUS pada `97da0f4`.** Pada `8bd8696` panel Serah Terima (444 px) melebihi viewport (309 px) dan tidak boleh ditatal; pemain tersekat. Pada `97da0f4` aliran penuh yang sama lulus dalam landskap: panel ditatal dengan leretan jari sebenar untuk mencapai Ambil bukti dan Penerima tiada.

**Selepas Langkah 10 (`97da0f4`), potret dan landskap:** kad status menunjukkan "Memandu Motor" dan km/j semasa memandu (B19); tiada "Tekan E", diganti "Ketik butang tindakan" (B20). Tiada ralat konsol.

## Keputusan

```
Vitest:     Test Files  21 passed (21)
            Tests  383 passed (383)
Playwright: 3 passed, 1 skipped (29.8s)   # desktop-chrome + pixel-7; landskap 823×309 pada pixel-7 sahaja
tsc --noEmit: tiada ralat · biome check src/: 0 ralat · npm run build: berjaya
```

### FPS — Redmi 9, Chrome 158 (dev build, `dpr={[1, 1.5]}`, Bloom aktif)

| Keadaan | Potret 392×767 | Landskap 823×309 |
|---------|----------------|------------------|
| Menu utama (tiada 3D) | — | 60 FPS (p95 17 ms) |
| Berdiri di jalan | 30 FPS (p95 50 ms) | 33 FPS (p95 34 ms) |
| Berjalan dengan joystick | — | 33 FPS (p95 50 ms) |
| Memandu motor | 29 FPS (p95 50 ms) | — |
| Di gudang | 28 FPS (p95 50 ms) | 34 FPS (p95 34 ms) |
| Panel gudang terbuka | 27 FPS (p95 50 ms, maks 67 ms) | — |
| Panel Serah Terima terbuka | 27 FPS (p95 50 ms, maks 100 ms) | 33 FPS |
| Panel Ringkasan terbuka | 27 FPS (p95 50 ms, maks 83 ms) | — |

**Tafsiran:** boleh dimainkan pada ~30 FPS, tetapi bukan 60. Landskap (lebih sedikit piksel) lebih laju daripada potret, jadi telefon ini terhad oleh GPU/fill-rate. Calon pertama: matikan Bloom (`EffectComposer`) pada peranti sentuh. Ukuran dibuat pada build dev; build produksi belum diukur.

Ulangan pada `97da0f4` (selepas beberapa larian berturut-turut, telefon mungkin panas): potret 24–29 FPS, landskap 29–33 FPS. Tiada perubahan ketara daripada HUD yang kini ditinjau 10 kali sesaat.

## Bukti

| Bukti | Rujukan |
|-------|---------|
| E2E + pembaikan B15/B16 | `bacccb5`, `76914e9` |
| Simpan/muat, autosave, Teruskan | `0766b57`, `a494ece` |
| Serah terima, ringkasan manifest | `2c33f7a`, `2600f2f`, `daac015` |
| Meter FPS dev (`?fps`) | `8bd8696` |
| Kontrak setiap langkah | `src/__contract__/005-*.test.ts(x)` |
| Pepijat telefon B18–B20 (kontrak + E2E landskap; dibaiki `97da0f4`) | `src/__contract__/005-langkah-10-pepijat-telefon.test.tsx`, `tests/contract/e2e/landscape-panels.spec.ts` |
| Ulang | `npx vitest run` · `npm run test:e2e` · `npm run build` |

## Had diketahui

- **B21:** landskap — penunjuk arah bertindih dengan tajuk panel; teks versi menu bertindih dengan butang Tetapan.
- **Rapier tidak digunakan** (TPD-017): tiada collision, jadi motor dan pemain menembusi bangunan.
- **B14:** kamera boleh masuk ke dalam rumah di pintu alamat, dan di meja gudang model pemain menutup bahagian atas skrin (dilihat di telefon).
- **B17:** ikon PWA dan favicon tidak wujud.
- Fon Inter dimuat dari Google Fonts, jadi tiada fon semasa luar talian.
- **Prestasi:** ~27–34 FPS pada Redmi 9 (lihat jadual). Build produksi dan telefon lain belum diukur.
- Belum diuji di Safari, Firefox atau iPhone.
