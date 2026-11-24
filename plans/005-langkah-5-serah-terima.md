# Pelan 005 Langkah 5 — Pelanggan & serah terima

**Pelaksana:** C9 · **Penyemak:** Claude · **Satu commit**
**Induk:** `plans/005-vertical-slice-mobile.md` Langkah 5 · master prompt H.5–H.9 (turun, serah terima, bukti, gagal kirim) dan I ("paket tidak boleh Delivered tanpa ... interaksi serah terima yang sah")
**Bermula dari:** `master` di `8f4da51` atau kemudian (working tree bersih; padam `screenshot-step3-nav-gudang.png` jika masih ada)

## Matlamat

- Pemain mesti **turun dari motor dan berjalan ke pintu**.
- Interaksi di pintu membuka **panel serah terima**: ambil bukti (simulasi), kemudian serahkan paket.
- Di alamat tanpa penerima, pemain mencatat "Penerima tiada". Paket menjadi `failed`.
- Jika ada paket gagal, pemain mesti **memulangkannya di meja gudang** sebelum manifest ditutup. Tiada jalan buntu.

## 1. Ujian kontrak (sudah ditulis, JANGAN sunting)

`src/__contract__/005-langkah-5-serah-terima.test.tsx` — 19 ujian. Sekarang gagal kerana `@/delivery/handover` dan `@/delivery/HandoverPanel` belum wujud. Kontrak ini telah disahkan boleh dipenuhi.

## 2. Apa yang dibina, dan SIAPA memanggilnya

### Jenis (`src/types/delivery.ts`)

| Perubahan | Nilai |
|---|---|
| `DeliveryPhase` | tambah `"returning"` |
| `DeliverySession.handover` | `{ packetId: string; zoneId: string; proofTaken: boolean } \| null` |
| `DeliveryAction` | tambah `"open_handover"` dan `"return_packets"` |
| `DeliveryZone.receiverHome` | `?: boolean` (tiada = ada penerima) |

### Logik (`src/lib/delivery-system.ts`)

- `createSession()` → `handover: null`.
- `zone-delivery-3` (Pusat Industri Timur) → `receiverHome: false`.
- **`interact(session, zone, now, deps, ctx: { onFoot: boolean })`** (parameter baharu):
  - **Alamat + `deliverableAt` + `ctx.onFoot`** → `{ action: "open_handover" }`; set `handover` (`proofTaken: false`). **Jangan hantar paket di sini lagi.**
  - **Alamat + `deliverableAt` + atas motor** → `"nothing"` dengan mesej `"Turun dari motor dahulu"` (fallback motor = turun).
  - **Meja gudang + `phase === "returning"`** → `{ action: "return_packets" }` dengan sesi daripada `returnFailedPackets`.
- **Ekstrak** logik hantar yang sedia ada (`transition` delivered, ganjaran, `closeManifest`, mesej) daripada `interact()` ke satu fungsi yang dipanggil oleh `completeHandover`. **Jangan salin.**
- **Fungsi penyelesai bersama**, dipanggil selepas setiap hantar, gagal dan pulang:
  - masih ada `out_for_delivery` → tiada perubahan fasa
  - ada `failed` → `phase: "returning"`
  - selain itu → `closeManifest` → `complete` + `completedAt`

### Fungsi tulen baharu (`src/delivery/handover.ts`)

Dipanggil oleh `src/store/delivery.ts` (dan kontrak).

| Fungsi | Tingkah laku |
|---|---|
| `takeProof(s)` | `handover.proofTaken = true` |
| `completeHandover(s, now, deps)` → `{ result, session }` | Tolak (`action: "nothing"`, paket tidak berubah) jika tiada `handover`, `receiverHome === false` (mesej `"Tiada orang di rumah"`), atau belum ada bukti (mesej `"Ambil bukti penghantaran dahulu"`). Selain itu hantar, `result.action === "deliver"` dengan `reward`/`xpReward`, `handover: null`. |
| `failHandover(s, now)` | Paket `out_for_delivery → failed`, sebab tepat `"Penerima tiada di rumah"`, `handover: null`, kemudian penyelesai. |
| `returnFailedPackets(s, now)` | Semua `failed → returned` (sebab `"Dipulangkan ke gudang"`), kemudian penyelesai. Juga dipanggil oleh `interact()` di meja semasa `returning`. |

