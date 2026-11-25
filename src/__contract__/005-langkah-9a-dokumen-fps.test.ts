/// <reference types="vite/client" />
/**
 * Kontrak Pelan 005 Langkah 9a — paparan FPS dev, skrip host, dokumen wajib (master prompt seksyen S).
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 */
import changelog from "/CHANGELOG.md?raw";
import devStatus from "/DEVELOPMENT_STATUS.md?raw";
import pkgRaw from "/package.json?raw";
import manifestRaw from "/public/manifest.json?raw";
import qaReport from "/QA_REPORT.md?raw";
import techDecisions from "/TECHNICAL_DECISIONS.md?raw";
import notices from "/THIRD_PARTY_NOTICES.md?raw";
import gameSceneSrc from "@/components/GameScene3D.tsx?raw";
import { createFpsMeter, shouldShowFps } from "@/dev/fps";
import { describe, expect, it } from "vitest";

// ── FPS ──────────────────────────────────────────────────────

describe("createFpsMeter — purata bergolek", () => {
  const run = (meter: ReturnType<typeof createFpsMeter>, start: number, frames: number, dt: number) => {
    let t = start;
    let fps = 0;
    for (let i = 0; i < frames; i++) {
      t += dt;
      fps = meter.tick(t);
    }
    return { t, fps };
  };

  it("tick pertama → 0 (belum ada selang)", () => {
    expect(createFpsMeter().tick(1000)).toBe(0);
  });

  it("selang 16.67 ms → ~60; 33.33 ms → ~30", () => {
    const m60 = createFpsMeter();
    m60.tick(0);
    expect(run(m60, 0, 120, 1000 / 60).fps).toBeCloseTo(60, 0);
    const m30 = createFpsMeter();
    m30.tick(0);
    expect(run(m30, 0, 120, 1000 / 30).fps).toBeCloseTo(30, 0);
  });

  it("tetingkap 60 bingkai: selepas 60 bingkai perlahan, purata ikut kadar baharu sepenuhnya", () => {
    const m = createFpsMeter(60);
    m.tick(0);
    const fast = run(m, 0, 120, 1000 / 60);
    expect(run(m, fast.t, 60, 1000 / 20).fps).toBeCloseTo(20, 0);
  });

  it("shouldShowFps: hanya DEV dan ?fps dalam URL", () => {
    expect(shouldShowFps(true, "?fps")).toBe(true);
    expect(shouldShowFps(true, "?touch=1&fps=1")).toBe(true);
    expect(shouldShowFps(true, "?touch=1")).toBe(false);
    expect(shouldShowFps(false, "?fps=1")).toBe(false);
  });

  it("GameScene3D memaparkan FpsOverlay ikut shouldShowFps(import.meta.env.DEV, window.location.search)", () => {
    expect(gameSceneSrc).toContain("shouldShowFps(import.meta.env.DEV, window.location.search)");
    expect(gameSceneSrc).toContain("<FpsOverlay");
  });
});

// ── Skrip & manifest ────────────────────────────────────────

