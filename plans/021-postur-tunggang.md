# Pelan 021 — Postur menunggang skuter (IK)

Pelaksana: **C9**. Penyemak: Claude. SATU commit pada cawangan `c9/021-tunggang` (dicabang daripada commit Pelan 020).

## Masalah

Penunggang memainkan klip Mixamo `drive`, iaitu animasi **memandu kereta**: tangan pada stereng di hadapan dada dan kaki ke hadapan seperti menekan pedal. Di atas skuter, ia nampak salah. Mixamo tiada klip menunggang motor, jadi postur dibina dengan IK di atas pose duduk.

## Ukuran skuter (diukur oleh perancang, ruang setempat kumpulan motor)

Hadapan = +z, kanan = −x. `ScooterGLB` dipasang pada asalan kumpulan motor.

| Bahagian | Kedudukan |
|---|---|
| Genggaman pemegang (tengah) | (±0.31, 1.06, 0.33); genggaman merentang x 0.22–0.38 |
| Paksi stereng (tiub kepala) | x = 0, z ≈ 0.42, menegak |
| Lantai kaki (`Object_17`) | atas y = 0.24, z −0.13…0.23, x ±0.32 |
| Tempat duduk | atas y ≈ 0.86 (`SEAT_TOP`) |
| Penunggang | `RIDER_OFFSET = [0, SEAT_TOP − 0.51, −0.12]` |

## Kontrak

`src/__contract__/021-tunggang-ik.test.ts` (ditulis oleh perancang; mesti gagal dahulu). JANGAN sunting.

## Spesifikasi

1. **Fail baharu `src/components/3d/rider-ik.ts`** (tulen, three.js sahaja, tanpa React):
   - `export const RIDER_STEER_ANGLE` ialah sudut pusingan pemegang maksimum (rad), cadangan 0.35.
   - `export function riderTargets(steer: number): { leftHand, rightHand, leftFoot, rightFoot }` memulangkan `THREE.Vector3` dalam ruang motor.
     - `steer` dikepit −1…1. Pemegang berputar pada paksi menegak melalui (0, *, 0.42) dengan sudut `θ = −steer × RIDER_STEER_ANGLE` (steer > 0 = kanan, jadi tangan kanan bergerak ke belakang).
     - Kaki: (±0.14, 0.26, 0.05) dan tidak ikut steer.
   - `export function solveTwoBoneIK(upper, lower, end, target, pole): void` ialah IK analitik dua tulang dalam **ruang dunia**: hukum kosinus untuk sudut siku/lutut, kemudian putar `upper` supaya rantai menghala sasaran, dengan satah bengkokan ditentukan oleh `pole`.
     - Hanya `quaternion` tulang diubah; `position` tidak disentuh.
     - Jika sasaran di luar jangkauan, rantai diluruskan ke arah sasaran.
     - Kemas kini `matrixWorld` tulang selepas setiap putaran.
     - Jangan guna `CCDIKSolver`: ia lelaran dan perlukan konfigurasi indeks tulang.
2. **`CharacterGLB.tsx`:** prop baharu `afterAnimate?: (root: THREE.Object3D, dt: number) => void`.
   - Dipanggil dalam `useFrame` yang sedia ada, SELEPAS `play(...)`. `useAnimations` mendaftar `useFrame` lebih awal, jadi mixer sudah dikemas kini dan IK menimpa pose klip.
   - Jangan tambah `priority` pada `useFrame`: priority bukan sifar mematikan render automatik R3F.
3. **`PlayerController.tsx`:** penunggang (`riderRef`) menghantar `afterAnimate`:
   - Cari tulang sekali melalui `getObjectByName`, simpan dalam ref, dengan nama Mixamo bersanitasi `${prefix}LeftArm`, `LeftForeArm`, `LeftHand`, `RightArm`, …, `LeftUpLeg`, `LeftLeg`, `LeftFoot`, …. Awalan dikesan daripada tulang yang berakhir dengan `Hips`, seperti dalam `tools/convert/mixamo.ts`.
   - Setiap frame:
     - `t = riderTargets(motorSteer)`;
     - tukar `t.*` ke ruang dunia dengan `motorGroup.localToWorld` (kumpulan `name="motor"`);
     - `solveTwoBoneIK` untuk empat anggota.
   - Pole:
     - siku = ke belakang dan ke luar (x tangan × 1.5, y 0.9, z −0.4);
     - lutut = ke hadapan (x kaki, y 0.6, z 0.6).
   - Pergelangan: selepas IK, putar tulang `Hand` supaya tapak tangan menghadap ke bawah ke pemegang. Ini sekadar `Hand.quaternion` setempat yang tetap; laraskan secara visual.
   - Badan: condongkan `Spine` 10–15° ke hadapan (setempat, tetap), dan `Spine1` sedikit melawan `motorLean` supaya kepala kekal lebih tegak daripada skuter.
   - Klip asas kekal `drive` (pose duduk). Ini MESTI dibuat dalam fungsi bernama dan bukan dalam JSX sebaris.
4. **Ukur semula titik jika visual tidak tepat.** Tangan mesti nampak memegang genggaman, bukan terapung. Nilai dalam `riderTargets` boleh dilaras dalam julat kontrak sahaja. Kemas kini jadual ukuran di atas dalam laporan, bukan dalam pelan.
5. **Dokumen:** CHANGELOG.

## Tangkapan skrin wajib (Vite, satu pelayan sahaja)

Simpan dalam `.playwright-mcp/plan-021/`:
- `sisi.png`: kamera dari sisi kiri, motor berhenti. Tangan pada genggaman, kaki di lantai, lutut bengkok ke hadapan.
- `belakang-belok.png`: dari belakang semasa membelok kanan. Pemegang dan tangan berpusing, badan condong.
- `hadapan.png`: dari hadapan. Siku tidak menembusi badan atau skuter.

Gunakan `window.__mks.goToMotor()`, kemudian tekan E untuk naik. Laraskan kamera dalam skrip Playwright sahaja, bukan dalam kod produksi.

## Luar skop

Tukar watak (Pelan 022), animasi turun/naik motor, kaki menongkat bila berhenti.

## Gate

tsc, biome src/ (kod keluar 0), vitest, knip tanpa baris baharu, playwright.

## STOP

- Kontrak bercanggah dengan ukuran sebenar (contohnya genggaman bukan pada y 0.95–1.15): berhenti dan lapor nilai yang diukur.
- Rantai tulang tidak dijumpai dalam `courier.glb`: berhenti dan lapor nama tulang yang wujud.
