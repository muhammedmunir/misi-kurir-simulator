# Pelan 005 Langkah 6 — Kembali ke gudang, tutup manifest, ringkasan

**Pelaksana:** C9 · **Penyemak:** Claude · **Satu commit**
**Induk:** `plans/005-vertical-slice-mobile.md` Langkah 6 · master prompt H.10: *"Kembali ke gudang, serahkan paket gagal/retur, tutup manifest, lihat ringkasan performa."*
**Bermula dari:** `master` selepas commit kontrak Langkah 6 (working tree bersih)

## Matlamat

Sekarang, manifest ditutup secara automatik di alamat terakhir dan sesi direset sendiri selepas 5 s. Selepas langkah ini:

1. Selepas paket terakhir selesai (dihantar atau gagal), fasa menjadi `returning`. Manifest kekal `open`. Navigasi menunjuk ke meja gudang.
2. Di meja gudang:
   - ada paket gagal → **PULANGKAN PAKET** (`return_packets`)
   - semua dihantar → **TUTUP MANIFEST** (`close_manifest`)

   Kedua-duanya menutup manifest dan menghasilkan **ringkasan**.
3. Panel **Ringkasan Manifest** dipaparkan: dihantar, dipulangkan, pendapatan RM, XP dan masa. Butang **Manifest baharu** membawa sesi kembali ke `idle`. Tiada reset automatik lagi.

## 1. Ujian kontrak (sudah ditulis, JANGAN sunting)

- `src/__contract__/005-langkah-6-tutup-manifest.test.tsx` — 11 ujian. Sekarang gagal kerana `@/delivery/ManifestSummaryPanel` dan `acknowledgeSummary` belum wujud.
- `src/__contract__/005-langkah-5-serah-terima.test.tsx` — satu ujian dikemas kini oleh perancang: paket terakhir dihantar → `returning`, manifest `open`. Sekarang gagal.

Kontrak ini telah disahkan boleh dipenuhi dengan pelaksanaan rujukan, kemudian dibuang.

## 2. Apa yang dibina, dan SIAPA memanggilnya

### Jenis (`src/types/delivery.ts`)

| Perubahan | Nilai |
|---|---|
| `DeliveryAction` | tambah `"close_manifest"` |
| `ManifestSummary` (interface baharu) | `{ manifestId: string \| undefined; delivered: number; returned: number; earned: number; xp: number; durationMs: number }` |
| `DeliverySession.tally` | `{ earned: number; xp: number }`: ganjaran manifest semasa |
| `DeliverySession.summary` | `ManifestSummary \| null` |

### Logik tulen

**`src/lib/delivery-system.ts`**
- `createSession()` → `tally: { earned: 0, xp: 0 }`, `summary: null`.
- `tickSession`:
  - **buang** reset automatik `complete → idle` dan parameter `autoResetMs`
  - kemas kini semua pemanggil `tickSession(s, now, 5000, …)` dalam ujian
  - mesej (`completeMessage`, `interactionMessage`) masih luput seperti biasa
- **`export function acknowledgeSummary(s)`** (baharu):
  - jika `s.phase !== "complete"` → pulangkan `s` yang sama (rujukan sama)
  - jika tidak → `phase: "idle"`, dengan nilai berikut:
    - `manifest: null`, `cargo: []`, `completedAt: null`, `cooldownUntil: 0`
    - `summary: null`, `tally: { earned: 0, xp: 0 }`
    - `targets` hanya untuk paket `inbound` (logik yang sama dengan reset lama dalam `tickSession`; pindahkan, jangan salin)
- Cabang meja gudang `phase === "returning"` dalam `interact`:
  - ada paket `failed` sebelum dipulangkan → `{ action: "return_packets" }`
  - jika tidak → `{ action: "close_manifest", message: "Manifest ditutup" }`
  - kedua-duanya memanggil `returnFailedPackets(session, now)`, seperti sekarang

**`src/delivery/handover.ts`**
- `deliverPacket`:
  - tambah `reward` dan `xpReward` pada `tally`
  - mesej paket terakhir (`left === 0`) → `"… — kembali ke gudang"`; buang `"semua paket selesai"`
- `settlePhase`: kekal **satu-satunya** pemanggil `closeManifest(` (kontrak Semakan 2):
  - masih ada `out_for_delivery` → tiada perubahan
  - fasa `delivering` dan tiada `out_for_delivery` → `phase: "returning"` (bukan tutup)
  - fasa `returning` (dipanggil oleh `returnFailedPackets` di meja) → `closeManifest`, kemudian set:
    - `phase: "complete"`, `completedAt: now`
    - `summary`:
      - `delivered`/`returned` = kiraan status dalam `cargo`
      - `earned`/`xp` = `tally`
      - `durationMs = now - manifest.createdAt`

**`src/lib/interact-button.ts`** — meja gudang semasa `returning`:
- ada `failed` → `{ label: "PULANGKAN PAKET", enabled: true }`
- jika tidak → `{ label: "TUTUP MANIFEST", enabled: true }`

`src/navigation/nav.ts`: tiada perubahan diperlukan. `returning` sudah jatuh ke cabang "meja gudang", dan kontrak menyemaknya.

### Stor (`src/store/delivery.ts`)
- `acknowledgeSummary: () => void` → `set({ session: acknowledgeSummary(get().session) })`.
- `interact` **tidak** menambah wang untuk `close_manifest` / `return_packets`. Wang hanya diberi semasa `confirmHandover`, seperti sekarang.

