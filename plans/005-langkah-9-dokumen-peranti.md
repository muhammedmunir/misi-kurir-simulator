# Pelan 005 Langkah 9 — Dokumen wajib & ujian peranti sebenar

**Induk:** `plans/005-vertical-slice-mobile.md` Langkah 9 · master prompt seksyen C (jangan dakwa FPS tanpa ukuran), seksyen O/T (lesen, `THIRD_PARTY_NOTICES`), seksyen S (`QA_REPORT`, `CHANGELOG`) dan seksyen Q (vertical slice diuji di pelayar telefon)

Langkah ini dipecah dua kerana sebahagiannya memerlukan telefon pemilik:

| Bahagian | Siapa | Isi |
|---|---|---|
| **9a** | C9 (satu commit) | paparan FPS dev, skrip `dev:host`, manifest BM/Malaysia, dokumen wajib, kemas kini status |
| **9b** | **Pemilik** (telefon Android) → Claude merekod | jalankan permainan di telefon, ukur FPS, lapor masalah; Claude kemas kini `QA_REPORT.md` |

---

## 9a — C9

**Pelaksana:** C9 · **Penyemak:** Claude · **Satu commit**
**Bermula dari:** `master` selepas commit kontrak 9a (working tree bersih)

### 1. Ujian kontrak (sudah ditulis, JANGAN sunting)

`src/__contract__/005-langkah-9a-dokumen-fps.test.ts` — 15 ujian. Sekarang gagal kerana `@/dev/fps` dan dokumen belum wujud. Kontrak ini telah disahkan boleh dipenuhi dengan pelaksanaan rujukan (370 ujian lulus), kemudian dibuang.

### 2. Apa yang dibina, dan SIAPA memanggilnya

#### `src/dev/fps.ts` (baharu)
- `export function createFpsMeter(windowSize = 60): { tick(nowMs: number): number }`:
  - simpan selang antara `tick` berturut-turut; tetingkap bergolek `windowSize` selang terakhir
  - pulangkan `1000 / purata selang`
  - tick pertama (belum ada selang) → `0`
- `export function shouldShowFps(isDev: boolean, search: string): boolean` → `isDev && new URLSearchParams(search).has("fps")`.

#### `src/dev/FpsOverlay.tsx` (baharu)
- Gelung `requestAnimationFrame` dalam `useEffect`, dengan `cancelAnimationFrame` semasa unmount. `tick(t)` dipanggil setiap bingkai.
- `setState` **paling kerap 2 kali sesaat**, bukan setiap bingkai.
- Papar `<output>` di penjuru kiri atas:
  - `position: fixed`, `pointerEvents: "none"`, `zIndex` di atas HUD
  - teks `"{n} FPS"` dengan `font-variant-numeric: tabular-nums`
  - latar gelap separa lutsinar; jangan tambah warna aksen baharu

**Pemanggil:** `src/components/GameScene3D.tsx`.
- Dalam badan komponen: `const showFps = shouldShowFps(import.meta.env.DEV, window.location.search);` (bentuk tepat ini disemak oleh kontrak)
- Dalam JSX, sebelum `<TouchJoystick />`: `{showFps && <FpsOverlay />}`.

#### `package.json`
- `scripts`: `"dev:host": "vite --host --port 5179"`. Ini untuk telefon di Wi-Fi yang sama.

#### `public/manifest.json`
- `description`: `"Simulator kehidupan kurir di Malaysia"` (TPD-016). Jangan ubah medan lain. Ikon yang hilang ialah B17, di luar skop.

#### `THIRD_PARTY_NOTICES.md` (baharu, akar repo)

