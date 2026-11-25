# Pelan 005 Langkah 10 — Pepijat telefon sebenar (B18, B19, B20)

**Pelaksana:** C9 · **Penyemak:** Claude · **Satu commit**
**Bermula dari:** `master` selepas commit kontrak Langkah 10 (working tree bersih)
**Punca:** ujian telefon sebenar Redmi 9 (Langkah 9b, `QA_REPORT.md`). Butiran: `BUG_TRACKER.md` B18–B20.

## 1. Ujian kontrak (sudah ditulis, JANGAN sunting)

| Fail | Apa yang disemak |
|------|------------------|
| `src/__contract__/005-langkah-10-pepijat-telefon.test.tsx` | 7 ujian; 5 gagal sekarang |
| `tests/contract/e2e/landscape-panels.spec.ts` | E2E landskap 823×309 (projek `pixel-7` sahaja); gagal sekarang: `Batal: bawah … Received: 521.0625` |

Kedua-duanya telah disahkan boleh dipenuhi dengan pelaksanaan rujukan (Vitest 383 lulus, Playwright 3 passed), kemudian dibuang.

## 2. Perubahan tepat

### B18 — `src/index.css`, peraturan `.wh-panel`
Tambah dua baris **selepas** `max-height: min(78dvh, 640px);`:
```css
  overflow-y: auto;
  overscroll-behavior: contain;
```
Jangan ubah `max-height` atau peraturan lain. `.wh-list` kekal seperti sedia ada. Ini membaiki ketiga-tiga panel yang guna `.wh-panel`: Serah Terima, Ringkasan Manifest dan Meja Sortir.

### B19 + B20 — `src/components/HUD.tsx`, fungsi `HUD`
1. Import: `useEffect`, `useState` dari `"react"`; `shouldShowTouchControls` dari `"./TouchJoystick"` (fungsi sedia ada; JANGAN salin).
2. Ganti dua baris ini:
   ```ts
   const isOnFoot = playerState.isOnFoot();
   const speed = Math.abs(Math.round(playerState.getSpeed()));
   ```
   dengan keadaan React yang ditinjau setiap **100 ms** (`window.setInterval`), corak sama seperti `TouchControls` dalam `TouchJoystick.tsx`:
   - `const [touch] = useState(shouldShowTouchControls);`
   - `isOnFoot` dan `speed` (dibundarkan) dalam `useState`, dikemas kini dalam `setInterval` di dalam `useEffect(..., [])`
   - `return () => window.clearInterval(id);`
   - Hook mesti dipanggil **sebelum** `if (!player || currentScene !== Scene.GAME) return null;` (peraturan hook).
3. Teks petunjuk:
   - Kad status: `touch ? "Ketik butang tindakan" : "Tekan E"` diikuti ` untuk naik motor` / ` untuk turun motor / interaksi` (bahagian kedua kekal).
   - Kad misi: `touch ? "Masuk gudang, ketik butang tindakan di meja sortir" : "Masuk gudang, tekan E di meja sortir"`.

**Pemanggil:** tiada fungsi baharu. `HUD` sudah dirender oleh `GameScene3D.tsx`.

## 3. Fail yang boleh disentuh

- `src/index.css`
- `src/components/HUD.tsx`

**Luar skop:** semua fail lain, termasuk `TouchJoystick.tsx`, `PlayerController.tsx`, dokumen (`*.md`), `src/__contract__/`, `tests/`, `playwright.config.ts`, `package.json`. B21 (unsur bertindih) dan Bloom/prestasi BUKAN dalam langkah ini.

## 4. Verify

```
npx tsc --noEmit                         # tiada output
npx biome check src/                     # No fixes applied, 0 ralat
npx vitest run                           # Tests  383 passed (383)
npx -y knip@6.44.1 --no-progress --include files,exports,dependencies   # tiada baris baharu vs baseline
npm run test:e2e                         # 3 passed  (desktop-chrome: 1 passed + 1 skipped; pixel-7: 2 passed)
git status --short                       # kosong selepas commit
git config --local -l                    # tiada core.autocrlf / core.eol
```

Pelayar (`npm run dev`, `localhost:5179/?touch=1`), laporkan dengan bukti:
- naik motor → kad status bertukar ke "Memandu Motor" dan km/j berubah semasa memandu
- tiada "Tekan E" di skrin dalam `?touch=1`; tanpa `?touch=1` (tetikus) "Tekan E" kekal
- DevTools, viewport 823×309: buka Serah Terima → panel boleh ditatal hingga Batal

## 5. Commit

SATU commit. Mesej (tanpa `@`, tulis melalui fail atau `-m` biasa, BUKAN here-string PowerShell):
```
005 Langkah 10: panel boleh ditatal (B18), status HUD reaktif (B19), petunjuk ikut mod input (B20)
```

## 6. STOP

Berhenti dan lapor jika:
- mana-mana ujian kontrak atau E2E gagal selepas dua cubaan
- pembaikan memerlukan fail di luar senarai §3
- ujian sedia ada perlu diubah

Larangan: jangan sunting kontrak/E2E, jangan ubah `git config`, jangan stash/reset/amend/rebase, jangan push, jangan tinggalkan fail untracked.
