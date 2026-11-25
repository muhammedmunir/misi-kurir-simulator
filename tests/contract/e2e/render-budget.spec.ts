/**
 * E2E kontrak Pelan 005 Langkah 11b — bajet draw call selepas instancing.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 *
 * Sebelum 11b (11a): desktop-chrome 265–274 draw call di kedudukan mula, pixel-7 136–145.
 * Pelaksanaan rujukan 11b: desktop 69, pixel-7 43; di alamat 30.
 * Bajet di bawah memberi ruang ~50% di atas rujukan, tetapi jauh di bawah nilai sebelum 11b.
 */
import { type Page, expect, test } from "@playwright/test";

type RenderInfo = { calls: number; triangles: number } | null;
type Api = { renderInfo(): RenderInfo; goTo(z: string): void; state(): { nearbyZoneId: string | null } };

const BUDGET: Record<string, number> = { "desktop-chrome": 110, "pixel-7": 80 };

const info = (page: Page) => page.evaluate(() => (window as unknown as { __mks: Api }).__mks.renderInfo());

async function goTo(page: Page, zone: string) {
  await page.evaluate((z) => (window as unknown as { __mks: Api }).__mks.goTo(z), zone);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __mks: Api }).__mks.state().nearbyZoneId))
    .toBe(zone);
  await page.waitForTimeout(500);
}

test("bajet draw call: mula, gudang dan alamat", async ({ page }, testInfo) => {
  const budget = BUDGET[testInfo.project.name];
  expect(budget, `bajet untuk projek ${testInfo.project.name}`).toBeDefined();

  await page.goto(testInfo.project.name === "pixel-7" ? "/?touch=1" : "/");
  await page.getByRole("button", { name: /Permainan Baru/ }).click();
  await page.getByPlaceholder("Nama kurir...").fill("Bajet");
  await page.getByRole("button", { name: "Mula Misi" }).click();
  await expect(page.locator("canvas[data-engine]")).toBeVisible();
  await expect.poll(async () => (await info(page))?.calls ?? 0, { timeout: 10_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(1000);

  const results: Record<string, RenderInfo> = { mula: await info(page) };
  await goTo(page, "zone-pickup-1");
  results.gudang = await info(page);
  await goTo(page, "zone-delivery-1");
  results.alamat = await info(page);

  console.log(`[render-budget ${testInfo.project.name}]`, JSON.stringify(results));
  for (const [where, r] of Object.entries(results)) {
    expect(r?.calls ?? Number.POSITIVE_INFINITY, `${where}: draw call ≤ ${budget}`).toBeLessThanOrEqual(budget);
    // Adegan tidak boleh dikosongkan untuk lulus bajet: geometri bandar mesti masih dilukis.
    expect(r?.triangles ?? 0, `${where}: segi tiga`).toBeGreaterThan(4000);
  }
});
