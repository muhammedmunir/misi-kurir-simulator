/// <reference types="vite/client" />
/**
 * Kontrak Pelan 007b — kamera tidak bergegar semasa memandu.
 * Punca: kamera (useFrame keutamaan 0) dikemas kini SEBELUM motor bergerak,
 * jadi ia mengejar kedudukan frame lepas; lerp `min(k·dt, 1)` bergantung FPS.
 */
import cameraSrc from "@/components/3d/CameraFollow.tsx?raw";
import { PLAYER_FRAME_PRIORITY } from "@/components/3d/PlayerController";
import playerSrc from "@/components/3d/PlayerController.tsx?raw";
import { describe, expect, it } from "vitest";

describe("susunan frame", () => {
  it("PlayerController berjalan sebelum kamera, tanpa mengambil alih render (keutamaan negatif)", () => {
    expect(PLAYER_FRAME_PRIORITY).toBeLessThan(0);
    expect(playerSrc).toMatch(/\},\s*PLAYER_FRAME_PRIORITY\)/);
  });

  it("CameraFollow kekal pada keutamaan lalai (0): useFrame tanpa argumen kedua", () => {
    expect(cameraSrc).toMatch(/useFrame\(\(state, delta\) => \{/);
    expect(cameraSrc).toMatch(/^\s*\}\);\s*$/m);
  });
});

describe("lerp kamera bebas FPS", () => {
  it("memakai redaman eksponen 1 − e^(−k·dt), bukan min(k·dt, 1)", () => {
    expect(cameraSrc).toMatch(/1 - Math\.exp\(-CAMERA_LERP \* dt\)/);
    expect(cameraSrc).not.toMatch(/Math\.min\(CAMERA_LERP \* dt, 1\)/);
  });
});
