# Pelan 013 — Interaksi fizikal paket (permintaan pemilik 2026-11-26)

Pemilik mahu kerja kurier dilakukan secara fizikal:
- angkat paket di gudang, letak dalam motor (guni jika banyak);
- ambil paket dari motor di alamat, bawa ke penerima;
- penerima menghulur tangan (dan duit jika COD) lalu menerima paket.

## 013a — Logik (SIAP)

Kontrak: `src/__contract__/013-angkat-paket.test.ts` (8 ujian). Juga dikemas kini: `005-langkah-5-semakan` S1 (tekan pertama di sebelah motor kini meletakkan paket).

- `DeliverySession.carry`: id paket di tangan. Disimpan dalam save v1 sebagai medan tambahan dan disahkan (setiap id mesti dalam kargo).
- **Berangkat:** kurier memegang semua paket yang dimuat (1 kotak, 2–3 bertindan, ≥ 4 guni).
- **Di sebelah motor:** LETAK DALAM MOTOR, kemudian AMBIL PAKET (alamat dalam 30 m), kemudian NAIK MOTOR. Tidak boleh menunggang sambil memegang barang.
- **Di pintu:** SERAH PAKET hanya jika paket itu di tangan. Jika tidak, butang menunjukkan "AMBIL DI MOTOR".
- **Selepas diserahkan:** paket keluar dari tangan.
- **Penerima tiada:** paket kekal di tangan dan mesti diletak semula dalam motor.
- **API ujian:** `goToMotor()`, `parkAt(zoneId)`, dan `state().carry`.

## 013b — Visual (SELEPAS Pelan 012, watak GLB beranimasi)

Postur memegang kotak atau guni, guni diikat pada motor, penerima menghulur tangan, dan wang COD. Ditangguh supaya tidak dibina dua kali: animasi ini perlu dibuat pada rangka watak sebenar, bukan model kotak sementara.
