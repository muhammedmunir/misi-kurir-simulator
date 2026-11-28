# Pelan 025 — Skala dunia seragam

Pelaksana: **C9**. Penyemak: Claude. SATU commit pada `c9/025-skala-dunia` (dicabang daripada master `a55536e`).

Ini pelan pertama daripada tiga untuk aduan pemilik bahawa "watak dan dunia masih pelik". Ia menangani tiga perkara: rupa, saiz dan gerakan.
- **025: saiz dan nisbah dunia.** Pelan ini.
- 026: rupa watak supaya sepadan dengan dunia (prototaip, pemilik memilih).
- 027: gerakan watak (audit, kemudian pembetulan).

025 dibuat dahulu kerana 026 dan 027 hanya boleh dinilai bila skala dunia sudah betul.

## Masalah (diukur oleh perancang)

Watak berketinggian 1.75 m, dan itu betul. Yang salah ialah dunia. Setiap model Kenney dimuatkan ke kotak sembarangan melalui `fitMatrix`, yang meregang setiap paksi secara berasingan:

| Objek | Saiz asli GLB (x × y × z) | Dipadankan ke | Regangan |
|---|---|---|---|
| `building-type-r` (rumah) | 1.03 × 1.14 × 1.02 | 6 × 4.5 × 7 | nisbah paksi 1.45: dipenyekkan, pintu jadi rendah dan lebar |
| `building-type-m` (rumah) | 1.43 × 0.74 × 1.43 | 6 × 4.5 × 7 | ditinggikan 1.45× |
| bangunan bandar (`buildingLayout`) | contohnya `building-a` 0.88 × 1.29 × 0.94 | lebar/dalam 6–14 m rawak, tinggi 5–25 m rawak | nisbah sehingga 1.39; tingkap berlainan saiz antara bangunan (2.6×) |
| kereta trafik | `sedan` 1.50 × 1.45 × 2.55 | 1.6 × ? × **3.0 m** | lebih pendek daripada kereta diparkir (4.1 m) |

Akibatnya pintu, tingkap dan kereta berlainan saiz di antara satu sama lain dan berbanding watak. Mata nampak "pelik" walaupun setiap model, bila dilihat sendirian, nampak elok.

## Kontrak

`src/__contract__/025-skala-seragam.test.ts` (ditulis oleh perancang; gagal pada master). JANGAN sunting. Kontrak membaca saiz asli terus daripada GLB, jadi nilai tidak boleh dipalsukan dalam kod.

- **Rumah suburban** (`blockPlacements` building-type-* dan `destinationHouses`):
  - nisbah skala antara paksi ≤ 1.04;
  - satu faktor skala untuk semua rumah (±5%), dalam julat 5–8.
- **Bangunan komersial** (`buildingLayout` melalui `commercialBuildingModel`, dan kedai dalam `blockPlacements`):
  - nisbah ≤ 1.04;
  - satu faktor skala untuk semua (±10%).
- **Kereta:**
  - kereta diparkir berukuran 3.8–4.8 × 1.7–1.95 × 1.4–2.0 m;
  - fungsi baharu `trafficCarSize(model)` dalam `car-models.ts` (model dalam bentuk `car-kit/sedan`) memulangkan saiz yang sama dengan kereta diparkir;
  - `NPCTraffic.tsx` mesti menggunakannya, dan `CAR_LENGTH = 3.0` dibuang.

- **Kontrak lama yang diselaraskan oleh perancang** (selepas C9 STOP):
  - **009** `liveTrafficRects`: kotak kenderaan ke-i dalam senarai live = `trafficCarSize(CAR_MODELS[carModelFor(i)])` (tanpa `/models/` dan `.glb`), w/d ditukar mengikut `roadAxis`, berpusat pada kedudukan kenderaan. Gunakan indeks senarai, sama seperti `NPCTraffic.tsx`.
  - **010**: saiz rumah alamat tidak lagi `HOUSE` tetap. Ujian kini memeriksa:
    - `h.x = lot.x`;
    - rumah berada dalam dalaman lot (±14);
    - pintu di hadapan rumah;
    - model `building-type-[a-u]`;
    - `cameraObstacles()` ada kotak yang sama saiz dengan setiap rumah (maxY = h).
  - Jika `HOUSE.width/height/depth` tidak lagi digunakan, buang atau kekalkan ikut knip. `HOUSE.zOffset/doorOffset` boleh kekal.

- **Ujian unit biasa** (di luar `src/__contract__/` dan `tests/contract/`) yang menetapkan saiz lama secara tetap, contohnya `kenney-building-model.test.ts`, `city-blocks.test.ts` dan ujian kotak trafik: C9 BOLEH mengemas kininya supaya ikut saiz model × faktor. Jangan berhenti kerana ini.
  - Kekalkan semakan model, turutan dan kedudukan.
  - Senaraikan setiap jangkaan yang diubah (fail:baris, lama → baharu) dalam laporan.
  - STOP hanya untuk percanggahan dengan fail kontrak.

