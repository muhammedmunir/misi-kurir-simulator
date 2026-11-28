/**
 * E2E kontrak Pelan 005 Langkah 12 — B21: unsur bertindih dalam landskap telefon.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 *
 * Viewport telefon sebenar (Redmi 9, Chrome, landskap): 823×309 CSS px.
 * 1. Menu utama: teks versi/hak cipta tidak bertindih dengan mana-mana butang; Tetapan boleh dicapai.
 * 2. Panel Serah Terima terbuka → penunjuk arah (.nav-hud) tiada; panel ditutup → muncul semula.
 */
import { type Locator, type Page, expect, test } from "@playwright/test";

type MksState = { phase: string; nearbyZoneId: string | null; actionLabel: string; cargo: { target: string }[] };

test.use({ viewport: { width: 823, height: 309 } });

const state = (page: Page) =>
  page.evaluate(() => (window as unknown as { __mks: { state(): MksState } }).__mks.state());

async function goTo(page: Page, zoneId: string) {
  await page.evaluate((id) => (window as unknown as { __mks: { goTo(z: string): void } }).__mks.goTo(id), zoneId);
  await expect.poll(async () => (await state(page)).nearbyZoneId, { timeout: 5000 }).toBe(zoneId);
}

async function action(page: Page, label: string) {
  await expect.poll(async () => (await state(page)).actionLabel, { timeout: 5000 }).toBe(label);
  await page.getByRole("button", { name: label, exact: true }).click();
}

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Teks (jika dipaparkan) tidak bertindih dengan butang dan boleh ditatal ke dalam viewport. */
async function expectNoOverlap(text: Locator, buttons: Locator) {
  if (!(await text.isVisible())) return; // disembunyikan dalam landskap pun diterima
  await text.scrollIntoViewIfNeeded();
  const t = await text.boundingBox();
  expect(t).not.toBeNull();
  if (t) {
    expect(t.y, `${await text.textContent()}: atas`).toBeGreaterThanOrEqual(0);
    expect(t.y + t.height, `${await text.textContent()}: bawah`).toBeLessThanOrEqual(309 + 0.5);
  }
  for (const btn of await buttons.all()) {
    const b = await btn.boundingBox();
    if (t && b) expect(overlaps(t, b), `${await text.textContent()} × ${await btn.textContent()}`).toBe(false);
  }
}

test("B21: menu utama landskap — versi tidak menutup butang", async ({ page }, info) => {
  test.skip(info.project.name !== "pixel-7", "landskap telefon: projek sentuh sahaja");
  await page.goto("/?touch=1");
  const buttons = page.getByRole("button");
  await expect(page.getByRole("button", { name: /Tetapan/ })).toBeVisible();

  // Tajuk tidak boleh terpotong di atas semasa halaman dibuka (justify-content: center tanpa "safe").
  const title = await page.getByRole("heading", { name: "MISI KURIR" }).boundingBox();
  expect(title, "tajuk MISI KURIR").not.toBeNull();
  if (title) expect(title.y, "tajuk: atas").toBeGreaterThanOrEqual(0);

  await expectNoOverlap(page.getByText(/Versi 0\.0\.0/), buttons);
  await expectNoOverlap(page.getByText(/© 2026/), buttons);

  const tetapan = page.getByRole("button", { name: /Tetapan/ });
  await tetapan.scrollIntoViewIfNeeded();
  const box = await tetapan.boundingBox();
  expect(box).not.toBeNull();
  if (box) expect(box.y + box.height).toBeLessThanOrEqual(309 + 0.5);
  await tetapan.click();
  await expect(page.getByRole("heading", { name: "Tetapan" })).toBeVisible();
});

test("B21: panel Serah Terima landskap — penunjuk arah disembunyikan", async ({ page }, info) => {
  test.skip(info.project.name !== "pixel-7", "landskap telefon: projek sentuh sahaja");
  await page.goto("/?touch=1");
  await page.getByRole("button", { name: /Permainan Baru/ }).click();
  await page.getByPlaceholder("Nama kurir...").fill("Tindih");
  await page.getByRole("button", { name: "Mula Misi" }).click();
  await expect(page.locator("canvas[data-engine]")).toBeVisible();
  await expect.poll(() => page.evaluate(() => "__mks" in window)).toBe(true);

  await goTo(page, "zone-pickup-1");
  await action(page, "BUKA GUDANG");
  const imbas = page.getByRole("button", { name: "Imbas", exact: true }).first();
  await imbas.scrollIntoViewIfNeeded();
  await imbas.click();
  const muat = page.getByRole("button", { name: "Muat", exact: true }).first();
  await muat.scrollIntoViewIfNeeded();
  await muat.click();
  const go = page.getByRole("button", { name: "Berangkat (1 paket)", exact: true });
  await go.scrollIntoViewIfNeeded();
  await go.click();
  await expect.poll(async () => (await state(page)).phase).toBe("delivering");

  const [first] = (await state(page)).cargo;
  await goTo(page, first.target);
  await expect(page.locator(".nav-hud")).toHaveCount(1);

  // Pelan 018: mood pelanggan dirawak; "refuse" menyembunyikan Batal. Tetapkan "home" (sekali guna).
  await page.evaluate(() =>
    (window as unknown as { __mks: { setNextCustomer(m: string): void } }).__mks.setNextCustomer("home"),
  );
  await action(page, "SERAH PAKET");
  await expect(page.getByRole("dialog", { name: "Panel Serah Terima" })).toBeVisible();
  await expect(page.locator(".nav-hud")).toHaveCount(0);

  const batal = page.getByRole("button", { name: "Batal", exact: true });
  await batal.scrollIntoViewIfNeeded();
  await batal.click();
  await expect(page.getByRole("dialog", { name: "Panel Serah Terima" })).toHaveCount(0);
  await expect(page.locator(".nav-hud")).toHaveCount(1);
});
