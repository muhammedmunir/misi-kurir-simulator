import { DELIVERY_ZONES, createSession } from "@/lib/delivery-system";
import { getActionButton, getInteractButtonInfo } from "@/lib/interact-button";
import { consumeAction, requestAction } from "@/lib/touch";
import type { DeliverySession } from "@/types/delivery";
import { describe, expect, it, vi } from "vitest";

// Mock Date.now untuk setiap ujian
function mockNow(t: number) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(t));
}

function restoreNow() {
  vi.useRealTimers();
}

function withSession(overrides: Partial<DeliverySession>): DeliverySession {
  return { ...createSession(), ...overrides };
}

describe("getInteractButtonInfo", () => {
  const now = Date.now();

  it("idle + tiada zon → { label: 'Tiada zon', enabled: false }", () => {
    const s = createSession();
    const info = getInteractButtonInfo(s, now);
    expect(info.enabled).toBe(false);
    expect(info.label).toBe("Tiada zon");
  });

  it("idle + zon pickup → { label: 'AMBIL PAKET', enabled: true }", () => {
    const s = withSession({ nearbyZone: DELIVERY_ZONES[0] });
    const info = getInteractButtonInfo(s, now);
    expect(info.enabled).toBe(true);
    expect(info.label).toBe("AMBIL PAKET");
  });

  it("hasPacket + zon pickup → { label: 'Hantar dulu', enabled: false }", () => {
    const s = withSession({
      nearbyZone: DELIVERY_ZONES[0],
      hasPacket: true,
      state: "hasPacket",
    });
    const info = getInteractButtonInfo(s, now);
    expect(info.enabled).toBe(false);
    expect(info.label).toBe("Hantar dulu");
  });

  it("hasPacket + zon delivery sasaran → { label: 'HANTAR PAKET', enabled: true }", () => {
    const s = withSession({
      nearbyZone: DELIVERY_ZONES[1],
      targetZone: DELIVERY_ZONES[1],
      hasPacket: true,
      state: "hasPacket",
    });
    const info = getInteractButtonInfo(s, now);
    expect(info.enabled).toBe(true);
    expect(info.label).toBe("HANTAR PAKET");
  });

  it("idle + zon delivery + tiada paket → { label: 'Tiada paket', enabled: false }", () => {
    const s = withSession({ nearbyZone: DELIVERY_ZONES[1] });
    const info = getInteractButtonInfo(s, now);
    expect(info.enabled).toBe(false);
    expect(info.label).toBe("Tiada paket");
  });

  it("cooldown aktif → { label: 'Tunggu...', enabled: false }", () => {
    const s = withSession({
      nearbyZone: DELIVERY_ZONES[0],
      cooldownUntil: Date.now() + 10000,
    });
    const info = getInteractButtonInfo(s, now);
    expect(info.enabled).toBe(false);
    expect(info.label).toBe("Tunggu...");
  });

  it("complete + cooldown habis → kembali ke idle, aktif jika zon pickup", () => {
    mockNow(10000);
    const s = withSession({
      state: "complete",
      deliveredAt: 5000,
      cooldownUntil: 6000,
      nearbyZone: DELIVERY_ZONES[0],
    });
    // cooldownUntil = 6000, now = 10000 → tidak disekat
    // complete → idle (secara manual set)
    const idle = { ...s, state: "idle" } as DeliverySession;
    const info = getInteractButtonInfo(idle, 10000);
    expect(info.enabled).toBe(true);
    expect(info.label).toBe("AMBIL PAKET");
    restoreNow();
  });
});

describe("getInteractButtonInfo — padanan dengan interact()", () => {
  const now = 50_000;

  it("hasPacket + zon delivery BUKAN sasaran → nyahaktif", () => {
    const s = withSession({
      nearbyZone: DELIVERY_ZONES[1],
      targetZone: DELIVERY_ZONES[2],
      hasPacket: true,
      state: "hasPacket",
    });
    expect(getInteractButtonInfo(s, now)).toEqual({ label: "Bukan sini", enabled: false });
  });

  it("cooldown tanpa zon → 'Tiada zon' (cooldown hanya penting dalam zon)", () => {
    const s = withSession({ cooldownUntil: now + 1000 });
    expect(getInteractButtonInfo(s, now).label).toBe("Tiada zon");
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
