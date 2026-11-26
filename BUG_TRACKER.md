# Bug Tracker — Courier Life Simulator 3D

**Kemas kini terakhir:** 2026-11-25

## Ringkasan

Pelan 004 selesai: B1–B11 dan B13 dibaiki. B12 dibaiki dalam Pelan 005 Langkah 2.
Pelan 005: B15–B16 dibaiki. Ujian telefon sebenar (Redmi 9, Langkah 9b) menemui B18–B21; B18–B20 dibaiki dalam Langkah 10 (`97da0f4`) dan disahkan di telefon. B14 dan B21 dibaiki dalam Langkah 12 (`8022722`); disahkan oleh E2E dan Chrome desktop, belum di telefon.
Belum diuji: skrin 360px, iPhone/Safari.

## Pepijat

### B1 — `PlayerController.tsx`: guard `mounted` sebelum hooks → React crash
- **Fail:** `src/components/3d/PlayerController.tsx:54-58`
- **Masalah:** `if (!mounted) return null;` diletakkan SEBELUM `useEffect`/`useFrame`. Render kedua memanggil lebih banyak hook.
- **Kesan:** `Rendered more hooks than during the previous render` — scene 3D kemungkinan rosak sepenuhnya.
- **Status:** SELESAI (`4d94530`) — disahkan di Chrome: tiada ralat hook di konsol
- **Pengesahan:** buka pelayar, semak konsol ralat.

### B2 — `PlayerController.tsx`: bendera `interacted` tidak direset
- **Fail:** `src/components/3d/PlayerController.tsx`
- **Masalah:** `interacted` jadi `true` selepas tekanan E pertama, hanya direset semasa cleanup effect.
- **Kesan:** E berfungsi SEKALI sahaja.
- **Status:** SELESAI (`4d94530`, `e.repeat`) — semakan kod; kekunci E belum diuji di pelayar
- **Pengesahan:** tekan E berulang kali — hanya pertama berfungsi.

### B3 — `delivery-system.ts`: cooldown setiap panggilan, bukan setiap saat
- **Fail:** `src/lib/delivery-system.ts`
- **Masalah:** Cooldown dikurangkan `0.016` setiap *panggilan*, bukan setiap saat. Selewat ambil paket (cooldown 0.5) perlu ~31 tekanan E.
- **Kesan:** Hantar paket hampir mustahil; pemain tertukar naik/turun motor tanpa sengaja.
- **Status:** SELESAI (`ab23c47`, `7fb8e43`: cooldown berasaskan masa + status `blocked`) — ujian unit
- **Pengesahan:** kira bilangan tekanan E diperlukan untuk hantar paket.

### B4 — `HUD.tsx`: `deliveryState` dibaca sekali sahaja
- **Fail:** `src/components/HUD.tsx`
- **Masalah:** `deliveryState` dibaca sekali dalam `useEffect(..., [])`.
- **Kesan:** Kad misi tidak pernah tunjuk "Bawa Paket" atau nombor penjejakan.
- **Status:** SELESAI (`b45ff97`, `7fb8e43`) — disahkan di Chrome: kad tunjuk nombor penjejakan & sasaran
- **Pengesahan:** ambil paket — kad misi kekal kosong.

### B5 — `DeliverySystemController.tsx`: syarat `!nearby` palsu
- **Fail:** `src/components/3d/DeliverySystemController.tsx`
- **Masalah:** `setNearbyZone(nearby)` dipanggil sebelum semakan `!nearby && session.nearbyZone`.
- **Kesan:** Mesej "Berhampiran: …" tidak pernah dipadam.
- **Status:** SELESAI (`b45ff97`) — semakan kod (`prevNearbyIdRef`); tiada ujian automatik
- **Pengesahan:** masuk/keluar zon — mesej kekal.

### B6 — `delivery-ui.ts`: `completeMessage` tidak dipadam
- **Fail:** `src/store/delivery-ui.ts` + `HUD.tsx`
- **Masalah:** `completeMessage` tidak pernah dipadam (hanya semasa unmount).
- **Kesan:** Selepas penghantaran pertama, HUD beku pada mesej selesai.
- **Status:** SELESAI (`7fb8e43`: mesej tamat tempoh dalam `tickSession`) — ujian unit
- **Pengesahan:** hantar paket — mesej "Berjaya!" kekal kekal.

