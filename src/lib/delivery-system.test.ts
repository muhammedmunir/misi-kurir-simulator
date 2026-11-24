import { DELIVERY_ZONES, createSession, interact, interactBlocksMotorSwap, tickSession } from "@/lib/delivery-system";
import { generateNPCTraffic, updateNPCTraffic } from "@/lib/npc-traffic";
import { useDeliveryStore } from "@/store/delivery";
import { useGameStateStore } from "@/store/gamestate";
import type { DeliverySession } from "@/types/delivery";
import type { Manifest, Packet } from "@/types/game";
import { beforeEach, describe, expect, it } from "vitest";

// ── Helpers ───────────────────────────────────────────────────────

function fakeId(): string {
  return `id-${Math.random().toString(36).slice(2)}`;
}

function fakeTracking(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

function fixedRng(...vals: number[]) {
  let i = 0;
  return () => {
    const v = vals[i % vals.length];
    i++;
    return v / 1000;
  };
}

/** Buat session dengan packet & manifest untuk testing */
function sessionWithPacket(overrides?: Partial<DeliverySession>): DeliverySession {
  const packet: Packet = {
    id: "pkt-test-1",
    trackingNumber: "MSK-TEST",
    senderName: "Penghantar",
    receiverName: "Penerima",
    senderAddress: "Pejabat Pos",
    receiverAddress: "Kedai Runcit",
    areaCode: "perumahan",
    weight: 1.5,
    dimensions: { length: 20, width: 15, height: 10 },
    volume: 3,
    paymentMethod: "prepaid",
    codAmount: 0,
    priority: "normal",
    specialInstructions: "",
    status: "in_transit",
    history: [{ status: "in_transit", timestamp: 0, reason: "Dalam penghantaran" }],
    createdAt: 0,
    updatedAt: 0,
  };
  const manifest: Manifest = {
    id: "man-test-1",
    date: "2026-01-01",
    packets: ["pkt-test-1"],
    totalPackets: 1,
    totalWeight: 1.5,
    totalVolume: 3,
    codTotal: 0,
    status: "open",
    createdAt: 0,
    closedAt: null,
  };
  return {
    ...createSession(),
    state: "carrying",
    packet,
    manifest,
    ...overrides,
  };
}

// ── createSession ────────────────────────────────────────────────

describe("createSession", () => {
  it("mula dengan state idle", () => {
    const s = createSession();
    expect(s.state).toBe("idle");
    expect(!!s.packet).toBe(false);
    expect(s.packet).toBeNull();
    expect(s.manifest).toBeNull();
    expect(s.targetZone).toBeNull();
    expect(s.reward).toBe(0);
    expect(s.xpReward).toBe(0);
    expect(s.nearbyZone).toBeNull();
    expect(s.cooldownUntil).toBe(0);
    expect(s.deliveredAt).toBeNull();
    // Mesej fields
    expect(s.completeMessage).toBeNull();
    expect(s.completeMessageTime).toBeNull();
    expect(s.interactionMessage).toBeNull();
    expect(s.interactionMessageTime).toBeNull();
  });
});

// ── tickSession ───────────────────────────────────────────────────

describe("tickSession", () => {
  it("tidak ubah session idle", () => {
    const s = createSession();
    const next = tickSession(s, 100);
    expect(next.state).toBe("idle");
  });

  it("auto-reset complete -> idle selepas 5000ms", () => {
    const s: DeliverySession = {
      ...createSession(),
      state: "complete",
      deliveredAt: 1000,
      reward: 50,
      xpReward: 50,
      targetZone: DELIVERY_ZONES[1],
      packet: null,
      manifest: null,
    };
    let next = tickSession(s, 5999);
    expect(next.state).toBe("complete");

    next = tickSession(s, 6000);
    expect(next.state).toBe("idle");
    expect(next.reward).toBe(0);
    expect(next.xpReward).toBe(0);
    expect(next.targetZone).toBeNull();
    expect(next.deliveredAt).toBeNull();
  });

  it("biar cooldown apabila now < cooldownUntil", () => {
    const s: DeliverySession = {
      ...createSession(),
      cooldownUntil: 500,
    };
    const next = tickSession(s, 300);
    expect(next.cooldownUntil).toBe(500);
  });

  it("tick semasa cooldown tidak mengubah cooldownUntil", () => {
    const s: DeliverySession = {
      ...createSession(),
      cooldownUntil: 500,
    };
    const next = tickSession(s, 300);
    expect(next.cooldownUntil).toBe(500);
  });

  it("padam completeMessage selepas 4000ms", () => {
    const s: DeliverySession = {
      ...createSession(),
      state: "complete",
      completeMessage: "Selesai!",
      completeMessageTime: 0, // bukan null supaya condition != null lulus
    };
    let next = tickSession(s, 3999);
    expect(next.completeMessage).toBe("Selesai!");

    next = tickSession(s, 4000);
    expect(next.completeMessage).toBeNull();
    expect(next.completeMessageTime).toBeNull();
  });

  it("padam interactionMessage selepas 3000ms", () => {
    const s: DeliverySession = {
      ...createSession(),
      interactionMessage: "Berhampiran: Pos",
      interactionMessageTime: 0, // bukan null supaya condition != null lulus
    };
    let next = tickSession(s, 2999);
    expect(next.interactionMessage).toBe("Berhampiran: Pos");

    next = tickSession(s, 3000);
    expect(next.interactionMessage).toBeNull();
    expect(next.interactionMessageTime).toBeNull();
  });
});

// ── interact — ambil paket ──────────────────────────────────────

describe("interact — ambil paket", () => {
  it("berjaya di zon pickup, session idle", () => {
    const s = createSession();
    const zone = DELIVERY_ZONES[0];
    const now = 1000;
    const rng = fixedRng(500, 500);
    const result = interact(s, zone, now, fakeId, fakeTracking, rng);

    expect(result).not.toBeNull();
    expect(result.result.action).toBe("pickup");
    expect(!!result.session.packet).toBe(true);
    expect(result.session.state).toBe("carrying");
    expect(result.session.packet?.id).not.toBeNull();
    expect(result.session.packet?.trackingNumber).not.toBeNull();
    expect(result.session.targetZone).not.toBeNull();
    expect(!!result.session.manifest).toBe(true);
    expect(result.session.manifest?.status).toBe("open");
    expect(result.session.manifest?.totalPackets).toBe(1);
    expect(result.session.cooldownUntil).toBe(now + 500);
    expect(result.session.interactionMessage).toBe("Pilih paket dari Pejabat Pos Pusat");
    expect(result.session.interactionMessageTime).toBe(now);
    expect(result.session.xpReward).toBeGreaterThan(0);
  });

  it("set packet & manifest selepas ambil", () => {
    const s = createSession();
    const zone = DELIVERY_ZONES[0];
    const now = 1000;
    const rng = fixedRng(500, 500);
    const result = interact(s, zone, now, fakeId, fakeTracking, rng);

    expect(!!result.session.packet).toBe(true);
    expect(result.session.state).toBe("carrying");
    expect(result.session.packet?.status).toBe("incoming");
    expect(result.session.manifest?.status).toBe("open");
    expect(result.session.manifest?.packets).toContain(result.session.packet!.id);
  });

  it("tiada mutation di zon pickup apabila sudah ada paket", () => {
    const s = sessionWithPacket({
      targetZone: DELIVERY_ZONES[1],
      xpReward: 30,
    });
    const zone = DELIVERY_ZONES[0];
    const now = 2000;

    const result = interact(s, zone, now, fakeId, fakeTracking, fixedRng(500));
    expect(result.result.action).toBe("nothing");
    expect(result.session.state).toBe("carrying");
  });
});

// ── interact — hantar paket ─────────────────────────────────────

describe("interact — hantar paket", () => {
  it("berjaya di zon penghantaran betul", () => {
    const s = sessionWithPacket({
      targetZone: DELIVERY_ZONES[1],
      xpReward: 30,
    });
    const zone = DELIVERY_ZONES[1];
    const now = 3000;

    const result = interact(s, zone, now, fakeId, fakeTracking, fixedRng(500));
    expect(result.result.action).toBe("deliver");
    expect(result.session.state).toBe("complete");
    expect(result.session.packet?.status).toBe("delivered");
    expect(result.session.manifest?.status).toBe("closed");
    expect(result.session.deliveredAt).toBe(now);
    expect(result.session.cooldownUntil).toBe(now + 1000);
    expect(result.result.reward).toBeGreaterThan(0);
    expect(result.result.xpReward).toBe(30);
    expect(result.result.message).toContain("XP");
    expect(result.session.completeMessage).toBe(result.result.message);
    expect(result.session.completeMessageTime).toBe(now);
    expect(result.session.interactionMessage).toBeNull();
  });

  it("tolak hantar di zon salah", () => {
    const s = sessionWithPacket({
      targetZone: DELIVERY_ZONES[1],
    });
    const zone = DELIVERY_ZONES[2];
    const now = 3000;

    const result = interact(s, zone, now, fakeId, fakeTracking, fixedRng(500));
    expect(result.result.action).toBe("nothing");
    expect(result.session.state).toBe("carrying");
  });

  it("tolak hantar tanpa paket", () => {
    const s = createSession();
    const zone = DELIVERY_ZONES[1];
    const now = 3000;

    const result = interact(s, zone, now, fakeId, fakeTracking, fixedRng(500));
    expect(result.result.action).toBe("nothing");
  });
});

// ── interact — blocked / nothing ─────────────────────────────────

describe("interact — disekat (blocked)", () => {
  it("cooldown di zon delivery → blocked", () => {
    const s: DeliverySession = {
      ...createSession(),
      state: "complete",
      cooldownUntil: 2000,
      packet: null,
      manifest: null,
    };
    const zone = DELIVERY_ZONES[1];
    const now = 1500;

    const result = interact(s, zone, now, fakeId, fakeTracking, fixedRng(505));
    expect(result.result.action).toBe("blocked");
    expect(result.result.message).toBe("Tunggu sebentar...");
    // Session tidak berubah
    expect(result.session.cooldownUntil).toBe(2000);
  });

  it("cooldown di zon pickup → blocked", () => {
    const s: DeliverySession = {
      ...createSession(),
      state: "carrying",
      cooldownUntil: 2000,
      packet: {
        id: "pkt-1",
        trackingNumber: "MSK-X",
        senderName: "A",
        receiverName: "B",
        senderAddress: "Addr1",
        receiverAddress: "Addr2",
        areaCode: "perumahan",
        weight: 1,
        dimensions: { length: 10, width: 10, height: 10 },
        volume: 1,
        paymentMethod: "prepaid",
        codAmount: 0,
        priority: "normal",
        specialInstructions: "",
        status: "in_transit",
        history: [],
        createdAt: 0,
        updatedAt: 0,
      } as Packet,
      manifest: {
        id: "man-1",
        date: "2026-01-01",
        packets: ["pkt-1"],
        totalPackets: 1,
        totalWeight: 1,
        totalVolume: 1,
        codTotal: 0,
        status: "open",
        createdAt: 0,
        closedAt: null,
      } as Manifest,
    };
    const zone = DELIVERY_ZONES[0];
    const now = 1500;

    const result = interact(s, zone, now, fakeId, fakeTracking, fixedRng(505));
    expect(result.result.action).toBe("blocked");
  });

  it("tiada zon → nothing", () => {
    const s = createSession();
    const now = 1000;

    const result = interact(s, null, now, fakeId, fakeTracking, fixedRng(505));
    expect(result.result.action).toBe("nothing");
    expect(result.result.message).toBe("Tiada zon berdekatan");
  });

  it("cooldown tepat pada had — tidak disekat", () => {
    const s: DeliverySession = {
      ...createSession(),
      cooldownUntil: 1500,
    };
    const zone = DELIVERY_ZONES[0];
    const now = 1500;

    const result = interact(s, zone, now, fakeId, fakeTracking, fixedRng(505));
    expect(result).not.toBeNull();
    expect(result.result.action).toBe("pickup");
  });
});

// ── Gelung lengkap: 3 kitaran berturut-turut ─────────────────────

describe("gelung penghantaran 3 kitaran", () => {
  const pickupZone = DELIVERY_ZONES[0];
  const deliveryZone = DELIVERY_ZONES[1];

  it("ambil -> hantar -> auto-reset -> ulang 3 kali", () => {
    let s = createSession();
    let t = 100000;

    for (let i = 0; i < 3; i++) {
      s = tickSession(s, t);
      expect(s.state, `kitaran ${i + 1}: state sebelum ambil`).toBe("idle");
      expect(!!s.packet, `kitaran ${i + 1}: tiada paket`).toBe(false);

      const pickResult = interact(s, pickupZone, t, fakeId, fakeTracking, fixedRng(300, 500));
      expect(pickResult, `kitaran ${i + 1}: pickup tidak null`).not.toBeNull();
      expect(pickResult.result.action).toBe("pickup");
      s = pickResult.session;

      expect(s.state).toBe("carrying");
      expect(!!s.packet).toBe(true);
      expect(s.targetZone).not.toBeNull();
      expect(!!s.manifest).toBe(true);

      t += 600;

      const deliverResult = interact(s, deliveryZone, t, fakeId, fakeTracking, fixedRng(500));
      expect(deliverResult, `kitaran ${i + 1}: deliver tidak null`).not.toBeNull();
      expect(deliverResult.result.action).toBe("deliver");
      s = deliverResult.session;

      expect(s.state, `kitaran ${i + 1}: state selepas hantar`).toBe("complete");
      expect(!!s.packet).toBe(true);
      expect(s.packet?.status).toBe("delivered");
      expect(s.deliveredAt).toBe(t);

      t += 5100;
      s = tickSession(s, t);
      expect(s.state, `kitaran ${i + 1}: selepas auto-reset`).toBe("idle");
      expect(!!s.packet).toBe(false);
      expect(s.reward).toBe(0);
    }
  });
});

// ── useDeliveryStore ─────────────────────────────────────────────

describe("useDeliveryStore — gelung penuh", () => {
  // Bersihkan store sebelum setiap ujian
  beforeEach(() => {
    useDeliveryStore.getState().reset();
  });

  it("ambil -> tick -> hantar -> tick 5000ms -> idle, 3 kitaran", () => {
    let payload = useDeliveryStore.getState().interact(100000);
    // Tiada zon berdekatan → null
    expect(payload).toBeDefined();

    // Simulasi zona berdekatan
    useDeliveryStore.getState().setNearbyZone(DELIVERY_ZONES[0]);

    // Ambil paket
    payload = useDeliveryStore.getState().interact(100000);
    expect(payload.result?.action).toBe("pickup");
    expect(payload.payload?.reward).toBe(0); // pickup tidak beri reward
    expect(payload.payload?.xpReward).toBeGreaterThan(0);

    const session = useDeliveryStore.getState().session;
    expect(!!session.packet).toBe(true);
    expect(session.state).toBe("carrying");

    // Tick tidak ubah hasPacket
    useDeliveryStore.getState().tick(100600);
    expect(useDeliveryStore.getState().session.state).toBe("carrying");

    // Hantar paket — targetZone ditetapkan semasa pickup
    const targetZoneId = session.targetZone?.id;
    const deliveryZone = DELIVERY_ZONES.find((z) => z.id === targetZoneId);
    if (!deliveryZone) throw new Error("delivery zone must exist");
    useDeliveryStore.getState().setNearbyZone(deliveryZone);
    payload = useDeliveryStore.getState().interact(100600);
    expect(payload.result?.action).toBe("deliver");

    const sessionAfter = useDeliveryStore.getState().session;
    expect(sessionAfter.state).toBe("complete");
    expect(!!sessionAfter.packet).toBe(true);
    expect(sessionAfter.packet?.status).toBe("delivered");

    // Tick 5000ms → auto-reset
    useDeliveryStore.getState().tick(105700);
    expect(useDeliveryStore.getState().session.state).toBe("idle");
    expect(!!useDeliveryStore.getState().session.packet).toBe(false);

    // Ulang kitaran 2
    useDeliveryStore.getState().tick(105700); // auto-reset
    expect(useDeliveryStore.getState().session.state).toBe("idle");
    useDeliveryStore.getState().setNearbyZone(DELIVERY_ZONES[0]);
    payload = useDeliveryStore.getState().interact(106000);
    expect(payload.result?.action).toBe("pickup");

    // Kitaran 2: hantar
    const targetZoneId2 = useDeliveryStore.getState().session.targetZone?.id;
    const deliveryZone2 = DELIVERY_ZONES.find((z) => z.id === targetZoneId2);
    if (!deliveryZone2) throw new Error("delivery zone must exist");
    useDeliveryStore.getState().setNearbyZone(deliveryZone2);
    payload = useDeliveryStore.getState().interact(106600);
    expect(payload.result?.action).toBe("deliver");

    // Kitaran 3: selepas auto-reset, ambil semula
    useDeliveryStore.getState().tick(112700); // auto-reset > 5000ms
    expect(useDeliveryStore.getState().session.state).toBe("idle");
    useDeliveryStore.getState().setNearbyZone(DELIVERY_ZONES[0]);
    payload = useDeliveryStore.getState().interact(113000);
    expect(payload.result?.action).toBe("pickup");
    expect(!!useDeliveryStore.getState().session.packet).toBe(true);
  });

  it("cooldown di zon → blocked, E tak boleh swap motor", () => {
    // Ambil paket
    useDeliveryStore.getState().setNearbyZone(DELIVERY_ZONES[0]);
    let payload = useDeliveryStore.getState().interact(100000);
    expect(payload.result?.action).toBe("pickup");

    // Sebaik ambil, ada cooldown 500ms
    payload = useDeliveryStore.getState().interact(100100);
    // Sedang dalam cooldown → blocked
    expect(payload.result?.action).toBe("blocked");

    // Setelah cooldown habis (pickup zone), dapat ambil lagi? Tidak — carrying
    // "nothing" = sudah ada paket, jangan swap motor
    payload = useDeliveryStore.getState().interact(100600);
    expect(payload.result?.action).toBe("nothing");
  });

  it("tiada zona berdekatan → interact() return null", () => {
    useDeliveryStore.getState().setNearbyZone(null);
    const payload = useDeliveryStore.getState().interact(100000);
    expect(payload.result).toBeNull();
    expect(payload.payload).toBeNull();
  });
});

// ── NPC Traffic ──────────────────────────────────────────────────

describe("generateNPCTraffic", () => {
  it("jana bilangan yang diminta", () => {
    const v = generateNPCTraffic(8, () => 0.5);
    expect(v).toHaveLength(8);
  });

  it("jana 0", () => {
    const v = generateNPCTraffic(0, () => 0.5);
    expect(v).toHaveLength(0);
  });

  it("id unik setiap kenderaan", () => {
    const v = generateNPCTraffic(5, () => 0.5);
    const ids = v.map((n) => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(5);
  });

  it("roadAxis atau x atau z", () => {
    const v = generateNPCTraffic(10, () => 0.5);
    for (const n of v) {
      expect(n.roadAxis).oneOf(["x", "z"]);
    }
  });

  it("heading betul mengikut paksi", () => {
    const v = generateNPCTraffic(20, () => 0.5);
    for (const n of v) {
      if (n.roadAxis === "z") {
        expect(n.heading).oneOf([0, Math.PI]);
      } else {
        expect(n.heading).oneOf([Math.PI / 2, -Math.PI / 2]);
      }
    }
  });
});

describe("updateNPCTraffic", () => {
  it("balut sempadan +200 / -200 paksi-z", () => {
    const v = generateNPCTraffic(1, () => 0.5);
    const result = updateNPCTraffic(v, 50);
    expect(result[0].position.z).toBeGreaterThanOrEqual(-200);
    expect(result[0].position.z).toBeLessThanOrEqual(200);
  });

  it("balut sempadan +200 / -200 paksi-x", () => {
    const v = generateNPCTraffic(1, () => 0.26);
    const result = updateNPCTraffic(v, 50);
    expect(result[0].position.x).toBeGreaterThanOrEqual(-200);
    expect(result[0].position.x).toBeLessThanOrEqual(200);
  });

  it("tidak ubah property lain", () => {
    const v = generateNPCTraffic(1, () => 0.5);
    const original = v[0];
    const result = updateNPCTraffic(v, 0.016);
    expect(result[0].speed).toBe(original.speed);
    expect(result[0].color).toBe(original.color);
    expect(result[0].roadAxis).toBe(original.roadAxis);
    expect(result[0].roadValue).toBe(original.roadValue);
  });

  it("delta 0 tidak ubah posisi", () => {
    const v = generateNPCTraffic(3, () => 0.5);
    const positions = v.map((n) => ({ ...n.position }));
    const result = updateNPCTraffic(v, 0);
    for (let i = 0; i < result.length; i++) {
      expect(result[i].position.x).toBe(positions[i].x);
      expect(result[i].position.z).toBe(positions[i].z);
    }
  });
});

// ── interactBlocksMotorSwap ──────────────────────────────────────

describe("interactBlocksMotorSwap", () => {
  it("pickup → true (swing disekat)", () => {
    expect(interactBlocksMotorSwap("pickup")).toBe(true);
  });

  it("deliver → true (swing disekat)", () => {
    expect(interactBlocksMotorSwap("deliver")).toBe(true);
  });

  it("blocked → true (swing disekat)", () => {
    expect(interactBlocksMotorSwap("blocked")).toBe(true);
  });

  it("nothing → false (benarkan motor swap)", () => {
    expect(interactBlocksMotorSwap("nothing")).toBe(false);
  });

  it("null → false (tiada delivery zone)", () => {
    expect(interactBlocksMotorSwap(null)).toBe(false);
  });
});

// ── Ganjaran: pickup tidak tambah wang/XP ───────────────────────

describe("ganjaran — wang & XP pemain", () => {
  beforeEach(() => {
    useDeliveryStore.getState().reset();
    useGameStateStore.getState().createNewGame("Ujian");
  });

  function player() {
    const p = useGameStateStore.getState().player;
    if (!p) throw new Error("player mesti wujud selepas createNewGame");
    return { money: p.money, xp: p.xp, totalEarnings: p.totalEarnings, level: p.level };
  }

  // _playerRef — reference stability check placeholder

  function pickUp(now: number) {
    useDeliveryStore.getState().setNearbyZone(DELIVERY_ZONES[0]);
    return useDeliveryStore.getState().interact(now);
  }

  function deliverToTarget(now: number) {
    const targetId = useDeliveryStore.getState().session.targetZone?.id;
    const zone = DELIVERY_ZONES.find((z) => z.id === targetId);
    if (!zone) throw new Error("zon sasaran mesti wujud selepas ambil paket");
    useDeliveryStore.getState().setNearbyZone(zone);
    return useDeliveryStore.getState().interact(now);
  }

  it("ambil paket → wang & XP tidak berubah", () => {
    const beforeMoney = useGameStateStore.getState().player?.money ?? 0;
    const beforeXp = useGameStateStore.getState().player?.xp ?? 0;
    const beforeEarnings = useGameStateStore.getState().player?.totalEarnings ?? 0;
    expect(pickUp(100_000).result?.action).toBe("pickup");

    const after = useGameStateStore.getState().player!;
    expect(after.money).toBe(beforeMoney);
    expect(after.xp).toBe(beforeXp);
    expect(after.totalEarnings).toBe(beforeEarnings);
  });

  it("hantar → wang & XP bertambah tepat sebanyak ganjaran", () => {
    const before = player();
    pickUp(100_000);
    const { reward } = useDeliveryStore.getState().session;
    // session.reward selepas pickup = 0; reward sebenar ada di result setelah deliver
    expect(reward).toBe(0);

    const deliverResult = deliverToTarget(100_600);
    expect(deliverResult.result?.action).toBe("deliver");

    const rewardAmount = deliverResult.payload?.reward ?? 0;
    const xpAmount = deliverResult.payload?.xpReward ?? 0;

    const after = player();
    expect(after.money).toBe(before.money + rewardAmount);
    expect(after.totalEarnings).toBe(before.totalEarnings + rewardAmount);
    // xpReward < xpToNext awal (100), jadi tiada naik level
    expect(after.level).toBe(before.level);
    expect(after.xp).toBe(before.xp + xpAmount);
  });

  it("tekan lagi di zon sama selepas hantar (tiada paket) → tiada ganjaran kedua", () => {
    pickUp(100_000);
    deliverToTarget(100_600);
    const afterFirst = player();

    // Cooldown hantar = 1000ms; tekan selepas tamat, masih di zon penghantaran
    const again = useDeliveryStore.getState().interact(102_000);
    expect(again.result?.action).not.toBe("deliver");

    const afterSecond = player();
    expect(afterSecond.money).toBe(afterFirst.money);
    expect(afterSecond.xp).toBe(afterFirst.xp);
  });

  it("tekan berulang semasa cooldown hantar → ganjaran sekali sahaja", () => {
    const before = player();
    pickUp(100_000);
    const deliverResult = deliverToTarget(100_600);
    const rewardAmount = deliverResult.payload?.reward ?? 0;
    useDeliveryStore.getState().interact(100_700);
    useDeliveryStore.getState().interact(100_800);

    expect(player().money).toBe(before.money + rewardAmount);
  });
});
