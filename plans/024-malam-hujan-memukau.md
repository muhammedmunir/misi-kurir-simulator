# Pelan 024 — Malam dan hujan yang memukau

Pelaksana: **C9**. Penyemak: Claude. SATU commit pada `c9/024-suasana` (dicabang daripada `c9/023-isi-dunia`).

## Masalah (tangkapan `test-results/pelan-020/`)

Pelan 020 berfungsi, tetapi rupanya belum meyakinkan:
- **Malam (19:30):** seluruh skrin hanya digelapkan. Lampu jalan tidak menerangi jalan, tingkap tidak bercahaya, dan lampu motor tiada.
- **Hujan:** zarah ialah titik segi empat putih, bukan garisan hujan. Langit masih cerah, dan jalan tidak nampak basah.

## Spesifikasi

1. **Lampu jalan (murah untuk telefon; tanpa `PointLight` bagi setiap lampu):**
   - Kolam cahaya: satu `instancedMesh` satah bulat di atas jalan (y = 0.02) di bawah setiap lampu. Bahannya `MeshBasicMaterial` dengan tekstur kecerunan jejari (`CanvasTexture`), `transparent`, `blending: AdditiveBlending`, dan `depthWrite: false`. Kelegapan ikut `dayPhase(...).lampsOn` dengan fade 1 s.
   - Kepala lampu: bahan emisif kuning hangat `#ffd9a0` bila lampu menyala.
2. **Tingkap bercahaya pada waktu malam:**
   - Bahan `colormap` Kenney (bangunan dan rumah) diberi `emissiveMap` = `colormap` yang sama, dengan `emissiveIntensity` 0 pada siang dan 0.6–0.9 pada malam. Laraskan supaya hanya kawasan kaca/tingkap yang nampak menyala.
   - Jika `emissiveMap` keseluruhan menerangi dinding, jana topeng tingkap: `CanvasTexture` daripada `colormap`, piksel biru/kaca = putih, selebihnya hitam. Kerja ini dibuat sekali semasa dimuat, dalam `merged-model.ts`.
   - ~30% rumah sahaja yang bertingkap menyala. Guna atribut instans atau dua kumpulan bahan, BUKAN satu bahan bagi setiap rumah.
3. **Lampu hadapan motor:**
   - Satu `SpotLight` sahaja (tiada bayang), dilekatkan pada motor, dan dihidupkan pada waktu malam atau semasa hujan;
   - kon cahaya palsu (`ConeGeometry` additive, lutsinar) untuk rupa volumetrik;
   - lampu belakang merah emisif.
4. **Hujan:**
   - Zarah diganti dengan garisan: `LineSegments` atau `instancedMesh` satah nipis 0.02 × 0.5 m, condong ikut arah angin, dengan kelegapan 0.35. Ia bergerak bersama kamera (kotak 30 × 20 × 30 m), tiada `Points` segi empat;
   - langit mendung: lerp warna langit, kabus dan cahaya ke kelabu-biru `#6b7685`, dan kabus lebih dekat;
   - jalan basah: `roughness` jalan diturunkan ke 0.25 dan warna digelapkan 15% ketika hujan (lerp 3 s). Pantulan cahaya lampu malam muncul sendiri daripada specular;
   - percikan: zarah kecil di sekitar tayar motor bila hujan dan laju > 10 km/j (pilihan, jika bajet membenarkan);
   - bunyi hujan: hingar putih ditapis (*bandpass*) dalam `src/audio/`, yang mengikut tetapan kelantangan sedia ada.
5. **Senja dan subuh:** warna langit jingga-merah jambu sekitar 18:45–19:30 dan 06:30–07:15. Gunakan lerp warna dalam `Atmosphere.tsx` mengikut `dayPhase`.
6. **Bajet:** draw call desktop ≤ 110, Pixel 7 ≤ 80, dan FPS desktop tidak jatuh > 10% berbanding Pelan 023. Laporkan `renderInfo()`.
7. **Ujian:**
   - fail biasa `src/world/atmosphere-mix.test.ts` untuk fungsi tulen pencampur warna dan nilai mengikut (masa, hujan): siang cerah, senja, malam, hujan siang dan hujan malam;
   - pastikan semua kontrak sedia ada lulus.

## Tangkapan skrin wajib — `.playwright-mcp/plan-024/`

Sudut dan kedudukan mesti sama dengan `test-results/pelan-020/`, supaya boleh dibandingkan sebelum dan selepas:
- `1200.png`, `1900-senja.png`, `2130-malam.png`, `hujan-siang.png`, `hujan-malam.png`, `malam-motor.png` (lampu hadapan di jalan).

## Gate

tsc, biome src/ (kod keluar 0), vitest, knip tanpa baris baharu, playwright, bajet render.

## STOP

Bajet gagal selepas mengurangkan: laporkan ciri mana yang paling mahal (draw call / ms).
