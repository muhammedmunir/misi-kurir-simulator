# Pelan 016 — Bangunan, rumah dan pokok Kenney

Pelaksana: **C9**. Penyemak: Claude (kemudian). SATU commit pada cawangan `c9/016-bangunan`.

## Matlamat

Kotak bangunan (`Buildings.tsx`) dan rumah alamat (`Destinations.tsx`) masih geometri kotak. Gantikannya dengan model GLB Kenney yang sudah ada dalam repo:
- `public/models/city-kit-commercial/`: `building-a` … `building-n`, `building-skyscraper-a` … `-e`.
- `public/models/city-kit-suburban/`: `building-type-a` … `-l`, `tree-large`, `tree-small`, `fence-low`, `planter`.

## Spesifikasi

1. **Corak:** ikut `src/components/3d/CityRoads.tsx`.
   - `useMergedModels(urls)` dan `fitMatrix(box, { x, z, w, h, d, rotY })` dari `./merged-model`.
   - Satu `<instancedMesh>` bagi setiap jenis model.
   - Bungkus dalam `<Suspense fallback={null}>`.
2. **Bangunan bandar** (`Buildings.tsx`):
   - Untuk setiap `buildingLayout()` (data TIDAK diubah; kontrak 11b menguncinya), pilih model secara deterministik: tinggi > 15 → skyscraper, selain itu building-a…n. Indeks model = `i % bilangan`.
   - Letak dengan `fitMatrix` supaya model mengisi **tepat** `width × height × depth` bangunan itu. Collision (`world-collision.ts`) dan kamera (`camera-collision.ts`) bergantung pada kotak ini, jadi JANGAN ubah dimensi.
   - Hadapan model ke +z (jalan). Sahkan dengan tangkapan skrin.
   - Buang tingkap dan pintu instanced lama jika model sudah ada tingkap.
   - **Kontrak 11b sudah dikemas kini oleh perancang** pada cawangan ini. Semakan render `Buildings.tsx` kini menuntut `useMergedModels` + `fitMatrix` dari `./merged-model`, `buildingLayout()`, `<Suspense>`, URL `/models/city-kit-commercial/`, `.map(...)` → `<instancedMesh>` (satu setiap jenis model), dan `computeBoundingSphere()`, tanpa `<boxGeometry>`/`<planeGeometry>`. Ujian susun atur, dimensi, tingkap/pintu (fungsi `city-layout`) dan jalan kekal dan mesti terus lulus. C9 JANGAN menyunting kontrak itu.
3. **Rumah alamat** (`Destinations.tsx`) — *kontrak 010 dikemas kini oleh perancang: semakan render kini menuntut GLB (`useMergedModels`, `fitMatrix`, `Suspense`, `/models/city-kit-suburban/`, `.map` → `<instancedMesh>`), setiap rumah mengisi kotak rumah asal dengan `rotY` 0 (menghadap +z), dan garisan/pad parkir kekal 2 instancedMesh satah (36 garisan, 9 pad).* ganti kotak rumah, bumbung dan pintu dengan model suburban (`building-type-a…l`, indeks ikut alamat), diletakkan mengisi `HOUSE.width × (HOUSE.height + 1.4) × HOUSE.depth` di tempat yang sama. Pintu model mesti menghadap +z (ke pintu zon). Kotak parkir kekal.
4. **Pokok:** tambah `tree-large` dan `tree-small` secara deterministik di lot kosong (blok tanpa bangunan atau alamat), 3–5 setiap lot. Satu instancedMesh setiap jenis. Pokok tidak perlu collision.
5. **Prestasi:** E2E `render-budget` mesti lulus (desktop ≤ 110 draw call, pixel-7 ≤ 80).
6. **Ujian:** tambah ujian unit dalam `src/components/3d/*.test.ts` (BUKAN `src/__contract__/`) untuk fungsi tulen baharu (pemilihan model, kedudukan pokok tidak bertindih dengan jalan dan bangunan).
7. **Dokumen:** `CHANGELOG.md` (satu baris), `THIRD_PARTY_NOTICES.md` (baris Commercial/Suburban: kegunaan "bangunan, rumah, pokok (Pelan 016)").

## Gate

tsc, `npx biome check src/` (kod keluar 0), vitest, knip (tiada baris baharu), `npx playwright test`. Ambil tangkapan skrin (desktop 1280×720) di titik mula dan di satu alamat, dan nyatakan laluannya dalam laporan.
