/**
 * E2E Pelan 010 — minimap kelihatan semasa menghantar dan tidak bertindih
 * dengan mana-mana butang (desktop dan landskap telefon 823×309).
 */
import { type Page, expect, test } from "@playwright/test";

type MksState = { phase: string; actionLabel: string };
const state = (page: Page) =>
  page.evaluate(() => (window as unknown as { __mks: { state(): MksState } }).__mks.state());

test("minimap tidak menutup butang", async ({ page, isMobile }) => {
  if (isMobile) await page.setViewportSize({ width: 823, height: 309 });
  await page.goto(isMobile ? "/?touch=1" : "/");
  await page.getByRole("button", { name: /Permainan Baru/ }).click();
  await page.getByPlaceholder("Nama kurir...").fill("Peta");
  await page.getByRole("button", { name: "Mula Misi" }).click();
  await expect.poll(() => page.evaluate(() => "__mks" in window)).toBe(true);

  const map = page.locator(".minimap");
  await expect(map).toBeVisible();
  const m = await map.boundingBox();
  expect(m).not.toBeNull();
  if (!m) return;
  const vp = page.viewportSize();
  expect(m.x).toBeGreaterThanOrEqual(0);
  expect(m.y).toBeGreaterThanOrEqual(0);
  expect(m.x + m.width).toBeLessThanOrEqual(vp?.width ?? 0);

  const buttons = page.getByRole("button");
  const n = await buttons.count();
  for (let i = 0; i < n; i++) {
    const b = buttons.nth(i);
    if (!(await b.isVisible())) continue;
    const r = await b.boundingBox();
    if (!r) continue;
    const overlap = m.x < r.x + r.width && m.x + m.width > r.x && m.y < r.y + r.height && m.y + m.height > r.y;
    expect(overlap, `minimap bertindih dengan butang "${await b.textContent()}"`).toBe(false);
  }
  expect((await state(page)).phase).toBe("idle");
});
