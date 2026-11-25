# Pelan 005 Langkah 11 — Prestasi telefon

**Matlamat:** Redmi 9 (Mali-G52) daripada ~27–34 FPS ke **≥ 45 FPS landskap / ≥ 40 FPS potret** dalam permainan, diukur oleh Claude di telefon sebenar.

## Ukuran yang menjadi asas pelan (Claude, 2026-11-25)

Redmi 9, Chrome 158, landskap 823×309, build dev, kedudukan mula + meja gudang, 2 × 5 s setiap varian. Setiap varian ialah suntingan sementara yang dibuang selepas ukuran.

| Varian | FPS | Draw call | Segi tiga |
|--------|-----|-----------|-----------|
| A. Asas (Bloom aktif) | 33–34 | (laluan composer) | — |
| B. Tanpa Bloom | 37–39 | 299 | 7 201 |
| C. Tanpa Bloom, `dpr` 1 | 39–40 | 299 | 7 201 |
| D. Tanpa Bloom, tanpa `<Physics>` | 38–39 | — | — |

**Kesimpulan:**
- Bloom ialah satu-satunya kos kesan visual yang besar (~5 FPS).
- Resolusi (`dpr`) dan Rapier masing-masing ~1 FPS, jadi biarkan.
- **~300 draw call untuk hanya ~7 200 segi tiga**: telefon terhad oleh bilangan objek, bukan geometri. Setiap tingkap, garisan jalan dan tiang lampu ialah mesh dengan geometri dan bahan sendiri (`Buildings.tsx`, `Roads.tsx`).
- Belum diukur: `pointLight` di zon penghantaran (`DeliveryZones.tsx`). Bilangan lampu berubah apabila sasaran berubah, dan itu boleh mencetuskan kompil semula shader. Ini calon untuk lonjakan 67–100 ms yang dilihat semasa panel dibuka. Claude akan mengukurnya selepas 11a.

| Langkah | Pelaksana | Isi |
|---------|-----------|-----|
| **11a** | C9 | Buang Bloom; dedahkan kiraan draw call kepada E2E (`__mks.renderInfo()`) |
| **11b** | C9 (pelan ditulis selepas 11a) | Instancing: tingkap, bangunan, pintu, garisan jalan, lampu jalan; bajet draw call dalam E2E |
| **11c** | Claude | Ukur semula di Redmi 9, termasuk build produksi; rekod dalam `QA_REPORT.md` |

---

## 11a — C9

**Pelaksana:** C9 · **Penyemak:** Claude · **Satu commit**
**Bermula dari:** `master` selepas commit kontrak 11a (working tree bersih)

### 1. Ujian kontrak (sudah ditulis, JANGAN sunting)

| Fail | Apa yang disemak |
|------|------------------|
| `src/__contract__/005-langkah-11a-prestasi.test.ts` | 8 ujian; gagal sekarang (`@/dev/render-info` belum wujud) |
| `tests/contract/e2e/render-info.spec.ts` | `renderInfo()` > 0 di kedudukan mula dan di meja gudang, kedua-dua projek |

Kedua-duanya telah disahkan dengan pelaksanaan rujukan (Vitest 391 lulus; Playwright 5 passed + 1 skipped; knip tiada baris baharu), kemudian dibuang. Nilai rujukan: desktop-chrome 265/215 draw call, pixel-7 145/103.

### 2. Perubahan tepat

#### `src/dev/render-info.tsx` (baharu)
```ts
type InfoSource = { info: { render: { calls: number; triangles: number } } };
export function registerRenderer(r: InfoSource | null): void
export function readRenderInfo(): { calls: number; triangles: number } | null
export function RenderInfoProbe(): null
```
- `registerRenderer` menyimpan **rujukan** kepada objek renderer, bukan salinan nilai.
- `readRenderInfo` membaca `info.render.calls` dan `info.render.triangles` **pada masa dipanggil**; `null` jika tiada renderer.
- `RenderInfoProbe`: `const gl = useThree((s) => s.gl)`; dalam `useEffect(..., [gl])` panggil `registerRenderer(gl)` dan pulangkan cleanup `() => registerRenderer(null)`. Pulangkan `null`.

