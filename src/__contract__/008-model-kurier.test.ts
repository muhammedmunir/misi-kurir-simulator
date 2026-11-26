/// <reference types="vite/client" />
/**
 * Kontrak Pelan 008a — model kurier bersendi dan kapcai dibina dengan kod.
 * Postur ialah fungsi tulen; komponen hanya menerapkannya pada sendi.
 */
import playerSrc from "@/components/3d/PlayerController.tsx?raw";
import { STRIDE, advancePhase, courierPose } from "@/components/3d/courier-pose";
import { describe, expect, it } from "vitest";

describe("courierPose", () => {
  it("diam: kaki lurus, tiada ayunan", () => {
    const p = courierPose({ mode: "foot", phase: 1.3, gait: 0 });
    expect([p.hipL, p.hipR, p.kneeL, p.kneeR, p.bob]).toEqual([0, 0, 0, 0, 0]);
  });

  it("berjalan: kaki kiri dan kanan berayun bertentangan; tangan bertentangan dengan kaki", () => {
    const p = courierPose({ mode: "foot", phase: Math.PI / 2, gait: 0.4 });
    expect(p.hipL).toBeLessThan(0); // kaki kiri ke hadapan
    expect(p.hipR).toBeCloseTo(-p.hipL);
    expect(Math.sign(p.shoulderL)).toBe(-Math.sign(p.hipL));
  });

  it("berlari mengayun lebih luas dan membengkok lutut lebih daripada berjalan", () => {
    const walk = courierPose({ mode: "foot", phase: Math.PI / 2, gait: 0.3 });
    const run = courierPose({ mode: "foot", phase: Math.PI / 2, gait: 1 });
    expect(Math.abs(run.hipL)).toBeGreaterThan(Math.abs(walk.hipL));
    const walkK = courierPose({ mode: "foot", phase: 0, gait: 0.3 });
    const runK = courierPose({ mode: "foot", phase: 0, gait: 1 });
    expect(runK.kneeL).toBeGreaterThan(walkK.kneeL);
  });

  it("lutut tidak pernah bengkok ke hadapan (sudut lutut ≥ 0)", () => {
    for (let i = 0; i < 32; i++) {
      const p = courierPose({ mode: "foot", phase: (i / 32) * Math.PI * 2, gait: 0.8 });
      expect(p.kneeL).toBeGreaterThanOrEqual(0);
      expect(p.kneeR).toBeGreaterThanOrEqual(0);
    }
  });

  it("menunggang: paha ke hadapan (≈ mendatar), betis ke bawah, tangan ke hendal", () => {
    const p = courierPose({ mode: "ride", phase: 0, gait: 0 });
    expect(p.hipL).toBeLessThan(-1.2);
    expect(p.kneeL).toBeGreaterThan(1.1);
    expect(p.shoulderL).toBeLessThan(-0.6);
  });
});

describe("advancePhase", () => {
  it("satu langkah penuh (STRIDE m) = 2π; diam tidak memajukan fasa", () => {
    expect(advancePhase(0, STRIDE)).toBeCloseTo(Math.PI * 2);
    expect(advancePhase(1, 0)).toBe(1);
  });
});

describe("PlayerController", () => {
  it("memakai CourierModel untuk berjalan dan penunggang, dengan postur courierPose", () => {
    expect(playerSrc.match(/<CourierModel /g)?.length).toBe(2);
    expect(playerSrc).toMatch(/courierPose\(\{ mode: "foot"/);
    expect(playerSrc).toMatch(/courierPose\(\{ mode: "ride"/);
  });

  it("kapcai ada kotak penghantaran dan penunggang ialah anak kumpulan motor", () => {
    expect(playerSrc).toMatch(/Kotak penghantaran/);
    const motorStart = playerSrc.indexOf('<group name="motor">');
    expect(motorStart).toBeGreaterThan(0);
    expect(playerSrc.indexOf("<group ref={riderRef}")).toBeGreaterThan(motorStart);
  });
});
