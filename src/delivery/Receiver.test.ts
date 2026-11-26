import { DELIVERY_ZONES, createSession } from "@/lib/delivery-system";
import { generateInbound } from "@/warehouse/warehouse-logic";
import { describe, expect, it } from "vitest";
import { visiblePendingReceivers } from "./Receiver";

const spots = [
  { id: "zone-delivery-1", x: 27, z: 36, model: "receiverF" as const },
  { id: "zone-delivery-2", x: 2, z: 0, model: "receiverM" as const },
  { id: "zone-delivery-3", x: 45.01, z: 0, model: "receiverF" as const },
  { id: "zone-delivery-4", x: 4, z: 0, model: "receiverM" as const },
];
const here = { x: 0, z: 0 };

describe("penerima paket aktif", () => {
  it("memerlukan paket belum diserah dan jarak tidak melebihi 45 m", () => {
    const session = createSession();
    let nextId = 0;
    const batch = generateInbound(
      3,
      [DELIVERY_ZONES[1]],
      "Gudang",
      {
        createId: () => `paket-${++nextId}`,
        createTrackingNumber: () => `MSK-${nextId}`,
        rng: () => 0.5,
      },
      0,
    );
    session.phase = "delivering";
    session.targets = Object.fromEntries(batch.packets.map((packet, i) => [packet.id, spots[i].id]));
    session.cargo = batch.packets.map((packet, i) => ({
      ...packet,
      status: i === 1 ? "delivered" : "out_for_delivery",
    }));
    expect(visiblePendingReceivers(spots, here, session)).toEqual(["zone-delivery-1"]);
    expect(visiblePendingReceivers(spots, here, { ...session, phase: "returning" })).toEqual([]);
    expect(visiblePendingReceivers(spots, here, createSession())).toEqual([]);
  });
});
