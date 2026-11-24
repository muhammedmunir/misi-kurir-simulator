# Pelan 005 — Vertical Slice Mobile Boleh Main

**Status:** Belum dimulakan
**Bergantung pada:** Pelan 004 (selesai, `ecd1a79`)
**Matlamat:** Capai milestone pertama wajib master prompt (seksyen Q), dan uji di browser telefon sebenar.

> "Milestone pertama wajib berupa playable mobile vertical slice: pemain memasuki gudang, bergerak, menaiki motor, berkendara di jalan terhubung, mencapai tujuan, mengambil paket, berinteraksi dengan pelanggan, menyelesaikan satu pengiriman, dan menyimpan progres melalui browser ponsel."

## Jurang semasa (disahkan dari kod pada `ffe1938`)

| Keperluan slice | Keadaan sekarang |
|---|---|
| Memasuki gudang | Tiada gudang 3D. `WarehouseUI.tsx` ialah skrin 2D berasingan yang menjana paket rawak (`generateTestPackets`), tidak bersambung dengan gelung. |
| Paket & manifest sebenar | Jenis `Packet`/`Manifest` wujud dalam `src/types/game.ts` tetapi gelung guna `session` rawak. `canTransition` menyemak pasangan dalam `PACKET_STATUS_FLOW` — rapuh dan tiada ujian. |
| Naik/turun motor | `MOTOR_POSITION` ialah pemalar. Turun motor mengalihkan pemain ke titik mula, bukan ke tempat motor berhenti. |
| Mencapai tujuan | Tiada penunjuk arah atau jarak. |
| Interaksi pelanggan | Tiada NPC penerima. Hantar = tekan E dalam bulatan 4 unit. |
| Simpan progres | `saveGame()` wujud tetapi tidak menyimpan paket, manifest, kedudukan atau status penghantaran. Tiada versi skema/validasi semasa load. |
| Fizik | `<Physics>` Rapier dibungkus tetapi tiada `RigidBody`. Motor menembusi bangunan. |
| QA (seksyen R) | Tiada Playwright, tiada ujian peranti sebenar. |
| Dokumen (seksyen S) | Tiada `THIRD_PARTY_NOTICES.md`, `QA_REPORT.md`, `CHANGELOG.md`. |

## Keputusan pemilik: latar Malaysia (TPD-016)

Pemilik memilih **latar Malaysia, mata wang RM, teks UI Bahasa Melayu**. Ini penyimpangan sengaja daripada master prompt (Indonesia/Rupiah), direkod sebagai TPD-016 dalam `TECHNICAL_DECISIONS.md`. Baca setiap "Indonesia"/"Rp" dalam master prompt sebagai "Malaysia"/"RM".

Laksanakan dalam **Langkah 0** di bawah, sebelum Langkah 1.

### Langkah 0 — Tukar ke RM & latar Malaysia
- Ganti `formatRupiah()` dengan `formatRinggit()` dalam `src/lib/utils.ts`: `Intl.NumberFormat("ms-MY", { style: "currency", currency: "MYR" })` → contoh `RM 12.50`. Kemas kini ujiannya.
- Cari dan ganti semua `Rp`, `id-ID`, `formatRupiah` dalam `src/` (kira-kira 11 tempat pada `ffe1938`).
- Tentukur semula angka wang dalam konfigurasi berpusat (seksyen M), contohnya `src/data/economy.ts`: modal permulaan (sekarang `500000` Rp), ganjaran penghantaran (sekarang `2000–7000` Rp), harga kenderaan. Cadangan permulaan: modal RM 500, upah RM 3–8 setiap paket. Ini angka cadangan, tentukur semasa Pelan ekonomi.
- `AreaCode` & nama zon: kekalkan kawasan generik (`bandar`, `perumahan`, `pasar`, `industri`, `kampung`, `sawah`, `perbukitan`). Kawasan negeri (`johor`, `pinang`, `melaka`, `kelantan`) dikekalkan untuk pengembangan cawangan kelak, tidak dipakai dalam slice.
- Nama tempat & penerima ala Malaysia (contoh "Pejabat Pos Pusat", "Kedai Runcit Mak Minah", "Jalan Merdeka"). Gunakan nama rekaan sahaja, jangan jenama sebenar (Pos Laju, J&T dan lain-lain).
- Save lama dengan nilai Rp: ini alpha tanpa pengguna, jadi naikkan `version` save dan buang save lama dengan mesej jelas. Jangan tukar kadar secara automatik.

**Lulus:** `grep -rn "Rp\b\|id-ID\|Rupiah" src` kosong; ujian `formatRinggit` lulus.

## Struktur fail

