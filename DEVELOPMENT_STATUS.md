# STATUS PEMBANGUNAN

Fasa ikut roadmap master prompt (seksyen Q). Skala status (seksyen S):
**Not started / In progress / Implemented / Tested / Accepted**

- **Implemented**: kod wujud dan berjalan, belum ada ujian atau bukti visual
- **Tested**: ada ujian unit dan/atau disahkan di pelayar (bukti dalam `BUG_TRACKER.md` / commit)
- **Accepted**: diuji di telefon sebenar dan diterima pemilik (belum ada setakat ini; telefon sebenar Redmi 9 lulus potret + landskap 2026-11-25, menunggu keputusan pemilik)

Latar: Malaysia, RM, teks BM (TPD-016).

## Phase 0 — Audit & fondasi

| Ciri | Status | Catatan |
|------|--------|---------|
| Vite + React 19 + TypeScript strict | Tested | typecheck + build lulus |
| Vitest | Tested | 471 ujian (Pelan 009) |
| Biome | Tested | 0 ralat |
| Playwright | Tested | E2E vertical slice, `desktop-chrome` + `pixel-7` (emulasi), `bacccb5` |
| PWA manifest | Implemented | Service worker belum ada |
| Dokumen wajib (seksyen S) | Implemented | README, DEVELOPMENT_STATUS, BUG_TRACKER, TECHNICAL_DECISIONS, THIRD_PARTY_NOTICES, QA_REPORT, CHANGELOG |

## Phase 1 — Playable foundation

| Ciri | Status | Catatan |
|------|--------|---------|
| Navigasi menu → permainan | Tested | Dibaiki `dc5d761`; disahkan di Chrome |
| Scene 3D: tanah, jalan, bangunan | Implemented | Geometri placeholder |
| Karakter berjalan/berlari | Tested | Kaki di tanah (y = 0); arah ikut kamera; E2E `pergerakan.spec.ts` (Pelan 007). Masih model kotak, tiada animasi |
| Kamera orang ketiga | Tested | B12 dibaiki: kamera kini benar-benar mengikut pemain; disahkan di Chrome |
| Kawalan papan kekunci (WASD, E) | Tested | A/D ikut skrin (B25), disahkan di Chrome oleh E2E Pelan 007; stereng motor juga |
| Kawalan sentuh (joystick, tindakan, BREK) | Tested | `1b88949`; telefon sebenar Redmi 9 (9b): joystick memandu, butang tindakan berfungsi; potret + landskap lulus selepas B18 (`97da0f4`) |
| Motor: naik, pandu, brek, turun | Tested | Pelan 009: fizik `stepMotor` (pecutan beransur, condong, belok ikut laju), bunyi enjin, km/j sebenar. |
| Motor (lama) | Tested | Motor kekal di tempat ditinggalkan; turun hanya bila < 1 unit/s; disahkan di Chrome |
| Kotak parkir di setiap alamat | Tested | Direkod betul/tidak (tiada penalti lagi); ujian unit sahaja, belum dipandu ke kotak di pelayar |
| Collision watak & motor | Tested | `world-collision.ts`: bulatan vs kotak XZ untuk bangunan, rumah, dinding gudang, meja dan rak (Pelan 007). Bukan Rapier; tiada collision dengan trafik NPC atau tiang lampu |
| HUD asas | Tested | Wang, level, kad misi dan status pandu reaktif (B19); petunjuk ikut mod input (B20). Disahkan di telefon sebenar |
| Simpan/muat | Tested | Skema v1 + validasi + autosave + Teruskan (Pelan 005 Langkah 7); E2E muat semula halaman |

## Phase 2 — World

| Ciri | Status | Catatan |
|------|--------|---------|
| Grid jalan bandar kecil | Tested | Satu kawasan; jalan utara–selatan kini rata (B29, Pelan 009) |
| Kawasan bersambung (perumahan, kampung, dll.) | Not started | |
| Navigasi / minimap | In progress | Anak panah: Tested, minimap: Belum ditulis |
| Chunk streaming, LOD | Not started | |

## Phase 3 — Warehouse

| Ciri | Status | Catatan |
|------|--------|---------|
| Gudang 3D (bangunan, rak, meja sortir) | Tested | Placeholder geometri; dinding, meja dan rak pejal (Pelan 007). Disahkan di Chrome |
| Imbas (simulasi), muat, kapasiti berat/isipadu, berangkat | Tested | Ujian unit + Chrome: paket ke-5 ditolak pada 20/20 unit |
| Manifest | Tested | Dibuka pada muatan pertama, ditutup di meja gudang dengan ringkasan (Langkah 6, `2600f2f`); E2E |

## Phase 4 — Delivery

| Ciri | Status | Catatan |
|------|--------|---------|
| Gelung gudang → hantar berbilang paket → ganjaran → ulang | Tested | Ujian unit stor (3 manifest); Chrome: 4 paket ke 2 alamat, RM500 → RM518 |
| Zon gudang/penghantaran | Tested | 1 meja gudang, 3 alamat |
| Pelanggan NPC, serah terima, bukti | Tested | Langkah 5 (`2c33f7a`); NPC penerima ialah placeholder kotak; E2E melalui UI sebenar |
| Penghantaran gagal / retur | Tested | Penerima tiada → failed → PULANGKAN PAKET → returned (Langkah 5–6); E2E |
| COD | Tested | Pelan 006 (`75883b4`): ~40% paket COD, baki wang kertas (3 pilihan), Serahkan dikunci sehingga dikutip, "COD disetor" dalam ringkasan; kontrak 006 dan E2E `payCod`. B23 dibaiki (Pelan 006b) |

## Phase 5 — Realism

| Ciri | Status | Catatan |
|------|--------|---------|
| Trafik NPC | Tested | 8 kenderaan di lorong kiri (Pelan 009); motor berlanggar dengan kenderaan; NPC belum mengelak pemain |
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

**Kemas kini terakhir:** 2026-11-25 (Pelan 005 Langkah 9b: ujian telefon sebenar)
**Versi:** 0.0.0-alpha
