# Pelan 023 — Isi dunia: taman perumahan Malaysia yang hidup

Pelaksana: **C9**. Penyemak: Claude. SATU commit pada `c9/023-isi-dunia` (dicabang daripada commit terakhir rantai C9).

## Masalah (daripada tangkapan skrin 016–020)

1. **Dunia kosong.** Blok 40 m hanya ada satu bangunan 6–14 m, dan 50% blok kosong (`buildingLayout`, `pseudoRandom() > 0.5`). Kebanyakan skrin ialah padang rumput.
2. **Rumah alamat berdiri sendirian** di tengah padang besar, tanpa jiran, pagar atau laluan kereta.
3. **Tiada identiti Malaysia:** tiada tiang elektrik berwayar, kedai berkanopi, kereta diparkir atau lampu isyarat.
4. **Gudang ialah kotak kelabu** dengan jalur kuning, tidak sepadan dengan gaya Kenney.
5. **Banyak model Kenney yang sudah dimuat turun belum digunakan.** Semuanya dalam `assets-src/*.zip`:
   - suburban `building-type-m…u`, `driveway-*`, `fence-*`, `path-*`;
   - commercial `low-detail-building-*` (untuk jarak jauh), `detail-awning*`, `detail-parasol-*`;
   - roads `electricity-pole*`, `electricity-wires*`, `traffic-light*`, `road-sign-*`, `dumpster`, `construction-*`;
   - car-kit `sedan`, `suv`, `van`, `taxi`, `delivery`, `garbage-truck`, `cone`.

## Kontrak

- `src/__contract__/023-isi-dunia.test.ts` (baharu).
- `src/__contract__/005-langkah-12-kamera-landskap.test.tsx` dikemas kini oleh perancang: kiraan `cameraObstacles` termasuk placement pejal setinggi ≥ 2 m.

JANGAN sunting kontrak.

## Spesifikasi

1. **Salin model** yang digunakan daripada arkib ke `public/models/<kit>/<nama>.glb`. Gunakan folder kit yang sama dengan yang sedia ada; `car-kit` sudah wujud. Salin hanya model yang dirujuk. Fail `colormap` / `Textures` perlu ikut jika model merujuknya; semak dalam pelayar bahawa model tidak putih.
2. **Fail baharu `src/components/3d/city-blocks.ts`** (tulen, tanpa React):
   ```ts
   export type Placement = { model: string; x: number; z: number; rotY: number; w: number; h: number; d: number; solid: boolean };
   export function blockPlacements(): Placement[]; // isi blok
   export function streetProps(): Placement[];     // tiang, lampu isyarat, papan tanda
   ```
   - `model` = `"<kit>/<nama>"` tanpa `.glb`. `w`/`h`/`d` = dimensi sasaran untuk `fitMatrix`. `rotY` = gandaan π/2.
   - Deterministik: guna rng berbiji sendiri, BUKAN `Math.random`.
   - **Jenis blok**, dipilih ikut kedudukan supaya ada kawasan yang jelas berbeza:
     - **Taman perumahan** (majoriti, terutamanya di sekitar alamat):
       - deretan 3–4 rumah `building-type-*` rapat menghadap jalan (gaya rumah teres/berkembar);
       - `driveway-short` di hadapan setiap rumah, dengan kereta (`sedan`/`hatchback-sports`/`suv`/`van`) di separuh daripada laluan kereta;
       - `fence-*` di sempadan lot;
       - pokok di belakang rumah.
     - **Deretan kedai** (blok bersebelahan jalan utama x = 0 atau z = 0):
       - 4–6 `building-a…n` atau `low-detail-building-*` rapat berderet;
       - `detail-awning-wide` di hadapan setiap kedai;
       - `dumpster` dan `detail-parasol-*` di kaki lima.
     - **Blok bangunan tinggi** (`buildingLayout` sedia ada): tambah bangunan rendah dan pokok di sekeliling sehingga ≥ 3 bangunan.
   - **Blok alamat:**
     - rumah alamat kekal;
     - tambah jiran di kiri dan kanan (≥ 2 m dari kotak rumah);
     - koridor pintu ke jalan mesti lapang (lihat kontrak).
   - **Blok gudang:** tiada placement (dikawal oleh Pelan gudang di bawah).
   - Tumbuhan menggantikan `emptyLotTrees()`: buang `CityTrees` dan `emptyLotTrees` jika tidak lagi digunakan (knip mesti bersih), atau gunakannya semula di dalam `blockPlacements`.
   - `solid`: bangunan, pagar, kereta diparkir dan dumpster = `true`; laluan kereta, laluan batu dan kanopi = `false`.
