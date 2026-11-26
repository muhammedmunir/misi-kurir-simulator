# Pelan 005 Langkah 12 — B14 (kamera masuk rumah) + B21 (bertindih dalam landskap)

Pelaksana: C9. Perancang/penyemak: Claude. SATU commit.

## Kontrak (mesti lulus, jangan sunting)

- `src/__contract__/005-langkah-12-kamera-landskap.test.tsx` (9 ujian)
- `tests/contract/e2e/landscape-overlap.spec.ts` (2 ujian, projek pixel-7, viewport 823×309)

## Punca

**B14.** `CameraFollow.tsx` meletakkan kamera 8 unit di belakang pemain tanpa semakan halangan. Di pintu alamat (pintu = lot.z + 9, rumah z lot.z + 1 … lot.z + 7), pemain menghadap jalan → kamera di z ≈ lot.z + 1, di dalam kotak rumah. Disahkan dengan `__mks.goTo("zone-delivery-1")`: skrin menunjukkan siling merah dan dinding dari dalam.

**B21a (penunjuk arah).** `NavArrow` hanya bersembunyi bila `session.panelOpen`. Panel Serah Terima tidak memakai `panelOpen` (hanya untuk gudang); ia memakai `session.handover`. Jadi pil arah kekal di atas panel.

**B21b (menu).** Footer `MainMenu` ialah `position: absolute; bottom: 24px`. Dalam ketinggian 309 px ia jatuh di atas butang Tetapan. Bekas menu `justify-content: center` tanpa `overflow` → bila kandungan lebih tinggi daripada viewport, tajuk "MISI KURIR" terpotong di atas (−36 px) dan tidak boleh ditatal.

## Spesifikasi

### 1. Modul baharu `src/components/3d/camera-collision.ts` (data tulen, tiada React/three)

```ts
export type Aabb = { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number };
export function cameraObstacles(): Aabb[];
export function clampCamera(eye: P3, desired: P3, boxes: Aabb[]): P3; // P3 = { x, y, z }
```

- `cameraObstacles()`:
  - satu kotak bagi setiap `buildingLayout()`: x ± width/2, y 0 … height, z ± depth/2;
  - satu kotak bagi setiap zon `type === "delivery"` yang ada `lot`: x lot.x ± HOUSE.width/2, y 0 … HOUSE.height + 1.4 (bumbung), z (lot.z + HOUSE.zOffset) ± HOUSE.depth/2;
  - gudang TIDAK termasuk (pemain masuk ke dalamnya).
- `clampCamera()`: sinar dari `eye` ke `desired` (kaedah slab AABB). Jika segmen memasuki kotak, kamera diletak pada titik masuk terawal tolak padding 0.3 unit sepanjang sinar (tidak kurang daripada `eye`). Tiada halangan → kembalikan `desired` tanpa ubah. Kotak yang mengandungi `eye` diabaikan.

### 2. `CameraFollow.tsx`

- Import `cameraObstacles, clampCamera` dari `"./camera-collision"`.
- `const OBSTACLES = cameraObstacles();` di peringkat modul (sekali, bukan setiap frame).
- Dalam `useFrame`, selepas lerp `camPos`: `eye = { x, y: target.y + (isOnFoot ? 1 : 0.5), z }` (titik `lookAt` yang sama); `cam = clampCamera(eye, camPos.current, OBSTACLES)`; `state.camera.position.set(cam.x, cam.y, cam.z)`; `lookAt(eye)`.
- `camPos` sendiri JANGAN diklamp (lerp terus ke kedudukan asal supaya kamera kembali lancar bila halangan hilang).

### 3. `NavArrow.tsx`

- `read()` kembalikan `null` bila `session.panelOpen || session.handover`.

### 4. `MainMenu.tsx`

- `footerStyle`: buang `position: "absolute"` dan `bottom`; footer dalam aliran biasa (contoh `marginTop: "24px"`).
- `containerStyle`: `justifyContent: "safe center"` dan `overflowY: "auto"`.

## Luar skop

Ikon (B17), COD, gudang dalam `cameraObstacles`, kamera naik di atas halangan.

Kamera yang diklamp rapat dengan pemain: di pintu menghadap jalan, pemain mengisi tengah skrin. Ini lebih baik daripada berada di dalam dinding; penambahbaikan boleh dibuat kemudian jika pemilik mahu.

## Gate

`npx tsc --noEmit`, `npx biome check src/`, `npx vitest run`, knip (tiada baris baharu berbanding baseline), `npx playwright test` (semua lulus; pixel-7 tambah 2).

## Pengesahan perancang (pelaksanaan rujukan, kemudian dibuang)

- Kontrak gagal dahulu: tanpa modul, fail unit gagal import; dengan modul sahaja 3/9 gagal (CameraFollow, NavArrow ×2). 2/2 E2E gagal (`.nav-hud` dijangka 0, diterima 1; tajuk atas −36.66).
- Dengan rujukan: Vitest 411/411 dan Playwright 9 passed + 3 skipped.
- Tangkapan skrin di `zone-delivery-1`:
  - sebelum: siling dan dinding rumah dari dalam;
  - selepas: kamera di luar dinding, petak parkir dan jalan kelihatan.
- Menu 823×309: tajuk pada y = 32; menu boleh ditatal ke Tetapan dan footer.

## Semakan C9 (`8022722`) — DITERIMA

- Skop: 4 fail mengikut spesifikasi (`camera-collision.ts` baharu, `CameraFollow.tsx`, `NavArrow.tsx`, `MainMenu.tsx`). `git status` bersih.
- Gate dijalankan semula oleh penyemak: tsc 0, biome bersih, Vitest 411/411, knip tiada item baharu (Unused exports 12 → 8), Playwright 9 passed + 3 skipped.
- Visual: tangkapan skrin di `zone-delivery-1` sama dengan rujukan (kamera di luar dinding); menu 823×309 tajuk y = 32, boleh ditatal.
- Belum: pengesahan di telefon sebenar (bersama 11c).
