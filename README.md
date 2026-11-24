# MISI KURIR SIMULATOR

> Game simulator kehidupan kurir ekspedisi — 3D, mobile-first, PWA.

## 🎮 Tentang

Misi Kurir Simulator ialah permainan 3D open-world di mana pemain bermain sebagai kurir ekspedisi yang mengendalikan penghantaran paket, mengemudai kenderaan, dan akhirnya membina syarikat ekspedisi sendiri.

**Platform:** Web (Android/iOS/Desktop) · PWA · 3D WebGL

## ✨ Ciri Utama

### Gameplay (Sudah Direka)
- Sistem pengurusan paket dengan status lengkap (13 status)
- Sistem manifest gudang
- Fisika kenderaan (motor → van → truk)
- Progression: XP, level, reputasi, mata wang (Rupiah)
- Multi-wilayah: bandar, perumahan, pasar, industri, kampung
- Cuaca & siklus siang/malam
- NPC: penerima, traffic, pejalan kaki
- Ekonomi & bisnes: rekrut, gaji, cabang, P&L
- PWA: save tempatan (IndexedDB), installable

### Teknikal (Sudah Direka)
- React 19 + TypeScript + Vite
- Three.js / React Three Fiber / Rapier 3D
- Zustand state management
- IndexedDB save system
- Biome linter + formatter
- Vitest unit testing
- Responsive mobile-first UI

## 🚀 Permulaan Pantas

### Pra-ciri

- **Node.js 20+** dan **pnpm** (atau npm/yarn)

### Pasang & Jalankan

```bash
pnpm install
pnpm dev
```

Buka `http://localhost:3000`.

### Build & Test

```bash
pnpm build          # production build
pnpm test           # unit tests
pnpm lint           # biome lint + format
pnpm typecheck      # TypeScript strict check
```

### Deploy

```bash
pnpm build
# Upload folder dist ke Cloudflare Pages
```

## 📂 Struktur Projek

```
src/
├── app.tsx                 # Root component
├── main.tsx                # Entry point
├── index.css               # Global styles
├── types/
│   ├── game.ts             # Types & interfaces
│   └── scene.ts            # Scene enum
├── store/
│   ├── gamestate.ts        # Zustand game state
│   └── game.ts             # Zustand scene store
├── lib/
│   ├── idb.ts              # IndexedDB helper
│   └── utils.ts            # Formatters & math helpers
├── components/
│   ├── MainMenu.tsx        # Menu utama
│   ├── HUD.tsx             # Heads-up display (in-game)
│   ├── SettingsPanel.tsx   # Tetapan
│   ├── LoadSavePanel.tsx   # Muat & simpan
│   ├── WarehouseUI.tsx     # UI gudang & paket
│   ├── GameScene3D.tsx     # Canvas 3D utama
│   └── 3d/
│       ├── PlayerController.tsx  # Karakter pemain
│       ├── WorldEnvironment.tsx  # Dunia 3D
│       ├── Terrain.tsx           # Tanah tinggi
│       ├── Buildings.tsx         # Bangunan
│       ├── Roads.tsx             # Jalan raya
│       └── HUD3D.tsx             # 3D overlay
public/
├── manifest.json           # PWA manifest
└── favicon.svg
```

## 📋 Roadmap

| Fasa | Status | Penerangan |
|------|--------|------------|
| 0 | 🔄 Dalam Proses | Setup projek, arsitektur, baseline |
| 1 | ⏳ Belum | Playable foundation: gudang → motor → jalan → delivery → save |
| 2 | ⏳ Belum | Dunia: kota kecil, bangunan, minimap, streaming |
| 3 | ⏳ Belum | Warehouse penuh: sort, scan, manifest, kapasitas |
| 4 | ⏳ Belum | Delivery complete: NPC, COD, gagal kirim, retur |
| 5 | ⏳ Belum | Siang/malam, hujan, traffic, BBM, kerusakan |
| 6 | ⏳ Belum | Ekonomi: Rupiah, XP, level, upgrade |
| 7 | ⏳ Belum | Bisnis: rekrut, gaji, cabang, P&L |
| 8 | ⏳ Belum | Polish: model, animasi, VFX, audio |
| 9 | ⏳ Belum | Release: mobile test, PWA, deploy |

Lihat `docs/` untuk dokumen detail.

## 📄 Lisensi

MIT — lihat `LICENSE`.

## 🙏 Terima Kasih

- [React Three Fiber](https://github.com/pmndrs/react-three-fiber)
- [Rapier](https://github.com/dimforge/rapier)
- [Vite](https://vite.dev)
- [Zustand](https://github.com/pmndrs/zustand)
- [Biome](https://github.com/biomejs/biome)
