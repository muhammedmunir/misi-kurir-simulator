# Pelan 004 — Stabilkan Gelung Penghantaran (Fasa 2.5)

**Status:** Belum dimulakan
**Bergantung pada:** commit `353dff8` (Fasa 2)
**Matlamat:** Gelung `ambil → hantar → ganjaran → ulang` berfungsi berulang kali, di papan kekunci DAN sentuhan, dengan ujian unit. Tiada ciri baharu sehingga pelan ini lulus.

## Kenapa pelan ini sebelum Fasa 3

Semakan kod Fasa 2 menunjukkan gelung penghantaran dilaporkan siap tetapi tidak boleh berfungsi seperti yang didakwa. `tsc` dan `vitest` lulus kerana tiada ujian menyentuh `delivery-system.ts`, dan `tsc` tidak mengesan pelanggaran Rules of Hooks.

## Pepijat yang disahkan (ikut keutamaan)

| # | Fail | Masalah | Kesan |
|---|------|---------|-------|
| B1 | `src/components/3d/PlayerController.tsx:54-58` | `if (!mounted) return null;` diletakkan **sebelum** `useEffect`/`useFrame`. Render kedua memanggil lebih banyak hook. | React melempar `Rendered more hooks than during the previous render` — scene 3D berkemungkinan rosak sepenuhnya. Disimpulkan daripada bacaan kod sahaja; sahkan di pelayar. |
| B2 | `PlayerController.tsx` (pengendali `keydown`) | Bendera `interacted` jadi `true` selepas tekanan E pertama dan hanya direset semasa cleanup effect. Komponen tidak render semula (semua state ialah pembolehubah modul). | E berfungsi **sekali** sahaja. |
| B3 | `src/lib/delivery-system.ts` `checkInteract` | Cooldown dikurangkan `0.016` setiap *panggilan*, bukan setiap saat. Selepas ambil paket (cooldown 0.5) perlu ~31 tekanan E. Semasa cooldown ia pulangkan `null` → jatuh ke logik tukar motor. | Hantar paket hampir mustahil; pemain tertukar naik/turun motor tanpa sengaja. |
| B4 | `src/components/HUD.tsx` | `deliveryState` dibaca sekali dalam `useEffect(..., [])`. | Kad misi tidak pernah tunjuk "Bawa Paket" atau nombor penjejakan. |
| B5 | `src/components/3d/DeliverySystemController.tsx` | `setNearbyZone(nearby)` dipanggil sebelum semakan `!nearby && session.nearbyZone` — syarat sentiasa palsu. | Mesej "Berhampiran: …" tidak pernah dipadam. |
| B6 | `src/store/delivery-ui.ts` + `HUD.tsx` | `completeMessage` tidak pernah dipadam (hanya semasa unmount) dan menyembunyikan `interactionMessage`. | Selepas penghantaran pertama, HUD beku pada mesej selesai. |
| B7 | `TouchJoystick.tsx` | Tiada butang interaksi sentuhan; hanya HORN/BRAKE. | Permainan mobile-first tidak boleh ambil/hantar paket di telefon. |
| B8 | `src/components/3d/NPCTraffic.tsx` | `generateNPCTraffic(8)` dipanggil dua kali (id dan data berbeza) dan sekali lagi setiap render dalam `useRef(...)`. Kemas kini didikitkan kepada 50ms tetapi guna `delta` satu frame → NPC bergerak ~⅓ kelajuan. `heading` paksi-x sama dengan paksi-z → kereta bergerak mengiring. | Trafik nampak salah; pembaziran. |
| B9 | `delivery-system.ts` | `setInterval` peringkat modul (kesan sampingan semasa import, tidak boleh diuji, tidak pernah dihentikan). | Bocor dan sukar diuji. |
| B10 | Repo | 29 ralat `biome check`; `tsconfig.tsbuildinfo` dijejak git; antara muka `DeliveryZone` diduplikasi dalam 2 fail; "Balik Pos" (patut "Pejabat Pos"); `DEVELOPMENT_STATUS.md` masih tulis "Phase 0". | Hutang teknikal. |

## Langkah pelaksanaan (1 per 1, sahkan setiap langkah)

### Langkah 1 — Jadikan logik penghantaran tulen dan boleh diuji
- Tulis semula `src/lib/delivery-system.ts` sebagai fungsi tulen atau stor Zustand (`src/store/delivery.ts`) yang menggantikan kedua-dua `session` mutable dan `delivery-ui.ts`. **Satu sumber kebenaran.**
- Eksport `type DeliveryZone` sekali sahaja (`src/types/delivery.ts`); `delivery-utils.ts` import dari situ.
- Cooldown berasaskan masa: simpan `cooldownUntil: number` (ms) dan banding dengan `now` yang dihantar sebagai argumen (`interact(now)`), bukan dikurangkan setiap panggilan.
- Buang `setInterval`. Reset auto selepas 5s dilakukan dalam `tick(now)` yang dipanggil dari `DeliverySystemController` `useFrame`.
- Jadikan rawak boleh disuntik (`rng: () => number`) supaya ujian deterministik.
- Pindahkan `generateNPCTraffic`/`updateNPCTraffic` ke `src/lib/npc-traffic.ts`.