### UI — `src/delivery/ManifestSummaryPanel.tsx` (baharu)

- **Pemanggil:** `src/components/HUD.tsx`. Render `<ManifestSummaryPanel />` sebelah `<HandoverPanel />`.
- Render `null` jika `session.summary` null.
- Gunakan `<dialog open className="wh-panel">`, seperti `HandoverPanel`. Jangan tambah warna baharu.
- Kandungan:
  - tajuk **"Ringkasan Manifest"** (`.wh-panel__title`)
  - grid 2 lajur (`<dl>`), dengan label `--color-text-muted` dan nilai `font-variant-numeric: tabular-nums`:
    - Dihantar
    - Dipulangkan
    - Pendapatan: `formatRinggit(earned)`, nilai satu-satunya dalam warna aksen `--color-primary`, saiz lebih besar
    - XP: `+N XP`
    - Masa: `m:ss`, contohnya `0:08`, `12:05`
  - butang `type="button"` **"Manifest baharu"** (`wh-btn wh-btn--primary`, `minHeight: 48`) → `useDeliveryStore.getState().acknowledgeSummary()`
- Gaya baharu jika perlu: tambah ke `src/index.css` dengan awalan `.wh-summary*` sahaja.

## 3. Ujian sedia ada yang mesti dikemas kini

Hanya yang berikut, dalam `src/lib/delivery-system.test.ts`. Kemas kini kepada tingkah laku baharu dengan pergi ke meja gudang dan tutup. **Jangan** lemahkan semakan wang atau status, dan **jangan** `.skip`.

- `interact — hantar > paket terakhir: manifest ditutup, fasa complete` → selepas serah: `returning` + `open`; selepas meja: `complete` + `closed`.
- `interact — hantar > dua paket ke alamat sama: dihantar satu demi satu`.
- `tickSession > complete → idle selepas 5000ms; paket gudang dan sasarannya kekal` → ujian ini kini untuk `acknowledgeSummary` (paket gudang dan sasarannya kekal), dan `tickSession` tidak reset.
- `useDeliveryStore — gelung penuh dengan wang pemain > imbas → muat → berangkat → hantar 2 → idle, 3 manifest berturut-turut` → tambah langkah meja (`interact` di DESK) dan `acknowledgeSummary()` antara manifest. Semakan wang tepat kekal.

Jika ujian **lain** gagal → STOP.

## 4. Fail yang boleh disentuh

`src/types/delivery.ts`, `src/lib/delivery-system.ts`, `src/delivery/handover.ts`, `src/lib/interact-button.ts`, `src/store/delivery.ts`, `src/delivery/ManifestSummaryPanel.tsx` (baharu), `src/components/HUD.tsx`, `src/index.css` (`.wh-summary*` sahaja), `src/lib/delivery-system.test.ts` (seksyen 3 sahaja).

**Di luar skop:**
- `src/__contract__/`, `src/test/`, `biome.json`, dan konfigurasi lain
- simpan/muat (Langkah 7)
- B14 kamera
- isu kecil `HandoverPanel` (label tanpa ruang, panel di skrin rendah)
- COD

## 5. Verify

```
npx tsc --noEmit                      → tiada output
npx biome check src/                  → No fixes applied, 0 ralat
npx vitest run                        → 0 gagal (jumlah ≥ 307)
npx -y knip@6.44.1 --no-progress --include files,exports,dependencies
                                      → sama dengan baseline (jangan ubah baseline)
git log --oneline -3                  → commit anda di atas commit kontrak Langkah 6
```

**Pelayar** (`http://localhost:5179/?touch=1`, guna import modul Vite seperti Langkah 5):
1. Sesi `deliveringTo([SHOP])` → serah paket. HUD: mesej "kembali ke gudang"; anak panah nav ke gudang.
2. Ke meja → butang **TUTUP MANIFEST** → tekan → panel Ringkasan Manifest: Dihantar 1, Pendapatan = wang yang bertambah, Masa `m:ss`.
3. **Manifest baharu** → panel hilang; butang meja **BUKA GUDANG**.
4. Ulang dengan `deliveringTo([INDUSTRI])` → Penerima tiada → meja **PULANGKAN PAKET** → ringkasan Dipulangkan 1, Pendapatan RM 0.00.
5. Tangkapan skrin panel ringkasan (lebar 390 px) di `screenshot-langkah6-ringkasan.png`. **Jangan commit** tangkapan skrin. Konsol: tiada ralat.

## 6. Commit

Satu commit, jangan push, **jangan** `reset`/`rebase`/`--amend`:
```
005 Langkah 6: tutup manifest di gudang, ringkasan manifest
```
Badan commit mesti mengandungi:
- baris `Tests …` verbatim
- status pelayar: "disahkan" atau "belum diuji di pelayar — <sebab>"

## 7. STOP

Berhenti dan lapor sebaik sahaja commit dibuat. Juga berhenti tanpa commit jika:
- kontrak tidak boleh lulus tanpa menyunting `src/__contract__/` atau `src/test/`;
- ujian di luar seksyen 3 gagal;
- knip melaporkan export/fail baharu tidak dipanggil. Sambungkan ikut seksyen 2; jangan ubah baseline.

**Laporan:** untuk setiap butiran seksyen 2, tunjuk baris diff sebagai bukti, bukan pernyataan "selesai". Sertakan juga:
- `git show --stat HEAD`
- baris `Tests …` verbatim
- output knip
- laluan tangkapan skrin
- senarai perkara yang tidak dibuat
