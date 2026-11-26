# Pelan 012a + 013b — Watak GLB beranimasi dan interaksi fizikal

Pelaksana: Claude (kerja berat). Aset dimuat turun oleh pemilik ke `assets-src/` (2026-11-26).

## Aset

Kenney Mini Characters (CC0): `character-worker` sebagai kurier; `male-a`, `male-c`, `female-b` dan `female-d` sebagai penerima. 32 animasi setiap watak. Hanya 5 GLB (~1.3 MB) dan `colormap.png` disalin ke `public/models/characters/`.

## Perubahan

- **`CharacterGLB.tsx`:** `useGLTF` + `SkeletonUtils.clone` + `useAnimations`, dengan peralihan pudar (crossfade) antara klip.
  - Skala tinggi 1.45 m. Gaya chibi: lebar ≈ 0.93 × tinggi, jadi 1.75 m terlalu lebar (1.6 m).
- **`courier-anim.ts`:** `courierClip()` memilih klip: drive, holding-both, sprint, walk atau idle, dengan kelajuan klip ikut laju.
- **`PlayerController`:**
  - kurier GLB; penunggang GLB dengan klip `drive` di atas tempat duduk;
  - 1–3 kotak di tangan, atau guni (≥ 4) di bahu;
  - kurier menghadap penerima semasa serah terima.
- **`Receiver`:**
  - watak GLB keluar ke pintu bila pemain dalam 45 m;
  - klip `interact-right` semasa serah terima;
  - wang kertas hijau jika COD belum dikutip.
- **`CameraFollow`:** `handoverShot()` dari sisi jalan, tidak pernah terhalang rumah. Skrin lebar: dianjak supaya watak di kiri. Potret: watak di ~20% atas, di atas helaian panel.
- **CSS:** `.wh-panel` di kanan pada skrin ≥ 960 px (bukan telefon).
- **Dibuang:** `CourierModel.tsx` dan `courier-pose.ts` (model kotak Pelan 008a).

## Kontrak

- `008-model-kurier.test.ts` ditulis semula (aset wujud, courierClip, PlayerController, penerima, kamera serah terima).
- `010` dikemas kini (penerima GLB).

## Pengesahan

- tsc 0 (kecuali kontrak 014 yang menunggu C9), biome 0, Vitest 504 lulus + 6 gagal (kontrak 014 sahaja), knip tiada baris baharu (drei kini digunakan), Playwright 13 passed + 5 skipped.
- Draw call: desktop 66 / 50 / 28 (sebelum 83 / 69 / 41).
- Tangkapan skrin:
  - kurier berjalan; dua kotak di tangan; guni di bahu; menunggang;
  - serah terima desktop (panel kanan, penerima menghulur tangan) dan potret 412×839.

## Belum

- Pelan 012b: bangunan, rumah, jalan dan kereta GLB.
- Ujian telefon.