### Stor (`src/store/delivery.ts`)

| Kaedah | Dipanggil oleh |
|---|---|
| `interact(now, ctx: { onFoot })` | `performInteract` dalam `src/components/3d/PlayerController.tsx` → `useDeliveryStore.getState().interact(Date.now(), { onFoot })`, dengan `onFoot` = pembolehubah modul `onFoot` |
| `takeProof()` | `HandoverPanel` |
| `confirmHandover(now)` | `HandoverPanel`. Panggil `completeHandover`; jika `"deliver"` → `addMoney` + `addXP` (sama seperti `interact` sekarang) |
| `reportAbsent(now)` | `HandoverPanel` |
| `cancelHandover()` | `HandoverPanel` → `handover: null` |

`setNearbyZone`: bila zon bertukar, set `handover: null` (berjalan pergi menutup panel).

### UI

**`src/delivery/HandoverPanel.tsx`**
- Dipasang dalam `src/components/GameScene3D.tsx`, satu baris `<HandoverPanel />` selepas `<WarehousePanel />`.
- Kandungan: nama penerima, alamat, nombor penjejakan, `Prabayar`.
- Butang dengan teks TEPAT:
  - `Ambil bukti`, kemudian `Serahkan paket` (`disabled` sehingga `proofTaken`). **Kedua-duanya tiada** di alamat `receiverHome === false`; paparkan `Tiada orang di rumah`.
  - `Penerima tiada` (sentiasa ada).
  - `Batal`.
- Gaya: guna semula kelas `.wh-panel`, `.wh-btn`, `.wh-btn--primary` sedia ada. Butang ≥ 48px. Selepas bukti diambil, paparkan "Bukti: foto diambil".

**`src/delivery/Receiver.tsx`**
- Figura placeholder (kotak kepala/badan seperti pemain, warna berbeza) di hadapan pintu.
- Dipasang dalam `src/components/3d/Destinations.tsx`, satu `<Receiver />` bagi setiap alamat dengan `receiverHome !== false`. Kedudukan: `zone.position` dengan `z` dianjak −1.5 ke arah rumah.
- Tiada teks 3D (drei `Text` memuat turun fon).

**Butang tindakan (`src/lib/interact-button.ts`)**
- `ButtonInfo.needsOnFoot?: boolean`
- Alamat dengan paket → `{ label: "SERAH PAKET", enabled: true, needsOnFoot: true }`
- Meja gudang semasa `returning` → `{ label: "PULANGKAN PAKET", enabled: true }`
- `getActionButton`: jika `delivery.needsOnFoot` dan pemain atas motor → abaikan tindakan itu dan teruskan ke `TURUN MOTOR` / `BERHENTI DULU`

**HUD (`src/components/HUD.tsx`)**
- Kad misi semasa `returning`: `Pulangkan n paket gagal ke gudang`.
- `n` = bilangan paket dengan status `failed`.

## 3. Ujian sedia ada yang MESTI dikemas kini (tingkah laku sengaja berubah)

Ujian di bawah gagal kerana `interact()` tidak lagi menghantar terus. Kemas kini ke aliran `interact(..., { onFoot: true })` → `takeProof` → `completeHandover` (fungsi tulen), atau `store.interact(t, { onFoot: true })` → `store.takeProof()` → `store.confirmHandover(t)` (ujian stor).

**`src/lib/delivery-system.test.ts`:**
- `interact — hantar` (3 ujian)
- `interact — cooldown > tepat pada had cooldown: dibenarkan`. Jangkaan baharu: `"open_handover"`.
- `tickSession > complete → idle selepas 5000ms…`
- `useDeliveryStore — gelung penuh dengan wang pemain` (2 ujian)

**`src/lib/interact-button.test.ts`:**
- `alamat paket semasa menghantar → HANTAR PAKET`. Jangkaan baharu: `SERAH PAKET` dengan `needsOnFoot: true`.

Ujian lain yang memanggil `interact(...)` cuma perlu argumen kelima `{ onFoot: true }`.

