# Pelan 005 Langkah 8 — E2E Playwright + pembaikan B15/B16

**Pelaksana:** C9 · **Penyemak:** Claude · **Satu commit**
**Induk:** `plans/005-vertical-slice-mobile.md` Langkah 8 · master prompt seksyen Q (vertical slice diuji di pelayar telefon) dan R (QA)
**Bermula dari:** `master` selepas commit kontrak Langkah 8 (working tree bersih)

## Matlamat

1. **API ujian dev** `window.__mks`:
   - wujud hanya dalam `vite dev` (`import.meta.env.DEV`), **tidak** dalam `dist/`
   - `state()`: membaca keadaan permainan
   - `goTo(zoneId)`: teleport berjalan kaki ke zon, menggantikan pemanduan masa nyata
2. **E2E Playwright** untuk vertical slice penuh pada dua projek: **Desktop Chrome** (kekunci E) dan **Pixel 7** (butang sentuh). Gagal jika ada `console.error` atau `pageerror`.
3. **Baiki dua pepijat sebenar** yang ditemui oleh E2E semasa perancangan (lihat `BUG_TRACKER.md`):
   - **B15:** panel serah terima dan panel ringkasan tidak boleh diklik (HUD `pointerEvents: "none"`)
   - **B16:** autosave selepas serahan menyimpan wang lama (`set` sebelum `addMoney`)

## 1. Kontrak (sudah ditulis, JANGAN sunting; kedua-duanya dilindungi hook)

- `src/__contract__/005-langkah-8-test-api.test.tsx` — 12 ujian vitest. Sekarang gagal kerana `@/dev/test-api` belum wujud, dan juga B15/B16.
- `tests/contract/e2e/vertical-slice.spec.ts` — spec E2E. Aliran:
  1. permainan baharu → meja gudang → imbas & muat 2 paket → berangkat
  2. paket 1: serah, atau "Penerima tiada" jika alamat tanpa penerima
  3. **muat semula halaman → Teruskan**, kemudian sahkan wang dan status paket
  4. paket 2: Penerima tiada
  5. kembali ke gudang → PULANGKAN PAKET → ringkasan → Manifest baharu

Kedua-duanya telah disahkan lulus dengan pelaksanaan rujukan (355 ujian unit; E2E 2/2 lulus dalam ~29 s), kemudian rujukan dibuang. **Spec E2E sudah betul. Jika ia gagal, punca ada dalam kod produksi atau konfigurasi Playwright, bukan dalam spec.**

## 2. Apa yang dibina, dan SIAPA memanggilnya

### `src/dev/test-api.ts` (baharu)

```ts
export interface MksState {
  scene: string;              // useSceneStore.currentScene
  phase: string;              // session.phase
  money: number | null;       // player?.money ?? null
  onFoot: boolean;            // getWorldState().onFoot
  nearbyZoneId: string | null;
  actionLabel: string;        // getActionButton(getInteractButtonInfo(session, Date.now()),
                              //   { onFoot, nearMotor: playerState.isNearMotor(), speed: playerState.getSpeed() }).label
  cargo: { id: string; status: string; target: string }[];  // target = session.targets[id]
  summary: ManifestSummary | null;
}
export interface MksTestApi { state(): MksState; goTo(zoneId: string): void }
declare global { interface Window { __mks?: MksTestApi } }
export function createTestApi(): MksTestApi
```

- `state()` memulangkan **data biasa baharu** setiap kali (boleh `JSON.stringify` tanpa kehilangan).
- `goTo(zoneId)`:
  - cari dalam `useDeliveryStore.getState().zones`
  - tiada → `throw new Error(\`Zon tidak wujud: ${zoneId}\`)`
  - ada → `restoreWorld({ pos: zone.position, onFoot: true, motor: getWorldState().motor })`, iaitu berjalan kaki dengan motor tidak berubah

**Pemanggil:** `src/main.tsx`, selepas `createRoot(...).render(...)`:
```ts
if (import.meta.env.DEV) {
  import("./dev/test-api").then((m) => {
    window.__mks = m.createTestApi();
  });
}
```
Import **dinamik** sahaja. Kontrak menolak import statik.

