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
| Vitest | Tested | 488 ujian (Pelan 010) |
| Biome | Tested | 0 ralat |
| Playwright | Tested | E2E vertical slice, `desktop-chrome` + `pixel-7` (emulasi), `bacccb5` |
| PWA manifest | Implemented | Service worker belum ada |
| Dokumen wajib (seksyen S) | Implemented | README, DEVELOPMENT_STATUS, BUG_TRACKER, TECHNICAL_DECISIONS, THIRD_PARTY_NOTICES, QA_REPORT, CHANGELOG |

## Phase 1 — Playable foundation

| Ciri | Status | Catatan |
|------|--------|---------|
| Navigasi menu → permainan | Tested | Dibaiki `dc5d761`; disahkan di Chrome |
| Scene 3D: tanah, jalan, bangunan | Tested | Jalan dan bangunan Kenney; blok perumahan, kedai dan perabot jalan (Pelan 023) |
| Karakter berjalan/berlari | Tested | Kaki di tanah (y = 0); arah ikut kamera; E2E `pergerakan.spec.ts` (Pelan 007). Model kurier bersendi dengan animasi langkah (Pelan 008a, dibina dengan kod) |
| Optimasi watak Mixamo | Tested | Pelan 017: geometri berkulit dikurangkan, tekstur penerima dikecilkan dan penerima ditapis ikut paket aktif. Pose berjalan, menunggang dan penerima di pintu disemak dalam Chrome. |
| Kamera orang ketiga | Tested | Pelan 019: jarak penuh semasa berjalan kaki; hanya bangunan atau rumah yang menghalang pandangan menjadi separa lutsinar. Disahkan di pintu Mak Minah dalam Chrome. Kamera motor dan serah terima kekal. |
| Kawalan papan kekunci (WASD, E) | Tested | A/D ikut skrin (B25), disahkan di Chrome oleh E2E Pelan 007; stereng motor juga |
| Kawalan sentuh (joystick, tindakan, BREK) | Tested | `1b88949`; telefon sebenar Redmi 9 (9b): joystick memandu, butang tindakan berfungsi; potret + landskap lulus selepas B18 (`97da0f4`) |
| Motor: naik, pandu, brek, turun | Tested | Motor kekal di tempat ditinggalkan; turun hanya bila < 1 m/s. Pelan 009: fizik `stepMotor` (pecutan beransur, condong, belok ikut laju), bunyi enjin, km/j sebenar. Disahkan di Chrome |
| Postur menunggang | Tested | Pelan 021: IK meletakkan tangan pada genggaman dan kaki pada lantai skuter; postur dan stereng disemak dalam Chrome. |
| Kotak parkir di setiap alamat | Tested | Direkod betul/tidak (tiada penalti lagi); ujian unit sahaja, belum dipandu ke kotak di pelayar |
| Collision watak & motor | Tested | `world-collision.ts`: bulatan vs kotak XZ untuk bangunan, pagar, kereta diparkir, tong sampah dan halangan gudang. Perabot jalan tidak pejal (Pelan 007 dan 023). |
| HUD asas | Tested | Wang, level, kad misi dan status pandu reaktif (B19); petunjuk ikut mod input (B20). Disahkan di telefon sebenar |
| Simpan/muat | Tested | Skema v1 + validasi + autosave + Teruskan (Pelan 005 Langkah 7); E2E muat semula halaman |

## Phase 2 — World

| Ciri | Status | Catatan |
|------|--------|---------|
| Grid jalan bandar kecil | Tested | Satu kawasan; jalan utara–selatan kini rata (B29, Pelan 009) |
| Bangunan, rumah dan pokok Kenney | Tested | GLB berkelompok mengikut model; Pelan 023 menambah jiran di kiri dan kanan rumah alamat tanpa menyekat laluan ke pintu. |
| Kawasan bersambung (perumahan, kampung, dll.) | Not started | |
| Navigasi / minimap | Tested | Anak panah dan minimap (Pelan 010); E2E minimap tidak menutup butang |
| Chunk streaming, LOD | Not started | |

## Phase 3 — Warehouse

| Ciri | Status | Catatan |
|------|--------|---------|
| Gudang 3D (bangunan, rak, meja sortir) | Tested | Dinding zink, pintu gulung, papan tanda PUSAT POS KURIR dan van penghantaran (Pelan 023); halangan gudang Pelan 007 dikekalkan. |
| Imbas (simulasi), muat, kapasiti berat/isipadu, berangkat | Tested | Ujian unit + Chrome: paket ke-5 ditolak pada 20/20 unit |
| Manifest | Tested | Dibuka pada muatan pertama, ditutup di meja gudang dengan ringkasan (Langkah 6, `2600f2f`); E2E |

## Phase 4 — Delivery

| Ciri | Status | Catatan |
|------|--------|---------|
| Gelung gudang → hantar berbilang paket → ganjaran → ulang | Tested | Ujian unit stor (3 manifest); Chrome: 4 paket ke 2 alamat, RM500 → RM518 |
| Zon gudang/penghantaran | Tested | 1 meja gudang, 9 alamat (Pelan 010) |
| Pelanggan NPC, serah terima, bukti | Tested | Pelan 018: penerima di rumah, tiada, diwakili jiran atau menolak; bukti dan COD mengikut laluan, penolakan dikira dalam ringkasan |
| Penghantaran gagal / retur | Tested | Penerima tiada → failed → PULANGKAN PAKET → returned (Langkah 5–6); E2E |
| COD | Tested | Pelan 006 (`75883b4`): ~40% paket COD, baki wang kertas (3 pilihan), Serahkan dikunci sehingga dikutip, "COD disetor" dalam ringkasan; kontrak 006 dan E2E `payCod`. B23 dibaiki (Pelan 006b) |

## Phase 5 — Realism

| Ciri | Status | Catatan |
|------|--------|---------|
| Trafik NPC | Tested | 8 kenderaan di lorong kiri (Pelan 009); motor berlanggar dengan kenderaan; NPC belum mengelak pemain |
| Kitaran siang/malam dan hujan | Tested | Pelan 020: jam HUD, simpanan dan cengkaman ketika hujan. Pelan 024: senja dan subuh, lampu jalan dan tingkap, lampu motor, hujan bergaris, kabus, jalan basah dan bunyi hujan. Ujian unit dan Playwright lulus pada desktop dan emulasi Pixel 7. |
| BBM, kerosakan, audio | Not started | |

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

**Kemas kini terakhir:** 2026-11-27 (Pelan 024: suasana malam dan hujan)
**Versi:** 0.0.0-alpha
