# PENGAMBILAN TEKNIKAL (TECHNICAL DECISIONS)

| ID | Tarikh | Keputusan | Alternatif | Alasan |
|----|--------|-----------|------------|--------|
| TPD-001 | 2026-11-24 | React 19 + TypeScript Strict | Vue / Svelte / Vanilla JS | React ecosystem R3F paling matang untuk 3D web. TypeScript strict memastikan keselamatan data. |
| TPD-002 | 2026-11-24 | Vite sebagai build tool | Webpack / Rollup / esbuild | Vite pantas, HCD baik, plugin React stabil, ESM-first. |
| TPD-003 | 2026-11-24 | React Three Fiber (R3F) | Raw Three.js / Babylon.js / PixiJS | R3F component model sesuai dengan React. Community besar, Drei helpers banyak. |
| TPD-004 | 2026-11-24 | Rapier 3D (via @react-three/rapier) | Cannon.js / Ammo.js / Matter.js | Rapier cepat (WASM), enkapsul API, R3F integration langsung. |
| TPD-005 | 2026-11-24 | Zustand untuk state management | Redux / Jotai / Recoil | Zustand ringkas, boilerplate minimum, TypeScript friendly, bundle kecil. |
| TPD-006 | 2026-11-24 | IndexedDB (via idb) | localStorage / Supabase / Firebase | IndexedDB capacity besar, offline-first, tiada server required. Supabase opsional. |
| TPD-007 | 2026-11-24 | Biome untuk lint/format | ESLint + Prettier / TSLint | Biome lebih pantas, konfigurasi ringkas, Rust-backed. |
| TPD-008 | 2026-11-24 | Vitest untuk testing | Jest / Mocha | Vitest cepat, ESM native, TypeScript support, compatible dengan Vite. |
| TPD-009 | 2026-11-24 | PWA (standalone display) | SPA biasa / Electron / TWA | PWA installable di Android, cross-platform, service worker untuk caching. |
| TPD-010 | 2026-11-24 | Bahasa BM (Malay) sahaja | BM + English serentak | Audience utama Malaysia/Indonesia. i18n structure sedia untuk English kemudian. |
| TPD-011 | 2026-11-24 | Reward Ads sahaja (jika ada) | Paywall / Iklan interstitial / No ads | Less intrusive, player pilih tonton untuk bonus, tak ganggu gameplay. |
| TPD-012 | 2026-11-24 | WebGL 2 baseline, WebGPU opsional | WebGPU only / WebGL 1 only | WebGL 2 supported by 95%+ devices. WebGPU enhancement bila ready. |
| TPD-013 | 2026-11-24 | Placeholder geometri sebelum asset 3D | Beli asset / Buat Blender sendiri | Lebih pantas untuk vertical slice. Asset final boleh tukar kemudian. |
| TPD-014 | 2026-11-24 | Cloudflare Pages untuk deploy | Vercel / Netlify / GitHub Pages | Cloudflare Pages gratis, KV support untuk PWA caching, worldwide CDN. |
| TPD-015 | 2026-11-24 | Nama projek: Misi Kurir Simulator | Courier Life Simulator / Kurir Megah / Laju Express | "Misi Kurir" lebih Melayu/Malaysia, ringkas, jelas maksudnya. |
| TPD-016 | 2026-11-24 | Latar Malaysia: mata wang RM (`ms-MY`), kawasan & nama tempatan Malaysia, teks UI BM | Indonesia + Rp (ikut master prompt seksyen B/K/M); latar Indonesia + teks BM | Keputusan pemilik. **Penyimpangan sengaja daripada master prompt** (Indonesia/Rupiah). Semua rujukan "Indonesia"/"Rp" dalam master prompt dibaca sebagai "Malaysia"/"RM". Ganjaran & harga perlu ditentukur semula ke skala RM. |

---

*Dokumen ini dikemaskini apabila keputusan arsitektur dibuat. Setiap perubahan perlu dicatatkan di sini.*