#### `src/components/GameScene3D.tsx`
- Buang `import { Bloom, EffectComposer } from "@react-three/postprocessing";` dan blok `{/* Post-processing */} <EffectComposer …>…</EffectComposer>`.
- Import `RenderInfoProbe` dari `"@/dev/render-info"`.
- Di dalam `<Canvas>`, di tempat blok EffectComposer tadi: `{import.meta.env.DEV && <RenderInfoProbe />}` (bentuk tepat ini disemak oleh kontrak).
- Jangan ubah `shadows={false}`, `dpr={[1, 1.5]}`, `<Physics>` atau lampu.

#### `src/dev/test-api.ts`
- `MksTestApi`: tambah `renderInfo(): { calls: number; triangles: number } | null;`
- `createTestApi()`: `renderInfo() { return readRenderInfo(); }` (import dari `"./render-info"`).

#### Kebergantungan
- `npm uninstall @react-three/postprocessing`. Ini mengemas kini `package.json` **dan** `package-lock.json`; commit kedua-duanya.

**Pemanggil:** `RenderInfoProbe` ← `GameScene3D.tsx`; `readRenderInfo` ← `test-api.ts`; `registerRenderer` ← `RenderInfoProbe`.

### 3. Fail yang boleh disentuh

- `src/dev/render-info.tsx` (baharu)
- `src/components/GameScene3D.tsx`
- `src/dev/test-api.ts`
- `package.json`, `package-lock.json` (melalui `npm uninstall` sahaja)

**Luar skop:** semua fail lain, termasuk dokumen (`THIRD_PARTY_NOTICES.md` dikemas kini oleh Claude selepas semakan), `src/__contract__/`, `tests/`, `playwright.config.ts`, komponen 3D lain (instancing ialah 11b).

### 4. Verify

```
npx tsc --noEmit                         # tiada output
npx biome check src/                     # No fixes applied
npx vitest run                           # Tests  391 passed (391)
npx -y knip@6.44.1 --no-progress --include files,exports,dependencies   # tiada baris baharu vs baseline
npm run test:e2e                         # 5 passed, 1 skipped
grep -c postprocessing package.json package-lock.json   # 0 dan 0
npm run build                            # berjaya
grep -l "renderInfo\|RenderInfoProbe" dist/assets/*.js  # tiada padanan (dev sahaja)
git status --short                       # kosong selepas commit
```

Laporkan baris `[render-info desktop-chrome]` dan `[render-info pixel-7]` daripada output E2E.

### 5. Commit

SATU commit. Mesej (tanpa `@`; BUKAN here-string PowerShell):
```
005 Langkah 11a: buang Bloom, renderInfo() untuk bajet draw call
```

### 6. STOP

Berhenti dan lapor jika:
- mana-mana ujian gagal selepas dua cubaan
- `npm uninstall` mengubah pakej lain selain `@react-three/postprocessing` dan kebergantungan transitifnya
- pembaikan memerlukan fail di luar §3

Larangan: jangan sunting kontrak/E2E, jangan ubah `git config`, jangan stash/reset/amend/rebase, jangan push, jangan tinggalkan fail untracked.

---

## 11a — Semakan (Claude)

`c21b328` diterima: diff sepadan dengan pelan; tsc, biome, Vitest 391, knip, E2E 5 passed + 1 skipped, build lulus; `renderInfo` tiada dalam `dist`. `@react-three/postprocessing` dibuang dari `package.json` dan `package-lock.json`.

---

## 11b — C9

**Pelaksana:** C9 · **Penyemak:** Claude · **Satu commit**
**Bermula dari:** `master` selepas commit kontrak 11b (working tree bersih)

### Ukuran yang menjadi asas (Claude, adegan sebenar desktop, selepas 11a)

583 mesh, 583 geometri, 583 bahan; 265–274 draw call di kedudukan mula.

