/**
 * Kontrak Pelan 013a — paket di tangan kurier (logik).
 */
import { SACK_FROM, TAKE_RADIUS, carryKind, stowCarry, takeFromMotor, takeableFromMotor } from "@/delivery/carry";
import { completeHandover, takeProof } from "@/delivery/handover";
import { interact } from "@/lib/delivery-system";
import { getActionButton, getInteractButtonInfo } from "@/lib/interact-button";
import { SHOP, deliveringTo, testDeps } from "@/test/delivery-fixtures";
import type { DeliverySession } from "@/types/delivery";
import { describe, expect, it } from "vitest";

const onFoot = { onFoot: true };
const nearShop = { x: SHOP.parking?.x ?? 0, z: SHOP.parking?.z ?? 0 };

describe("Berangkat → paket di tangan", () => {
  it("dispatch: kurier memegang semua paket yang dimuat", () => {
    const s = deliveringTo([SHOP, SHOP]);
    expect(s.carry).toEqual(s.cargo.map((p) => p.id));
  });

  it("jenis bawaan: 1 kotak, 2–3 bertindan, ≥ 4 guni", () => {
    expect(carryKind(0)).toBe("none");
    expect(carryKind(1)).toBe("box");
    expect(carryKind(3)).toBe("stack");
    expect(carryKind(SACK_FROM)).toBe("sack");
  });
});

describe("motor", () => {
  it("letak dalam motor mengosongkan tangan", () => {
    const s = stowCarry(deliveringTo([SHOP]), 10);
    expect(s.carry).toEqual([]);
    expect(s.interactionMessage).toBe("Paket diletak dalam motor");
  });

  it("ambil dari motor: hanya paket untuk alamat dalam TAKE_RADIUS", () => {
    const s = stowCarry(deliveringTo([SHOP]), 10);
    expect(takeableFromMotor(s, nearShop)?.id).toBe(s.cargo[0].id);
    expect(takeableFromMotor(s, { x: SHOP.position.x + TAKE_RADIUS + 5, z: SHOP.position.z })).toBeNull();
    const taken = takeFromMotor(s, nearShop, 20);
    expect(taken.carry).toEqual([s.cargo[0].id]);
  });
});

describe("serahan memerlukan paket di tangan", () => {
  it("tangan kosong di pintu → 'Ambil paket dari motor dahulu', butang AMBIL DI MOTOR (tidak aktif)", () => {
    const s = { ...stowCarry(deliveringTo([SHOP]), 10), nearbyZone: SHOP };
    const r = interact(s, SHOP, 2000, testDeps(), onFoot);
    expect(r.result.action).toBe("nothing");
    expect(r.session.interactionMessage).toBe("Ambil paket dari motor dahulu");
    expect(getInteractButtonInfo(s, 2000)).toEqual({ label: "AMBIL DI MOTOR", enabled: false });
  });

  it("paket di tangan → serah terima; selepas diserahkan tangan kosong", () => {
    let s: DeliverySession = { ...deliveringTo([SHOP]), nearbyZone: SHOP };
    s = interact(s, SHOP, 2000, testDeps(), onFoot).session;
    expect(s.handover).not.toBeNull();
    s = takeProof(s, 2100);
    const done = completeHandover(s, 2200, testDeps());
    expect(done.result.action).toBe("deliver");
    expect(done.session.carry).toEqual([]);
  });
});

describe("butang tindakan di sebelah motor", () => {
  const none = { label: "Tiada zon", enabled: false };
  it("memegang barang → LETAK DALAM MOTOR; ada paket untuk alamat → AMBIL PAKET; selain itu NAIK MOTOR", () => {
    const ctx = { onFoot: true, nearMotor: true, speed: 0 };
    expect(getActionButton(none, { ...ctx, carrying: true }).label).toBe("LETAK DALAM MOTOR");
    expect(getActionButton(none, { ...ctx, canTake: true }).label).toBe("AMBIL PAKET");
    expect(getActionButton(none, ctx).label).toBe("NAIK MOTOR");
  });
});
