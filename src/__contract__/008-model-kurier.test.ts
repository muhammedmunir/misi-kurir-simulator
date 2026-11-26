/// <reference types="vite/client" />
/**
 * Kontrak Pelan 008/012a — kurier dan penerima ialah watak GLB beranimasi
 * (Kenney Mini Characters, CC0). Model kotak bersendi Pelan 008a telah diganti.
 */
import { handoverShot } from "@/components/3d/CameraFollow";
import cameraSrc from "@/components/3d/CameraFollow.tsx?raw";
import { CHARACTER_URL } from "@/components/3d/CharacterGLB";
import playerSrc from "@/components/3d/PlayerController.tsx?raw";
import { SPRINT_FROM, courierClip } from "@/components/3d/courier-anim";
import { RECEIVER_SHOW_RADIUS, visibleReceivers } from "@/delivery/Receiver";
import { describe, expect, it } from "vitest";

const NODE_FS = "node:fs";
type NodeFs = { existsSync(path: string): boolean };
const { existsSync } = (await import(/* @vite-ignore */ NODE_FS)) as NodeFs;

describe("aset watak", () => {
  it("setiap model GLB dan teksturnya wujud dalam public/", () => {
    for (const url of Object.values(CHARACTER_URL)) expect(existsSync(`public${url}`), url).toBe(true);
    expect(existsSync("public/models/characters/Textures/colormap.png")).toBe(true);
    expect(existsSync("public/models/characters/LICENSE-kenney-mini-characters.txt")).toBe(true);
  });
});

describe("courierClip", () => {
  it("menunggang → drive; memegang paket → holding-both; laju → sprint; bergerak → walk; diam → idle", () => {
    expect(courierClip({ riding: true, speed: 0, carrying: true }).clip).toBe("drive");
    expect(courierClip({ riding: false, speed: 3, carrying: true }).clip).toBe("holding-both");
    expect(courierClip({ riding: false, speed: SPRINT_FROM + 1, carrying: false }).clip).toBe("sprint");
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
    expect(playerSrc).toMatch(/clip="drive"/);
    expect(playerSrc).toMatch(/carryKind\(held\)/);
    expect(playerSrc).not.toMatch(/CourierModel/);
  });
});

describe("penerima", () => {
  it("hanya penerima dalam RECEIVER_SHOW_RADIUS dipaparkan", () => {
    const spots = [
      { id: "dekat", x: 10, z: 0, model: "maleA" as const },
      { id: "jauh", x: 200, z: 0, model: "femaleB" as const },
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