**Kriteria lulus:** `src/lib/delivery-system.test.ts` meliputi: ambil di zon pickup; tolak ambil kedua; hantar ke zon salah = tiada perubahan; hantar ke zon betul = state `complete` + ganjaran; cooldown menyekat dalam tempoh dan membenarkan selepasnya; reset auto selepas 5000ms; 3 kitaran berturut-turut berjaya.

### Langkah 2 — Betulkan PlayerController (B1, B2, B3)
- Buang `mounted` guard sepenuhnya (atau letak semua hook di atas pulangan awal).
- `useEffect` pengendali kekunci dengan `[]` deps; abaikan `e.repeat` dan bukannya bendera `interacted`.
- Susunan keutamaan E: (1) jika ada zon penghantaran berdekatan dan tindakan sah → interaksi penghantaran, **jangan** tukar motor; (2) jika tidak → tukar motor. Pulangan `nothing` dari zon tidak boleh mencetuskan tukar motor.
- Ekstrak `handleInteract()` sebagai fungsi yang dikongsi oleh kekunci E dan butang sentuhan (Langkah 4).
- Pindahkan `document.addEventListener` peringkat modul ke dalam `useEffect` dengan cleanup.

**Kriteria lulus:** Tiada amaran hook di konsol pelayar; E boleh ditekan berulang kali.

### Langkah 3 — HUD reaktif (B4, B5, B6)
- HUD langgan stor penghantaran (selector), bukan baca `session` sekali.
- Mesej selesai mempunyai tamat tempoh (contoh 4s) — padam dalam `tick(now)`.
- `DeliverySystemController` kira `prevNearby` sebelum menulis, dan padam mesej apabila keluar zon.
- Tunjuk sasaran semasa: nama zon + jarak (m) ke `targetZone` semasa bawa paket.
- Status Berjalan/Memandu dan kelajuan: HUD tidak render semula sekarang. Tolak nilai ke stor ringan pada ~10Hz atau guna `ref` + `requestAnimationFrame` untuk teks kelajuan.

**Kriteria lulus:** Ujian manual: ambil → kad tunjuk nombor penjejakan + sasaran; hantar → wang & XP di HUD bertambah; selepas 5s kembali ke "Cari Paket"; ulang 3 kali.

### Langkah 4 — Butang interaksi sentuhan (B7)
- Tambah butang "AMBIL/HANTAR" di `TouchJoystick.tsx` (sasaran sentuh ≥ 48px, label berubah ikut konteks, nyahaktif apabila tiada zon berdekatan). Panggil `handleInteract()` yang sama.
- Ikut doktrin antislop: satu aksen tegas, kontras ≥ 4.5:1 untuk label.

**Kriteria lulus:** Dalam DevTools mod peranti (Pixel 7), gelung penuh boleh diselesaikan tanpa papan kekunci.

### Langkah 5 — Betulkan NPC (B8)
- Jana data sekali (`useState(() => generateNPCTraffic(8))`), id dari data yang sama.
- Kemas kini setiap frame dengan `delta` sebenar (buang throttle 50ms) atau kumpul `delta` di antara kemas kini.
- `heading`: paksi-z → `0 | π`; paksi-x → `±π/2`.
- Tambah ujian unit untuk `updateNPCTraffic` (balut sempadan ±200, arah).

### Langkah 6 — Kebersihan repo (B10)
- `git rm --cached tsconfig.tsbuildinfo` dan tambah `*.tsbuildinfo` ke `.gitignore`.
- `npx biome check --write src` kemudian betulkan baki secara manual (`useButtonType`, `noArrayIndexKey`, `noParameterAssign`). Jangan tambah `biome-ignore`.
- Betulkan "Balik Pos" → "Pejabat Pos".
- Kemas kini `DEVELOPMENT_STATUS.md` supaya sepadan dengan realiti (Fasa 1 & 2, dan status pelan ini).

## Gerbang QA (ECHO) — semua wajib sebelum laporan "siap"
```
npm run typecheck
npm test
npx biome check src
npm run build
```
Plus **pengesahan visual di pelayar** (`npm run dev`): tangkapan skrin atau GIF bagi (a) konsol bersih, (b) gelung penuh dengan papan kekunci, (c) gelung penuh dalam mod peranti sentuh. Laporan siap tanpa bukti visual tidak diterima — Fasa 1 & 2 dilaporkan siap tanpanya.

## Di luar skop
Gudang, minimap, chunk streaming, COD, ekonomi baharu. Ini untuk Pelan 005.

## Draf Pelan 005 (selepas 004 lulus)
Fasa 3 — Gudang bersambung ke gelung: zon pickup buka `WarehouseUI` → pilih paket sebenar dari `gamestate` (bukan rawak) → kapasiti motor (contoh 3 paket) → berbilang sasaran aktif → minimap 2D ringkas dengan penanda sasaran.
