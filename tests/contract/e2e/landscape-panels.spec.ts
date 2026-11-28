/**
 * E2E kontrak Pelan 005 Langkah 10 — B18: panel dalam landskap telefon.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini. (Pelan 018: mood pelanggan via __mks.setNextCustomer.)
 *
 * Viewport diambil daripada telefon sebenar (Redmi 9, Chrome 158, landskap): 823×309 CSS px.
 * Panel Serah Terima (444 px) lebih tinggi daripada viewport. Setiap butang mesti boleh dicapai
 * dengan klik sebenar; Playwright menatal elemen ke dalam paparan hanya jika bekasnya boleh ditatal.
 */
import { type Page, expect, test } from "@playwright/test";

type MksState = {
  phase: string;
  nearbyZoneId: string | null;
  actionLabel: string;
  cargo: { id: string; status: string; target: string; cod: number }[];
};

const DESK = "zone-pickup-1";

/** COD (Pelan 006): pilih baki yang betul jika paket COD. Wang kertas = RM20/50/100 terkecil ≥ jumlah. */
async function payCod(page: Page, cod: number) {
  if (cod <= 0) return;
  const note = [20, 50, 100].find((n) => n >= cod) ?? 100;
  const btn = page.getByRole("button", { name: `Baki ${(note - cod).toFixed(2)}`, exact: true });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await expect(btn).toHaveCount(0);
}

test.use({ viewport: { width: 823, height: 309 } });

const state = (page: Page) =>
  page.evaluate(() => (window as unknown as { __mks: { state(): MksState } }).__mks.state());

/**
 * Pelan 018 (dikemas kini oleh perancang): mood pelanggan dirawak semasa serah terima dibuka.
 * E2E menetapkannya secara eksplisit melalui API dev supaya laluan ujian deterministik.
 * `setNextCustomer` berlaku untuk SATU serah terima seterusnya sahaja.
 */
type Mood = "home" | "absent" | "refuse" | "neighbour";
async function setNextCustomer(page: Page, mood: Mood) {
  await page.evaluate(
    (m) => (window as unknown as { __mks: { setNextCustomer(m: string): void } }).__mks.setNextCustomer(m),
    mood,
  );
}

async function goTo(page: Page, zoneId: string) {
  await page.evaluate((id) => (window as unknown as { __mks: { goTo(z: string): void } }).__mks.goTo(id), zoneId);
  await expect.poll(async () => (await state(page)).nearbyZoneId, { timeout: 5000 }).toBe(zoneId);
}

async function action(page: Page, label: string) {
  await expect.poll(async () => (await state(page)).actionLabel, { timeout: 5000 }).toBe(label);
  await page.getByRole("button", { name: label, exact: true }).click();
}

/** Butang mesti berada sepenuhnya dalam viewport selepas Playwright menatalnya ke paparan. */
async function reachable(page: Page, name: string) {
  const btn = page.getByRole("button", { name, exact: true }).first();
  await btn.scrollIntoViewIfNeeded();
  const box = await btn.boundingBox();
  expect(box, `${name}: kotak`).not.toBeNull();
  if (box) {
    expect(box.y, `${name}: atas`).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, `${name}: bawah`).toBeLessThanOrEqual(309 + 0.5);
  }
  return btn;
}

test("B18: landskap 823×309 — serah terima, penerima tiada dan ringkasan boleh dicapai", async ({ page }, info) => {
  test.skip(info.project.name !== "pixel-7", "landskap telefon: projek sentuh sahaja");
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/?touch=1");
  await page.getByRole("button", { name: /Permainan Baru/ }).click();
  await page.getByPlaceholder("Nama kurir...").fill("Landskap");
  await page.getByRole("button", { name: "Mula Misi" }).click();
  await expect(page.locator("canvas[data-engine]")).toBeVisible();
  await expect.poll(() => page.evaluate(() => "__mks" in window)).toBe(true);

  // Gudang: 2 paket
  await goTo(page, DESK);
  await action(page, "BUKA GUDANG");
  for (let i = 0; i < 2; i++) {
    await (await reachable(page, "Imbas")).click();
    await (await reachable(page, "Muat")).click();
  }
  await (await reachable(page, "Berangkat (2 paket)")).click();
  await expect.poll(async () => (await state(page)).phase).toBe("delivering");
  const [first, second] = (await state(page)).cargo;

  // Paket 1: setiap butang panel boleh dicapai; Batal menutup panel
  await goTo(page, first.target);
  await setNextCustomer(page, "home");
  await action(page, "SERAH PAKET");
  await (await reachable(page, "Batal")).click();
  await expect(page.getByRole("button", { name: "Penerima tiada" })).toHaveCount(0);

  await setNextCustomer(page, "home");
  await action(page, "SERAH PAKET");
  const proof = page.getByRole("button", { name: "Ambil bukti", exact: true });
  if ((await proof.count()) > 0) {
    await payCod(page, first.cod);
    await (await reachable(page, "Ambil bukti")).click();
    await (await reachable(page, "Serahkan paket")).click();
    await expect.poll(async () => (await state(page)).cargo.find((p) => p.id === first.id)?.status).toBe("delivered");
  } else {
    await (await reachable(page, "Penerima tiada")).click();
    await expect.poll(async () => (await state(page)).cargo.find((p) => p.id === first.id)?.status).toBe("failed");
  }

  // Paket 2: Penerima tiada
  await goTo(page, second.target);
  await setNextCustomer(page, "absent");
  await action(page, "SERAH PAKET");
  await (await reachable(page, "Penerima tiada")).click();
  await expect.poll(async () => (await state(page)).phase).toBe("returning");

  // Ringkasan dalam landskap
  await goTo(page, DESK);
  await action(page, "PULANGKAN PAKET");
  await expect(page.getByText("Ringkasan Manifest")).toBeVisible();
  await (await reachable(page, "Manifest baharu")).click();
  await expect.poll(async () => (await state(page)).phase).toBe("idle");

  expect(errors).toEqual([]);
});
