// Alat dev: tukar FBX Mixamo dalam assets-src/ kepada GLB dalam public/models/mixamo/.
// Guna: node tools/convert/run.mjs   (memerlukan pelayan Vite pada port 5190)
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const JOBS = process.argv[2] ? [[process.argv[2], "debug.glb"]] : [
  ["Remy.fbx", "courier.glb"],
  ["Megan.fbx", "receiver-f.glb"],
  ["James.fbx", "receiver-m.glb"],
];
const OUT = "public/models/mixamo";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
page.on("console", (m) => console.log("[pelayar]", m.text()));
page.on("pageerror", (e) => console.log("[ralat]", e.message));
await page.goto("http://localhost:5190/tools/convert/mixamo.html");
await page.waitForFunction(() => typeof window.__convert === "function", null, { timeout: 60000 });
const results = await page.evaluate((jobs) => window.__convert(jobs), JOBS);
mkdirSync(OUT, { recursive: true });
for (const r of results) {
  writeFileSync(`${OUT}/${r.name}`, Buffer.from(r.b64, "base64"));
  console.log(`${r.name}: ${(r.bytes / 1024).toFixed(0)} KB`);
}
console.log(await page.textContent("#log"));
await browser.close();
