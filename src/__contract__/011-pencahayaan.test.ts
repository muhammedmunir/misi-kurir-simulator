/// <reference types="vite/client" />
/**
 * Kontrak Pelan 011 — pencahayaan siang dan suasana.
 */
import { HORIZON, shadowsEnabled } from "@/components/3d/Atmosphere";
import atmosphereSrc from "@/components/3d/Atmosphere.tsx?raw";
import sceneSrc from "@/components/GameScene3D.tsx?raw";
import hudSrc from "@/components/HUD.tsx?raw";
import { describe, expect, it } from "vitest";

describe("bayang-bayang ikut tetapan grafik dan peranti", () => {
  it("Rendah: tiada; Sederhana: desktop sahaja (telefon terlalu perlahan); Tinggi: sentiasa", () => {
    expect(shadowsEnabled("low", false)).toBe(false);
    expect(shadowsEnabled("medium", false)).toBe(true);
    expect(shadowsEnabled("medium", true)).toBe(false);
    expect(shadowsEnabled("high", true)).toBe(true);
  });
});

describe("adegan siang", () => {
  it("Atmosphere dipasang; lampu ambient/arah malam lama dibuang", () => {
    expect(sceneSrc).toMatch(/<Atmosphere \/>/);
    expect(sceneSrc).not.toMatch(/<ambientLight/);
    expect(sceneSrc).not.toMatch(/<color attach="background"/);
  });

  it("kabus dan latar memakai warna ufuk yang sama (tiada jahitan langit)", () => {
    expect(atmosphereSrc).toMatch(/new THREE\.Fog\(HORIZON/);
    expect(atmosphereSrc).toMatch(/new THREE\.Color\(HORIZON\)/);
    expect(HORIZON).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("matahari mengikut pemain supaya kotak bayang-bayang kekal kecil", () => {
    expect(atmosphereSrc).toMatch(/light\.target\.position\.set\(p\.x, 0, p\.z\)/);
  });

  it("kad HUD legap (boleh dibaca di atas langit cerah)", () => {
    expect(hudSrc).not.toMatch(/background: "rgba\(255,255,255,0\.1\)"/);
    expect(hudSrc).toMatch(/rgba\(12, 14, 20, 0\.84\)/);
  });
});
