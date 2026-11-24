# Bug Tracker — Courier Life Simulator 3D

**Kemas kini terakhir:** 2026-11-24

## Pepijat

### B1 — `PlayerController.tsx`: guard `mounted` sebelum hooks → React crash
- **Fail:** `src/components/3d/PlayerController.tsx:54-58`
- **Masalah:** `if (!mounted) return null;` diletakkan SEBELUM `useEffect`/`useFrame`. Render kedua memanggil lebih banyak hook.
- **Kesan:** `Rendered more hooks than during the previous render` — scene 3D kemungkinan rosak sepenuhnya.
- **Status:** {DEPENDS: Langkah 2 Pelan 004}
- **Pengesahan:** buka pelayar, semak konsol ralat.

### B2 — `PlayerController.tsx`: bendera `interacted` tidak direset
- **Fail:** `src/components/3d/PlayerController.tsx`
- **Masalah:** `interacted` jadi `true` selepas tekanan E pertama, hanya direset semasa cleanup effect.
- **Kesan:** E berfungsi SEKALI sahaja.
- **Status:** {DEPENDS: Langkah 2 Pelan 004}
- **Pengesahan:** tekan E berulang kali — hanya pertama berfungsi.

### B3 — `delivery-system.ts`: cooldown setiap panggilan, bukan setiap saat
- **Fail:** `src/lib/delivery-system.ts`
- **Masalah:** Cooldown dikurangkan `0.016` setiap *panggilan*, bukan setiap saat. Selewat ambil paket (cooldown 0.5) perlu ~31 tekanan E.
- **Kesan:** Hantar paket hampir mustahil; pemain tertukar naik/turun motor tanpa sengaja.
- **Status:** {DEPENDS: Langkah 1 Pelan 004}
- **Pengesahan:** kira bilangan tekanan E diperlukan untuk hantar paket.

### B4 — `HUD.tsx`: `deliveryState` dibaca sekali sahaja
- **Fail:** `src/components/HUD.tsx`
- **Masalah:** `deliveryState` dibaca sekali dalam `useEffect(..., [])`.
- **Kesan:** Kad misi tidak pernah tunjuk "Bawa Paket" atau nombor penjejakan.
- **Status:** {DEPENDS: Langkah 3 Pelan 004}
- **Pengesahan:** ambil paket — kad misi kekal kosong.

### B5 — `DeliverySystemController.tsx`: syarat `!nearby` palsu
- **Fail:** `src/components/3d/DeliverySystemController.tsx`
- **Masalah:** `setNearbyZone(nearby)` dipanggil sebelum semakan `!nearby && session.nearbyZone`.
- **Kesan:** Mesej "Berhampiran: …" tidak pernah dipadam.
- **Status:** {DEPENDS: Langkah 3 Pelan 004}
- **Pengesahan:** masuk/keluar zon — mesej kekal.

### B6 — `delivery-ui.ts`: `completeMessage` tidak dipadam
- **Fail:** `src/store/delivery-ui.ts` + `HUD.tsx`
- **Masalah:** `completeMessage` tidak pernah dipadam (hanya semasa unmount).
- **Kesan:** Selepas penghantaran pertama, HUD beku pada mesej selesai.
- **Status:** {DEPENDS: Langkah 3 Pelan 004}
- **Pengesahan:** hantar paket — mesej "Berjaya!" kekal kekal.

### B7 — `TouchJoystick.tsx`: tiada butang interaksi sentuhan
- **Fail:** `src/components/TouchJoystick.tsx`
- **Masalah:** Hanya butang HORN/BRAKE.
- **Kesan:** Permainan mobile-first tidak boleh ambil/hantar paket di telefon.
- **Status:** {DEPENDS: Langkah 4 Pelan 004}
- **Pengesahan:** mod peranti DevTools — tiada butang untuk interaksi.

### B8 — `NPCTraffic.tsx`: jana dua kali, delta salah, heading paksi-x
- **Fail:** `src/components/3d/NPCTraffic.tsx`
- **Masalah:** `generateNPCTraffic(8)` dipanggil dua kali (id/data berbeza), throttle 50ms, `heading` paksi-x sama dengan paksi-z.
- **Kesan:** Trafik nampak salah; pembaziran sumber. NPC bergerak ~⅓ kelajuan.
- **Status:** SELESAI (commit `a3f86d4`)
- **Pengesahan:** nampak NPC bergerak lancar pada kelajuan betul.

### B9 — `delivery-system.ts`: `setInterval` peringkat modul
- **Fail:** `src/lib/delivery-system.ts`
- **Masalah:** `setInterval` peringkat modul (kesan sampingan semasa import, tidak boleh diuji, tidak pernah dihentikan).
- **Kesan:** Bocor dan sukar diuji.
- **Status:** {DEPENDS: Langkah 1 Pelan 004}
- **Pengesahan:** `grep` untuk `setInterval` — jangan ada di peringkat modul.

### B10 — Repo: 29 ralat `biome`, `tsconfig.tsbuildinfo` dijejak, teks salah
- **Fail:** pelbagai
- **Masalah:** 29 ralat biome; `tsconfig.tsbuildinfo` dijejak git; `DeliveryZone` diduplikasi; "Balik Pos" (patut "Pejabat Pos"); `DEVELOPMENT_STATUS.md` tulis "Phase 0".
- **Status:** SELESAI (commit ini — Langkah 6)
- **Pengesahan:** `biome check src` lulus; `git ls-files tsconfig.tsbuildinfo` tiada; teks betul.

### B11 — `<HUD3D />` dirender di luar `<Canvas>`
- **Fail:** `src/components/GameScene3D.tsx:110`
- **Masalah:** `<HUD3D />` diletakkan di luar `<Canvas>` sebagai React child biasa. React Three Fiber hanya mengesan komponen Three.js di DALAM `<Canvas>`. Di luar, ia dirender sebagai `<div>` — menyebabkan 6 ralat konsol (Three.js API dipanggil pada `HTMLElement`).
- **Kesan:** 6 ralat konsol semasa render pertama; HUD3D tidak muncul dalam scene 3D.
- **Status:** SELESAI (pindah ke DALAM `<Physics>` dalam `<Canvas>`)
- **Pengesahan:** konsol bersih tanpa ralat Three.js; HUD3D mesh muncul di scene.

### B12 — Kamera menghadap dinding bangunan semasa mula
- **Fail:** `src/components/3d/CameraFollow.tsx`
- **Masalah:** Kamera mula di `(0, 5, 10)` menghadap arah player. Jika player spawn berhampiran bangunan, kamera mungkin terjepit di dalam/ddekat dinding. Motor juga kecil dari sudut ini.
- **Kesan:** Pemain tidak nampak motor secara jelas; persepsi "gelap" atau berdesak.
- **Status:** DIRAKAM (belum dibetulkan) — perlu tweak `CAMERA_DISTANCE` awal atau raycast obstacle.
- **Pengesahan:** mula permainan — semak jika kamera terjepit di dinding.

### B13 — `.playwright-mcp/` tidak dalam `.gitignore`
- **Fail:** `.gitignore`
- **Masalah:** Folder `.playwright-mcp/` tidak disenaraikan.
- **Status:** SELESAI (tambah ke `.gitignore`, commit ini)
- **Pengesahan:** `git status` tidak tunjuk `.playwright-mcp/`.
