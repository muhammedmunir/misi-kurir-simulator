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