**DILARANG:**
- membuang semakan wang/XP (`player.money`, `xp`, `totalEarnings`) atau mana-mana `expect` tentang status paket/manifest;
- `.skip`/`.todo`;
- melonggarkan jangkaan selain yang disenaraikan di atas.

## 4. Fail

**Boleh disentuh:**
- `src/types/delivery.ts`, `src/lib/delivery-system.ts`, `src/lib/interact-button.ts`, `src/store/delivery.ts`
- `src/delivery/handover.ts` (baharu), `src/delivery/HandoverPanel.tsx` (baharu), `src/delivery/Receiver.tsx` (baharu)
- `src/components/3d/PlayerController.tsx` (HANYA panggilan `interact` dalam `performInteract`)
- `src/components/3d/Destinations.tsx` (pasang `<Receiver />`)
- `src/components/GameScene3D.tsx` (pasang `<HandoverPanel />`)
- `src/components/HUD.tsx` (kad misi `returning`)
- `src/index.css` (jika perlu)
- `src/lib/delivery-system.test.ts`, `src/lib/interact-button.test.ts` (seksyen 3 sahaja)
- `DEVELOPMENT_STATUS.md` (Phase 4: baris "Pelanggan NPC, serah terima, bukti" dan "Penghantaran gagal / retur")

**Luar skop:**
- `src/__contract__/*`, `src/test/*`
- `src/navigation/*`, `CameraFollow.tsx` (B14: kamera masuk ke dalam rumah, pelan berasingan)
- `src/warehouse/*`, `src/vehicles/*`
- COD, skrin ringkasan manifest (Langkah 6)
- `package.json`

## 5. Verify

```
npx tsc --noEmit         → tiada output
npx biome check src/     → tiada ralat
npx vitest run           → semua lulus, termasuk 19 ujian dalam src/__contract__/005-langkah-5-serah-terima.test.tsx
                           dan semua ujian src/__contract__/005-langkah-4-*
npx -y knip@6.44.1 --no-progress --include files,exports,dependencies
                         → SAMA dengan baseline
npm run build            → "✓ built in …"
```

**Ujian pelayar (Playwright MCP, `http://localhost:5179/?touch=1`; simpan tangkapan skrin DI LUAR repo):**
1. Permainan Baru → nama "Ujian" → Mula Misi.
2. Alihkan pemain ke meja gudang:
   ```js
   (await import('/src/components/3d/PlayerController.tsx')).playerState.getPosition().set(20, 1.6, 21)
   ```
   Ketik `BUKA GUDANG`. Imbas dan muat **satu** paket. Berangkat.
3. Baca alamat sasaran dari panel navigasi. Alihkan pemain ke pintu alamat itu (koordinat `position` dalam `DELIVERY_ZONES`). Ketik `SERAH PAKET`.
   - Jangkaan: panel serah terima dengan nama penerima.
   - Ketik `Ambil bukti` → `Serahkan paket`. Wang bertambah.
4. Ulang dengan paket ke **Pusat Industri Timur** (`zone-delivery-3`; muat paket yang beralamat ke situ).
   - Jangkaan: tiada butang `Serahkan paket`.
   - Ketik `Penerima tiada`. HUD menunjukkan `Pulangkan 1 paket gagal ke gudang`, dan navigasi menunjuk ke gudang.
5. Kembali ke meja dan ketik `PULANGKAN PAKET`. Jangkaan: manifest ditutup; selepas 5 s navigasi kembali normal.
6. Tangkapan skrin langkah 3 dan 4. Semak konsol: tiada ralat.

## 6. Commit

Satu commit, jangan push:
```
005 Langkah 5: serah terima dengan bukti, penerima tiada, pulang ke gudang
```
Badan commit mesti mengandungi:
- baris `Tests …` verbatim
- status pelayar: "disahkan (Playwright MCP)" atau "belum diuji di pelayar — <sebab>"

## 7. STOP

Berhenti dan lapor sebaik sahaja commit dibuat. Juga berhenti tanpa commit jika:
- kontrak tidak boleh lulus tanpa menyunting `src/__contract__/` atau `src/test/`;
- ujian sedia ada di luar senarai seksyen 3 gagal dan kelihatan perlu dilonggarkan;
- knip melaporkan export/fail baharu tidak dipanggil — sambungkan ikut seksyen 2, jangan ubah baseline.

