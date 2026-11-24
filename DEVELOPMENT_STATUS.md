# STATUS PEMBANGUNAN

Fasa ikut roadmap master prompt (seksyen Q). Skala status (seksyen S):
**Not started / In progress / Implemented / Tested / Accepted**

- **Implemented**: kod wujud dan berjalan, belum ada ujian atau bukti visual
- **Tested**: ada ujian unit dan/atau disahkan di pelayar (bukti dalam `BUG_TRACKER.md` / commit)
- **Accepted**: diuji di telefon sebenar dan diterima pemilik (belum ada setakat ini)

Latar: Malaysia, RM, teks BM (TPD-016). Paparan wang masih Rp sehingga Pelan 005 Langkah 0.

## Phase 0 — Audit & fondasi

| Ciri | Status | Catatan |
|------|--------|---------|
| Vite + React 19 + TypeScript strict | Tested | typecheck + build lulus |
| Vitest | Tested | 88 ujian |
| Biome | Tested | 0 ralat |
| Playwright | Not started | Pelan 005 Langkah 8 |
| PWA manifest | Implemented | Service worker belum ada |
| Dokumen wajib (seksyen S) | In progress | Ada: README, DEVELOPMENT_STATUS, BUG_TRACKER, TECHNICAL_DECISIONS. Belum: THIRD_PARTY_NOTICES, QA_REPORT, CHANGELOG |

## Phase 1 — Playable foundation

| Ciri | Status | Catatan |
|------|--------|---------|
| Navigasi menu → permainan | Tested | Dibaiki `dc5d761`; disahkan di Chrome |
| Scene 3D: tanah, jalan, bangunan | Implemented | Geometri placeholder |
| Karakter berjalan/berlari | Implemented | Kedudukan dikira manual, bukan Rapier |
| Kamera orang ketiga | Implemented | B12: menghadap dinding semasa mula |
| Kawalan papan kekunci (WASD, E) | Implemented | Belum diuji di pelayar; logik E dikongsi dengan butang sentuh |
| Kawalan sentuh (joystick, tindakan, BREK) | Tested | `1b88949`; Chrome `?touch=1`. Belum diuji di telefon sebenar |
| Motor: naik, pandu, brek, turun | In progress | Berfungsi, tetapi motor kembali ke titik tetap bila turun (Pelan 005 Langkah 3) |
| Fizik Rapier / collision | Not started | `<Physics>` tanpa `RigidBody`; motor menembusi bangunan |
| HUD asas | Tested | Wang, level, status pandu, kad misi reaktif |
| Simpan/muat | In progress | IndexedDB wujud; tidak simpan paket/kedudukan (Pelan 005 Langkah 7) |

## Phase 2 — World

| Ciri | Status | Catatan |
|------|--------|---------|
| Grid jalan bandar kecil | Implemented | Satu kawasan |
| Kawasan bersambung (perumahan, kampung, dll.) | Not started | |
| Navigasi / minimap | Not started | Anak panah: Pelan 005 Langkah 4 |
| Chunk streaming, LOD | Not started | |

## Phase 3 — Warehouse

| Ciri | Status | Catatan |
|------|--------|---------|
| Skrin gudang 2D (`WarehouseUI`) | Implemented | Paket rawak, tidak bersambung ke gelung |
| Gudang 3D, sortir, imbas, muat, kapasiti | Not started | Pelan 005 Langkah 1–2 |
| Manifest | Not started | Jenis data wujud sahaja |

## Phase 4 — Delivery

| Ciri | Status | Catatan |
|------|--------|---------|
| Gelung ambil → hantar → ganjaran → ulang | Tested | Ujian unit stor (3 kitaran, ganjaran tepat sekali); ambil paket disahkan di Chrome |
| Zon pickup/penghantaran | Tested | 2 pickup, 3 penghantaran |
| Pelanggan NPC, serah terima, bukti | Not started | Pelan 005 Langkah 5 |
| Penghantaran gagal / retur | Not started | Pelan 005 Langkah 5–6 |
| COD | Not started | Pelan 006 |

## Phase 5 — Realism

| Ciri | Status | Catatan |
|------|--------|---------|
| Trafik NPC | Tested | 8 kenderaan di grid, ikut paksi; tiada elak perlanggaran |
| Siang/malam, cuaca, BBM, kerosakan, audio | Not started | |

## Phase 6 — Economy / career

| Ciri | Status | Catatan |
|------|--------|---------|
| Wang & XP daripada penghantaran | Tested | Ujian unit `player.money` / `xp` |
| Level up | Implemented | Logik `addXP` |
| Mata wang RM | Not started | Pelan 005 Langkah 0 |
| Upgrade kenderaan, reputasi | Not started | Logik separa dalam `gamestate.ts`, tiada UI |

## Phase 7–9 — Business, Polish, Release

| Ciri | Status | Catatan |
|------|--------|---------|
| Semua ciri | Not started | Model 3D, animasi, audio, service worker, Cloudflare deploy |

---

**Kemas kini terakhir:** 2026-11-24 (selepas Pelan 004)
**Versi:** 0.0.0-alpha