### B7 — `TouchJoystick.tsx`: tiada butang interaksi sentuhan
- **Fail:** `src/components/TouchJoystick.tsx`
- **Masalah:** Hanya butang HORN/BRAKE.
- **Kesan:** Permainan mobile-first tidak boleh ambil/hantar paket di telefon.
- **Status:** SELESAI (`1b88949`) — disahkan di Chrome `?touch=1`: ambil paket, naik motor, joystick, BREK
- **Pengesahan:** mod peranti DevTools — tiada butang untuk interaksi.

### B8 — `NPCTraffic.tsx`: jana dua kali, delta salah, heading paksi-x
- **Fail:** `src/components/3d/NPCTraffic.tsx`
- **Masalah:** `generateNPCTraffic(8)` dipanggil dua kali (id/data berbeza), throttle 50ms, `heading` paksi-x sama dengan paksi-z.
- **Kesan:** Trafik nampak salah; pembaziran sumber. NPC bergerak ~⅓ kelajuan.
- **Status:** SELESAI (`6a2c945`, `a3f86d4`) — ujian unit `heading` ikut paksi; disahkan berjalan di Chrome
- **Pengesahan:** nampak NPC bergerak lancar pada kelajuan betul.

### B9 — `delivery-system.ts`: `setInterval` peringkat modul
- **Fail:** `src/lib/delivery-system.ts`
- **Masalah:** `setInterval` peringkat modul (kesan sampingan semasa import, tidak boleh diuji, tidak pernah dihentikan).
- **Kesan:** Bocor dan sukar diuji.
- **Status:** SELESAI (`ab23c47`: `setInterval` dibuang, reset dalam `tickSession`) — `grep setInterval src` kosong
- **Pengesahan:** `grep` untuk `setInterval` — jangan ada di peringkat modul.

### B10 — Repo: 29 ralat `biome`, `tsconfig.tsbuildinfo` dijejak, teks salah
- **Fail:** pelbagai
- **Masalah:** 29 ralat biome; `tsconfig.tsbuildinfo` dijejak git; `DeliveryZone` diduplikasi; "Balik Pos" (patut "Pejabat Pos"); `DEVELOPMENT_STATUS.md` tulis "Phase 0".
- **Status:** SELESAI (`93dec38`, Langkah 6) — biome 0 ralat, `tsconfig.tsbuildinfo` tidak dijejak, `DeliveryZone` satu definisi, `DEVELOPMENT_STATUS.md` dikemas kini
- **Pengesahan:** `biome check src` lulus; `git ls-files tsconfig.tsbuildinfo` tiada; teks betul.

### B11 — `<HUD3D />` dirender di luar `<Canvas>`
- **Fail:** `src/components/GameScene3D.tsx:110`
- **Masalah:** `<HUD3D />` diletakkan di luar `<Canvas>` sebagai React child biasa. React Three Fiber hanya mengesan komponen Three.js di DALAM `<Canvas>`. Di luar, ia dirender sebagai `<div>` — menyebabkan 6 ralat konsol (Three.js API dipanggil pada `HTMLElement`).
- **Kesan:** 6 ralat konsol semasa render pertama; HUD3D tidak muncul dalam scene 3D.
- **Status:** SELESAI (`93dec38`)
- **Pengesahan:** konsol bersih tanpa ralat Three.js; HUD3D mesh muncul di scene.

### B12 — Kamera menghadap dinding bangunan semasa mula
- **Fail:** `src/components/3d/CameraFollow.tsx`
- **Masalah:** Kamera mula di `(0, 5, 10)` menghadap arah player. Jika player spawn berhampiran bangunan, kamera mungkin terjepit di dalam/ddekat dinding. Motor juga kecil dari sudut ini.
- **Kesan:** Pemain tidak nampak motor secara jelas; persepsi "gelap" atau berdesak.
- **Status:** SELESAI — punca sebenar: `CameraFollow` menggerakkan objek `<camera>` baharu, bukan kamera render, jadi kamera tidak pernah mengikut pemain sejak Fasa 1. Kini guna `state.camera`. Bangunan rawak juga dialih dari persimpangan jalan ke tengah blok. Disahkan di Chrome.
- **Pengesahan:** mula permainan — semak jika kamera terjepit di dinding.

### B13 — `.playwright-mcp/` tidak dalam `.gitignore`
- **Fail:** `.gitignore`
- **Masalah:** Folder `.playwright-mcp/` tidak disenaraikan.
- **Status:** SELESAI (`93dec38`)
- **Pengesahan:** `git status` tidak tunjuk `.playwright-mcp/`.