| Komponen | Mesh | Pecahan |
|----------|------|---------|
| `Buildings.tsx` | 349 | 23 badan + 23 pintu + 303 tingkap |
| `Roads.tsx` | 78 | 14 jalan + 40 garisan + 12 tiang + 12 lampu |
| NPC trafik | 72 | 8 kenderaan × 9 (bergerak; luar skop) |
| Gudang, alamat, pemain, lain-lain | 84 | luar skop |

**Pelaksanaan rujukan** (dibuang selepas ukuran): draw call desktop **265 → 69** (mula), 223 → 39 (alamat); pixel-7 127 → 34. Segi tiga tidak berubah (~6 500–7 400). Tangkapan skrin sebelum/selepas di kedudukan mula dan alamat: sama, kecuali kedudukan kereta NPC.

### 1. Ujian kontrak (sudah ditulis, JANGAN sunting)

| Fail | Apa yang disemak |
|------|------------------|
| `src/__contract__/005-langkah-11b-instancing.test.ts` | 11 ujian. Susun atur bandar sama tepat seperti sebelum 11b (23 bangunan, jumlah kedudukan/saiz, warna ikut turutan, 303 tingkap, 14 jalan, 40 garisan, 12 lampu); `Buildings.tsx` 3 `instancedMesh`, `Roads.tsx` 4 `instancedMesh` |
| `tests/contract/e2e/render-budget.spec.ts` | Draw call ≤ 110 (desktop-chrome) / ≤ 80 (pixel-7) di mula, gudang dan alamat; segi tiga > 4 000 |

Disahkan dengan pelaksanaan rujukan: Vitest 402 lulus; Playwright 7 passed + 1 skipped; knip tiada baris baharu.

### 2. Perubahan tepat

#### `src/components/3d/city-layout.ts` (baharu) — fungsi tulen, tiada React/three
- `buildingLayout(): BuildingLot[]` — **pindahkan algoritma sedia ada dari `Buildings.tsx` tanpa mengubahnya**: seed 42, `pseudoRandom` yang sama, turutan panggilan `pseudoRandom()` yang sama, `RESERVED_LOTS` dan `BUILDING_COLORS` yang sama. Kontrak menyemak hasilnya hingga 9 tempat perpuluhan.
  `BuildingLot = { x, y, z, width, height, depth, color, floors }`.
- `windowPositions(b): [x, y, z][]` — koordinat **dunia**: untuk `floor` 0..min(floors, 5)−1 (luar), `wi` 0..2 (dalam): `[b.x − b.width/3 + wi·b.width/4, b.y − b.height/2 + 2 + floor·3, b.z + b.depth/2 + 0.05]`.
- `doorPosition(b): [x, y, z]` — `[b.x, b.y − b.height/2 + 1.5, b.z + b.depth/2 + 0.05]`.
- `roadLayout(): { x, z, rotY, w, d }[]` — senarai sedia ada dari `Roads.tsx` (14).
- `roadMarkingPositions(): [x, y, z][]` — 40 × `[0, 0.08, (i − 20)·10]`.
- `streetLightPositions(): { x, z }[]` — 12 × `{ x: 8, z: (i − 6)·30 }`.
- Jangan eksport jenis/pemalar yang tidak digunakan di fail lain (knip).

#### `src/components/3d/Buildings.tsx` — tulis semula
- Data: `useMemo(buildingLayout, [])`; tingkap `bs.flatMap(windowPositions)`.
- Tepat **3** `<instancedMesh ref args={[undefined, undefined, count]}>`:
  1. badan: `<boxGeometry args={[1, 1, 1]} />`, skala setiap instance `[width, height, depth]`, warna melalui `setColorAt` (bahan `meshStandardMaterial roughness={0.8}` tanpa `color`, supaya warna instance tidak didarab)
  2. tingkap: `<planeGeometry args={[1.2, 1.5]} />`, bahan sama seperti sekarang (`#87ceeb`, emissive `#334455`, 0.3)
  3. pintu: `<planeGeometry args={[1.5, 3]} />`, `#8B4513`
