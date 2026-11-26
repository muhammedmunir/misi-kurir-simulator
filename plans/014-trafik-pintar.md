# Pelan 014 — Trafik pintar

Pelaksana: **C9**. Perancang/penyemak: Claude. SATU commit.

## Kontrak (mesti lulus, jangan sunting)

- `src/__contract__/014-trafik.test.ts` (11 ujian), baharu.
- Ujian sedia ada `src/lib/npc-traffic.test.ts` mesti kekal lulus tanpa disunting.

## Matlamat

Kereta NPC berkelakuan seperti trafik sebenar:
1. Berhenti di garis berhenti sebelum setiap simpang, menunggu, kemudian meneruskan perjalanan.
2. Tidak merempuh kereta di hadapan dalam lorong yang sama.
3. Berhenti bila pemain (berjalan atau bermotor) berada di hadapannya dalam lorong yang sama.
4. Laju berubah secara beransur (tiada lompatan laju).

## Spesifikasi

### 1. `src/lib/npc-traffic.ts`

- Eksport pemalar baharu:
  - `STOP_LINE = 8`: jarak garis berhenti dari pusat simpang (m).
  - `STOP_SECONDS = 1.5`: masa menunggu (s).
  - `FOLLOW_GAP = 5`: jarak minimum ke kereta atau pemain di hadapan (m).
- `NPCTrafficVehicle` ditambah medan **pilihan**:
  - `cruise?: number`: laju jelajah asal. Diisi pada kemas kini pertama daripada `speed`.
  - `waitLeft?: number`: baki masa menunggu (s).
  - `lastStop?: number | null`: pusat simpang terakhir di mana kereta berhenti, supaya ia tidak berhenti dua kali di simpang yang sama.
- Tandatangan baharu:
  ```ts
  updateNPCTraffic(vehicles, delta, ctx?: { player?: { x: number; z: number } })
  ```
  Panggilan lama tanpa `ctx` mesti kekal berfungsi.
- **Simpang:** pusat simpang ialah gandaan 40 dalam julat −120…120 sepanjang paksi gerak. Garis berhenti berada pada `pusat − arah × STOP_LINE`.
  - Bila kereta tiba di garis berhenti (dan `lastStop` ≠ pusat itu), ia berhenti dan menetapkan `waitLeft = STOP_SECONDS` serta `lastStop = pusat`.
- **Kereta di hadapan:** kereta lain dengan `roadAxis`, `roadValue` dan `direction` yang sama, dan berada di hadapan. Jarak bebas = jarak − `FOLLOW_GAP`.
- **Pemain:** jika jarak sisi pemain ke lorong kereta < 2 m dan pemain berada 0–25 m di hadapan, jarak bebas = jarak − `FOLLOW_GAP`.
- **Laju sasaran:** 0 jika `waitLeft > 0`; selain itu `cruise`, tetapi dihadkan kepada `sqrt(2 × brek × jarak bebas)` supaya kereta membrek sebelum halangan.
  - Pecutan ≤ 4 m/s² dan brek ≤ 9 m/s². Kontrak menyemak lompatan ≤ 10 m/s² setiap langkah.
  - Jangan potong laju terus ke 0 bila tiba di halangan. Hadkan langkah kedudukan kepada jarak bebas, dan biarkan laju turun mengikut brek.
- **Pusingan dunia:** −200…200 kekal seperti sedia ada.

### 2. `src/components/3d/NPCTraffic.tsx`

Ubah SATU baris sahaja, iaitu panggilan dalam `useFrame`:
```ts
const updated = updateNPCTraffic(dataRef.current, Math.min(delta, 0.05), { player: playerState.getPosition() });
```
Tambah `import { playerState } from "./PlayerController";`. **Jangan ubah instancing atau bahagian lain fail ini.**

## Luar skop

Lampu isyarat, kereta membelok, pejalan kaki, NPC mengelak pemain secara sisi.

## Gate

`npx tsc --noEmit`, `npx biome check src/` (semak kod keluar 0; jangan `| tail -1`), `npx vitest run`, knip (tiada baris baharu berbanding baseline), `npx playwright test`.

## Pengesahan perancang (pelaksanaan rujukan, kemudian dibuang)

- Gagal dahulu: 6/11 gagal (pemalar undefined; tiada berhenti, merempuh, tidak berhenti untuk pemain; NPCTraffic tidak menghantar pemain).
- Dengan rujukan (~70 baris dalam `npc-traffic.ts`): tsc 0, biome 0, Vitest 511/511, knip tiada baris baharu, Playwright 13 passed + 5 skipped.
