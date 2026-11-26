# Notis Pihak Ketiga

Misi Kurir Simulator menggunakan perisian sumber terbuka di bawah. Versi dan lesen dibaca daripada `node_modules/<pakej>/package.json` pada 2026-11-25. Versi boleh berubah apabila `package-lock.json` dikemas kini.

## Kebergantungan terus — produksi (`dependencies`)

| Pakej | Versi | Lesen | Repositori | Kegunaan |
|-------|-------|-------|------------|----------|
| `@react-three/drei` | 10.7.9 | MIT | https://github.com/pmndrs/drei | `useGLTF`, `useAnimations` untuk watak GLB (Pelan 012a) |
| `@react-three/fiber` | 9.8.2 | MIT | https://github.com/pmndrs/react-three-fiber | Pemapar React untuk Three.js |
| `@react-three/rapier` | 2.2.0 | Tidak dinyatakan dalam pakej npm (perlu disahkan dengan upstream sebelum rilis) | https://github.com/pmndrs/react-three-rapier | `<Physics>` sahaja; tiada `RigidBody` (TPD-017) |
| `@supabase/supabase-js` | 2.119.2 | MIT | https://github.com/supabase/supabase-js | Belum digunakan (disenaraikan oleh knip) |
| `idb` | 8.0.4 | ISC | https://github.com/jakearchibald/idb | Belum digunakan; simpanan guna API IndexedDB terus |
| `react` | 19.3.1 | MIT | https://github.com/react/react | UI |
| `react-dom` | 19.3.1 | MIT | https://github.com/react/react | UI |
| `react-router-dom` | 7.18.6 | MIT | https://github.com/remix-run/react-router | Belum digunakan (disenaraikan oleh knip) |
| `three` | 0.172.0 | MIT | https://github.com/mrdoob/three.js | Enjin 3D |
| `zustand` | 5.1.0 | MIT | https://github.com/pmndrs/zustand | Keadaan permainan |

## Kebergantungan terus — pembangunan (`devDependencies`)

| Pakej | Versi | Lesen | Repositori | Kegunaan |
|-------|-------|-------|------------|----------|
| `@biomejs/biome` | 1.9.4 | MIT OR Apache-2.0 | https://github.com/biomejs/biome | Lint & format |
| `@playwright/test` | 1.65.1 | Apache-2.0 | https://github.com/microsoft/playwright | Ujian E2E |
| `@types/react` | 19.3.0 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | Jenis TypeScript |
| `@types/react-dom` | 19.3.0 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | Jenis TypeScript |
| `@types/three` | 0.172.0 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | Jenis TypeScript |
| `@vitejs/plugin-react` | 4.7.0 | MIT | https://github.com/vitejs/vite-plugin-react | Pemalam Vite |
| `jsdom` | 26.1.0 | MIT | https://github.com/jsdom/jsdom | DOM untuk Vitest |
| `typescript` | 5.7.3 | Apache-2.0 | https://github.com/microsoft/TypeScript | Pengkompil |
| `vite` | 6.4.6 | MIT | https://github.com/vitejs/vite | Pelayan dev & build |
| `vitest` | 3.2.7 | MIT | https://github.com/vitest-dev/vitest | Ujian unit |

## Kebergantungan transitif yang penting

| Pakej | Lesen | Nota |
|-------|-------|------|
| `@dimforge/rapier3d-compat` | Apache-2.0 | Enjin fizik WASM, dibawa oleh `@react-three/rapier` |

## Fon

| Fon | Lesen | Sumber |
|-----|-------|--------|
| Inter | SIL Open Font License 1.1 (OFL) | Dimuat dari `https://fonts.googleapis.com` dalam `index.html` |

**Nota privasi:** pelayar pemain menghubungi pelayan Google Fonts untuk memuat Inter.

## Aset media

| Aset | Pencipta | Lesen | Sumber | Fail dalam repo | Kegunaan |
|------|----------|-------|--------|-----------------|----------|
| City Kit (Roads) | Kenney (www.kenney.nl) | CC0 1.0 (domain awam) | https://kenney.nl/assets/city-kit-roads | `public/models/city-kit-roads/` (jubin lurus, simpang, lampu jalan, lampu isyarat, papan tanda; `LICENSE.txt`) | Jalan, kaki lima dan lampu jalan |
| City Kit (Commercial), City Kit (Suburban), Car Kit | Kenney (www.kenney.nl) | CC0 1.0 (domain awam) | https://kenney.nl/assets/city-kit-commercial, …/city-kit-suburban, …/car-kit | `public/models/city-kit-commercial/`, `city-kit-suburban/`, `car-kit/` (`LICENSE.txt` setiap pek) | Bangunan, rumah, pokok dan kereta (Pelan 012b, sedang dipasang) |
| Watak dan animasi Mixamo (Remy, Megan, James; Idle, Walking, Running, Carrying, Picking Up, Taking Item, Driving) | Adobe Mixamo | Lesen Mixamo (Adobe): boleh digunakan dalam projek, termasuk komersial; fail mentah tidak boleh diedarkan secara berasingan | https://www.mixamo.com | **Tidak di-commit** (repo awam). `public/models/mixamo/*.glb` dijana tempatan daripada `assets-src/*.fbx` oleh `tools/convert/run.mjs` | Kurier dan penerima realistik beranimasi |
| Low Poly Delivery Electric Scooter | ramdom_sp (https://sketchfab.com/spartanmelon), berdasarkan "Delivery Electric Scooter" oleh Neakster | CC-BY-4.0 (atribusi wajib; komersial dibenarkan) | https://sketchfab.com/3d-models/low-poly-delivery-electric-scooter-16a3330edde14cb7b56626ede007067f | `public/models/scooter/delivery-scooter.glb` (`LICENSE.txt`) | Motor kurier |

CC0 tidak mewajibkan atribusi; ia dicatat di sini untuk ketelusan. **CC-BY-4.0 mewajibkan atribusi**: pencipta skuter mesti dikreditkan dalam permainan (skrin Kredit) dan di sini. Arkib zip asal disimpan di luar repo dalam `assets-src/` (diabaikan git); hanya model yang digunakan disalin ke `public/models/`.

Audio enjin dijana dalam kod (Web Audio), tanpa fail. Bangunan masih dijana dalam kod sehingga Pelan 012b siap (TPD-013). Ikon PWA belum wujud (B17).
