# Pelan 005 Langkah 4 — Navigasi ke tujuan

**Pelaksana:** C9 · **Penyemak:** Claude · **Satu commit**
**Induk:** `plans/005-vertical-slice-mobile.md` Langkah 4 · master prompt seksyen H.4 ("navigasi menunjukkan tujuan, jarak, dan arahan") dan N (HUD: tujuan, jarak)
**Bermula dari:** `master` selepas commit kontrak (working tree bersih)

## Matlamat

Pemain sentiasa tahu ke mana hendak pergi:
- Sebelum ada paket: ke **meja gudang**.
- Semasa menghantar: ke **alamat paket seterusnya**.

HUD menunjukkan anak panah yang berputar mengikut arah sasaran berbanding arah pemain menghadap, nama sasaran, dan jarak.

## 1. Ujian kontrak (sudah ditulis, JANGAN sunting)

`src/__contract__/005-langkah-4-navigasi.test.tsx` — 16 ujian. Sekarang gagal kerana `@/navigation/nav` dan `@/navigation/NavArrow` belum wujud. Pelan ini siap bila semuanya lulus.

Konvensyen paksi (ikut kontrak):
- `heading` h → arah hadapan `(sin h, cos h)` pada `(x, z)`.
- `turn` = sudut belok, positif = **kanan** (ikut jam), dalam julat `(-π, π]`.
- Rumus: `turn = normalize(heading − atan2(dx, dz))`.
- Jika jarak 0, pulangkan `{ distance: 0, turn: 0 }`.

## 2. Apa yang dibina, dan SIAPA memanggilnya

| Baharu | Fail | Dipanggil oleh (tepat) |
|---|---|---|
| `navTo(from, heading, to): { distance: number; turn: number }` | `src/navigation/nav.ts` | `NavArrow` dalam `src/navigation/NavArrow.tsx` |
| `formatDistance(m: number): string` — `"43 m"`, `"2.3 km"` | `src/navigation/nav.ts` | `NavArrow` |
| `currentNavTarget(session: DeliverySession): DeliveryZone \| null` | `src/navigation/nav.ts` | `NavArrow` |
| `NavArrow()` komponen React (DOM, bukan R3F) | `src/navigation/NavArrow.tsx` | `GameScene3D` dalam `src/components/GameScene3D.tsx` — satu baris `<NavArrow />` terus selepas `<WarehousePanel />` (di luar `<Canvas>`) |

Peraturan `currentNavTarget`:
- `phase === "complete"` → `null`
- `phase === "delivering"` → `nextTargetZone(session)` (fungsi sedia ada dalam `src/lib/delivery-system.ts`, guna semula, jangan salin)
- `idle` / `loading` → zon `type === "pickup"` dari `DELIVERY_ZONES`

Peraturan `NavArrow`:
- **Sumber data:**
  - Kedudukan dan arah pemain: `playerState.getPosition()` dan `playerState.getHeading()` dari `src/components/3d/PlayerController.tsx`.
  - Sesi: `useDeliveryStore` (`src/store/delivery.ts`).
- **Render pertama** mesti terus memaparkan nama sasaran dan jarak. Kira nilai awal secara segerak, contohnya `useState(() => read())`. Kontrak menyemak perkara ini.
- **Kemas kini** ~10 Hz dengan `setInterval(…, 100)` dan `clearInterval` semasa unmount (sama seperti `readActionButton` dalam `TouchJoystick.tsx`).
  - Panggil `setState` hanya jika nilai yang dipaparkan berubah: jarak bulat, nama, atau turn berubah > 0.05 rad.
  - **Jangan** set state dalam `useFrame` atau setiap frame.
- **Elemen anak panah** mesti ada atribut `data-nav-arrow` dan `style.transform = rotate(<turn>rad)`.
- **Tiada sasaran** → `return null`.
- **Panel gudang dibuka** (`session.panelOpen`) → sembunyikan (`return null`) supaya tidak bertindih dengan panel.
- **Kedudukan dan gaya:**
  - Atas tengah, di bawah bar HUD atas (`top: calc(64px + env(safe-area-inset-top))`), `pointer-events: none`.
  - Gaya dalam `src/index.css` dengan kelas berawalan `.nav-`, guna token sedia ada: `--color-surface`, `--color-text`, `--color-primary` untuk anak panah.
  - Teks ≥ 14px, dan kontras teks/latar ≥ 4.5:1.
  - Tiada kecerunan, dan tiada emoji pada anak panah. Gunakan SVG segi tiga atau chevron.