### B15 — `src/delivery/HandoverPanel.tsx` dan `src/delivery/ManifestSummaryPanel.tsx`
- Tambah `style={{ pointerEvents: "auto" }}` pada `<dialog>` dalam kedua-dua fail. Jika `<dialog>` sudah ada `style`, gabungkan.
- Jangan ubah `HUD.tsx`, kerana `pointerEvents: "none"` di HUD sengaja supaya kanvas menerima input.

### B16 — `src/store/delivery.ts` `confirmHandover`
- Panggil `addMoney` / `addXP` **sebelum** `set({ session })`. Tiada perubahan lain.

### Playwright
- `npm i -D @playwright/test@^1.56` (versi 1.x terkini). **Jangan** jalankan `npx playwright install`: kedua-dua projek guna Chrome yang sudah dipasang (`channel: "chrome"`).
- `playwright.config.ts` (akar repo):
  - `testDir: "tests/contract/e2e"`, `timeout: 90_000`, `use.baseURL: "http://localhost:5180"`
  - `webServer: { command: "npx vite --port 5180 --strictPort", url: "http://localhost:5180", reuseExistingServer: false, timeout: 60_000 }`
  - `projects`:
    - `{ name: "desktop-chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }`
    - `{ name: "pixel-7", use: { ...devices["Pixel 7"], channel: "chrome" } }`
- `package.json` `scripts`: `"test:e2e": "playwright test"`.
- `.gitignore`: tambah `test-results/` dan `playwright-report/`.

## 3. Fail yang boleh disentuh

`src/dev/test-api.ts` (baharu), `src/main.tsx`, `src/delivery/HandoverPanel.tsx` (`style` dialog sahaja), `src/delivery/ManifestSummaryPanel.tsx` (`style` dialog sahaja), `src/store/delivery.ts` (`confirmHandover` sahaja), `playwright.config.ts` (baharu), `package.json`, `package-lock.json`, `.gitignore`, `BUG_TRACKER.md` (status B15/B16 → SELESAI dengan hash commit).

**Di luar skop:**
- `src/__contract__/`, `tests/contract/`, `src/test/`
- `biome.json`, `vitest.config.ts`, `tsconfig.json`
- B14
- dokumen lain (Langkah 9)

## 4. Verify

```
npx tsc --noEmit                      → tiada output
npx biome check src/                  → 0 ralat
npx vitest run                        → 0 gagal (jumlah ≥ 355)
npx -y knip@6.44.1 --no-progress --include files,exports,dependencies
                                      → tiada baris baharu berbanding baseline
npm run test:e2e                      → "2 passed" (desktop-chrome, pixel-7)
npm run build                         → berjaya
grep -l "__mks\|createTestApi" dist/assets/*.js
                                      → TIADA output (API dev tidak dibundel)
git status --short                    → kosong selepas commit (test-results/ diabaikan)
git log --oneline -2                  → SATU commit anda di atas commit kontrak
```

Jika `npm run test:e2e` gagal kerana Chrome tidak dijumpai: berhenti dan lapor output itu. Jangan tukar kepada `npx playwright install`.

## 5. Commit

**Satu** commit, jangan push. **Jangan** `reset`, `rebase`, `--amend` atau `stash`, dan jangan ubah `git config`.
```
005 Langkah 8: E2E Playwright (desktop + Pixel 7), API ujian dev, baiki B15 B16
```
Badan commit mesti mengandungi:
- baris `Tests …` vitest verbatim
- baris akhir Playwright verbatim (`2 passed (…)`)
- output `grep` dist (kosong)

## 6. STOP

Berhenti dan lapor sebaik sahaja commit dibuat. Juga berhenti tanpa commit jika:
- mana-mana kontrak (vitest atau E2E) tidak boleh lulus tanpa menyunting `src/__contract__/` atau `tests/contract/`;
- ujian sedia ada gagal;
- Chrome tidak dijumpai;
- gate gagal kerana line ending. Laporkan; jangan ubah konfigurasi.

**Laporan:**
- untuk setiap fail dalam seksyen 2, baris diff sebagai bukti
- `git show --stat HEAD` dan `git status --short`
- baris `Tests …` dan baris Playwright verbatim
- output knip dan output grep dist
- senarai perkara yang tidak dibuat
