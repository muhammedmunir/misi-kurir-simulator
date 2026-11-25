/// <reference types="vite/client" />
/**
 * Kontrak Pelan 005 Langkah 11a — prestasi telefon: buang Bloom, dedahkan kiraan draw call.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 *
 * Ukuran Redmi 9 (Mali-G52), landskap, dev build: Bloom aktif 34 FPS → tanpa Bloom 37–39 FPS.
 * Tanpa Bloom, renderer melapor ~300 draw call untuk ~7 200 segi tiga: had seterusnya ialah
 * bilangan draw call (Langkah 11b). `renderInfo()` membolehkan E2E mengukurnya.
 */
import gameSceneSrc from "@/components/GameScene3D.tsx?raw";
import { readRenderInfo, registerRenderer } from "@/dev/render-info";
import { createTestApi } from "@/dev/test-api";
import { afterEach, describe, expect, it } from "vitest";
import pkgRaw from "/package.json?raw";

const pkg = JSON.parse(pkgRaw) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };

describe("Bloom dibuang", () => {
  it("GameScene3D tidak lagi menggunakan EffectComposer/Bloom", () => {
    expect(gameSceneSrc).not.toMatch(/EffectComposer|<Bloom|@react-three\/postprocessing/);
  });

  it("@react-three/postprocessing dibuang daripada package.json", () => {
    expect(pkg.dependencies).not.toHaveProperty("@react-three/postprocessing");
    expect(pkg.devDependencies).not.toHaveProperty("@react-three/postprocessing");
  });

  it("tetapan Canvas lain kekal: shadows={false}, dpr={[1, 1.5]}", () => {
    expect(gameSceneSrc).toMatch(/shadows=\{false\}/);
    expect(gameSceneSrc).toMatch(/dpr=\{\[1, 1\.5\]\}/);
  });
});

describe("render-info: kiraan draw call untuk E2E", () => {
  afterEach(() => registerRenderer(null));

  const fake = (calls: number, triangles: number) => ({ info: { render: { calls, triangles } } });

  it("readRenderInfo() null sebelum renderer didaftar", () => {
    registerRenderer(null);
    expect(readRenderInfo()).toBeNull();
  });

  it("membaca nilai SEMASA renderer setiap kali dipanggil (bukan salinan semasa daftar)", () => {
    const r = fake(42, 900);
    registerRenderer(r);
    expect(readRenderInfo()).toEqual({ calls: 42, triangles: 900 });
    r.info.render.calls = 17;
    r.info.render.triangles = 300;
    expect(readRenderInfo()).toEqual({ calls: 17, triangles: 300 });
  });

  it("registerRenderer(null) mengosongkan pendaftaran", () => {
    registerRenderer(fake(1, 1));
    registerRenderer(null);
    expect(readRenderInfo()).toBeNull();
  });

  it("window.__mks.renderInfo() = readRenderInfo()", () => {
    const api = createTestApi();
    expect(api.renderInfo()).toBeNull();
    registerRenderer(fake(120, 5000));
    expect(api.renderInfo()).toEqual({ calls: 120, triangles: 5000 });
  });

  it("GameScene3D merender <RenderInfoProbe /> di dalam Canvas, dev sahaja", () => {
    expect(gameSceneSrc).toMatch(/import\.meta\.env\.DEV\s*&&\s*<RenderInfoProbe\s*\/>/);
    const canvasOpen = gameSceneSrc.indexOf("<Canvas");
    const canvasClose = gameSceneSrc.indexOf("</Canvas>");
    const probe = gameSceneSrc.indexOf("<RenderInfoProbe");
    expect(probe).toBeGreaterThan(canvasOpen);
    expect(probe).toBeLessThan(canvasClose);
  });
});