Ikut seksyen G secara beransur — hanya untuk domain yang disentuh pelan ini. Jangan pindahkan fail lain.
```
src/delivery/     packet.ts, manifest.ts, handover.ts (+ *.test.ts)
src/warehouse/    WarehouseBuilding.tsx, warehouse-logic.ts (+ test)
src/vehicles/     motor-state.ts (kedudukan motor dinamik)
src/navigation/   NavArrow.tsx, nav.ts (+ test)
src/npc/          Receiver.tsx
src/save/         save-schema.ts, migrate.ts (+ test)
```

## Langkah pelaksanaan (1 per 1)

### Langkah 1 — Domain paket & manifest (logik tulen, tiada UI)
- `src/delivery/packet.ts`: peta peralihan bersebelahan (`Record<PacketStatus, PacketStatus[]>`) gantikan `PACKET_STATUS_FLOW`. `transition(packet, to, reason, now)` pulangkan paket baharu + entri `history`, atau ralat jika tidak sah.
- Peraturan seksyen I: `delivered` hanya jika paket dalam manifest `open` DAN ada rekod serah terima yang sah.
- `src/delivery/manifest.ts`: cipta manifest, muat paket dengan semakan `cargoCapacity` dan `cargoWeight` kenderaan (seksyen H.3: paket yang tidak termuat tidak boleh dianggap dibawa), tutup manifest.
- Penjana paket boleh disuntik RNG; alamat terikat kepada zon penghantaran sebenar dalam dunia.
- Gantikan `session` dalam stor penghantaran (Pelan 004) supaya guna `Packet` + `Manifest` sebenar.

**Lulus:** ujian unit untuk setiap peralihan sah/tidak sah, had kapasiti & berat, `delivered` ditolak tanpa manifest/serah terima.

### Langkah 2 — Gudang 3D yang boleh dimasuki
- Bangunan gudang ringkas (placeholder geometri berlabel) di zon pickup utama dengan pintu dan kawasan dalam. Masuk = pemain berjalan kaki melepasi pintu (pencetus kawasan), bukan butang menu.
- Di dalam: meja sortir. Interaksi buka panel gudang (gunakan semula gaya `WarehouseUI`, tetapi data dari stor, bukan `generateTestPackets`).
- Aliran minimum: senarai paket `received` → imbas (ketik, simulasi — label "Simulasi imbas") → `sorting` → `ready_to_dispatch` → muat ke motor → `loaded`. Penunjuk kapasiti "2/3 paket, 4.1/10 kg".
- Butang yang belum berfungsi mesti dinyahaktif dengan sebab (seksyen J/T).

**Lulus:** paket yang tidak dimuat tidak muncul sebagai dibawa; panel boleh dikendalikan sepenuhnya dengan sentuhan pada lebar 360px tanpa limpahan mendatar.

### Langkah 3 — Motor berkedudukan dinamik & parkir
- `src/vehicles/motor-state.ts`: kedudukan & arah motor dinamik. Turun motor = pemain muncul di sisi motor; motor kekal di situ.
- Turun hanya dibenarkan jika `|motorSpeed| < 1`. Jika tidak, tunjuk "Berhenti dulu".
- Kotak parkir bertanda di hadapan setiap rumah tujuan. Parkir di luar kotak dibenarkan, tetapi rekod sebagai `parkedProperly: false` untuk reputasi kelak (tanpa penalti dalam slice ini).
- B12: kamera mula menghadap dinding bangunan dan motor tidak kelihatan. Betulkan sudut/jarak kamera awal supaya pemain dan motor kelihatan semasa permainan bermula.
- Kawalan sentuh sedia ada (`1b88949`) sudah ada butang NAIK/TURUN MOTOR melalui `getActionButton()`. Kekalkan satu butang tindakan, kecuali jika ujian menunjukkan konflik antara tindakan penghantaran dan motor di tempat yang sama.
- (Asal) Butang sentuh NAIK/TURUN berasingan daripada AMBIL/HANTAR jika kedua-duanya mungkin di satu tempat. Satu butang, satu tindakan.

**Lulus:** ujian unit `motor-state`; manual — tunggang ke rumah, berhenti, turun, berjalan ke pintu, kembali, naik semula di tempat yang sama.

### Langkah 4 — Navigasi ke tujuan
- `nav.ts`: jarak dan arah relatif dari pemain/motor ke sasaran aktif (diuji).
- Anak panah HUD di tepi skrin + jarak dalam meter + nama penerima & alamat. Penanda tiang di lokasi tujuan dalam dunia.
- Minimap **di luar skop** (Phase 2 World). Anak panah sudah cukup untuk slice.

**Lulus:** ujian unit `nav.ts` (4 kuadran, jarak 0).