- Isi matriks dalam `useLayoutEffect`: `Object3D` sementara → `updateMatrix()` → `setMatrixAt`; kemudian `instanceMatrix.needsUpdate = true`, `instanceColor.needsUpdate = true` (jika ada), dan **`computeBoundingSphere()`**. Tanpa langkah terakhir ini, frustum culling guna sfera lama dan objek boleh hilang dari skrin.
- Tiada `Array.from`, tiada `pseudoRandom` dalam fail ini.

#### `src/components/3d/Roads.tsx` — tulis semula
- Tepat **4** `<instancedMesh>`:
  1. jalan: `<planeGeometry args={[1, 1]} />`; setiap instance: kedudukan `[x, 0.05, z]`, putaran `[−π/2, rotY, 0]`, skala `[w, d, 1]`; `#2a2a2a`, roughness 0.95
  2. garisan: `<planeGeometry args={[0.3, 4]} />`, putaran `[−π/2, 0, 0]`, `#ffffff`
  3. tiang: `<cylinderGeometry args={[0.1, 0.15, 8, 8]} />` di `[x, 4, z]`, `#555555`, metalness 0.5
  4. lampu: `<boxGeometry args={[1, 0.3, 0.5]} />` di `[x + 0.5, 8, z]`, `#f59e0b`, emissive `#f59e0b` 0.5
- Isi matriks seperti di atas, termasuk `computeBoundingSphere()`.

**Pemanggil:** `city-layout` ← `Buildings.tsx`, `Roads.tsx`. `Buildings`/`Roads` tetap dirender oleh `WorldEnvironment.tsx` (tidak berubah).

### 3. Fail yang boleh disentuh

- `src/components/3d/city-layout.ts` (baharu)
- `src/components/3d/Buildings.tsx`
- `src/components/3d/Roads.tsx`

**Luar skop:** NPC trafik, gudang, alamat, `WorldEnvironment.tsx`, lampu titik, dokumen, `src/__contract__/`, `tests/`.

### 4. Verify

```
npx tsc --noEmit                         # tiada output
npx biome check src/                     # No fixes applied
npx vitest run                           # Tests  402 passed (402)
npx -y knip@6.44.1 --no-progress --include files,exports,dependencies   # tiada baris baharu vs baseline
npm run test:e2e                         # 7 passed, 1 skipped
git status --short                       # kosong selepas commit
```

Laporkan baris `[render-budget desktop-chrome]` dan `[render-budget pixel-7]`. Semakan pelayar (`localhost:5179`): bangunan, tingkap, pintu, jalan, garisan dan lampu jalan kelihatan seperti sebelum, termasuk selepas berpusing 360° dengan motor (tiada objek hilang di tepi skrin).

### 5. Commit

SATU commit, tanpa `@`, BUKAN here-string PowerShell:
```
005 Langkah 11b: instancing bangunan & jalan (draw call 265 → ~70)
```

### 6. STOP

Berhenti dan lapor jika: susun atur tidak sepadan dengan kontrak selepas dua cubaan; bajet draw call gagal; perlu menyentuh fail di luar §3.

Larangan: jangan sunting kontrak/E2E, jangan ubah `git config`, jangan stash/reset/amend/rebase, jangan push, jangan tinggalkan fail untracked.

---

## 11b — Semakan (Claude)

`2ad40f8` diterima: 3 fail dalam skop; tsc, biome, Vitest 402, knip, E2E 7 passed + 1 skipped. Bajet (larian penyemak): desktop 78/71/48, pixel-7 25/44/46 (mula/gudang/alamat). Tangkapan skrin desktop di kedudukan mula sama dengan sebelum 11b. Nit: pemboleh ubah tempatan `window` dalam `Buildings.tsx` membayangi global `window` (tidak menjejaskan fungsi).

**11c ditangguhkan** atas arahan pemilik (2026-11-26): ukur FPS Redmi 9 (dev + produksi) apabila telefon tersedia.
