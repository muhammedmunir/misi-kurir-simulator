# Pelan 005 Langkah 7a — Skema save, validasi, migrasi, simpan/muat manual

**Pelaksana:** C9 · **Penyemak:** Claude · **Satu commit**
**Induk:** `plans/005-vertical-slice-mobile.md` Langkah 7 (dipecah: **7a** = data + simpan/muat manual; **7b** = autosave + "Teruskan" di menu, pelan berasingan) · master prompt seksyen Q (vertical slice mesti ada save), seksyen O (save tidak boleh merosakkan permainan)
**Bermula dari:** `master` selepas commit kontrak 7a (working tree bersih)

## Kenapa

Butang **Simpan** sekarang tidak pernah berfungsi:
- `saveGame()` (`src/lib/idb.ts`) menulis `SaveData` tanpa medan `id`, padahal stor IDB guna `keyPath: "id"`, jadi `put` gagal secara senyap.
- `loadGame()` membaca kunci `"current"` yang tidak pernah ditulis.
- Kedudukan pemain dan motor, manifest, dan paket tidak disimpan langsung.

## 1. Ujian kontrak (sudah ditulis, JANGAN sunting)

`src/__contract__/005-langkah-7a-simpan-muat.test.ts` — 25 ujian. Sekarang gagal kerana `@/save/*` belum wujud. Kontrak ini telah disahkan boleh dipenuhi dengan pelaksanaan rujukan, kemudian dibuang.

## 2. Apa yang dibina, dan SIAPA memanggilnya

### `src/components/3d/PlayerController.tsx` (tambah sahaja)
- `export interface WorldState { pos: { x: number; z: number }; onFoot: boolean; motor: { x: number; z: number; heading: number } }`
- `export function getWorldState(): WorldState`: membaca pembolehubah modul `pos`, `onFoot` dan `motor`.
- `export function restoreWorld(w: WorldState): void`:
  - set `onFoot`, `motor.x/z/heading`
  - `motor.speed = 0`, `vel.set(0, 0, 0)`
  - `pos.set(w.pos.x, onFoot ? 1.6 : MOTOR_Y, w.pos.z)`
- Pemanggil: `save-schema.ts` (`getWorldState`), `save-game.ts` (`restoreWorld`).

### `src/save/backend.ts` (baharu)
- `export interface SaveBackend { read(): Promise<unknown>; write(data: unknown): Promise<void>; clear(): Promise<void> }`
- `idbBackend` (tidak dieksport):
  - guna `openDB()` dari `@/lib/idb`, stor `"saves"`
  - rekod `{ id: "current", data }`
  - `read()` pulangkan `data` atau `null`
  - ralat IDB mesti ditolak (`reject`), bukan ditelan
- `export const saveBackends: { current: SaveBackend } = { current: idbBackend }`: titik suntikan untuk ujian dan 7b.

### `src/save/save-schema.ts` (baharu)
- `export const SAVE_VERSION = 1`
- `PersistedSession` = `Pick<DeliverySession, "phase" | "inbound" | "cargo" | "targets" | "manifest" | "tally" | "summary" | "completedAt">`.
  - **Tidak** disimpan: `handover`, `panelOpen`, `nearbyZone`, `cooldownUntil`, mesej, `lastParking`.
- `export interface SaveV1 { version: 1; savedAt: number; player: Player; vehicles: Vehicle[]; settings: GameSettings; world: WorldState; session: PersistedSession }`
- `export function buildSave(now): SaveV1`:
  - sumber: `useGameStateStore` (player, vehicles, settings), `useDeliveryStore` (session) dan `getWorldState()`
  - salin medan `PersistedSession` **secara eksplisit**, bukan `...session`
- `export function validateSave(raw: unknown): { ok: true; save: SaveV1 } | { ok: false; error: string }`. Semak semua yang berikut; mesej ralat ringkas dalam BM:
  - objek; `version === 1`; `savedAt` nombor terhingga
  - `player`: objek; `name` string; `money` ≥ 0 terhingga; `xp` ≥ 0 terhingga
  - `world`:
    - `pos` dan `motor` mempunyai `x` dan `z` terhingga dalam julat `[-1000, 1000]`
    - `motor.heading` terhingga
    - `onFoot` boolean
  - `session.phase` ∈ `idle | loading | delivering | returning | complete`
  - `inbound` dan `cargo`: tatasusunan paket dengan `id` string dan `status` ∈ kunci `PACKET_TRANSITIONS`
  - `targets`: setiap nilai ialah `id` dalam `DELIVERY_ZONES`
  - `manifest`: `null`, atau objek dengan `packets` tatasusunan. Jika `status === "open"`, setiap `cargo[i].id` mesti ada dalam `manifest.packets`.
  - `tally.earned` dan `tally.xp` ≥ 0 terhingga
  - `vehicles` tatasusunan; `settings` objek

