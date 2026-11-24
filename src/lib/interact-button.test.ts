import { createSession } from "@/lib/delivery-system";
import { getActionButton, getInteractButtonInfo } from "@/lib/interact-button";
import { consumeAction, requestAction } from "@/lib/touch";
import { CAFE, DESK, SHOP, deliveringTo } from "@/test/delivery-fixtures";
import type { DeliverySession } from "@/types/delivery";
import { describe, expect, it } from "vitest";

function withSession(overrides: Partial<DeliverySession>): DeliverySession {
  return { ...createSession(), ...overrides };
}

describe("getInteractButtonInfo — sepadan dengan interact()", () => {
  const now = 50_000;

  it("tiada zon → 'Tiada zon' walaupun cooldown", () => {
    expect(getInteractButtonInfo({ ...createSession(), cooldownUntil: now + 1 }, now).label).toBe("Tiada zon");
  });

  it("meja gudang semasa idle → BUKA GUDANG", () => {
    expect(getInteractButtonInfo(withSession({ nearbyZone: DESK }), now)).toEqual({
      label: "BUKA GUDANG",
      enabled: true,
    });
  });

  it("meja gudang semasa menghantar → nyahaktif", () => {
    expect(getInteractButtonInfo({ ...deliveringTo([SHOP]), nearbyZone: DESK }, now)).toEqual({
      label: "Hantar dulu",
      enabled: false,
    });
  });

  it("alamat paket semasa menghantar → HANTAR PAKET", () => {
    expect(getInteractButtonInfo({ ...deliveringTo([SHOP]), nearbyZone: SHOP }, now)).toEqual({
      label: "HANTAR PAKET",
      enabled: true,
    });
  });

  it("alamat lain semasa menghantar → Bukan sini", () => {
    expect(getInteractButtonInfo({ ...deliveringTo([SHOP]), nearbyZone: CAFE }, now)).toEqual({
      label: "Bukan sini",
      enabled: false,
    });
  });

  it("zon penghantaran tanpa kargo → Tiada paket", () => {
    expect(getInteractButtonInfo(withSession({ nearbyZone: SHOP }), now).label).toBe("Tiada paket");
  });

  it("cooldown dalam zon → Tunggu...", () => {
    expect(getInteractButtonInfo(withSession({ nearbyZone: DESK, cooldownUntil: now + 1 }), now).label).toBe(
      "Tunggu...",
    );
  });
});

describe("getActionButton — keutamaan sama seperti performInteract()", () => {
  const ambil = { label: "AMBIL PAKET", enabled: true };
  const tunggu = { label: "Tunggu...", enabled: false };
  const tiadaZon = { label: "Tiada zon", enabled: false };
  const hantarDulu = { label: "Hantar dulu", enabled: false };

  it("tindakan penghantaran menang walaupun dekat motor", () => {
    expect(getActionButton(ambil, { onFoot: true, nearMotor: true })).toEqual(ambil);
  });

  it("cooldown menyekat naik/turun motor", () => {
    expect(getActionButton(tunggu, { onFoot: false, nearMotor: false })).toEqual(tunggu);
    expect(getActionButton(tunggu, { onFoot: true, nearMotor: true })).toEqual(tunggu);
  });

  it("atas motor + tiada tindakan → TURUN MOTOR", () => {
    expect(getActionButton(tiadaZon, { onFoot: false, nearMotor: false })).toEqual({
      label: "TURUN MOTOR",
      enabled: true,
    });
  });

  it("berjalan dekat motor + tiada tindakan → NAIK MOTOR (termasuk di zon pickup dengan paket)", () => {
    const naik = { label: "NAIK MOTOR", enabled: true };
    expect(getActionButton(tiadaZon, { onFoot: true, nearMotor: true })).toEqual(naik);
    expect(getActionButton(hantarDulu, { onFoot: true, nearMotor: true })).toEqual(naik);
  });

  it("berjalan jauh dari motor + tiada tindakan → label penghantaran, nyahaktif", () => {
    expect(getActionButton(tiadaZon, { onFoot: true, nearMotor: false })).toEqual(tiadaZon);
  });
});

describe("requestAction / consumeAction — satu ketikan, satu tindakan", () => {
  it("consume sekali sahaja selepas satu request", () => {
    consumeAction();
    requestAction();
    expect(consumeAction()).toBe(true);
    expect(consumeAction()).toBe(false);
  });

  it("tiada request → false", () => {
    consumeAction();
    expect(consumeAction()).toBe(false);
  });
});
