/**
 * E2E Pelan 007 — kawalan papan kekunci sebenar dalam pelayar (desktop-chrome).
 * A/D mesti ikut skrin, watak di tanah, dan rumah tidak boleh ditembusi.
 */
import { type Page, expect, test } from "@playwright/test";

type MksState = { pos: { x: number; y: number; z: number }; heading: number; nearbyZoneId: string | null };

const state = (page: Page) =>
  page.evaluate(() => (window as unknown as { __mks: { state(): MksState } }).__mks.state());

async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(150);
}

test.beforeEach(async ({ page, isMobile }) => {
  test.skip(isMobile, "kawalan papan kekunci: desktop sahaja");
  await page.goto("/");
  await page.getByRole("button", { name: /Permainan Baru/ }).click();
  await page.getByPlaceholder("Nama kurir...").fill("Gerak");
  await page.getByRole("button", { name: "Mula Misi" }).click();
  await expect(page.locator("canvas[data-engine]")).toBeVisible();
  await expect.poll(() => page.evaluate(() => "__mks" in window)).toBe(true);
  // Tunggu sehingga adegan 3D benar-benar melukis (useFrame berjalan).
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __mks: { renderInfo(): { calls: number } | null } }).__mks.renderInfo()?.calls ?? 0,
      ),
    )
    .toBeGreaterThan(0);
  await page.waitForTimeout(300);
});

test("watak di tanah; D ke kanan skrin, A ke kiri skrin", async ({ page }) => {
  const s0 = await state(page);
  expect(s0.pos.y).toBe(0);
  // Kamera memandang +z (heading 0), jadi kanan skrin = −x.
  expect(Math.abs(s0.heading)).toBeLessThan(0.01);

  await hold(page, "KeyD", 600);
  const s1 = await state(page);
  expect(s1.pos.x).toBeLessThan(s0.pos.x - 1.5);
  expect(Math.abs(s1.pos.z - s0.pos.z)).toBeLessThan(0.3);
  expect(Math.abs(s1.heading)).toBeLessThan(0.01); // kamera tidak berpusing bila bergerak ke sisi

  await hold(page, "KeyA", 600);
  const s2 = await state(page);
  expect(s2.pos.x).toBeGreaterThan(s1.pos.x + 1.5);
});

test("rumah alamat tidak boleh ditembusi", async ({ page }) => {
  // Kedai Runcit Mak Minah: rumah x 56–64, z 21–27; pintu (60, 29).
  await page.evaluate(() => (window as unknown as { __mks: { goTo(z: string): void } }).__mks.goTo("zone-delivery-1"));
  await expect.poll(async () => (await state(page)).nearbyZoneId).toBe("zone-delivery-1");
  await hold(page, "KeyS", 1500); // berjalan ke −z, terus ke dinding rumah
  const s = await state(page);
  expect(s.pos.z).toBeGreaterThanOrEqual(27.3);
  expect(s.pos.z).toBeLessThan(27.5);
});
