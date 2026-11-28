// Guna: node tools/convert/run.mjs [asal|rata|quaternius] [alamat Vite]
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const [style = "asal", base = "http://localhost:5190"] = process.argv.slice(2);
const jobs = [
  ["Remy.fbx", "courier"],
  ["Megan.fbx", "receiver-f"],
  ["James.fbx", "receiver-m"],
];
if (!["asal", "rata", "quaternius"].includes(style)) throw new Error(`Gaya tidak sah: ${style}`);
const quaternius = style === "quaternius";
const out = `public/models/${quaternius ? "quaternius" : "mixamo"}`;
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage();
  page.on("console", (m) => console.log("[pelayar]", m.text()));
  page.on("pageerror", (e) => console.log("[ralat]", e.message));
  await page.goto(new URL("/tools/convert/mixamo.html", base).href);
  await page.waitForFunction(() => typeof window.__convert === "function");
  if (quaternius)
    await page.evaluate(async () => {
      await import("./quaternius.ts");
    });
  mkdirSync(out, { recursive: true });
  for (const [file, name] of jobs) {
    const r = await page.evaluate(
      ({ file, name, style }) =>
        style === "quaternius"
          ? window.__convertQuaternius(name)
          : window.__convert(file, `${name}.glb`, { flat: style === "rata" }),
      { file, name, style },
    );
    writeFileSync(`${out}/${r.name}`, Buffer.from(r.b64, "base64"));
    console.log(`${r.name}: ${r.bytes} bait`);
  }
  console.log(await page.textContent("#log"));
} finally {
  await browser.close();
}
