/**
 * E2E kontrak Pelan 005 Langkah 8 — vertical slice penuh.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 *
 * Aliran: permainan baharu → meja gudang → imbas & muat 2 paket → berangkat →
 * paket 1 diselesaikan (dengan baki COD jika paket COD) → MUAT SEMULA HALAMAN → Teruskan → paket 2 "Penerima tiada" →
 * kembali ke gudang → pulangkan → ringkasan → Manifest baharu.
 *
 * Teleport (`__mks.goTo`) hanya menggantikan pemanduan masa nyata. Setiap tindakan
 * permainan dibuat melalui UI sebenar: butang sentuh (mudah alih) atau kekunci E (desktop).
 */
import { type Page, expect, test } from "@playwright/test";

type MksState = {
  scene: string;
  phase: string;
  money: number | null;
  onFoot: boolean;
  nearbyZoneId: string | null;
  actionLabel: string;
  cargo: { id: string; status: string; target: string; cod: number }[];
  summary: { delivered: number; returned: number; earned: number } | null;
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

const state = (page: Page) =>
  page.evaluate(() => (window as unknown as { __mks: { state(): MksState } }).__mks.state());

async function goTo(page: Page, zoneId: string) {
  await page.evaluate((id) => (window as unknown as { __mks: { goTo(z: string): void } }).__mks.goTo(id), zoneId);
  await expect.poll(async () => (await state(page)).nearbyZoneId, { timeout: 5000 }).toBe(zoneId);
}

/**
 * Tekan butang tindakan: butang sentuh berlabel `label` pada mudah alih, kekunci E pada desktop.
 * `actionLabel` ialah label yang sama dipaparkan oleh butang sentuh (getActionButton).
 */
async function action(page: Page, isMobile: boolean, label: string) {
  // Tunggu sehingga permainan sendiri menawarkan tindakan ini (cooldown tamat, zon betul).
  await expect.poll(async () => (await state(page)).actionLabel, { timeout: 5000 }).toBe(label);
  if (isMobile) {
    const btn = page.getByRole("button", { name: label, exact: true });
    await expect(btn).toBeVisible();
    await btn.click();
  } else {
    await page.keyboard.press("KeyE");
  }
}

test("vertical slice: gudang → hantar → muat semula → gagal → pulang → ringkasan", async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  const url = isMobile ? "/?touch=1" : "/";
  await page.goto(url);

  // ── Permainan baharu ──
  await expect(page.getByRole("button", { name: /Teruskan/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Permainan Baru/ }).click();
  await page.getByPlaceholder("Nama kurir...").fill("Ujian E2E");
  await page.getByRole("button", { name: "Mula Misi" }).click();
  await expect(page.locator("canvas[data-engine]")).toBeVisible();
  await expect.poll(() => page.evaluate(() => "__mks" in window)).toBe(true);
  const startMoney = (await state(page)).money ?? Number.NaN;

  // ── Gudang: imbas & muat 2 paket, berangkat ──
  await goTo(page, DESK);
  await action(page, isMobile, "BUKA GUDANG");
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Imbas", exact: true }).first().click();
    await page.getByRole("button", { name: "Muat", exact: true }).first().click();
  }
  await page.getByRole("button", { name: "Berangkat (2 paket)" }).click();
  await expect.poll(async () => (await state(page)).phase).toBe("delivering");
  const [first, second] = (await state(page)).cargo;
  expect(first.status).toBe("out_for_delivery");
  expect(second.status).toBe("out_for_delivery");

  // ── Paket 1: serah (jika ada penerima) atau penerima tiada ──
  await goTo(page, first.target);
  await action(page, isMobile, "SERAH PAKET");
  await expect(page.getByRole("button", { name: "Penerima tiada" })).toBeVisible();
  const proof = page.getByRole("button", { name: "Ambil bukti" });
  let firstDelivered = false;
  if ((await proof.count()) > 0) {
    await payCod(page, first.cod);
    await proof.click();
    await page.getByRole("button", { name: "Serahkan paket" }).click();
    firstDelivered = true;
  } else {
    await page.getByRole("button", { name: "Penerima tiada" }).click();
  }
  const firstStatus = firstDelivered ? "delivered" : "failed";
  await expect.poll(async () => (await state(page)).cargo.find((p) => p.id === first.id)?.status).toBe(firstStatus);
  const moneyAfterFirst = (await state(page)).money ?? Number.NaN;
  if (firstDelivered) expect(moneyAfterFirst).toBeGreaterThan(startMoney);
  else expect(moneyAfterFirst).toBe(startMoney);

  // ── Muat semula di tengah penghantaran → Teruskan ──
  await page.reload();
  const cont = page.getByRole("button", { name: /Teruskan/ });
  await expect(cont).toBeVisible();
  await cont.click();
  await expect(page.locator("canvas[data-engine]")).toBeVisible();
  await expect.poll(() => page.evaluate(() => "__mks" in window)).toBe(true);
  await expect.poll(async () => (await state(page)).phase).toBe("delivering");
  const restored = await state(page);
  expect(restored.money).toBe(moneyAfterFirst);
  expect(restored.cargo.find((p) => p.id === first.id)?.status).toBe(firstStatus);
  expect(restored.cargo.find((p) => p.id === second.id)?.status).toBe("out_for_delivery");

  // ── Paket 2: penerima tiada → returning ──
  await goTo(page, second.target);
  await action(page, isMobile, "SERAH PAKET");
  await page.getByRole("button", { name: "Penerima tiada" }).click();
  await expect.poll(async () => (await state(page)).phase).toBe("returning");

  // ── Kembali ke gudang: pulangkan, tutup manifest, ringkasan ──
  await goTo(page, DESK);
  await action(page, isMobile, "PULANGKAN PAKET");
  await expect(page.getByText("Ringkasan Manifest")).toBeVisible();
  const done = await state(page);
  expect(done.phase).toBe("complete");
  expect(done.summary?.delivered).toBe(firstDelivered ? 1 : 0);
  expect(done.summary?.returned).toBe(firstDelivered ? 1 : 2);
  expect(done.summary?.earned).toBe(moneyAfterFirst - startMoney);
  expect(done.money).toBe(moneyAfterFirst);

  await page.getByRole("button", { name: "Manifest baharu" }).click();
  await expect.poll(async () => (await state(page)).phase).toBe("idle");
  await expect(page.getByText("Ringkasan Manifest")).toHaveCount(0);

  expect(errors).toEqual([]);
});
