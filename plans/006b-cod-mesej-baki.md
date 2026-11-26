# Pelan 006b — B23 (mesej "Baki salah" tidak kelihatan) + kembalikan shuffleArray

Pelaksana: C9. Perancang/penyemak: Claude. SATU commit.

## Kontrak (mesti lulus, jangan sunting)

- `src/__contract__/006b-cod-mesej-baki.test.tsx` (6 ujian), baharu.

## Punca

**B23.** `collectCod` menetapkan `interactionMessage = "Baki salah — kira semula"`, tetapi mesej itu hanya dipaparkan oleh kotak info HUD. Kotak itu tidak kelihatan semasa Panel Serah Terima terbuka di telefon. Tangkapan skrin 412×839 menunjukkan panel sama sahaja sebelum dan selepas baki salah diketik, jadi pemain tidak mendapat maklum balas.

**shuffleArray (`816eb3e`).** Commit itu menukar `shuffleArray` supaya tidak pernah memulangkan susunan asal. Tujuannya ialah menstabilkan ujian rawak `utils.test.ts` ("berbagai item"), yang gagal dengan kebarangkalian 1/120. Akibatnya kocokan tidak lagi seragam (bias), dan kod produksi diubah demi ujian yang goyah. Yang sepatutnya dibetulkan ialah ujian itu.

## Spesifikasi

### 1. `src/delivery/cod.ts`

- `export const COD_WRONG_CHANGE = "Baki salah — kira semula";`
- `collectCod` memakai pemalar ini untuk baki salah.

### 2. `src/delivery/HandoverPanel.tsx`

- Dalam cabang ada penerima, sebelum nota "Pelanggan bayar …", tambah:
  ```tsx
  {session.interactionMessage === COD_WRONG_CHANGE && <output className="wh-panel__msg">{COD_WRONG_CHANGE}</output>}
  ```
- Mesej lain (contohnya "Serah terima dibuka" dan "Bukti: foto diambil") TIDAK dipaparkan dalam panel, supaya tidak berulang dengan nota "COD diterima" dan butang bukti.
- Gaya `.wh-panel__msg` sudah wujud (dipakai oleh Panel Gudang). Mesej hilang sendiri selepas 3 s (`tick`) atau bila baki betul dipilih.

### 3. `src/lib/utils.ts` dan `src/lib/utils.test.ts`

- Kembalikan `shuffleArray` kepada Fisher-Yates asal: buang `n < 2` dan blok "Jaminan".
- `utils.test.ts` "berbagai item": gantikan `not.toEqual([1, 2, 3, 4, 5])` dengan semakan bahawa hasil ialah pilih atur, contohnya `expect([...shuffled].sort()).toEqual([1, 2, 3, 4, 5])`. Fail ini bukan kontrak, jadi boleh disunting.

## Luar skop

- Penunjuk arah di atas Ringkasan Manifest.
- Anjakan susun atur panel bila mesej muncul.

## Gate

`npx tsc --noEmit`, `npx biome check src/`, `npx vitest run` (439), knip (tiada baris baharu), `npx playwright test`.

## Pengesahan perancang (pelaksanaan rujukan, kemudian dibuang)

- Gagal dahulu: 3/6 gagal (`COD_WRONG_CHANGE` undefined; tiada `<output>` dalam dialog; shuffleArray menukar [1,2] bila Math.random ≈ 1).
- Dengan rujukan:
  - tsc 0, biome bersih, Vitest 439/439, knip tiada baris baharu, Playwright 9 passed + 3 skipped.
  - Tangkapan skrin 412×839: jalur "Baki salah — kira semula" (sempadan kiri jingga) kelihatan di atas soalan baki.
