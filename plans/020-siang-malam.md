# Pelan 020 — Kitaran siang/malam dan hujan

Pelaksana: **C9**. Penyemak: Claude (kemudian). SATU commit pada cawangan `c9/020-siang-malam`.

## Spesifikasi

1. **Fungsi tulen `src/world/daytime.ts`:**
   ```ts
   export function dayPhase(minutes: number): { sun: number; sky: string; horizon: string; lampsOn: boolean };
   ```
   - Jam permainan: 1 hari = 24 minit sebenar. Mula 08:00.
   - `sun`: 0…1 (intensiti matahari).
   - `lampsOn` dari 19:00 hingga 07:00.
2. **`Atmosphere.tsx`:** warna langit/ufuk/kabus dan intensiti matahari serta hemisfera ikut `dayPhase`, dikemas kini ≤ 2 kali sesaat (bukan setiap frame untuk bahan). Matahari kekal mengikut pemain.
3. **Lampu jalan:** bahagian lampu dalam `CityRoads` bercahaya (emissive) bila `lampsOn`. Tiada `pointLight` (prestasi telefon).
4. **Hujan** (pilihan pemain dalam Tetapan, lalai "Auto"): zarah hujan ringkas sebagai satu `THREE.Points` atau `instancedMesh`, ≤ 2000 titik, mengikut kamera. Jalan lebih gelap dan berkilat semasa hujan. Motor: cengkaman berkurang (`stepMotor`: kadar belok × 0.85, brek × 0.8 semasa hujan).
5. **HUD:** jam kecil (contohnya "08:30") di sebelah wang.
6. **Simpan/muat:** jam permainan disimpan dalam save v1 (medan tambahan, serasi dengan simpanan lama).
7. **Ujian:** `daytime.test.ts` (fasa pada 06:00/12:00/20:00, `lampsOn`), dan ujian `stepMotor` semasa hujan dalam fail ujian biasa. JANGAN sunting `src/__contract__/`. Kontrak `011-pencahayaan` mesti kekal lulus. Jika bercanggah, BERHENTI dan laporkan.
8. **Visual:** tangkapan skrin pada 12:00, 19:30 dan semasa hujan.

## Gate

tsc, biome (kod keluar 0), vitest, knip, playwright (render-budget mesti lulus).
