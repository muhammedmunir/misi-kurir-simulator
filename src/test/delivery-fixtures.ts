import { DELIVERY_ZONES, STARTER_CARGO, createSession } from "@/lib/delivery-system";
import type { DeliverySession, DeliveryZone } from "@/types/delivery";
import { type Deps, dispatch, loadOntoVehicle, scanPacket } from "@/warehouse/warehouse-logic";

export const DESK = DELIVERY_ZONES[0];
export const SHOP = DELIVERY_ZONES[1];
export const CAFE = DELIVERY_ZONES[2];

/** Deterministic ids/tracking; rng cycles through `values`. */
export function testDeps(values: number[] = [0.5]): Deps {
  let id = 0;
  let r = 0;
  return {
    createId: () => {
      id += 1;
      return `id-${id}`;
    },
    createTrackingNumber: (prefix) => `${prefix}-${id + 1}`,
    rng: () => {
      const v = values[r % values.length];
      r += 1;
      return v;
    },
  };
}

function must(o: { ok: true; session: DeliverySession } | { ok: false; error: string }): DeliverySession {
  if (!o.ok) throw new Error(o.error);
  return o.session;
}

/**
 * Session already dispatched with one packet per zone in `zones`,
 * built through the real warehouse functions.
 */
export function deliveringTo(zones: DeliveryZone[], now = 1_000): DeliverySession {
  const deps = testDeps();
  let s = createSession();
  zones.forEach((zone, i) => {
    const id = `pkt-${i}`;
    s = {
      ...s,
      inbound: [
        ...s.inbound,
        {
          id,
          trackingNumber: `MSK-${i}`,
          senderName: "Penghantar",
          receiverName: `Penerima ${i}`,
          senderAddress: DESK.name,
          receiverAddress: zone.name,
          areaCode: zone.areaCode,
          weight: 1,
          dimensions: { length: 20, width: 15, height: 10 },
          volume: 2,
          paymentMethod: "prepaid",
          codAmount: 0,
          priority: "normal",
          specialInstructions: "",
          status: "received",
          history: [{ status: "received", timestamp: now, reason: "Diterima di gudang" }],
          createdAt: now,
          updatedAt: now,
        },
      ],
      targets: { ...s.targets, [id]: zone.id },
    };
    s = must(scanPacket(s, id, now));
    s = must(loadOntoVehicle(s, id, STARTER_CARGO, deps.createId, now));
  });
  return must(dispatch(s, now));
}
