# Pelan 022 — Seragamkan gaya watak dengan dunia

Pelaksana: **C9**. Penyemak: Claude. Pemilik memilih gaya akhir berdasarkan tangkapan skrin.

## Masalah

Dunia menggunakan Kenney: low-poly dengan warna rata daripada satu `colormap`. Watak pula Mixamo dengan tekstur foto (kulit, kain, rambut). Gabungan dua gaya ini membuatkan watak nampak ditampal ke dalam dunia. Pemilik sudah menolak watak chibi Kenney kerana tidak realistik, jadi sasarannya ialah **badan berkadar manusia dengan gaya low-poly warna rata**.

## Pilihan yang diuji

| Kod | Gaya | Sumber |
|---|---|---|
| `asal` | Mixamo bertekstur (sekarang) | `public/models/mixamo/*.glb` (tidak di-commit) |
| `rata` | Mixamo yang sama, tekstur diganti warna rata ikut bahagian | dijana oleh penukar, `public/models/mixamo/*-rata.glb` (tidak di-commit) |
| `quaternius` | Quaternius *Universal Base Characters* (kadar "Regular") + *Universal Animation Library*, CC0 | `assets-src/quaternius/` → `public/models/quaternius/*.glb` (BOLEH di-commit, CC0) |

**Aset Quaternius (sudah diekstrak oleh perancang, CC0):**
- Badan: `assets-src/quaternius/base-characters/Universal Base Characters[Standard]/Base Characters/Godot - UE/Superhero_{Male,Female}_FullBody.gltf`. Versi Standard HANYA ada kadar "Superhero" (berotot) dan **berpakaian dalam sahaja, tiada baju**.
- Rambut: `…/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/Hair_*.gltf` (+ `Eyebrows_*`).
- Animasi: `assets-src/quaternius/animation-library/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb` (tanpa root motion; JANGAN guna `_RM`).

## Langkah 022a — prototaip tiga gaya (SATU commit pada `c9/022-gaya-watak`, dicabang daripada `c9/021-tunggang`)

1. **Penukar `rata`** dalam `tools/convert/mixamo.ts`:
   - pilihan `flat: true` mengira warna purata setiap tekstur `map`, ditimbang dengan alpha, dalam ruang linear;
   - set `color` kepada purata itu, kemudian buang `map` dan `normalMap`;
   - kekalkan `alphaMap` dan `alphaTest` untuk rambut;
   - `roughness` 0.9, `flatShading: false`;
   - output `<nama>-rata.glb`.
   Ini lebih dekat dengan gaya Kenney berbanding mengekalkan tekstur.
2. **Penukar `quaternius`**, fail baharu `tools/convert/quaternius.ts` + kemas kini `run.mjs`:
   - baca format yang ada dalam pek (glTF/GLB atau FBX), dan laporkan formatnya;
   - pilih 3 watak: kurier (lelaki), penerima perempuan dan penerima lelaki;
   - klip mesti dinamakan sama dengan Mixamo: `idle`, `walk`, `run`, `carry`, `pickup`, `take`, `drive`. Petakan daripada nama klip UAL yang paling hampir (contohnya Idle, Walk, Jog/Sprint, Sitting untuk `drive`);
   - jika klip tiada dalam UAL (kemungkinan `carry`, `pickup`, `take`), cuba `SkeletonUtils.retargetClip` daripada FBX Mixamo dalam `assets-src/`. Jika gagal, guna klip terdekat dan **senaraikan dalam laporan** klip yang diganti;
   - **pakaian wajib (aset tiada baju; watak berpakaian dalam TIDAK boleh muncul dalam permainan):**
     - buang tekstur badan dan `normalMap` supaya otot tidak ketara, kemudian cat **warna verteks** ikut tulang dengan pemberat terbesar:
       - badan, bahu, lengan atas → baju;
       - lengan bawah → baju (lengan panjang) atau kulit (lengan pendek);
       - pinggul dan kaki hingga buku lali → seluar/kain;
       - kaki → kasut gelap;
       - kepala, leher, tangan → kulit sawo matang (`#b07a52` / `#c68e63`);
     - kurier: baju jingga `#f59e0b` berlengan pendek, seluar biru tua `#1d3a8a`, kasut hitam, rambut `Hair_Buzzed`;
     - penerima perempuan: baju kurung lengan panjang (cth. `#2f7d6d`), kain labuh hingga buku lali, rambut `Hair_Buns` atau `Hair_Long`;
     - penerima lelaki: kemeja-T lengan pendek (cth. `#3b5b92`), seluar panjang, rambut `Hair_SimpleParted`;
     - jika sempadan warna (contohnya leher baju) bergerigi teruk, laporkan dengan tangkapan skrin dekat, jangan sembunyikan;
   - segi tiga ≤ 12 000 setiap watak, tekstur ≤ 512 px (jika ada);
   - output `public/models/quaternius/{courier,receiver-f,receiver-m}.glb`.
