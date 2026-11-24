# Pelan 005 Langkah 5 — Pelanggan & serah terima (DRAF)

> **DRAF — JANGAN beri kepada C9 lagi.** Ujian kontrak `src/__contract__/005-langkah-5-serah-terima.test.tsx` belum ditulis. Perancang (Claude) mesti menulis kontrak itu, mengesahkan ia gagal dan boleh dipenuhi, kemudian melengkapkan seksyen Verify dan STOP.

**Induk:** `plans/005-vertical-slice-mobile.md` Langkah 5 · master prompt H.6–H.9, I

## Reka bentuk yang dipersetujui

1. **Interaksi di alamat mesti berjalan kaki.**
   - Tukar tandatangan: `interact(session, zone, now, deps, ctx: { onFoot: boolean })`.
   - Jika masih atas motor di alamat dengan paket → `"nothing"` dengan mesej `"Turun dari motor dahulu"` (fallback = turun motor).
2. **Tiada penghantaran terus.** Alamat + paket + berjalan kaki → tindakan baharu `"open_handover"`. `session.handover = { packetId, zoneId, proofTaken: false }`.
3. **`src/delivery/handover.ts` (fungsi tulen):**
   - `takeProof(s)` → `proofTaken: true` (bukti foto simulasi)
   - `completeHandover(s, now, deps)` → perlu `proofTaken`; hantar menggunakan logik yang sekarang ada dalam `interact()` (ekstrak ke fungsi yang dikongsi, jangan salin); pulangkan `{ result: { action: "deliver", reward, xpReward }, session }`
   - `failHandover(s, now)` → `out_for_delivery → failed`, sebab `"Penerima tiada di rumah"`. Jika tiada paket `out_for_delivery` lagi → fasa baharu `"returning"`.
   - `returnFailedPackets(s, now)` → semua `failed → returned`, kemudian `closeManifest` → `complete`
4. **Alamat tanpa penerima.** Tambah `receiverHome?: boolean` (lalai `true`) pada `DeliveryZone`. `zone-delivery-3` (Pusat Industri Timur) = `false`. Di situ, `completeHandover` ditolak dan hanya "Penerima tiada" dibenarkan.
5. **Meja gudang semasa `returning`.** Tindakan `"return_packets"` memanggil `returnFailedPackets`. Label butang: `PULANGKAN PAKET`. Navigasi sudah menuju ke gudang untuk fasa selain `delivering`/`complete` (`currentNavTarget`).
6. **Stor (`src/store/delivery.ts`):**
   - `interact(now, { onFoot })` — pemanggil: `performInteract` dalam `PlayerController.tsx`, guna `playerState.isOnFoot()`
   - `takeProof()`, `confirmHandover(now)` (beri wang/XP), `reportAbsent(now)`, `cancelHandover()`
   - `setNearbyZone` keluar zon → tutup `handover`
7. **UI:**
   - `src/delivery/HandoverPanel.tsx` (DOM; dipasang dalam `GameScene3D.tsx` selepas `<WarehousePanel />`). Paparan: nama penerima, alamat, nombor penjejakan, "Prabayar". Butang: Ambil bukti → Serahkan paket; Penerima tiada; Batal. Butang ≥ 48px, gaya ikut `.wh-*`.
   - `src/delivery/Receiver.tsx` (3D; dipasang dalam `Destinations.tsx` untuk alamat `receiverHome`): figura placeholder di pintu.
8. **Butang tindakan:**
   - Alamat dengan paket: label `SERAH PAKET`. `ButtonInfo` mendapat `needsOnFoot?: boolean`.
   - `getActionButton`: jika atas motor dan `needsOnFoot` → fallback ke `TURUN MOTOR` / `BERHENTI DULU`.
9. **HUD fasa `returning`:** `"Pulangkan n paket gagal ke gudang"`.
10. **Ujian sedia ada.** `src/lib/delivery-system.test.ts` dan `interact-button.test.ts` yang menghantar terus melalui `interact()` mesti dikemas kini ke aliran baharu (`open_handover` → `takeProof` → `confirmHandover`). Semua semakan wang/XP mesti DIKEKALKAN.

## Luar skop

- COD (Pelan 006)
- B14: kamera masuk ke dalam rumah semasa pemain berdiri di pintu. Pelan berasingan.
- Skrin ringkasan manifest (Langkah 6)
