# Pelan 008a — Model kurier dan kapcai (dibina dengan kod)

Pelaksana: Claude (kelulusan pemilik 2026-11-26). SATU commit.

## Kenapa bukan aset muat turun dahulu

Semakan sumber CC0 (2026-11-26):
- Quaternius Universal Animation Library (GLB): animasi sahaja; model watak tidak dinyatakan.
- Ultimate Animated Character Pack: FBX/OBJ sahaja.
- Tiada motor atau skuter CC0 di Quaternius atau Kenney.
- Muat turun dari itch.io perlu diklik secara manual.

Pelan 008b (aset GLB sebenar) kekal sebagai pilihan jika pemilik memuat turun pek watak sendiri.

## Kontrak

- `src/__contract__/008-model-kurier.test.ts` (9 ujian).

## Perubahan

- `courier-pose.ts` (tulen):
  - `courierPose()`: diam, berjalan atau berlari (ayunan dan lutut ikut gaya langkah), duduk menunggang;
  - `advancePhase()`: fasa langkah ikut jarak sebenar.
- `CourierModel.tsx`:
  - kurier ~1.75 m dengan 8 sendi (pinggul, lutut, bahu, siku);
  - topi keledar amber dengan visor, jaket biru tua dengan jalur amber, beg kurier.
- `PlayerController.tsx`:
  - kurier berjalan dengan animasi langkah;
  - kapcai underbone: fork, perisai kaki, lampu depan, hendal, lantai, badan belakang, tempat duduk, kotak penghantaran amber, lampu belakang, ekzos;
  - penunggang ialah anak kumpulan motor, jadi ia condong bersama motor.

## Pengesahan

- tsc 0, biome bersih, Vitest 479/479, knip tiada baris baharu, Playwright 11 passed + 5 skipped.
- Draw call:
  - desktop: mula 99, gudang 73, alamat 58 (bajet 110; rapat di titik mula);
  - pixel-7: 46–58 (bajet 80).
- Tangkapan skrin Chrome 1280×720: langkah berlari, penunggang di atas kapcai dengan kotak, dan condong ke kiri pada 64 km/j.

## Belum

- Ujian telefon (FPS dengan model baharu).
- Postur penunggang: tangan belum benar-benar mencapai hendal.