3. **`CharacterGLB.tsx`:**
   - `CHARACTER_URL` KEKAL seperti sekarang (peta rata `courier`/`receiverF`/`receiverM` → `/models/mixamo/*.glb`), kerana kontrak `008-model-kurier.test.ts:25` menuntutnya;
   - peta gaya diletakkan BERASINGAN dalam `src/components/3d/character-style.ts`: `CHARACTER_STYLE_URLS: Record<CharacterStyle, Record<CharacterKey, string>>`, dengan `asal` = `CHARACTER_URL` (rujukan yang sama, bukan salinan). Tambah juga `characterUrl(model)`, yang digunakan oleh `CharacterGLB` untuk `useGLTF` dan preload (gaya aktif sahaja);
   - gaya dipilih melalui pemalar `CHARACTER_STYLE` dalam modul baharu `src/components/3d/character-style.ts`;
   - semasa dev SAHAJA (`import.meta.env.DEV`), parameter `?watak=asal|rata|quaternius` boleh mengatasinya. Ini dibaca dalam `character-style.ts`, bukan dalam logik permainan;
   - lalai kekal `asal` sehingga pemilik memilih.
4. **Nama tulang:**
   - `UPPER` dalam `layeredClip` dan pencarian tulang IK Pelan 021 mesti berfungsi untuk kedua-dua rangka;
   - tambah `RIG_BONES` dalam `character-style.ts`: peta peranan (`leftArm`, `leftForeArm`, `leftHand`, …, `hips`, `spine`) → nama tulang untuk rangka Mixamo dan rangka Quaternius;
   - Pelan 021 `PlayerController` mesti menggunakan peta ini dan bukan nama Mixamo terus;
   - `retargetClips(animations, keepHipsPosition)` juga ikut peta (`hips`), TETAPI tandatangannya kekal, dan ia mesti terus lulus kontrak 008 dengan nama trek Mixamo (`mixamorigHips.position`). `layeredClip(name, lower, upper)` juga kekal.
5. **Ujian (fail biasa, bukan kontrak):** `src/components/3d/character-style.test.ts` menyemak:
   - setiap gaya ada 3 URL;
   - `RIG_BONES` lengkap untuk kedua-dua rangka;
   - parameter dev diabaikan dalam binaan produksi (mock `import.meta.env.DEV = false`).
6. **Tangkapan skrin perbandingan**, `.playwright-mcp/plan-022/<gaya>-<sudut>.png`, untuk setiap gaya × 4 sudut. Kamera, masa dan kedudukan mesti sama:
   - `jalan`: kurier berjalan di jalan perumahan;
   - `serah`: serah terima dengan penerima di pintu (`__mks.goTo` ke alamat, kemudian SERAH PAKET);
   - `tunggang`: atas skuter, dari sisi (postur Pelan 021);
   - `luas`: pandangan jalan dengan bangunan Kenney dan kereta, supaya gaya watak dibandingkan dengan dunia.
   Selain itu, gabungkan setiap sudut menjadi satu imej grid `banding-<sudut>.png` (3 gaya sebelah-menyebelah, berlabel), menggunakan skrip dalam `tools/convert/` (tidak dijalankan dalam permainan).
7. **Lesen:** tambah Quaternius (CC0) dalam `THIRD_PARTY_NOTICES.md` dan bahagian Kredit dalam Tetapan, jika aset digunakan.
8. **BERHENTI** selepas commit 022a. Laporkan laluan imej `banding-*.png`, segi tiga dan saiz setiap GLB, klip yang diganti, serta FPS/`renderInfo()` untuk setiap gaya. Pemilik akan memilih.

## Langkah 022b — selepas pemilik memilih (prompt berasingan)

- Tetapkan `CHARACTER_STYLE` kepada pilihan pemilik.
- Buang gaya yang tidak dipilih daripada peta, penukar dan fail awam.
- Jika `quaternius` dipilih: commit GLB (CC0), buang kebergantungan permainan pada Mixamo, dan pastikan E2E lulus tanpa `public/models/mixamo/`.

## Luar skop

Postur tunggang (Pelan 021; hanya peta tulang disesuaikan), dunia, kereta, skuter.

## Gate

tsc, biome src/ (kod keluar 0), vitest, knip tanpa baris baharu (alat dalam `tools/**` diabaikan oleh knip), playwright.

## STOP

- Aset Quaternius tiada: buat `rata` sahaja, kemudian laporkan.
- Rangka Quaternius tiada tulang untuk satu peranan IK: laporkan nama tulang yang wujud.
- Segi tiga melebihi bajet selepas pengurangan: laporkan.
