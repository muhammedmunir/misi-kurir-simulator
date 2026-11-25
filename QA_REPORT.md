# LAPORAN QA — Misi Kurir Simulator

**Tarikh:** 2026-11-25
**Versi:** 0.0.0-alpha

---

## Peranti

| Peranti | Status |
|---------|--------|
| Desktop (Chrome) | DIUJI |
| Desktop (Firefox) | BELUM DIUJI |
| Telefon Android (Pixel 7) | DIUJI |
| iPhone (Safari) | BELUM DIUJI |
| Tablet | BELUM DIUJI |

## Pelayar

| Pelayar | Status |
|---------|--------|
| Chrome (desktop) | DIUJI |
| Firefox | BELUM DIUJI |
| Safari | BELUM DIUJI |
| Edge | BELUM DIUJI |

## Senario

| Senario | Penerangan | Status |
|---------|------------|--------|
| Navigasi menu → permainan | Klik "Mula" dari menu utama ke scene 3D | DIUJI |
| Kawalan motor | WASD naik/henti/undur, E interaksi | DIUJI |
| Kawalan sentuh | Joystick + butang tindakan di mod peranti | DIUJI |
| Ambil paket | Masuk zon pickup, tekan E, paket masuk manifest | DIUJI |
| Hantar paket | Masuk zon delivery, ambil bukti, sahkan serahan | DIUJI |
| Autosave | Setelah serahan, muat semula → wang & XP kekal | DIUJI |
| E2E penuh | Playwright — desktop-chrome + pixel-7 | DIUJI |

## Keputusan

- **Vitest:** 355 passed (355)
- **Playwright E2E:** 2 passed (desktop-chrome 25.5s, pixel-7 25.9s)
- **Typecheck:** lulus, tiada ralat
- **Build:** lulus, tiada ralat
- **Biome check:** 0 isu pada kod produksi

## Had Diketahui

- **B14:** Kamera boleh masuk dalam bangunan di pintu alamat (masih dicatatkan).
- **B17:** Ikon PWA dan favicon belum wujud (menunggu reka bentuk).
- **Rapier:** Enjin fizik Rapier belum digunakan sebagai `RigidBody` — kenderaan menembusi bangunan.
- Peranti sebenar (telefon, tablet) — BELUM DIUJI.
- Tiada ukuran FPS dijalankan; kelajuan animasi belum diukur.

## Bukti

1. Ujian vitest: `vitest run` → 355 passed
2. E2E Playwright desktop: `playwright test --project=desktop-chrome` → 2 passed (25.5s)
3. E2E Playwright Pixel 7: `playwright test --project=pixel-7` → 2 passed (25.9s)
4. Tangkapan skrin Chrome: navigasi menu → permainan → serahan paket → manifest