Penanda 3D di lokasi tujuan **sudah wujud**: `DeliveryZones.tsx` menyerlahkan zon aktif dengan sfera beacon. Jangan tambah penanda baharu.

## 3. Fail

**Boleh disentuh:**
- `src/navigation/nav.ts` (baharu)
- `src/navigation/NavArrow.tsx` (baharu)
- `src/components/GameScene3D.tsx` (hanya import + satu baris `<NavArrow />`)
- `src/index.css` (tambah gaya `.nav-*` di hujung fail)
- `DEVELOPMENT_STATUS.md` (baris "Navigasi / minimap" dalam Phase 2: tulis "Anak panah: Tested", minimap kekal Not started)

**Luar skop (jangan ubah):**
- `PlayerController.tsx`, `CameraFollow.tsx`, `TouchJoystick.tsx`
- `src/lib/delivery-system.ts`, `src/store/*`, `src/vehicles/*`, `src/warehouse/*`
- `src/__contract__/*`, ujian sedia ada
- `package.json` (tiada pakej baharu)
- Minimap

## 4. Verify (jalankan semua, salin output)

```
npx tsc --noEmit                  → tiada output
npx biome check src/              → "Checked N files ... No fixes applied." tanpa ralat
npx vitest run                    → semua lulus; termasuk 16 ujian dalam src/__contract__/005-langkah-4-navigasi.test.tsx
npx -y knip@6.44.1 --no-progress --include files,exports,dependencies
                                  → senarai SAMA dengan baseline (tiada export/fail baharu)
npm run build                     → "✓ built in …"
```

**Ujian pelayar (Playwright MCP, localhost):**
1. `npx vite --port 5179 --strictPort`, kemudian buka `http://localhost:5179/?touch=1`
2. Klik "Permainan Baru" → isi nama "Ujian" → "Mula Misi"
3. Jangkaan: panel navigasi menunjukkan `Gudang Pejabat Pos Pusat` dan jarak sekitar `29 m` (pemain di (0,0), meja di (20,21)).
4. Alihkan pemain dalam konsol halaman:
   ```js
   const pc = await import('/src/components/3d/PlayerController.tsx');
   pc.playerState.getPosition().set(20, 1.6, 15);
   ```
   Tunggu 1 s. Jangkaan: jarak sekitar `6 m`.
5. Ketik butang `BUKA GUDANG`. Jangkaan: panel navigasi **hilang** semasa panel gudang terbuka.
6. Imbas → Muat satu paket → Berangkat. Jangkaan: navigasi menunjukkan nama alamat paket itu (contoh `Kedai Runcit Mak Minah`), bukan gudang.
7. Ambil tangkapan skrin langkah 3 dan 6. Semak konsol: tiada ralat.

## 5. Commit

Satu commit, jangan push:
```
005 Langkah 4: navigasi ke tujuan
```
Badan commit: senarai fail, baris ringkasan vitest (verbatim), dan "Pelayar: disahkan (Playwright MCP)" ATAU "belum diuji di pelayar — <sebab>".

## 6. STOP

Berhenti dan lapor sebaik sahaja commit dibuat. Juga berhenti tanpa commit jika:
- kontrak tidak boleh lulus tanpa menyunting `src/__contract__/` — laporkan ujian mana dan kenapa;
- kerja memerlukan perubahan pada fail luar skop — laporkan fail itu dan sebabnya;
- knip melaporkan export/fail baharu tidak dipanggil — sambungkan mengikut jadual seksyen 2, jangan tambah ke baseline.

**Laporan mesti mengandungi:**
- `git show --stat HEAD`
- Baris `Tests …` verbatim dari vitest
- Output knip (atau "sama dengan baseline")
- Laluan tangkapan skrin
- Senarai perkara yang tidak dibuat
