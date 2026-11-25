/**
 * E2E kontrak Pelan 005 Langkah 11a — kiraan draw call dibaca daripada renderer sebenar.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 *
 * Langkah 11a hanya mengesahkan sambungan (nilai > 0) dan merekod nilai sebagai anotasi.
 * Langkah 11b akan menambah bajet draw call berdasarkan nilai ini.
 */
import { type Page, expect, test } from "@playwright/test";

type RenderInfo = { calls: number; triangles: number } | null;
type Api = { renderInfo(): RenderInfo; goTo(z: string): void; state(): { nearbyZoneId: string | null } };

const api = (page: Page) => page.evaluate(() => (window as unknown as { __mks: Api }).__mks.renderInfo());

test("renderInfo(): draw call dan segi tiga daripada renderer sebenar", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(info.project.name === "pixel-7" ? "/?touch=1" : "/");
  await page.getByRole("button", { name: /Permainan Baru/ }).click();
  await page.getByPlaceholder("Nama kurir...").fill("Bajet");
  await page.getByRole("button", { name: "Mula Misi" }).click();
  await expect(page.locator("canvas[data-engine]")).toBeVisible();
  await expect.poll(() => page.evaluate(() => "__mks" in window)).toBe(true);

  // Kedudukan mula
  await expect.poll(async () => (await api(page))?.calls ?? 0, { timeout: 10_000 }).toBeGreaterThan(0);
  const start = await api(page);
  expect(start?.triangles ?? 0).toBeGreaterThan(0);

  // Meja gudang
  await page.evaluate(() => (window as unknown as { __mks: Api }).__mks.goTo("zone-pickup-1"));
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __mks: Api }).__mks.state().nearbyZoneId))
    .toBe("zone-pickup-1");
  await page.waitForTimeout(500);
  const desk = await api(page);
  expect(desk?.calls ?? 0).toBeGreaterThan(0);

  info.annotations.push({ type: "draw-calls", description: JSON.stringify({ start, desk }) });
  console.log(`[render-info ${info.project.name}]`, JSON.stringify({ start, desk }));
  expect(errors).toEqual([]);
});
