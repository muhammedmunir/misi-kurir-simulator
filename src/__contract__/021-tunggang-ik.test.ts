/**
 * Pelan 021 — postur menunggang skuter (IK). Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 *
 * Koordinat `riderTargets` ialah ruang setempat kumpulan motor: hadapan = +z, kanan = −x, tayar y ≈ 0.
 * Ukuran skuter (ScooterGLB, panjang 1.9 m): pemegang ≈ (±0.31, 1.06, 0.33), lantai kaki y ≈ 0.24
 * pada z −0.13…0.23, tempat duduk ≈ y 0.86.
 */
import characterSrc from "@/components/3d/CharacterGLB.tsx?raw";
import playerSrc from "@/components/3d/PlayerController.tsx?raw";
import { RIDER_STEER_ANGLE, riderTargets, solveTwoBoneIK } from "@/components/3d/rider-ik";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

const L1 = 0.3;
const L2 = 0.28;

function chain(parentRotY = 0) {
  const root = new THREE.Group();
  root.rotation.y = parentRotY;
  const upper = new THREE.Bone();
  const lower = new THREE.Bone();
  const end = new THREE.Bone();
  root.add(upper);
  upper.add(lower);
  lower.add(end);
  upper.position.set(0, 1.4, 0);
  lower.position.set(0, -L1, 0); // lurus ke bawah
  end.position.set(0, -L2, 0);
  root.updateMatrixWorld(true);
  return { root, upper, lower, end };
}

const world = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());

describe("solveTwoBoneIK — IK analitik dua tulang (lengan / kaki)", () => {
  for (const rotY of [0, 1.2]) {
    it(`sasaran dalam jangkauan: hujung tiba pada sasaran (induk diputar ${rotY} rad)`, () => {
      const { root, upper, lower, end } = chain(rotY);
      const target = root.localToWorld(new THREE.Vector3(0.3, 1.0, 0.25));
      const pole = root.localToWorld(new THREE.Vector3(0, 1.2, -1));
      solveTwoBoneIK(upper, lower, end, target, pole);
      root.updateMatrixWorld(true);
      expect(world(end).distanceTo(target)).toBeLessThan(0.01);
      // Hanya putaran berubah; panjang tulang kekal.
      expect(lower.position.toArray()).toEqual([0, -L1, 0]);
      expect(end.position.toArray()).toEqual([0, -L2, 0]);
      // Siku/lutut bengkok ke arah pole.
      const s = world(upper);
      const mid = s.clone().add(target).multiplyScalar(0.5);
      const toElbow = world(lower).sub(mid);
      const toPole = pole.clone().sub(mid);
      expect(toElbow.dot(toPole)).toBeGreaterThan(0);
    });
  }

  it("sasaran di luar jangkauan: rantai lurus menghala sasaran", () => {
    const { root, upper, lower, end } = chain();
    const target = new THREE.Vector3(0, 1.4, 2);
    solveTwoBoneIK(upper, lower, end, target, new THREE.Vector3(0, 0, 1));
    root.updateMatrixWorld(true);
    const e = world(end);
    expect(e.distanceTo(target)).toBeCloseTo(2 - (L1 + L2), 2);
    expect(e.y).toBeCloseTo(1.4, 2);
    expect(e.x).toBeCloseTo(0, 2);
  });
});

describe("riderTargets — titik tangan dan kaki pada skuter", () => {
  it("steer 0: tangan simetri pada pemegang, kanan = −x", () => {
    const t = riderTargets(0);
    expect(t.leftHand.x).toBeGreaterThan(0.2);
    expect(t.leftHand.x).toBeLessThan(0.4);
    expect(t.rightHand.x).toBeCloseTo(-t.leftHand.x, 6);
    expect(t.rightHand.y).toBeCloseTo(t.leftHand.y, 6);
    expect(t.rightHand.z).toBeCloseTo(t.leftHand.z, 6);
    for (const h of [t.leftHand, t.rightHand]) {
      expect(h.y).toBeGreaterThan(0.95);
      expect(h.y).toBeLessThan(1.15);
      expect(h.z).toBeGreaterThan(0.25);
      expect(h.z).toBeLessThan(0.42);
    }
  });

  it("kaki rata di lantai skuter, di antara roda", () => {
    const t = riderTargets(0);
    for (const f of [t.leftFoot, t.rightFoot]) {
      expect(f.y).toBeGreaterThan(0.2);
      expect(f.y).toBeLessThan(0.35);
      expect(f.z).toBeGreaterThan(-0.15);
      expect(f.z).toBeLessThan(0.25);
      expect(Math.abs(f.x)).toBeLessThan(0.3);
    }
    expect(t.leftFoot.x).toBeGreaterThan(0);
    expect(t.rightFoot.x).toBeLessThan(0);
  });

  it("belok kanan (steer > 0): pemegang berpusing, tangan kanan ke belakang, lebar pemegang kekal", () => {
    const a = riderTargets(0);
    const t = riderTargets(1);
    expect(t.rightHand.z).toBeLessThan(t.leftHand.z);
    expect(t.rightHand.distanceTo(t.leftHand)).toBeCloseTo(a.rightHand.distanceTo(a.leftHand), 3);
    expect(t.rightHand.y).toBeCloseTo(a.rightHand.y, 6);
    // Sudut pusingan maksimum munasabah (bukan 90°).
    expect(RIDER_STEER_ANGLE).toBeGreaterThan(0.15);
    expect(RIDER_STEER_ANGLE).toBeLessThan(0.6);
    // Kaki tidak ikut pemegang.
    expect(t.leftFoot.toArray()).toEqual(a.leftFoot.toArray());
  });

  it("simetri cermin: riderTargets(−s) = cermin riderTargets(s)", () => {
    const p = riderTargets(0.6);
    const m = riderTargets(-0.6);
    expect(m.leftHand.x).toBeCloseTo(-p.rightHand.x, 6);
    expect(m.leftHand.z).toBeCloseTo(p.rightHand.z, 6);
    expect(m.rightHand.z).toBeCloseTo(p.leftHand.z, 6);
  });

  it("nilai di luar −1…1 dikepit", () => {
    expect(riderTargets(5).rightHand.toArray()).toEqual(riderTargets(1).rightHand.toArray());
  });
});

describe("sambungan dalam permainan", () => {
  it("CharacterGLB menyediakan cangkuk selepas animasi (dipanggil dalam useFrame selepas mixer)", () => {
    expect(characterSrc).toMatch(/afterAnimate\?:\s*\(/);
    expect(characterSrc).toMatch(/afterAnimate\?\.\(/);
  });

  it("PlayerController: penunggang guna riderTargets + solveTwoBoneIK dengan steer motor semasa", () => {
    expect(playerSrc).toMatch(/from "\.\/rider-ik"/);
    expect(playerSrc).toMatch(/riderTargets\(\s*motorSteer/);
    expect(playerSrc).toMatch(/solveTwoBoneIK\(/);
    expect(playerSrc).toMatch(/afterAnimate=\{/);
  });
});