## Spesifikasi

1. **Kalibrasi pintu.** Ukur tinggi bukaan pintu dalam satu model rumah suburban dan satu model komersial (unit asli; cari daripada geometri, contohnya segi empat gelap pada muka hadapan).
   - Pilih faktor skala supaya pintu ≈ 2.1 m (julat 2.0–2.3 m). Satu faktor untuk suburban, satu untuk komersial.
   - Laporkan ukuran ini. Jika pintu 2.0–2.3 m mustahil dalam julat 5–8 bagi suburban, BERHENTI dan lapor nilai.
2. **Rumah:** `w/h/d` setiap rumah = saiz asli × faktor skala. Ia tidak lagi ditetapkan secara manual.
   - Susun semula `blockPlacements` supaya kontrak 023 kekal lulus: tiada pertindihan, koridor pintu, ≥ 3 bangunan setiap blok, pagar ≥ 20, laluan kereta ≥ 10 dan kereta ≥ 10.
   - Pilih model rumah yang muat (contohnya `type-r`, yang lebih kecil, untuk lot sempit). Jangan regang.
   - `destinationHouses`: `HOUSE.width/height/depth` diganti dengan saiz model × faktor. Jika saiz rumah alamat berubah, `cameraObstacles` dan `worldColliders` mesti mengikut, kerana kontrak 007/012/023 mengira daripada fungsi yang sama.
3. **Bangunan bandar:** `buildingLayout()` menetapkan `width/height/depth` daripada model yang dipilih × faktor komersial, bukan rawak.
   - Pilih model mengikut ruang lot (contohnya `skyscraper-*` hanya bila lot muat).
   - Pilihan mesti deterministik dan tidak menggunakan `Math.random`.
   - Kotak perlanggaran dan kamera mengikut saiz baharu secara automatik.
4. **Kereta:**
   - Satu jadual saiz sebenar setiap model dalam `car-models.ts`: sedan/teksi ≈ 4.5 × 1.8 × 1.45; hatchback ≈ 4.0 × 1.75 × 1.45; SUV ≈ 4.6 × 1.9 × 1.75; van/delivery ≈ 4.8 × 1.9 × 1.95. Semua dalam julat kontrak.
   - Ia digunakan oleh kereta diparkir dan trafik.
   - Kereta Kenney sememangnya berbentuk mainan (tinggi ≈ lebar). Kereta dibenarkan diregang untuk mencapai saiz sebenar; ini pengecualian yang disengajakan.
   - Laporkan nisbah regangan setiap kereta.
   - Lorong trafik dan `liveTrafficRects()` mesti mengikut saiz baharu.
5. **Tiang elektrik:** jangan ubah, kerana pengecualian sengaja (lihat `streetProps`).
6. **Prestasi:** bilangan instans boleh berubah. Draw call tidak boleh naik melebihi bajet (desktop ≤ 110, Pixel 7 ≤ 80). Laporkan `renderInfo()` sebelum dan selepas.

## Tangkapan skrin wajib — `.playwright-mcp/plan-025/`

Gunakan sudut yang sama sebelum (master `a55536e`) dan selepas, pada 12:00 tanpa hujan, dengan kamera dan bingkai sepadan. Gabungkan setiap pasangan menjadi satu imej `sebelum-selepas-<sudut>.png`.
- `pintu`: kurier berdiri di pintu rumah alamat (`zone-delivery-1`), dari hadapan. Pintu mesti lebih tinggi sedikit daripada kurier.
- `jalan`: kurier di kaki lima jalan perumahan, dengan rumah dan kereta diparkir dalam bingkai.
- `trafik`: kereta trafik melintas di sebelah kurier yang berdiri di tepi jalan.
- `bandar`: pandangan jalan ke arah bangunan komersial.
- `luas`: pandangan atas condong ke satu blok perumahan.

Semak sendiri setiap imej sebelum melapor.

## Luar skop

Rupa watak (026), animasi (027), model baharu dan pencahayaan.

## Gate

tsc, biome src/ (kod keluar 0), vitest (SEMUA kontrak, termasuk 007/012/023), knip@6.44.1 tanpa baris baharu berbanding `a55536e`, playwright (semua profil), bajet render.

## STOP

- Kontrak 025 bercanggah dengan kontrak lama (contohnya 023 tidak boleh dipenuhi dengan rumah bersaiz seragam): berhenti dan lapor fail, baris dan nilai.
- Pintu tidak boleh mencapai 2.0–2.3 m dalam julat skala kontrak: lapor ukuran.
