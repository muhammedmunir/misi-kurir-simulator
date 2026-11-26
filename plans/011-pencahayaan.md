# Pelan 011 — Pencahayaan siang dan suasana

Pelaksana: Claude (kelulusan pemilik 2026-11-26). SATU commit.

## Kontrak

- `src/__contract__/011-pencahayaan.test.ts` (6 ujian).

## Perubahan

- `Atmosphere.tsx`:
  - kubah langit bergradien (ufuk → zenit);
  - kabus 90–320 m dan latar dalam warna ufuk yang sama;
  - lampu hemisfera (langit/tanah) dan matahari petang tropika.
  - Matahari mengikut pemain, dengan kotak bayang-bayang ±32 m.
  - Bayang-bayang lembut (PCF): Rendah = tiada; Sederhana = desktop sahaja; Tinggi = sentiasa.
  - Kereta NPC dan penanda zon tidak membuang bayang.
- Lampu ambient/arah malam dan kubah langit gelap dibuang.
- Rumput `#5f8a45`, dan jalan asfalt kelabu `#55575c` (sebelum ini hampir hitam).
- **Palet bangunan siang:** krim, pastel, terakota. Ia dipetakan semasa melukis, jadi data susun atur dan kontrak 11b tidak berubah. Tingkap kaca gelap dan pintu kayu.
- **HUD:** kad legap gelap (boleh dibaca di atas langit cerah); gradien atas/bawah dikurangkan.
- **Minimap:** warna siang.

## Pengesahan

- tsc 0, biome 0 (kod keluar), Vitest 500/500, knip tiada baris baharu, Playwright 13 passed + 5 skipped.
- Draw call: desktop mula 95 (dengan pas bayang-bayang; bajet 110); pixel-7 53 (tiada bayang-bayang; bajet 80).
- Tangkapan skrin 1280×720: langit siang, bayang-bayang motor dan kurier di jalan, bangunan pastel.

## Belum

- FPS di telefon.
- Aset model sebenar (Pelan 012).
