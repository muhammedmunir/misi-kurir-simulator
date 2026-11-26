# Pelan 015 — Kereta trafik GLB (Kenney Car Kit)

Pelaksana: **C9**. Perancang/penyemak: Claude. SATU commit.

## Kontrak (mesti lulus, jangan sunting)

- `src/__contract__/015-kereta-glb.test.ts` (7 ujian), baharu.
- Semua kontrak dan ujian sedia ada mesti kekal lulus, termasuk `014-trafik` dan E2E `render-budget`.

## Matlamat

Kereta trafik kini kotak berwarna (6 instancedMesh: badan, kabin, cermin, roda, lampu depan, lampu belakang). Gantikannya dengan model GLB Kenney Car Kit (CC0) yang sudah ada dalam repo: `public/models/car-kit/` (sedan, taxi, van, suv, hatchback-sports, delivery, police).

## Spesifikasi

### 1. Fail baharu `src/components/3d/car-models.ts` (data tulen)

```ts
export const CAR_MODELS = [
  "/models/car-kit/sedan.glb",
  "/models/car-kit/taxi.glb",
  "/models/car-kit/van.glb",
  "/models/car-kit/suv.glb",
  "/models/car-kit/hatchback-sports.glb",
  "/models/car-kit/delivery.glb",
] as const; // JANGAN masukkan police

/** Indeks model untuk kereta NPC ke-i. */
export function carModelFor(npcIndex: number): number; // = npcIndex % CAR_MODELS.length
```

### 2. `src/components/3d/NPCTraffic.tsx`

Contohi corak dalam `src/components/3d/CityRoads.tsx`:
- `const models = useMergedModels(CAR_MODELS)` (dari `./merged-model`). Setiap model sudah digabung menjadi satu geometri dengan bahan `colormap`.
- Satu `<instancedMesh>` bagi setiap model: `args={[m.geometry, m.material, bilanganKeretaJenisIni]}` dan `frustumCulled={false}`. Kereta NPC ke-i memakai model `carModelFor(i)`.
- Dalam `useFrame`, setiap kereta: `fitMatrix(m.box, { x, z, w: 1.6, h: tinggi, d: 3.0, rotY: npc.heading })`, kemudian `setMatrixAt(slot, matriks)` dan `instanceMatrix.needsUpdate = true`.
  - `tinggi` = tinggi kotak model × (3.0 / panjang kotak model), supaya kadar asal kereta kekal.
  - Panjang 3.0 dan lebar 1.6 = kotak collision dalam `liveTrafficRects()`. Jangan ubah fail itu.
  - Model Kenney menghadap +z. Jika kereta kelihatan berjalan mengundur, tambah `Math.PI` pada `rotY` dan catat dalam komen.
- **KEKALKAN TANPA UBAH:**
  - panggilan `updateNPCTraffic(dataRef.current, Math.min(delta, 0.05), { player: playerState.getPosition() })`;
  - `setLiveTraffic(updated)`;
  - `userData={{ noCastShadow: true }}` pada kumpulan induk.
- Bungkus kumpulan dalam `<Suspense fallback={null}>` (di `NPCTraffic` sendiri atau di `GameScene3D.tsx`), kerana `useMergedModels` menggantung semasa memuat.
- Buang semua mesh kotak lama (`boxGeometry`/`cylinderGeometry`) dan pemalar bahagian kereta lama.

### 3. Dokumen

- `THIRD_PARTY_NOTICES.md`: baris Car Kit sudah wujud. Tukar teks "(Pelan 012b, sedang dipasang)" kepada "kereta trafik (Pelan 015)" untuk baris itu sahaja.
- `CHANGELOG.md`: satu baris di bawah "### Ditambah": kereta trafik kini model 3D Kenney (6 jenis).

## Luar skop

Logik trafik (`npc-traffic.ts`), bangunan, watak, kamera dan motor.

## Gate

`npx tsc --noEmit`, `npx biome check src/` (semak kod keluar 0; JANGAN `| tail -1`), `npx vitest run`, knip (`npx -y knip@6.44.1 --no-progress --include files,exports,dependencies`, tiada baris baharu berbanding baseline), `npx playwright test` (semua lulus, termasuk render-budget).

## Nota perancang

- Kontrak gagal dahulu (`car-models` tidak wujud). Pelaksanaan rujukan tidak dibuat untuk pelan ini kerana bajet token perancang. Coraknya sama dengan `CityRoads.tsx`, yang sudah lulus semua gate.
- Draw call dijangka turun atau sama (6 jenis = 6 instancedMesh, sama dengan sekarang).
