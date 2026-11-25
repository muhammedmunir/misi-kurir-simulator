# Pelan 005 Langkah 7b — Autosave di titik selamat + "Teruskan" di menu utama

**Pelaksana:** C9 · **Penyemak:** Claude · **Satu commit**
**Induk:** `plans/005-vertical-slice-mobile.md` Langkah 7 · master prompt seksyen O (autosave di checkpoint selamat; save rosak tidak boleh merosakkan permainan)
**Bergantung pada:** 7a (`src/save/*`, `getWorldState`/`restoreWorld`) yang sudah diterima
**Bermula dari:** `master` selepas commit kontrak 7b (working tree bersih)

## Matlamat

1. Permainan **menyimpan sendiri** di tiga titik selamat:
   - selepas berangkat (`delivering`);
   - selepas setiap serah terima, sama ada paket menjadi `delivered` atau `failed`;
   - selepas manifest ditutup (`complete`).

   Tiada simpanan untuk pergerakan, mesej, tick atau perubahan zon.
2. Menu utama menunjukkan **Teruskan** jika ada simpanan. Tekan butang itu untuk memulihkan permainan dan masuk ke GAME.
3. Jika simpanan rosak: tunjuk mesej ralat yang jelas (`role="alert"`), kekal di menu, dan **Permainan Baru** masih boleh ditekan.

## 1. Ujian kontrak (sudah ditulis, JANGAN sunting)

`src/__contract__/005-langkah-7b-autosave-teruskan.test.tsx` — 11 ujian. Sekarang gagal kerana `@/save/autosave` belum wujud. Kontrak ini telah disahkan boleh dipenuhi dengan pelaksanaan rujukan, kemudian dibuang.

## 2. Apa yang dibina, dan SIAPA memanggilnya

### `src/save/autosave.ts` (baharu)

`export function startAutosave(backend: SaveBackend): () => void`:
- Langgan `useDeliveryStore.subscribe((state, prev) => …)`. Pulangkan fungsi nyahlanggan.
- Bandingkan `prev.session` dengan `state.session`. Simpan dengan `void saveNow(backend, Date.now())` jika:
  - `phase` berubah **kepada** `"delivering"` atau `"complete"`; atau
  - set paket kargo berstatus `delivered` / `failed` / `returned` berubah. Bandingkan senarai `id:status` bagi paket berstatus itu sahaja, kerana status lain seperti `loaded` berubah semasa muat dan **bukan** titik selamat.
- Satu perubahan stor = paling banyak satu simpanan.
- `saveNow` memanggil `notify("Tersimpan")`, yang juga mengubah stor, tetapi itu bukan titik selamat. Pastikan tiada gelung.

**Pemanggil:** `src/components/GameScene3D.tsx`. Tambah, sebelum `useEffect` konteks WebGL:
```tsx
useEffect(() => startAutosave(saveBackends.current), []);
```
Bentuk tepat ini disemak oleh kontrak. Nyahlanggan berlaku semasa unmount (keluar ke menu).

### `src/components/MainMenu.tsx`
- `useState`: `hasSave: boolean` (mula `false`) dan `error: string | null`.
- `useEffect([])`: `saveBackends.current.read()`, kemudian `setHasSave(data != null)`. Jika `read()` ditolak → `setHasSave(false)`, tanpa throw dan tanpa ralat konsol.
- Jika `hasSave`, butang **pertama** dalam `buttonContainerStyle`:
  - `<button type="button">` dengan teks `▶ Teruskan`
  - gaya sama seperti `menuButtonStyle`, tetapi berlatar `var(--color-primary)` dan teks gelap, supaya ia satu-satunya aksen di skrin (doktrin antislop: satu aksen)
  - `onClick` → `const r = await loadSaved(saveBackends.current)`:
    - `r.ok` → `navigate(Scene.GAME)`
    - jika tidak → `setError(r.error)`
- Jika `error`: `<p role="alert">` di bawah butang, dengan teks `{error}` dan satu baris `"Mulakan Permainan Baru untuk bermain semula."`, guna warna ralat yang sedia ada dalam `index.css`, jika ada.
- Butang sedia ada (Mula Misi / Permainan Baru / Tetapan) **tidak diubah**.

## 3. Fail yang boleh disentuh

`src/save/autosave.ts` (baharu), `src/components/GameScene3D.tsx` (import + satu `useEffect`), `src/components/MainMenu.tsx`.

**Di luar skop:**
- `LoadSavePanel`
- simpanan berbilang slot
- butang padam simpanan
- `src/save/*` lain
- `src/__contract__/`, `src/test/`, konfigurasi, `package.json`

## 4. Verify

```
npx tsc --noEmit                      → tiada output
npx biome check src/                  → 0 ralat
npx vitest run                        → 0 gagal (jumlah ≥ 344)
npx -y knip@6.44.1 --no-progress --include files,exports,dependencies
                                      → tiada baris baharu berbanding baseline
git status --short                    → kosong selepas commit
git log --oneline -2                  → SATU commit anda di atas commit kontrak 7b
```

**Pelayar** (`http://localhost:5179/?touch=1`):
1. Permainan baharu → buka gudang → imbas, muat, berangkat. Mesej "Tersimpan" muncul.
2. Muat semula halaman (F5). Menu menunjukkan **▶ Teruskan**. Tekan → pemain, wang, kedudukan dan paket kembali.
3. Dalam konsol, rosakkan simpanan:
   ```js
   const b = (await import('/src/save/backend.ts')).saveBackends.current; await b.write({ version: 1 })
   ```
   Kemudian F5 → **Teruskan** → mesej "Simpanan rosak…", kekal di menu, **Permainan Baru** berfungsi.
4. Tangkapan skrin menu (lebar 390 px) di `screenshot-langkah7b-menu.png`. **Jangan commit.** Konsol: tiada ralat.

## 5. Commit

**Satu** commit, jangan push. **Jangan** `reset`, `rebase`, `--amend` atau `stash`, dan jangan ubah `git config`.
```
005 Langkah 7b: autosave di titik selamat, Teruskan di menu utama
```
Badan commit mesti mengandungi:
- baris `Tests …` verbatim
- status pelayar

## 6. STOP

Berhenti dan lapor sebaik sahaja commit dibuat. Juga berhenti tanpa commit jika:
- kontrak tidak boleh lulus tanpa menyunting `src/__contract__/`;
- ujian sedia ada gagal;
- gate gagal kerana line ending. Laporkan; jangan ubah konfigurasi.

**Laporan:**
- untuk setiap fail dalam seksyen 2, baris diff sebagai bukti
- `git show --stat HEAD`
- `git status --short`
- baris `Tests …` verbatim
- output knip
- laluan tangkapan skrin
- senarai perkara yang tidak dibuat
