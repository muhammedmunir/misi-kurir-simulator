/**
 * Kontrak Pelan 005 Langkah 4 — navigasi ke tujuan.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 */
import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { NavArrow } from "@/navigation/NavArrow";
import { currentNavTarget, formatDistance, navTo } from "@/navigation/nav";
import { useDeliveryStore } from "@/store/delivery";
import { CAFE, DESK, SHOP, deliveringTo } from "@/test/delivery-fixtures";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Konvensyen paksi (sama seperti PlayerController/CameraFollow):
// heading h → arah hadapan (sin h, cos h) pada (x, z). heading 0 = menghadap +z.
// Kamera di belakang pemain, jadi kanan skrin = -x apabila heading 0.
// `turn` positif = belok KANAN (ikut jam), radian dalam (-π, π].

describe("navTo — jarak dan sudut belokan", () => {
  it("sasaran tepat di hadapan → turn 0", () => {
    const n = navTo({ x: 0, z: 0 }, 0, { x: 0, z: 10 });
    expect(n.distance).toBeCloseTo(10);
    expect(n.turn).toBeCloseTo(0);
  });

  it("sasaran di kanan (heading 0, kanan = -x) → +π/2", () => {
    expect(navTo({ x: 0, z: 0 }, 0, { x: -10, z: 0 }).turn).toBeCloseTo(Math.PI / 2);
  });

  it("sasaran di kiri → -π/2", () => {
    expect(navTo({ x: 0, z: 0 }, 0, { x: 10, z: 0 }).turn).toBeCloseTo(-Math.PI / 2);
  });

  it("sasaran di belakang → magnitud π", () => {
    expect(Math.abs(navTo({ x: 0, z: 0 }, 0, { x: 0, z: -10 }).turn)).toBeCloseTo(Math.PI);
  });

  it("mengambil kira heading: menghadap +x, sasaran di +x → turn 0", () => {
    expect(navTo({ x: 5, z: 5 }, Math.PI / 2, { x: 25, z: 5 }).turn).toBeCloseTo(0);
  });

  it("turn sentiasa dalam (-π, π] walaupun heading besar", () => {
    const t = navTo({ x: 0, z: 0 }, 7 * Math.PI, { x: 3, z: -4 }).turn;
    expect(t).toBeGreaterThan(-Math.PI);
    expect(t).toBeLessThanOrEqual(Math.PI);
  });

  it("sudah sampai → jarak 0, turn 0 (bukan NaN)", () => {
    expect(navTo({ x: 7, z: 7 }, 1.2, { x: 7, z: 7 })).toEqual({ distance: 0, turn: 0 });
  });
});

describe("formatDistance", () => {
  it("bawah 1 km dalam meter bulat", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(42.6)).toBe("43 m");
    expect(formatDistance(999.4)).toBe("999 m");
  });

  it("1 km ke atas dengan satu titik perpuluhan", () => {
    expect(formatDistance(1000)).toBe("1.0 km");
    expect(formatDistance(2345)).toBe("2.3 km");
  });
});

describe("currentNavTarget — apa yang patut dituju", () => {
  it("idle → meja gudang", () => {
    useDeliveryStore.getState().reset();
    expect(currentNavTarget(useDeliveryStore.getState().session)?.id).toBe(DESK.id);
  });

  it("menghantar → alamat paket seterusnya, kemudian alamat berikutnya", () => {
    const s = deliveringTo([SHOP, CAFE]);
    expect(currentNavTarget(s)?.id).toBe(SHOP.id);
    const shopPacket = s.cargo.find((p) => s.targets[p.id] === SHOP.id);
    if (!shopPacket) throw new Error("fixture mesti ada paket ke SHOP");
    const afterShop = {
      ...s,
      cargo: s.cargo.map((p) => (p.id === shopPacket.id ? { ...p, status: "delivered" as const } : p)),
    };
    expect(currentNavTarget(afterShop)?.id).toBe(CAFE.id);
  });

  it("complete → tiada sasaran", () => {
    expect(currentNavTarget({ ...deliveringTo([SHOP]), phase: "complete" })).toBeNull();
  });

  it("mengembalikan zon sebenar dari DELIVERY_ZONES (koordinat untuk navTo)", () => {
    const target = currentNavTarget(deliveringTo([CAFE]));
    expect(target).toBe(DELIVERY_ZONES.find((z) => z.id === CAFE.id));
  });
});

describe("NavArrow — komponen HUD", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useDeliveryStore.getState().reset();
  });

  it("render pertama terus papar nama sasaran dan jarak (tanpa menunggu poll)", () => {
    useDeliveryStore.setState({ session: deliveringTo([SHOP]) });
    act(() => root.render(<NavArrow />));
    const text = container.textContent ?? "";
    expect(text).toContain(SHOP.name);
    expect(text).toMatch(/\d+(\.\d)? (m|km)/);
  });

  it("anak panah boleh dicapai dan berputar mengikut turn", () => {
    useDeliveryStore.setState({ session: deliveringTo([SHOP]) });
    act(() => root.render(<NavArrow />));
    const arrow = container.querySelector("[data-nav-arrow]");
    expect(arrow).not.toBeNull();
    expect((arrow as HTMLElement).style.transform).toMatch(/rotate\(-?[\d.]+rad\)/);
  });

  it("tiada sasaran (complete) → tidak render apa-apa", () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), phase: "complete" } });
    act(() => root.render(<NavArrow />));
    expect(container.textContent).toBe("");
  });
});
