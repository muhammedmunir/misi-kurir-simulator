# STATUS PEMBANGUNAN

Fasa ikut roadmap master prompt (seksyen Q). Skala status (seksyen S):
**Not started / In progress / Implemented / Tested / Accepted**

- **Implemented**: kod wujud dan berjalan, belum ada ujian atau bukti visual
- **Tested**: ada ujian unit dan/atau disahkan di pelayar (bukti dalam `BUG_TRACKER.md` / commit)
- **Accepted**: diuji di telefon sebenar dan diterima pemilik (belum ada setakat ini)

Latar: Malaysia, RM, teks BM (TPD-016).

## Phase 0 — Audit & fondasi

| Ciri | Status | Catatan |
|------|--------|---------|
| Vite + React 19 + TypeScript strict | Tested | typecheck + build lulus |
| Vitest | Tested | 370 ujian (`0f0af83`) |
| Biome | Tested | 0 ralat |
| Playwright | Tested | E2E vertical slice, `desktop-chrome` + `pixel-7` (emulasi), `bacccb5` |
| PWA manifest | Implemented | Service worker belum ada |
| Dokumen wajib (seksyen S) | Implemented | README, DEVELOPMENT_STATUS, BUG_TRACKER, TECHNICAL_DECISIONS, THIRD_PARTY_NOTICES, QA_REPORT, CHANGELOG |

## Phase 1 — Playable foundation

| Ciri | Status | Catatan |
|------|--------|---------|
| Navigasi menu → permainan | Tested | Dibaiki `dc5d761`; disahkan di Chrome |
| Scene 3D: tanah, jalan, bangunan | Implemented | Geometri placeholder |
| Karakter berjalan/berlari | Implemented | Kedudukan dikira manual, bukan Rapier |
| Kamera orang ketiga | Tested | B12 dibaiki: kamera kini benar-benar mengikut pemain; disahkan di Chrome |
| Kawalan papan kekunci (WASD, E) | Implemented | Belum diuji di pelayar; logik E dikongsi dengan butang sentuh |
| Kawalan sentuh (joystick, tindakan, BREK) | Tested | `1b88949`; Chrome `?touch=1`. Belum diuji di telefon sebenar |
| Motor: naik, pandu, brek, turun | Tested | Motor kekal di tempat ditinggalkan; turun hanya bila < 1 unit/s; disahkan di Chrome |
| Kotak parkir di setiap alamat | Tested | Direkod betul/tidak (tiada penalti lagi); ujian unit sahaja, belum dipandu ke kotak di pelayar |
| Fizik Rapier / collision | Not started | `<Physics>` tanpa `RigidBody`; motor menembusi bangunan |
| HUD asas | Tested | Wang, level, status pandu, kad misi reaktif |
| Simpan/muat | Tested | Skema v1 + validasi + autosave + Teruskan (Pelan 005 Langkah 7); E2E muat semula halaman |

## Phase 2 — World

| Ciri | Status | Catatan |
|------|--------|---------|
| Grid jalan bandar kecil | Implemented | Satu kawasan |
| Kawasan bersambung (perumahan, kampung, dll.) | Not started | |
| Navigasi / minimap | In progress | Anak panah: Tested, minimap: Belum ditulis |
| Chunk streaming, LOD | Not started | |

## Phase 3 — Warehouse

| Ciri | Status | Catatan |
|------|--------|---------|
| Gudang 3D (bangunan, rak, meja sortir) | Tested | Placeholder geometri; tiada collision. Disahkan di Chrome |
| Imbas (simulasi), muat, kapasiti berat/isipadu, berangkat | Tested | Ujian unit + Chrome: paket ke-5 ditolak pada 20/20 unit |
| Manifest | Tested | Dibuka pada muatan pertama, ditutup di meja gudang dengan ringkasan (Langkah 6, `2600f2f`); E2E |

## Phase 4 — Delivery

| Ciri | Status | Catatan |
|------|--------|---------|
| Gelung gudang → hantar berbilang paket → ganjaran → ulang | Tested | Ujian unit stor (3 manifest); Chrome: 4 paket ke 2 alamat, RM500 → RM518 |
| Zon gudang/penghantaran | Tested | 1 meja gudang, 3 alamat |
| Pelanggan NPC, serah terima, bukti | Tested | Langkah 5 (`2c33f7a`); NPC penerima ialah placeholder kotak; E2E melalui UI sebenar |
| Penghantaran gagal / retur | Tested | Penerima tiada → failed → PULANGKAN PAKET → returned (Langkah 5–6); E2E |
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