### B14 — Kamera masuk ke dalam rumah di pintu alamat
- **Fail:** `src/components/3d/CameraFollow.tsx`
- **Masalah:** Kamera diletak 8 unit di belakang pemain tanpa semakan halangan. Bila pemain berdiri di pintu rumah alamat dan menghadap jalan, kamera berada di dalam kotak rumah.
- **Kesan:** Bumbung/dinding rumah menutup separuh skrin (dilihat di Chrome semasa semakan Langkah 4).
- **Status:** SELESAI (`8022722`) — `camera-collision.ts` mengklamp kamera di luar 23 bangunan + 3 rumah alamat; disahkan dengan tangkapan skrin di `zone-delivery-1`. Belum disahkan di telefon.
- **Pengesahan:** berdiri di pintu Kafe Kampung Digital menghadap jalan; skrin tidak patut dilindungi dinding.

### B15 — Panel serah terima & ringkasan manifest tidak boleh diklik
- **Fail:** `src/components/HUD.tsx`, `src/delivery/HandoverPanel.tsx`, `src/delivery/ManifestSummaryPanel.tsx`
- **Masalah:** bekas akar `<HUD>` ialah `pointerEvents: "none"`. Kedua-dua panel dirender di dalamnya tanpa `pointer-events: auto`, jadi klik/sentuhan menembusi ke kanvas 3D.
- **Kesan:** pemain sebenar tidak boleh menekan Ambil bukti, Serahkan paket, Penerima tiada, Batal atau Manifest baharu. Aliran permainan tersekat. Semakan pelayar Langkah 5/6 terlepas pepijat ini kerana event dihantar terus melalui JS.
- **Ditemui:** E2E Playwright semasa menulis Pelan 005 Langkah 8 ("canvas … intercepts pointer events").
- **Status:** SELESAI (`bacccb5`) — disahkan oleh E2E desktop-chrome + pixel-7
- **Pengesahan:** kontrak `005-langkah-8-test-api.test.tsx` (B15) + E2E `tests/contract/e2e/vertical-slice.spec.ts`

### B16 — Autosave selepas serahan menyimpan wang lama
- **Fail:** `src/store/delivery.ts` (`confirmHandover`)
- **Masalah:** `set({ session })` dipanggil sebelum `addMoney`/`addXP`. Langganan autosave terus memanggil `saveNow`, dan `buildSave` membaca wang sebelum ganjaran ditambah.
- **Kesan:** selepas muat semula → Teruskan, ganjaran serahan terakhir hilang (E2E: dijangka 504, dapat 500).
- **Ditemui:** E2E Playwright semasa menulis Pelan 005 Langkah 8.
- **Status:** SELESAI (`bacccb5`) — disahkan oleh E2E desktop-chrome + pixel-7
- **Pengesahan:** kontrak `005-langkah-8-test-api.test.tsx` (B16) + E2E

### B17 — Ikon PWA dan favicon tidak wujud
- **Fail:** `index.html` (`/favicon.svg`, `/apple-touch-icon.png`), `public/manifest.json` (`/icon-192.png`, `/icon-512.png`)
- **Masalah:** keempat-empat fail dirujuk tetapi tiada dalam `public/`. Vite dev memulangkan `index.html` (SPA fallback), jadi tiada ralat konsol, tetapi PWA tidak boleh dipasang dengan ikon dan tab tiada favicon.
- **Kesan:** "Tambah ke skrin utama" di Android tanpa ikon; audit PWA gagal.
- **Ditemui:** semakan untuk Pelan 005 Langkah 9.
- **Status:** DIRAKAM — memerlukan reka bentuk ikon (keputusan visual pemilik); bukan dalam Langkah 9a

