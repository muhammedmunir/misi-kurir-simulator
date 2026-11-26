# Pelan 017 — Optimumkan watak Mixamo untuk telefon

Pelaksana: **C9**. Penyemak: Claude (kemudian). SATU commit pada cawangan `c9/017-watak-ringan`.

## Masalah

`public/models/mixamo/{courier,receiver-f,receiver-m}.glb` ialah ~35k segi tiga dan ~10 MB setiap satu. Bilangan segi tiga di alamat ~229k, terlalu berat untuk Redmi 9. Fail ini dijana oleh `tools/convert/run.mjs` dan diabaikan git (repo awam, lesen Mixamo).

## Spesifikasi

1. **Dalam `tools/convert/`, tambah pengurangan geometri yang mengekalkan kulit (rangka):**
   - Salin algoritma `three/examples/jsm/modifiers/SimplifyModifier.js` ke `tools/convert/simplify-skinned.ts`.
   - Ubah supaya atribut `skinIndex` dan `skinWeight` **dikekalkan**. Algoritma itu mengekalkan bucu asal, jadi simpan indeks asal setiap bucu sebelum ia dinomborkan semula, dan salin data kulit daripada indeks asal semasa membina geometri baharu.
   - Pakai dalam `mixamo.ts` pada setiap SkinnedMesh sebelum eksport. Sasaran: ≤ 12k segi tiga untuk keseluruhan watak. Mata dan bulu mata boleh dibiarkan.
2. **Tekstur:** kecilkan lagi ke ≤ 512 px untuk penerima; kurier kekal 1024 px.
3. Jana semula: `npx vite --port 5190 &`, kemudian `node tools/convert/run.mjs`. Laporkan saiz fail dan bilangan segi tiga sebelum dan selepas.
4. **Pengesahan visual:** tangkapan skrin kurier berjalan dan menunggang, dan penerima di pintu. Rupa mesti kekal manusia, tanpa lubang besar atau anggota terkoyak. Jika terkoyak, kurangkan nisbah pengurangan.
5. **Dalam permainan:** penerima hanya dilukis untuk alamat yang ada paket menunggu DAN dalam 45 m (`Receiver.tsx`, `visibleReceivers`). Kemas kini ujian kontrak 008 HANYA melalui fungsi baharu yang diuji dalam fail ujian biasa; JANGAN sunting `src/__contract__/`.
6. **Bajet:** E2E `render-budget` lulus. Laporkan segi tiga di alamat; sasaran < 100k.
7. **Dokumen:** CHANGELOG satu baris.

## Gate

tsc, biome (kod keluar 0), vitest, knip, playwright.

Nota: GLB Mixamo tidak di-commit. Commit hanya kod `tools/convert/` dan `src/`.