### `src/save/migrate.ts` (baharu)
- `export function migrate(raw: unknown): { ok: true; data: unknown } | { ok: false; error: string }`:
  - bukan objek → ralat
  - tiada `version` nombor (contohnya `SaveData` lama dengan `slots`) → `"Format save lama tidak disokong"`
  - `version > SAVE_VERSION` → mesej yang mengandungi `"lebih baharu"`
  - v1 → `{ ok: true, data: raw }` (rujukan sama)
- Migrasi v1→v2 kelak ditambah di sini.

### `src/save/save-game.ts` (baharu)
- `export async function saveNow(backend: SaveBackend, now: number): Promise<boolean>`:
  - tiada `player` → `false` tanpa menulis
  - jika tidak, `backend.write(buildSave(now))`
  - berjaya → `useDeliveryStore.getState().notify("Tersimpan", now)`, pulangkan `true`
  - `write` throw → `notify("Gagal menyimpan", now)`, pulangkan `false`
- `export async function loadSaved(backend): Promise<{ ok: true } | { ok: false; error: string }>`:
  - `read()` null/undefined → `{ ok: false, error: "Tiada simpanan" }`
  - `migrate` atau `validateSave` gagal → `error` bermula dengan `"Simpanan rosak"`. **Jangan sentuh stor** dalam laluan gagal.
  - berjaya, dalam urutan ini:
    1. `useGameStateStore.setState({ player, vehicles, settings, isNewGame: false })`
    2. `useDeliveryStore.setState({ session: { ...createSession(), ...save.session } })`
    3. `restoreWorld(save.world)`

### Sambungan UI (7a sahaja)
- `src/components/HUD.tsx` `handleSave` → ganti seluruh badan dengan `await saveNow(saveBackends.current, Date.now())`. Buang import `saveGame`.
- `src/lib/idb.ts`: **buang** `saveGame`, `loadGame` dan `clearSave` (rosak dan diganti). Kekalkan `openDB`, yang kini dipanggil oleh `backend.ts`.
- `loadSaved` belum ada pemanggil UI; itu kerja 7b.
  - Untuk elak knip melaporkan kod tidak disambung, **jangan** tambah butang muat dalam 7a.
  - `loadSaved` dipanggil oleh ujian kontrak, dan knip menganggap fail ujian sebagai titik masuk.
  - Jika knip tetap melaporkannya, tulis `KOD BELUM DISAMBUNG: loadSaved - disambung dalam 7b` dalam laporan, kemudian berhenti.

## 3. Fail yang boleh disentuh

`src/components/3d/PlayerController.tsx` (tambah eksport sahaja), `src/save/backend.ts`, `src/save/save-schema.ts`, `src/save/migrate.ts`, `src/save/save-game.ts`, `src/components/HUD.tsx` (`handleSave` + import sahaja), `src/lib/idb.ts` (buang 3 fungsi).

**Di luar skop:**
- autosave, `MainMenu` / "Teruskan", `LoadSavePanel` (7b)
- `src/__contract__/`, `src/test/`, konfigurasi, `package.json`
- jangan pasang `fake-indexeddb` atau pakej lain

## 4. Verify

```
npx tsc --noEmit                      → tiada output
npx biome check src/                  → 0 ralat
npx vitest run                        → 0 gagal (jumlah ≥ 333)
npx -y knip@6.44.1 --no-progress --include files,exports,dependencies
                                      → tiada baris baharu berbanding baseline (baris lama yang hilang tidak mengapa)
git status --short                    → kosong selepas commit (TIADA fail untracked)
git log --oneline -2                  → commit anda di atas commit kontrak 7a
```

**Pelayar** (`http://localhost:5179/?touch=1`):
1. Permainan baharu.
2. Tekan **Simpan** di HUD. Mesej "Tersimpan" muncul.
3. Dalam konsol: `await (await import('/src/save/backend.ts')).saveBackends.current.read()` mesti memulangkan objek dengan `version: 1`.
4. Tiada ralat konsol.

## 5. Commit

Satu commit, jangan push. **Jangan** `reset`, `rebase`, `--amend` atau `stash`, dan **jangan ubah `git config`**.
```
005 Langkah 7a: skema save v1, validasi, migrasi, simpan/muat manual
```
Badan commit mesti mengandungi:
- baris `Tests …` verbatim
- status pelayar

## 6. STOP

Berhenti dan lapor sebaik sahaja commit dibuat. Juga berhenti tanpa commit jika:
- kontrak tidak boleh lulus tanpa menyunting `src/__contract__/`;
- ujian sedia ada gagal;
- gate gagal kerana line ending. Laporkan output itu; **jangan** ubah konfigurasi git atau biome.

**Laporan:**
- untuk setiap fail dalam seksyen 2, baris diff sebagai bukti
- `git show --stat HEAD`
- `git status --short` (mesti kosong)
- baris `Tests …` verbatim
- output knip
- senarai perkara yang tidak dibuat