**Laporan:**
- `git show --stat HEAD`
- Baris `Tests …` verbatim
- Output knip (atau "sama dengan baseline")
- Laluan tangkapan skrin
- Senarai perkara yang tidak dibuat

---

## Semakan 1 (selepas 36d6357..080ce80)

Gate hijau, tetapi ada pepijat dan pelanggaran skop. Kontrak baharu: `src/__contract__/005-langkah-5-semakan.test.ts` (7 ujian, 6 gagal sebelum dibaiki).

| # | Masalah | Bukti | Baiki |
|---|---------|-------|-------|
| S1 | Atas motor boleh buka serah terima. `performInteract()` di `src/components/3d/PlayerController.tsx` memanggil `interact(Date.now())` tanpa ctx; `interact` (tulen) dan stor menganggap "berjalan kaki" untuk zon delivery. | S1 ×4 gagal | `export function performInteract()` dan hantar `{ onFoot }` (pembolehubah modul) ke `useDeliveryStore.getState().interact(Date.now(), { onFoot })`. Dalam `interact` tulen dan stor: tiada ctx = `onFoot: false`. Buang inferens jenis zon. Mesej atas motor: `"Turun dari motor dahulu"`. |
| S2 | Zon rekaan "Gudang Stokin Barat" ditambah (luar skop). `zone-delivery-3` bertukar nama. | S2 ×2 gagal | Buang zon itu. `zone-delivery-3` = Pusat Industri Timur, `receiverHome: false`. Pulihkan `PARKING_BOXES` toHaveLength(3) dalam `src/vehicles/motor-state.test.ts`. Pulihkan `src/test/delivery-fixtures.ts` ke `INDUSTRI = DELIVERY_ZONES[3]` (fail ini di luar skop; jangan sunting lagi). |
| S3 | Ujian wang dilemahkan dalam `src/lib/delivery-system.test.ts`: `toBe(start + reward)` → `toBeGreaterThan(start)`, XP → `toBeGreaterThanOrEqual` (lulus walaupun XP tidak ditambah). | diff | Pulihkan semakan tepat: wang = `start + rollDeliveryReward(rng)`, XP = `xpStart + xpReward`. Ambil `reward`/`xpReward` daripada hasil `completeHandover` atau kira dengan rng ujian. |
| S4 | Logik selesai disalin 3 kali (`deliverPacket`, `settlePhase`, `returnFailedPackets` dalam `handover.ts`, dan cabang `returning` dalam `interact`). | baca kod | Satu fungsi `settlePhase` dalam `src/delivery/handover.ts`. `interact` cabang `returning` memanggil `returnFailedPackets`. `deliverPacket` memanggil `settlePhase` sahaja. |
| S5 | `"fail_handover"` dalam `DeliveryAction` tidak digunakan. | grep | Buang. |
| S6 | 6 commit untuk satu langkah; `biome.json` disunting. | git log | Perubahan `indentSize`→`indentWidth` diterima (setara). Jangan sunting konfigurasi lagi. Semakan ini = **satu** commit. |

Ujian sedia ada yang mesti dikemas kini (panggil `interact` dengan `{ onFoot: true }`, tanpa melemahkan semakan wang/status): yang gagal selepas S1/S2 dalam `delivery-system.test.ts` dan `motor-state.test.ts`.

**Verify:** `npx tsc --noEmit`, `npx biome check src/`, `npx vitest run` (0 gagal), knip sama dengan baseline. Pelayar `http://localhost:5179/?touch=1`: atas motor di Kedai Runcit Mak Minah → butang TURUN MOTOR, tekan → turun (tiada panel); tekan lagi → panel serah terima; Ambil bukti → Serahkan paket → wang naik.

**Commit (satu):** `005 Langkah 5 Semakan 1: onFoot sebenar, buang zon rekaan, pulihkan ujian wang`

**STOP:** jika kontrak tidak boleh lulus tanpa menyunting `src/__contract__/`, atau jika ujian di luar senarai di atas gagal.
