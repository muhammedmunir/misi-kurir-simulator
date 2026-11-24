import { DELIVERY_ZONES, createSession } from "@/lib/delivery-system";
import { getInteractButtonInfo } from "@/lib/interact-button";
import type { DeliverySession } from "@/types/delivery";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("idle + tiada zon → { label: 'Tiada zon', enabled: false }", () => {
    const s = createSession();
    const info = getInteractButtonInfo(s);
    expect(info.enabled).toBe(false);
    expect(info.label).toBe("Tiada zon");
  });

  it("idle + zon pickup → { label: 'AMBIL PAKET', enabled: true }", () => {
    const s = withSession({ nearbyZone: DELIVERY_ZONES[0] });
    const info = getInteractButtonInfo(s);
    expect(info.enabled).toBe(true);
    expect(info.label).toBe("AMBIL PAKET");
  });

  it("hasPacket + zon pickup → { label: 'Hantar dulu', enabled: false }", () => {
    const s = withSession({
      nearbyZone: DELIVERY_ZONES[0],
      hasPacket: true,
      state: "hasPacket",
    });
    const info = getInteractButtonInfo(s);
    expect(info.enabled).toBe(false);
    expect(info.label).toBe("Hantar dulu");
  });

  it("hasPacket + zon delivery → { label: 'HANTAR PAKET', enabled: true }", () => {
    const s = withSession({
      nearbyZone: DELIVERY_ZONES[1],
      hasPacket: true,
      state: "hasPacket",
    });
    const info = getInteractButtonInfo(s);
    expect(info.enabled).toBe(true);
    expect(info.label).toBe("HANTAR PAKET");
  });

  it("idle + zon delivery + tiada paket → { label: 'Tiada paket', enabled: false }", () => {
    const s = withSession({ nearbyZone: DELIVERY_ZONES[1] });
    const info = getInteractButtonInfo(s);
    expect(info.enabled).toBe(false);
    expect(info.label).toBe("Tiada paket");
  });

  it("cooldown aktif → { label: 'Tunggu...', enabled: false }", () => {
    const s = withSession({
      nearbyZone: DELIVERY_ZONES[0],
      cooldownUntil: Date.now() + 10000,
    });
    const info = getInteractButtonInfo(s);
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
    const info = getInteractButtonInfo(idle);
    expect(info.enabled).toBe(true);
    expect(info.label).toBe("AMBIL PAKET");
    restoreNow();
  });
});
