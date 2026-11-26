/// <reference types="vite/client" />
/**
 * Kontrak Pelan 008/012a/012c — kurier dan penerima ialah watak realistik
 * Mixamo beranimasi (GLB dijana tempatan oleh tools/convert); motor ialah skuter
 * penghantaran Sketchfab (CC-BY-4.0).
 */
import { handoverShot } from "@/components/3d/CameraFollow";
import cameraSrc from "@/components/3d/CameraFollow.tsx?raw";
import { CHARACTER_URL, layeredClip, retargetClips } from "@/components/3d/CharacterGLB";
import playerSrc from "@/components/3d/PlayerController.tsx?raw";
import { SCOOTER_URL } from "@/components/3d/ScooterGLB";
import { SPRINT_FROM, courierClip } from "@/components/3d/courier-anim";
import { RECEIVER_SHOW_RADIUS, visibleReceivers } from "@/delivery/Receiver";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

const NODE_FS = "node:fs";
type NodeFs = { existsSync(path: string): boolean; readFileSync(path: string, enc: "utf8"): string };
const { existsSync, readFileSync } = (await import(/* @vite-ignore */ NODE_FS)) as NodeFs;

describe("aset", () => {
  it("model Mixamo tidak di-commit (repo awam) tetapi dijana oleh alat penukar", () => {
    expect(readFileSync(".gitignore", "utf8")).toMatch(/^public\/models\/mixamo\/$/m);
    expect(existsSync("tools/convert/run.mjs")).toBe(true);
    for (const url of Object.values(CHARACTER_URL)) expect(url).toMatch(/^\/models\/mixamo\/.+\.glb$/);
  });

  it("skuter dan lesen CC-BY wujud dalam public/, dan dikreditkan dalam THIRD_PARTY_NOTICES", () => {
    expect(existsSync(`public${SCOOTER_URL}`)).toBe(true);
    expect(readFileSync("public/models/scooter/LICENSE.txt", "utf8")).toMatch(/CC-BY-4\.0/);
    const notices = readFileSync("THIRD_PARTY_NOTICES.md", "utf8");
    expect(notices).toMatch(/Low Poly Delivery Electric Scooter/);
    expect(notices).toMatch(/spartanmelon/);
    expect(notices).toMatch(/Mixamo/);
  });
});

describe("klip animasi", () => {
  const track = (name: string) => new THREE.QuaternionKeyframeTrack(name, [0, 1], [0, 0, 0, 1, 0, 0, 0, 1]);
  const pos = (name: string) => new THREE.VectorKeyframeTrack(name, [0, 1], [0, 0, 0, 0, 1, 0]);
  const walk = new THREE.AnimationClip("walk", 1, [
    track("mixamorigLeftLeg.quaternion"),
    track("mixamorigSpine.quaternion"),
    pos("mixamorigHips.position"),
  ]);
  const carry = new THREE.AnimationClip("carry", 2, [
    track("mixamorigLeftLeg.quaternion"),
    track("mixamorigSpine.quaternion"),
    track("mixamorigRightHand.quaternion"),
  ]);

  it("carryWalk: kaki dari walk, badan dan tangan dari carry", () => {
    const c = layeredClip("carryWalk", walk, carry);
    expect(c.duration).toBe(1);
    expect(c.tracks.map((t) => t.name).sort()).toEqual(
      [
        "mixamorigHips.position",
        "mixamorigLeftLeg.quaternion",
        "mixamorigRightHand.quaternion",
        "mixamorigSpine.quaternion",
      ].sort(),
    );
  });

  it("retargetClips: watak lain kehilangan trek kedudukan pinggul; kurier mengekalkannya; carryWalk ditambah", () => {
    const keep = retargetClips([walk, carry], true);
    const drop = retargetClips([walk, carry], false);
    expect(keep.map((c) => c.name)).toContain("carryWalk");
    expect(keep.find((c) => c.name === "walk")?.tracks.some((t) => t.name.endsWith("Hips.position"))).toBe(true);
    expect(drop.find((c) => c.name === "walk")?.tracks.some((t) => t.name.endsWith("Hips.position"))).toBe(false);
  });
});

describe("courierClip", () => {
  it("menunggang → drive; memegang paket → carry/carryWalk; laju → run; bergerak → walk; diam → idle", () => {
    expect(courierClip({ riding: true, speed: 0, carrying: true }).clip).toBe("drive");
    expect(courierClip({ riding: false, speed: 3, carrying: true }).clip).toBe("carryWalk");
    expect(courierClip({ riding: false, speed: 0, carrying: true }).clip).toBe("carry");
    expect(courierClip({ riding: false, speed: SPRINT_FROM + 1, carrying: false }).clip).toBe("run");
    expect(courierClip({ riding: false, speed: 3, carrying: false }).clip).toBe("walk");
    expect(courierClip({ riding: false, speed: 0, carrying: false }).clip).toBe("idle");
  });

  it("kelajuan klip berjalan mengikut laju sebenar (dalam had munasabah)", () => {
    const slow = courierClip({ riding: false, speed: 1.5, carrying: false }).timeScale;
    const fast = courierClip({ riding: false, speed: 5, carrying: false }).timeScale;
    expect(fast).toBeGreaterThan(slow);
    expect(slow).toBeGreaterThanOrEqual(0.6);
    expect(fast).toBeLessThanOrEqual(1.6);
  });
});

describe("PlayerController", () => {
  it("kurier berjalan dan penunggang memakai CharacterGLB; barang di tangan kelihatan", () => {
    expect(playerSrc.match(/<CharacterGLB model="courier"/g)?.length).toBe(2);
    expect(playerSrc).toMatch(/pickClip=\{pickRiderClip\}/);
    expect(playerSrc).toMatch(/<ScooterGLB \/>/);
    expect(playerSrc).toMatch(/carryKind\(held\)/);
    expect(playerSrc).not.toMatch(/CourierModel/);
  });
});

describe("penerima", () => {
  it("hanya penerima dalam RECEIVER_SHOW_RADIUS dipaparkan", () => {
    const spots = [
      { id: "dekat", x: 10, z: 0, model: "receiverF" as const },
      { id: "jauh", x: 200, z: 0, model: "receiverM" as const },
    ];
    expect(visibleReceivers(spots, { x: 0, z: 0 })).toEqual(["dekat"]);
    expect(RECEIVER_SHOW_RADIUS).toBeGreaterThanOrEqual(30);
  });
});

describe("kamera serah terima", () => {
  it("kamera di sisi jalan (z > pintu), tidak pernah di dalam rumah (rumah di −z dari pintu)", () => {
    const door = { x: 60, z: 29 };
    for (const aspect of [0.46, 1, 1.78]) {
      const s = handoverShot(door, aspect);
      expect(s.cam.z).toBeGreaterThan(door.z + 4);
      expect(s.look.z).toBeLessThan(s.cam.z);
    }
  });

  it("CameraFollow memakai handoverShot bila serah terima aktif", () => {
    expect(cameraSrc).toMatch(/session\.handover/);
    expect(cameraSrc).toMatch(/handoverShot\(door, aspect\)/);
  });
});
