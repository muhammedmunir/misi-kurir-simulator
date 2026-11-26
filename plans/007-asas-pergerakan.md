# Pelan 007 — Asas pergerakan (B24 terapung, B25 A/D terbalik, B26 tembus)

Pelaksana: Claude (pemilik meluluskan pada 2026-11-26 kerana C9 terlalu lambat). SATU commit.

## Kontrak

- `src/__contract__/007-asas-pergerakan.test.ts` (13 ujian)
- `tests/contract/e2e/pergerakan.spec.ts` (2 ujian, desktop-chrome, kekunci sebenar)

## Punca

- **B24:** `pos.y = 1.6` sebagai tanah, sedangkan kaki model bermula pada y = 0. `MOTOR_Y = 0.6` mengangkat roda 0.55.
- **B25:** input dipetakan ke paksi dunia (D = +x). Dengan kamera memandang +z, +x ialah kiri skrin. Stereng motor menambah heading untuk kanan, jadi ia juga terbalik.
- **B26:** tiada collision langsung untuk pemain dan motor.

## Perubahan

- `src/components/3d/world-collision.ts` (baharu):
  - `worldColliders()` — kotak kamera (bangunan, rumah) dalam XZ, serta dinding gudang, meja dan rak;
  - `resolveCircle()`;
  - `moveHeading()` — kanan skrin = heading berkurang;
  - `angleDelta()`.
- `PlayerController.tsx`:
  - `GROUND_Y = 0` dan `MOTOR_Y = 0.05`;
  - `viewYaw` untuk kamera berjalan kaki, yang menyusul arah hadapan hanya bila input hadapan > 0.2;
  - collision watak (r 0.35), motor (r 0.7, laju × 0.5 bila terlanggar) dan titik turun motor;
  - `motor.heading -=` (undur membalikkan pusingan);
  - penunggang kelihatan di atas motor.
- `test-api.ts`: `state().pos` dan `state().heading`.
- `WarehouseBuilding.tsx`: memakai `WAREHOUSE_WALL_T`.

## Pengesahan

- tsc 0, biome bersih, Vitest 452/452, knip tiada baris baharu, Playwright 11 passed + 5 skipped.
- Tangkapan skrin Chrome 1280×720:
  - watak di atas jalan;
  - D → watak ke kanan skrin;
  - berhenti di meja sortir (z = 21.55);
  - penunggang di atas motor;
  - motor berhenti pada dinding belakang gudang (0 km/j).

## Belum

- Ujian di telefon (joystick memakai fungsi yang sama).
- Collision dengan trafik NPC dan tiang lampu.
- Model 3D dan animasi sebenar (cadangan Pelan 008).