### Langkah 5 — Pelanggan & serah terima
- `Receiver.tsx`: NPC placeholder di pintu rumah (bentuk manusia ringkas, berlabel nama).
- Interaksi hanya dalam keadaan berjalan kaki dan dekat dengan pintu (bukan dari atas motor).
- Panel dialog: paparkan nama, nombor penjejakan, pembayaran. Pilihan:
  - "Serahkan paket" → bukti penghantaran (simulasi tandatangan: lukis garisan di kanvas, atau ketik "Sahkan penerima"). Kemudian `delivered`, beri ganjaran + XP.
  - "Penerima tiada" → `failed` dengan sebab. Paket kekal dibawa untuk dipulangkan.
- Semua penerima wujud di rumah dalam slice ini, kecuali satu rumah yang ditetapkan "tiada orang" untuk menguji laluan gagal.
- COD **di luar skop** (Pelan 006). Semua paket slice berstatus prabayar.

**Lulus:** ujian unit `handover.ts`; manual — satu kejayaan + satu kegagalan.

### Langkah 6 — Kembali ke gudang & tutup manifest
- Selepas semua paket selesai/gagal, sasaran nav = gudang.
- Di meja gudang: serah paket gagal (`failed` → `returned`), tutup manifest, skrin ringkasan (dihantar, gagal, pendapatan Rp, XP, masa).
- Kemudian boleh mula manifest baharu.

**Lulus:** ujian unit tutup manifest dengan campuran status.

### Langkah 7 — Simpan & muat yang sebenar
- `src/save/save-schema.ts`: guna `SaveSlot` sedia ada + `version` nombor skema, kedudukan pemain & motor, mod (kaki/motor), manifest aktif, semua paket.
- Validasi semasa load (bentuk & julat). Save yang rosak tidak boleh merosakkan permainan: tunjuk ralat jelas + pilihan permainan baharu. `migrate.ts` dengan migrasi v1 sebagai asas.
- Autosave di checkpoint selamat (seksyen O): selepas muat motor, selepas setiap serah terima, selepas tutup manifest. Tunjuk "Tersimpan" ringkas.
- Butang "Teruskan" di menu utama memuatkan save terakhir.

**Lulus:** ujian unit validasi + migrasi + save rosak; manual — muat semula halaman di tengah penghantaran, pemain/motor/paket kembali di tempat yang sama.

### Langkah 8 — E2E Playwright
- Pasang `@playwright/test`. Tambah skrip `npm run test:e2e`.
- API ujian dev sahaja (`window.__mks`, dilindungi `import.meta.env.DEV`, tidak wujud dalam build produksi): baca state, teleport pemain. Tujuannya mengelakkan ujian bergantung pada pemanduan masa nyata.
- Senario: permainan baharu → masuk gudang → muat 2 paket → ke rumah A → turun → serah → ke rumah B → gagal → balik gudang → tutup manifest → muat semula halaman → state kekal.
- Jalankan pada 2 projek: Desktop Chrome dan Pixel 7 (emulasi sentuh). Gagal jika ada `console.error`.
- Sahkan `window.__mks` tiada dalam `dist/`.

### Langkah 9 — Dokumen & ujian peranti sebenar
- Cipta `THIRD_PARTY_NOTICES.md` (senarai pakej npm & lesen; nyatakan tiada aset pihak ketiga digunakan setakat ini), `CHANGELOG.md`, `QA_REPORT.md`.
- Uji di sekurang-kurangnya satu telefon Android sebenar melalui `npm run dev -- --host` atau `vite preview --host`. Rekod model, OS, pelayar, resolusi, FPS purata (guna paparan FPS dev sahaja), dan masalah yang ditemui.
- Jangan dakwa "30 FPS" tanpa ukuran (seksyen C).
- Rekod Rapier tidak digunakan lagi sebagai had yang diketahui dalam `TECHNICAL_DECISIONS.md` dan `QA_REPORT.md`.

## Gerbang QA (ECHO)
```
npm run typecheck
npm test
npx biome check src
npm run build
npm run test:e2e
```
Plus `QA_REPORT.md` dengan keputusan peranti sebenar, dan GIF gelung penuh di telefon (rakaman skrin). Kemas kini `DEVELOPMENT_STATUS.md` dan `BUG_TRACKER.md`.

## Di luar skop (pelan kemudian)
- **006:** COD (seksyen I/M) + pilihan pelanggan lain (minta tunggu, titip, tolak, alamat tidak ditemui).
- **007:** Fizik Rapier untuk motor & collision bangunan, jalan bersambung + minimap (Phase 2 World).
- **008:** Siang/malam, BBM (Phase 5).
- PWA service worker, Cloudflare deploy, ekonomi, bisnis.
