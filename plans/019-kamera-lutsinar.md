# Pelan 019 — Dinding yang menghalang kamera menjadi lutsinar

Pelaksana: **C9**. Penyemak: Claude (kemudian). SATU commit pada cawangan `c9/019-kamera`.

## Masalah

Semasa berjalan kaki dekat dinding atau di pintu rumah (bukan semasa serah terima, yang sudah ada `handoverShot`), `clampCamera` menarik kamera rapat ke belakang kepala watak.

## Spesifikasi

1. **`CameraFollow.tsx`:** semasa berjalan kaki, JANGAN klamp kamera ke dalam jarak < 3 m.
   - Kekalkan kamera pada jarak penuh, dan jadikan objek yang menghalang sinar kamera → watak **separa lutsinar**.
   - Ini hanya untuk bangunan dan rumah (`Buildings`, `Destinations`).
2. **Pelaksanaan:**
   - Fungsi tulen baharu `occluders(eye, cam, boxes): number[]` dalam `camera-collision.ts` mengembalikan indeks kotak yang memotong segmen kamera → mata.
   - Komponen bangunan/rumah menetapkan kelutsinaran setiap instance yang menghalang (contohnya instance colour alpha, atau pindahkan instance itu ke mesh lutsinar kedua).
   - Pilih cara yang paling ringan dan nyatakan dalam laporan.
3. **Semasa memandu motor**, kelakuan sekarang dikekalkan.
4. **Ujian:** `occluders` dalam fail ujian biasa. Kontrak `005-langkah-12` (kamera tidak di dalam kotak) MESTI kekal lulus tanpa disunting. Jika bercanggah, BERHENTI dan laporkan.
5. **Visual:** tangkapan skrin di pintu `zone-delivery-1` selepas `__mks.goTo`. Watak kelihatan penuh, dan rumah di belakang kamera lutsinar.

## Gate

tsc, biome (kod keluar 0), vitest, knip, playwright.