3. **`streetProps()`:**
   - **Tiang elektrik** `electricity-pole` setiap ~20 m di bahu jalan (6–9 m dari garis jalan), dengan `electricity-wires` di antara tiang. Wayar elektrik melintang ialah pemandangan biasa di taman perumahan Malaysia.
   - **Lampu isyarat** di ≥ 4 persimpangan utama (paksi x = 0 dan z = 0).
   - **Papan tanda nama jalan** (`road-sign-street`) di persimpangan. Teks BM (contohnya "Jalan Mawar 3", "Lorong Cempaka") melalui `CanvasTexture` pada satah kecil di hadapan papan.
   - Tidak pejal, dan TIDAK ditambah ke `worldColliders` (termasuk tiang). Kontrak 007 mengira collider dengan tepat: `cameraObstacles + warehouseColliders + placement pejal < 2 m`.
4. **Render:**
   - komponen baharu `src/components/3d/CityBlocks.tsx` dan `StreetProps.tsx`, dirender dalam `GameScene3D.tsx` dalam `<Suspense>`;
   - corak sama seperti `Buildings.tsx`: `useMergedModels`, satu `instancedMesh` setiap model, `fitMatrix`, `computeBoundingSphere()`;
   - **bayang:** hanya bangunan yang `castShadow`; prop kecil tidak.
5. **Perlanggaran dan kamera:**
   - `cameraObstacles()` menambah kotak untuk setiap placement pejal dengan `h ≥ 2`, DILAMPIRKAN SELEPAS kotak rumah alamat. Kontrak bergantung pada susunan ini;
   - `worldColliders()` menambah segi empat untuk SETIAP placement pejal (termasuk pagar dan kereta);
   - kamera lutsinar Pelan 019 mesti berfungsi dengan halangan baharu.
6. **Gudang:** gantikan kotak kelabu dalam `src/warehouse/WarehouseBuilding.tsx` dengan rupa gudang pos.
   - Dinding zink beralur: `CanvasTexture` jalur menegak atau `low-detail-building-wide-*` sebagai cangkang.
   - Pintu gulung (*roller shutter*) di bahagian muat, dan papan tanda "PUSAT POS KURIR" (`CanvasTexture`, huruf tebal, latar putih, aksen jingga `#f59e0b`).
   - `construction-cone` dan `box` (car-kit) di laman, serta van `delivery` diparkir.
   - Dimensi dan `warehouseColliders()` TIDAK berubah, supaya kontrak gudang tetap lulus.
7. **Bajet prestasi:**
   - kekalkan bajet render sedia ada: draw call desktop ≤ 110, Pixel 7 ≤ 80;
   - untuk bangunan > 60 m dari pemain, guna `low-detail-building-*` jika draw call atau segi tiga melepasi bajet;
   - laporkan `renderInfo()` di mula, gudang dan alamat.
8. **Dokumen:** CHANGELOG, DEVELOPMENT_STATUS, `THIRD_PARTY_NOTICES.md` (Kenney CC0, kit yang sama).

## Tangkapan skrin wajib — `.playwright-mcp/plan-023/`

Kamera dan kedudukan mesti sama dengan tangkapan 016, supaya boleh dibandingkan sebelum dan selepas:
- `mula.png`: lokasi mula, pandangan ke jalan;
- `alamat.png`: Kedai Runcit Mak Minah, dengan jiran, pagar dan laluan kereta kelihatan;
- `kedai.png`: deretan kedai berkanopi;
- `gudang.png`: gudang baharu dari jalan;
- `atas.png`: pandangan atas sudut 45° kawasan 3 × 3 blok.

## Luar skop

Watak (021/022), malam dan hujan (024), trafik NPC, peta mini (kecuali jika pagar/bangunan perlu dilukis; tidak wajib).

## Gate

tsc, biome src/ (kod keluar 0), vitest, knip tanpa baris baharu, playwright, bajet render.

## STOP

- Kontrak tidak boleh dipenuhi kerana geometri (contohnya blok terlalu kecil untuk 3 bangunan bersama koridor): laporkan blok dan ukuran.
- Bajet draw call gagal walaupun dengan model low-detail: laporkan angka.