### B18 — Landskap: panel Serah Terima tidak boleh ditatal (pemain tersekat)
- **Fail:** `src/index.css` (`.wh-panel`)
- **Masalah:** `.wh-panel` ada `max-height: min(78dvh, 640px)` tetapi tiada `overflow-y`. Dalam landskap Redmi 9 (viewport 823×309), kandungan panel Serah Terima 444 px dipotong pada 241 px dan tidak boleh ditatal.
- **Kesan:** butang Serahkan paket, Penerima tiada dan Batal berada di luar skrin (y = 329–521). Pemain tidak boleh menyelesaikan atau membatalkan serah terima. **Menyekat.**
- **Ditemui:** ujian telefon sebenar, Pelan 005 Langkah 9b. Emulasi Pixel 7 (potret) tidak menangkapnya.
- **Status:** SELESAI (`97da0f4`) — disahkan di Redmi 9 sebenar, potret + landskap (2026-11-25)
- **Pengesahan:** kontrak `005-langkah-10-pepijat-telefon.test.tsx` (B18) + E2E `tests/contract/e2e/landscape-panels.spec.ts`

### B19 — Kad status HUD kekal "Berjalan" semasa memandu
- **Fail:** `src/components/HUD.tsx` (baris `const isOnFoot = playerState.isOnFoot()`)
- **Masalah:** `playerState` ialah pemboleh ubah modul, bukan stor React. HUD hanya membaca nilainya semasa render atas sebab lain, jadi naik motor tidak mengemas kini kad (label, warna, km/j).
- **Kesan:** semasa memandu, kad menunjukkan "Berjalan / Tekan E untuk naik motor" (tangkapan skrin telefon 9b).
- **Ditemui:** ujian telefon sebenar, Pelan 005 Langkah 9b.
- **Status:** SELESAI (`97da0f4`) — disahkan di Redmi 9 sebenar, potret + landskap (2026-11-25)
- **Pengesahan:** kontrak `005-langkah-10-pepijat-telefon.test.tsx` (B19)

### B20 — Petunjuk "Tekan E" dipaparkan di telefon
- **Fail:** `src/components/HUD.tsx`
- **Masalah:** teks "Tekan E untuk …" dan "Masuk gudang, tekan E di meja sortir" tidak bergantung pada mod input.
- **Kesan:** pemain telefon diberitahu menekan kekunci yang tidak wujud.
- **Ditemui:** ujian telefon sebenar, Pelan 005 Langkah 9b.
- **Status:** SELESAI (`97da0f4`) — disahkan di Redmi 9 sebenar, potret + landskap (2026-11-25)
- **Pengesahan:** kontrak `005-langkah-10-pepijat-telefon.test.tsx` (B20)

### B21 — Landskap: unsur bertindih
- **Fail:** `src/components/HUD.tsx` (penunjuk arah), `src/components/MainMenu.tsx` (teks versi)
- **Masalah:** dalam viewport 823×309, penunjuk arah ("Kafe Kampung Digital 0 m") menutup tajuk panel Serah Terima; di menu utama, "Versi 0.0.0-alpha" dan "© 2026" bertindih dengan butang Tetapan.
- **Kesan:** kosmetik; tidak menyekat.
- **Ditemui:** ujian telefon sebenar, Pelan 005 Langkah 9b.
- **Status:** SELESAI (`8022722`) — punca: NavArrow abaikan `handover`; footer menu `position: absolute`. Disahkan oleh E2E `landscape-overlap.spec.ts` (823×309). Belum disahkan di telefon.

### B22 — Panel: label dan nilai bercantum ("Penerima:Aminah")
- **Fail:** `src/index.css` (tiada peraturan `.wh-panel__row`), `src/delivery/HandoverPanel.tsx`
- **Masalah:** `<span>` label dan nilai dalam `.wh-panel__row` tiada jarak.
- **Kesan:** kosmetik; teks sukar dibaca.
- **Ditemui:** tangkapan skrin semasa menulis Pelan 006.
- **Status:** SELESAI (`75883b4`) — `.wh-panel__row { display: flex; gap: 6px }`. Disahkan oleh kontrak 006 (CSS) dan tangkapan skrin 412×839.

### B23 — COD: baki salah tiada maklum balas
- **Fail:** `src/delivery/HandoverPanel.tsx`, `src/delivery/cod.ts`
- **Masalah:** mesej "Baki salah — kira semula" hanya dipaparkan dalam kotak info HUD, yang tidak kelihatan semasa Panel Serah Terima terbuka.
- **Kesan:** pemain mengetik baki salah dan tiada apa-apa berubah pada skrin.
- **Ditemui:** semakan visual Pelan 006 (412×839).
- **Status:** SELESAI (Pelan 006b) — `<output className="wh-panel__msg">` dalam panel. Disahkan oleh kontrak `006b-cod-mesej-baki.test.tsx` dan tangkapan skrin 412×839.
