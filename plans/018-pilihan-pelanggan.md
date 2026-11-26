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
2. Keadaan pelanggan digulung **sekali** semasa serah terima dibuka (`interact` → `open_handover`) dan disimpan dalam `DeliveryHandover.mood?: CustomerMood`. rng ialah `deps.rng`.
3. **Kesan pada `HandoverPanel.tsx` dan logik:**
   - `home`: seperti sekarang.
   - `absent`: nota "Tiada orang di rumah". Pilihan:
     - "Titip pada jiran" (jika rng < 0.5 semasa gulungan; simpan `neighbourAvailable`), yang menyerahkan paket dengan ganjaran −20%;
     - atau "Penerima tiada" (gagal → dipulangkan).
   - `neighbour`: penerima tiada tetapi jiran sanggup menerima. Butang "Serahkan kepada jiran" (ganjaran penuh), memerlukan bukti.
   - `refuse`: nota "Pelanggan menolak paket". Hanya "Pelanggan menolak", yang menandakan paket `failed` dengan sebab `refused` (paket dipulangkan ke gudang).
   - COD hanya untuk `home` dan `neighbour`.
4. **Ringkasan manifest:** tambah kiraan `refused`. Kemas kini jenis `ManifestSummary` secara serasi (medan pilihan, nilai lalai 0 dalam `loadSaved`).
5. **Ujian:** fail ujian biasa `src/delivery/customer.test.ts` (taburan 1000 gulungan dalam ±3%; setiap laluan panel). JANGAN sunting `src/__contract__/`. Jika kontrak lama gagal kerana mood baharu, buat mood lalai `home` bila `deps.rng` tidak dipanggil dalam laluan ujian itu, dan JANGAN ubah kontrak. Jika masih bercanggah, BERHENTI dan laporkan.
6. **E2E:** `vertical-slice` dan `landscape-panels` mesti kekal lulus. Rawak boleh menyebabkan `refuse`; jika ujian E2E gagal kerana itu, tambah API ujian `__mks.setNextCustomer(mood)` (dev sahaja) dan JANGAN ubah ujian E2E kontrak. Laporkan.
7. **Dokumen:** CHANGELOG, DEVELOPMENT_STATUS (baris pelanggan NPC).

## Gate

tsc, biome (kod keluar 0), vitest, knip, playwright.
