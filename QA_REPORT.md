# Laporan QA — Misi Kurir Simulator

**Tarikh:** 2026-11-25 · **Versi:** 0.1.0-alpha (belum dikeluarkan) · **Commit diuji:** `0f0af83`

Laporan ini hanya merekod apa yang **benar-benar** dijalankan. "Emulasi" bermaksud Chrome desktop yang meniru saiz skrin dan sentuhan sesebuah peranti, bukan peranti itu sendiri.

## Peranti & Pelayar

| Persekitaran | Jenis | Status |
|--------------|-------|--------|
| Vitest (Node + jsdom) | Ujian unit & kontrak | DIUJI |
| Playwright `desktop-chrome` (Chrome terpasang, 1280×720, kekunci E) | E2E automatik | DIUJI |
| Playwright `pixel-7` (Chrome terpasang, **emulasi** Pixel 7, butang sentuh) | E2E automatik | DIUJI (emulasi sahaja) |
| Chrome desktop, `localhost:5179/?touch=1`, semakan manual oleh penyemak | Manual | DIUJI (aliran Langkah 5–7; tindakan melalui DOM/JS, bukan sentuhan sebenar) |
| **Telefon Android sebenar** | Manual | **BELUM DIUJI** (Pelan 005 Langkah 9b) |
| iPhone / Safari, Firefox, Edge | — | BELUM DIUJI |

## Senario

Spec E2E `tests/contract/e2e/vertical-slice.spec.ts`. Tindakan permainan dibuat melalui UI sebenar; hanya pemanduan digantikan dengan teleport (`window.__mks.goTo`, dev sahaja).

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

## Keputusan

```
Vitest:     Test Files  19 passed (19)
            Tests  370 passed (370)
Playwright: 2 passed (27.9s)        # desktop-chrome + pixel-7
tsc --noEmit: tiada ralat · biome check src/: 0 ralat · npm run build: berjaya
```

`grep "__mks|createTestApi" dist/assets/*.js` → tiada padanan (API ujian tidak dibundel).

## Bukti

| Bukti | Rujukan |
|-------|---------|
| E2E + pembaikan B15/B16 | `bacccb5`, `76914e9` |
| Simpan/muat, autosave, Teruskan | `0766b57`, `a494ece` |
| Serah terima, ringkasan manifest | `2c33f7a`, `2600f2f`, `daac015` |
| Kontrak setiap langkah | `src/__contract__/005-*.test.ts(x)` |
| Ulang | `npx vitest run` · `npm run test:e2e` · `npm run build` |

## Had diketahui

- **Rapier tidak digunakan** (TPD-017): tiada collision, jadi motor dan pemain menembusi bangunan.
- **B14:** kamera boleh masuk ke dalam rumah semasa pemain berdiri di pintu alamat.
- **B17:** ikon PWA dan favicon tidak wujud.
- Fon Inter dimuat dari Google Fonts, jadi tiada fon semasa luar talian.
- **Prestasi belum diukur.** Tiada nombor FPS direkod sehingga ujian telefon sebenar (9b). Paparan FPS dev (`?fps`) sedang dibaiki (semakan 9a).
- Belum diuji di telefon sebenar, Safari atau Firefox.
