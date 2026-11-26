# Pelan 010 — 9 alamat, minimap dan kos render per alamat

Pelaksana: Claude (kelulusan pemilik 2026-11-26). SATU commit.

## Kontrak

- `src/__contract__/010-alamat-minimap.test.ts` (9 ujian).
- `tests/contract/e2e/minimap.spec.ts` (desktop dan landskap 823×309). Disahkan gagal dengan CSS lama: bertindih dengan "NAIK MOTOR".
- Dikemas kini:
  - `005-langkah-5-semakan` (senarai zon: 3 asal + 6 Pelan 010);
  - `motor-state.test` (bilangan kotak parkir);
  - `delivery-system.test` (gelung 3 manifest kini membayar COD bila paket COD).

## Perubahan

- **6 alamat baharu**: Rumah Pak Abu, Klinik Desa Sejahtera, Kedai Kopi Ah Seng, Bengkel Motor Raju, Pasar Mini Pak Din, Flat Sri Mawar.
  - Semuanya di lot yang sedia kosong, jadi susun atur bangunan tidak berubah (kontrak 11b kekal lulus).
- **Instancing:**
  - `Destinations` (rumah, bumbung, pintu, garisan parkir, pad): 5 draw call untuk semua alamat;
  - `Receiver`: 2 draw call, warna baju berbeza.
- **`DeliveryZones`:**
  - `pointLight` per zon dibuang (kos shader tinggi di telefon);
  - tiang dan papan tanda yang menutup pemain dibuang;
  - penanda alamat hanya dipaparkan bila alamat itu ada paket.
- **Minimap** (`src/navigation/Minimap.tsx` dan `minimap-math.ts`):
  - bulat, arah hadapan ke atas, jejari 90 m, dilukis ke kanvas pada 15 Hz;
  - jalan, gudang (hijau), sasaran (amber; di tepi jika jauh), alamat lain (kelabu);
  - kanan atas pada desktop dan potret; kiri atas dalam landskap rendah.

## Pengesahan

- tsc 0, biome bersih, Vitest 488/488, knip tiada baris baharu, Playwright 13 passed + 5 skipped.
- Draw call:
  - desktop: mula 86 (sebelum 99), gudang 72, alamat 44;
  - pixel-7: 44–62.

## Belum

- Kamera di pintu rumah masih rapat dengan watak (had Langkah 12).
- Ujian telefon.
