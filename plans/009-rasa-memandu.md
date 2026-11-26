# Pelan 009 — Rasa memandu (+ B28, B29 dunia)

Pelaksana: Claude (kelulusan pemilik 2026-11-26). SATU commit.

## Kontrak

- `src/__contract__/009-rasa-memandu.test.ts` (17 ujian).
- Dikemas kini:
  - `007-asas-pergerakan` (stereng kini dalam `stepMotor`);
  - `render-budget.spec.ts` (ambang segi tiga 4000 → 2500 selepas Terrain dibuang).

## Perubahan

- **Fizik motor** (`src/vehicles/motor-physics.ts`, `stepMotor`):
  - pecutan beransur (0→50 km/j ≈ 1.6 s; 50→80 km/j lebih lama), maksimum 90 km/j;
  - luncur bila pendikit dilepas; brek S kemudian undur perlahan; butang BREK;
  - kadar belok bergantung laju; stereng papan kekunci ditapis;
  - motor dan penunggang condong ke arah belokan.
- **Kamera:** FOV 60° → 72° dan jarak +2 m ikut laju.
- **HUD:** km/j sebenar (m/s × 3.6). Sebelum ini HUD memaparkan unit dunia sebagai km/j.
- **Roda** berputar ikut laju (dengan jejari supaya kelihatan).
- **Bunyi enjin** Web Audio (`src/audio/`): pic dan kelantangan ikut laju dan pendikit, mengikut tetapan "Bunyi". Bermula selepas gerak isyarat pertama.
- **Trafik:**
  - kenderaan di lorong kiri (Malaysia), ±3 m dari garis tengah;
  - collision motor dengan kenderaan (laju × 0.2, notis "Hati-hati!").
- **B28:** `Terrain.tsx` dibuang. Bucunya sudah pada satah XZ tetapi diputar −90° lagi, jadi ia berdiri sebagai dinding hitam 400 × 400 di z ≈ 0.
- **B29:** jalan utara–selatan diputar `(-π/2, π/2, 0)` (Euler XYZ), menjadikannya dinding tegak 6 m dan bukan jalan. `roadTransform()` kini membaringkan semua jalan; diuji dengan matriks three sebenar.

## Pengesahan

- tsc 0, biome bersih, Vitest 471/471, knip tiada baris baharu.
- Playwright 11 passed + 5 skipped, dua larian berturut-turut. Satu larian lebih awal (2.2 minit, mesin sibuk) gagal 3 ujian dan tidak berulang.
- Tangkapan skrin Chrome 1280×720:
  - jalan utara–selatan kini jalan sebenar dan dinding hitam hilang;
  - motor condong ke kanan pada 74 km/j;
  - kereta trafik di lorong.

## Belum

- Ujian telefon.
- Bunyi belum didengar oleh manusia (hanya diuji fungsi pic/kelantangan).
- Model 3D (Pelan 008).