describe("package.json & manifest", () => {
  const pkg = JSON.parse(pkgRaw) as {
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };

  it("skrip dev:host untuk ujian telefon di rangkaian tempatan", () => {
    expect(pkg.scripts["dev:host"]).toBe("vite --host --port 5179");
  });

  it("manifest PWA ikut TPD-016 (Malaysia), bukan Indonesia", () => {
    const m = JSON.parse(manifestRaw) as { description: string };
    expect(m.description).not.toMatch(/Indonesia/i);
    expect(m.description).toMatch(/Malaysia/);
  });

  // ── THIRD_PARTY_NOTICES.md ──

  /** Lesen sebenar daripada node_modules/<pakej>/package.json, disemak oleh perancang. */
  const LICENSES: Record<string, string> = {
    "@react-three/drei": "MIT",
    "@react-three/fiber": "MIT",
    "@react-three/postprocessing": "MIT",
    "@supabase/supabase-js": "MIT",
    idb: "ISC",
    react: "MIT",
    "react-dom": "MIT",
    "react-router-dom": "MIT",
    three: "MIT",
    zustand: "MIT",
    "@biomejs/biome": "MIT OR Apache-2.0",
    "@playwright/test": "Apache-2.0",
    "@types/react": "MIT",
    "@types/react-dom": "MIT",
    "@types/three": "MIT",
    "@vitejs/plugin-react": "MIT",
    jsdom: "MIT",
    typescript: "Apache-2.0",
    vite: "MIT",
    vitest: "MIT",
  };

  it("THIRD_PARTY_NOTICES menyenaraikan SETIAP kebergantungan terus dengan lesennya pada baris yang sama", () => {
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.length).toBeGreaterThan(0);
    const lines = notices.split("\n");
    for (const name of deps) {
      const row = lines.find((l) => l.includes(`\`${name}\``));
      expect(row, `${name} tiada dalam THIRD_PARTY_NOTICES (tulis nama dalam \`backtick\`)`).toBeDefined();
      if (name === "@react-three/rapier") {
        // Pakej npm tidak mengisytiharkan lesen; dokumen mesti mengatakannya dengan jujur.
        expect(row).toMatch(/tidak dinyatakan/i);
      } else {
        expect(LICENSES[name], `lesen ${name} belum disemak perancang`).toBeDefined();
        expect(row).toContain(LICENSES[name]);
      }
    }
  });

  it("THIRD_PARTY_NOTICES: enjin fizik transitif, font Inter (OFL, dimuat dari Google Fonts), tiada aset media", () => {
    expect(notices).toMatch(/`@dimforge\/rapier3d-compat`.*Apache-2\.0/);
    expect(notices).toMatch(/Inter/);
    expect(notices).toMatch(/OFL/);
    expect(notices).toMatch(/fonts\.googleapis\.com/);
    expect(notices).toMatch(/tiada (model 3D|aset)/i);
  });
});

// ── Dokumen status & QA ────────────────────────────────────

describe("QA_REPORT, CHANGELOG, TECHNICAL_DECISIONS, DEVELOPMENT_STATUS", () => {
  it("QA_REPORT ada bahagian wajib (seksyen S: peranti, pelayar, senario, keputusan, bukti, had)", () => {
    for (const h of ["Peranti", "Pelayar", "Senario", "Keputusan", "Bukti", "Had"]) {
      expect(qaReport, `bahagian "${h}"`).toMatch(new RegExp(`^#+ .*${h}`, "m"));
    }
  });

  it("QA_REPORT merekod E2E (desktop-chrome, pixel-7) dan bilangan ujian unit sebenar", () => {
    expect(qaReport).toContain("desktop-chrome");
    expect(qaReport).toContain("pixel-7");
    expect(qaReport).toMatch(/\b3[5-9]\d passed\b/);
  });

  it("QA_REPORT tidak mendakwa FPS tanpa ukuran; peranti sebenar ditanda BELUM DIUJI", () => {
    expect(qaReport).not.toMatch(/\d+\s*FPS/i);
    expect(qaReport).toMatch(/BELUM DIUJI/);
  });

  it("QA_REPORT & TECHNICAL_DECISIONS merekod Rapier tidak digunakan sebagai had diketahui; QA menyebut B14 dan B17", () => {
    expect(qaReport).toMatch(/Rapier/);
    expect(qaReport).toContain("B14");
    expect(qaReport).toContain("B17");
    expect(techDecisions).toMatch(/Rapier[^\n]*(tidak digunakan|belum digunakan)/i);
  });

  it("CHANGELOG (Keep a Changelog) merangkumi kerja Pelan 005", () => {
    expect(changelog).toMatch(/^## \[0\.1\.0-alpha\]/m);
    for (const s of ["Serah terima", "Ringkasan manifest", "Simpan", "E2E", "B15", "B16"]) {
      expect(changelog, s).toContain(s);
    }
  });

  it("DEVELOPMENT_STATUS dikemas kini: Playwright & simpan/muat Tested, dokumen wajib lengkap", () => {
    const row = (name: string) => devStatus.split("\n").find((l) => l.startsWith(`| ${name}`)) ?? "";
    expect(row("Playwright")).toContain("Tested");
    expect(row("Simpan/muat")).toContain("Tested");
    expect(row("Dokumen wajib")).not.toContain("Belum:");
    expect(devStatus).not.toMatch(/Paparan wang masih Rp/);
  });
});
