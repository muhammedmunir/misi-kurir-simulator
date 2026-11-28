# Pelan 018 — Pelanggan yang pelbagai (master prompt K)

Pelaksana: **C9**. Penyemak: Claude (kemudian). SATU commit pada cawangan `c9/018-pelanggan`.

## Matlamat

Setiap serahan berbeza. Kini penerima sentiasa ada, kecuali Pusat Industri Timur (`receiverHome: false`).

## Spesifikasi

1. **Fungsi tulen baharu `src/delivery/customer.ts`:**
   ```ts
   export type CustomerMood = "home" | "absent" | "refuse" | "neighbour";
   export function rollCustomer(rng: () => number, zone: DeliveryZone): CustomerMood;
   ```
   - Jika `zone.receiverHome === false` → `"absent"`.
   - Selain itu: 75% `home`, 10% `absent`, 8% `neighbour`, 7% `refuse`.
2. Keadaan pelanggan digulung **sekali** semasa serah terima dibuka (`interact` → `open_handover`) dan disimpan dalam `DeliveryHandover.mood?: CustomerMood`. rng ialah `deps.rng`. Kontrak `005-langkah-5-serah-terima` (dikemas kini oleh perancang) menuntut `mood: "home"` untuk `testDeps()` (rng 0.5) melalui `toMatchObject`, jadi medan tambahan seperti `neighbourAvailable` dibenarkan.
3. **Kesan pada `HandoverPanel.tsx` dan logik:**
   - `home`: seperti sekarang.
   - `absent`: nota "Tiada orang di rumah". Pilihan:
     - "Titip pada jiran" (jika rng < 0.5 semasa gulungan; simpan `neighbourAvailable`), yang menyerahkan paket dengan ganjaran −20%;
     - atau "Penerima tiada" (gagal → dipulangkan).
   - `neighbour`: penerima tiada tetapi jiran sanggup menerima. Butang "Serahkan kepada jiran" (ganjaran penuh), memerlukan bukti.
   - `refuse`: nota "Pelanggan menolak paket". Hanya "Pelanggan menolak", yang menandakan paket `failed` dengan sebab `refused` (paket dipulangkan ke gudang).
   - COD hanya untuk `home` dan `neighbour`.
4. **Ringkasan manifest:** tambah kiraan `refused`. Kemas kini jenis `ManifestSummary` secara serasi (medan pilihan, nilai lalai 0 dalam `loadSaved`). Ringkasan BAHARU yang dijana `close_manifest` mesti SENTIASA mengandungi `refused` (0 jika tiada); kontrak `005-langkah-6-tutup-manifest` menuntut `refused: 0`.
5. **Ujian:** fail ujian biasa `src/delivery/customer.test.ts` (taburan 1000 gulungan dalam ±3%; setiap laluan panel). JANGAN sunting `src/__contract__/`. Jika kontrak lama gagal kerana mood baharu, buat mood lalai `home` bila `deps.rng` tidak dipanggil dalam laluan ujian itu, dan JANGAN ubah kontrak. Jika masih bercanggah, BERHENTI dan laporkan.
6. **E2E:** kontrak `vertical-slice` dan `landscape-panels` **sudah dikemas kini oleh perancang**. Ia memanggil `__mks.setNextCustomer(mood)` sebelum setiap serah terima: paket 1 `"home"`, paket 2 `"absent"`, dan untuk panel landskap yang dibuka semula selepas Batal, `"home"` sekali lagi. C9 MESTI melaksanakan API ini (dev sahaja, dalam `src/dev/test-api.ts` dan jenis `MksTestApi`):
   - `setNextCustomer(mood: CustomerMood): void` menetapkan mood untuk **SATU** serah terima yang dibuka seterusnya (sekali guna). Selepas itu, kembali kepada `rollCustomer`.
   - Keutamaan: `zone.receiverHome === false` → sentiasa `"absent"`, walaupun `setNextCustomer` dipanggil. Pusat Industri tiada orang, dan laluan "Penerima tiada" dalam E2E bergantung pada ini.
   - Mood `"absent"` mesti memaparkan butang "Penerima tiada" (bersama "Titip pada jiran" jika `neighbourAvailable`).
   - Simpan mood tertunda dalam stor (contohnya `useDeliveryStore` atau pemboleh ubah modul dalam logik serah terima), dan baca ketika `open_handover`. JANGAN baca daripada `window` dalam logik produksi.
   - Kontrak E2E ini akan GAGAL sehingga API ini wujud. Itu dijangka.
7. **Dokumen:** CHANGELOG, DEVELOPMENT_STATUS (baris pelanggan NPC).

## Gate

tsc, biome (kod keluar 0), vitest, knip, playwright.