**Jadual 1:** setiap kebergantungan terus dalam `package.json`, kedua-dua `dependencies` dan `devDependencies`.
- Lajur: Pakej (dalam \`backtick\`) | Versi terpasang | Lesen | Repositori | Kegunaan.
- **Satu baris setiap pakej. Lesen pada baris yang sama.**
- Ambil versi dan lesen daripada `node_modules/<pakej>/package.json`, bukan daripada ingatan.
- `@react-three/rapier`: pakej npm **tidak** mengisytiharkan lesen. Tulis `Tidak dinyatakan dalam pakej npm (perlu disahkan dengan upstream sebelum rilis)`. Jangan teka.

**Jadual 2:** kebergantungan transitif yang penting. Sekurang-kurangnya `@dimforge/rapier3d-compat` (enjin fizik WASM), dengan lesen `Apache-2.0`.

**Fon:** `Inter`, lesen SIL Open Font License 1.1 (OFL), dimuat dari `https://fonts.googleapis.com` dalam `index.html`. Nota privasi: pelayar pemain menghubungi Google Fonts.

**Aset:** nyatakan `Tiada model 3D, tekstur, audio atau imej pihak ketiga digunakan. Semua geometri dijana dalam kod (TPD-013).`

#### `CHANGELOG.md` (baharu)
- Format Keep a Changelog, bahagian `## [0.1.0-alpha] — Belum dikeluarkan`.
- Subbahagian `Ditambah` / `Diubah` / `Dibaiki`, dibina daripada `git log --oneline` dan `plans/004*`, `plans/005*`. Mesti merangkumi:
  - gudang 3D
  - navigasi
  - **Serah terima** (bukti, penerima tiada)
  - **Ringkasan manifest**
  - **Simpan**/muat dan autosave
  - **E2E** Playwright
  - pembaikan **B15** dan **B16** (rujuk `BUG_TRACKER.md`)

#### `QA_REPORT.md` (baharu)

Bahagian bertajuk (`##`), dengan nama yang mengandungi perkataan berikut:
1. **Peranti & Pelayar:**
   - jadual ujian automatik: vitest dalam Node + jsdom; Playwright `desktop-chrome`, `pixel-7` (emulasi) dengan Chrome terpasang
   - baris **Telefon Android sebenar: BELUM DIUJI** (9b)
2. **Senario:** senarai langkah spec E2E `tests/contract/e2e/vertical-slice.spec.ts`.
3. **Keputusan:**
   - baris `Tests  N passed (N)` vitest verbatim daripada `npx vitest run` anda
   - baris Playwright `2 passed (…)` verbatim
4. **Bukti:** hash commit (`bacccb5`, `76914e9`, commit 9a anda) dan arahan untuk mengulang.
5. **Had diketahui:**
   - Rapier tidak digunakan (tiada collision; motor menembusi bangunan)
   - B14 kamera dalam rumah
   - B17 ikon PWA tiada
   - fon dari Google Fonts
   - belum diuji di telefon sebenar
   - prestasi belum diukur

**Jangan tulis sebarang nombor FPS** (contohnya "30 FPS"). Kontrak menolak `\d+ FPS` sehingga 9b.

#### `TECHNICAL_DECISIONS.md`
- Tambah baris **TPD-017**: `Rapier tidak digunakan lagi untuk collision` (pergerakan dikira manual; `<Physics>` tanpa `RigidBody`). Alasan: vertical slice dahulu; collision dirancang dalam Pelan 007.
- Tambah juga nota pada TPD-004: `(lihat TPD-017: belum digunakan)`.

#### `DEVELOPMENT_STATUS.md`
Kemas kini baris yang lapuk, dengan bukti commit:
- **Playwright** → `Tested` (E2E 2 projek, `bacccb5`)
- **Simpan/muat** → `Tested` (7a/7b, E2E muat semula)
- **Dokumen wajib (seksyen S)** → senaraikan semua dokumen yang kini ada; buang perkataan `Belum:`
- **Vitest** → bilangan ujian sebenar
- Baris penghantaran, serah terima dan manifest di fasa berkaitan → `Tested` dengan rujukan langkah
- Buang ayat `Paparan wang masih Rp sehingga Pelan 005 Langkah 0.`
- **Jangan** tanda apa-apa sebagai `Accepted`. Itu hanya selepas telefon sebenar dan kelulusan pemilik.

### 3. Fail yang boleh disentuh

`src/dev/fps.ts`, `src/dev/FpsOverlay.tsx`, `src/components/GameScene3D.tsx` (import + `showFps` + satu baris JSX), `package.json` (`scripts` sahaja), `public/manifest.json` (`description` sahaja), `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md`, `QA_REPORT.md`, `TECHNICAL_DECISIONS.md`, `DEVELOPMENT_STATUS.md`.

**Di luar skop:**
- B14, B17 (ikon)
- `BUG_TRACKER.md`
- `src/__contract__/`, `tests/contract/`, `src/test/`
- konfigurasi
- `package-lock.json` (tiada pakej baharu)

### 4. Verify

```
npx tsc --noEmit                      → tiada output
npx biome check src/                  → 0 ralat
npx vitest run                        → 0 gagal (jumlah ≥ 370)
npx -y knip@6.44.1 --no-progress --include files,exports,dependencies
                                      → tiada baris baharu berbanding baseline
npm run test:e2e                      → 2 passed
npm run build && grep -l "createFpsMeter\|FpsOverlay" dist/assets/*.js
                                      → lihat nota di bawah
git status --short                    → kosong selepas commit
git log --oneline -2                  → SATU commit anda di atas commit kontrak 9a
```

Nota build: `FpsOverlay` diimport secara statik, jadi kodnya mungkin ada dalam bundel walaupun tidak dirender di produksi (`import.meta.env.DEV` ialah `false`). Ini **dibenarkan**. Laporkan output `grep` itu sahaja; jangan ubah kepada import dinamik.

**Pelayar:** `http://localhost:5179/?touch=1&fps=1` → mula permainan → nombor FPS kelihatan di kiri atas dan berubah. `http://localhost:5179/?touch=1` → tiada FPS. Tiada ralat konsol.

### 5. Commit

**Satu** commit, jangan push. **Jangan** `reset`, `rebase`, `--amend` atau `stash`, **jangan ubah `git config`**, dan pastikan tiada fail tertinggal (`git status --short` kosong).
```
005 Langkah 9a: paparan FPS dev, dev:host, dokumen wajib (notices, changelog, QA)
```
Badan commit mesti mengandungi:
- baris `Tests …` verbatim
- baris Playwright verbatim

### 6. STOP

Berhenti dan lapor sebaik sahaja commit dibuat. Juga berhenti tanpa commit jika:
- kontrak tidak boleh lulus tanpa menyunting `src/__contract__/`;
- lesen sesuatu pakej dalam `node_modules` berbeza daripada kontrak. Laporkan; jangan ubah kontrak.

**Laporan:**
- untuk setiap fail, baris diff sebagai bukti
- `git show --stat HEAD` dan `git status --short`
- baris `Tests …` dan Playwright
- output knip dan output grep dist

---

## 9b — Pemilik: ujian telefon Android sebenar

Selepas 9a diterima. Tiada kod.

1. PC dan telefon pada Wi-Fi yang sama. Di PC: `npm run dev:host`. Catat alamat `Network: http://192.168.x.x:5179/`.
2. Di telefon (Chrome Android): buka `http://192.168.x.x:5179/?fps=1`.
3. Mainkan aliran penuh:
   1. Permainan Baru
   2. jalan ke gudang → BUKA GUDANG → imbas & muat 2 paket → Berangkat
   3. naik motor → pandu ke alamat → turun → SERAH PAKET → Ambil bukti → Serahkan
   4. paket kedua: Penerima tiada
   5. muat semula halaman → Teruskan
   6. kembali ke gudang → PULANGKAN PAKET → ringkasan → Manifest baharu
4. Lapor kepada Claude:
   - model telefon, versi Android, versi Chrome, resolusi skrin (lihat `chrome://version`, Tetapan → Paparan)
   - **nombor FPS** yang dilihat:
     - semasa berjalan di gudang
     - semasa memandu di jalan
     - semasa panel terbuka
   - apa yang sukar, perlahan, tidak boleh ditekan, atau terpotong di skrin
   - tangkapan skrin jika ada masalah
5. Claude merekod keputusan dalam `QA_REPORT.md`, termasuk nombor FPS sebenar. Kontrak "tiada nombor FPS" akan dikemas kini oleh Claude pada masa itu. Masalah yang ditemui menjadi B18 dan seterusnya.

Selepas 9b, status vertical slice (seksyen Q) boleh dinilai untuk **Accepted** oleh pemilik.
