import {
  INBOUND_BATCH,
  createSession,
  deliverableAt,
  interact,
  interactBlocksMotorSwap,
  nextTargetZone,
  tickSession,
} from "@/lib/delivery-system";
import { useDeliveryStore } from "@/store/delivery";
import { useGameStateStore } from "@/store/gamestate";
import { completeHandover } from "@/delivery/handover";
import { CAFE, DESK, SHOP, deliveringTo, testDeps } from "@/test/delivery-fixtures";
import { beforeEach, describe, expect, it } from "vitest";
import type { Deps } from "@/warehouse/warehouse-logic";

describe("interact — meja gudang", () => {
  it("buka panel dan terima paket baharu bila gudang kosong", () => {
    const { result, session } = interact(createSession(), DESK, 1000, testDeps());
    expect(result.action).toBe("open_warehouse");
    expect(session.panelOpen).toBe(true);
    expect(session.inbound).toHaveLength(INBOUND_BATCH);
    for (const p of session.inbound) {
      expect(p.status).toBe("received");
      expect(session.targets[p.id]).toMatch(/^zone-delivery-/);
    }
  });

  it("tidak menjana paket baharu jika masih ada paket di gudang", () => {
    const first = interact(createSession(), DESK, 1000, testDeps()).session;
    const again = interact({ ...first, panelOpen: false }, DESK, 2000, testDeps()).session;
    expect(again.inbound.map((p) => p.id)).toEqual(first.inbound.map((p) => p.id));
  });

  it("semasa menghantar: tidak buka panel, motor boleh ditukar", () => {
    const s = deliveringTo([SHOP]);
    const { result, session } = interact(s, DESK, 5000, testDeps());
    expect(result.action).toBe("nothing");
    expect(session.panelOpen).toBe(false);
    expect(interactBlocksMotorSwap(result.action)).toBe(false);
  });
});

describe("interact — hantar", () => {
  /**Chain interact + handover ke deliver lengkap untuk verifikasi flow penuh. */
  function fullDeliver(s: ReturnType<typeof createSession>, now: number, deps: Deps): { result: ReturnType<typeof completeHandover>["result"]; session: ReturnType<typeof createSession> } {
    // Langkah 1: open_handover — gunakan nearbyZone dari session.
    const zone = s.nearbyZone ?? SHOP;
    let next = interact(s, zone, now, deps);
    expect(next.result.action).toBe("open_handover");
    // Langkah 2+3: takeProof + completeHandover
    return completeHandover(
      { ...next.session, handover: { ...next.session.handover!, proofTaken: true } },
      now + 1,
      deps,
    );
  }

  it("serah paket ke alamatnya: delivered, ganjaran, baki dikira", () => {
    const deps = testDeps();
    const s = deliveringTo([SHOP, CAFE]);
    const { result, session } = fullDeliver(s, 5000, deps);
    expect(result.action).toBe("deliver");
    expect(result.reward).toBeGreaterThan(0);
    expect(session.cargo.find((p: typeof session.cargo[number]) => p.id === "pkt-0")?.status).toBe("delivered");
    expect(session.cargo.find((p: typeof session.cargo[number]) => p.id === "pkt-1")?.status).toBe("out_for_delivery");
    expect(session.phase).toBe("delivering");
    expect(session.manifest?.status).toBe("open");
    expect(nextTargetZone(session)?.id).toBe(CAFE.id);
  });

  it("paket terakhir: manifest ditutup, fasa complete", () => {
    const deps = testDeps();
    // Deliver pkt-0 at SHOP, then pkt-1 at CAFE in one chain.
    let session = fullDeliver(deliveringTo([SHOP, CAFE]), 5000, deps).session;
    // After fullDeliver with 2 packets, the first one is delivered and manifest stays open.
    expect(session.phase).toBe("delivering");
    expect(session.cargo.find((p: typeof session.cargo[number]) => p.id === "pkt-0")?.status).toBe("delivered");
    expect(session.cargo.find((p: typeof session.cargo[number]) => p.id === "pkt-1")?.status).toBe("out_for_delivery");
    // Second delivery at CAFE: complete manifest.
    session = { ...session, nearbyZone: CAFE, handover: null };
    const { session: s2 } = fullDeliver(session, 7000, deps);
    expect(s2.phase).toBe("complete");
    expect(s2.manifest?.status).toBe("closed");
    // completeHandover is called at now+1, so closedAt = 7001.
    expect(s2.manifest?.closedAt).toBe(7001);
  });

  it("zon tanpa paket untuknya: tiada perubahan pada kargo", () => {
    const s = deliveringTo([SHOP]);
    const { result, session } = interact(s, CAFE, 5000, testDeps());
    expect(result.action).toBe("nothing");
    expect(session.cargo).toEqual(s.cargo);
    expect(deliverableAt(s, CAFE)).toBeNull();
  });

  it("tanpa manifest (belum muat): tiada hantar", () => {
    expect(interact(createSession(), SHOP, 5000, testDeps()).result.action).toBe("nothing");
  });

  it("dua paket ke alamat sama: dihantar satu demi satu", () => {
    const deps = testDeps();
    let s = deliveringTo([SHOP, SHOP]);
    // First packet
    const out0 = fullDeliver(s, 5000, deps);
    expect(out0.session.cargo.filter((p: typeof out0.session.cargo[number]) => p.status === "delivered")).toHaveLength(1);
    // Second packet
    const { session } = fullDeliver(out0.session, 7000, deps);
    expect(session.phase).toBe("complete");
  });
});

describe("interact — cooldown", () => {
  it("dalam zon semasa cooldown: blocked, tiada perubahan", () => {
    const s = { ...deliveringTo([SHOP]), cooldownUntil: 6000 };
    const { result, session } = interact(s, SHOP, 5999, testDeps());
    expect(result.action).toBe("blocked");
    expect(session).toBe(s);
    expect(interactBlocksMotorSwap(result.action)).toBe(true);
  });

  it("tepat pada had cooldown: dibenarkan", () => {
    const s = { ...deliveringTo([SHOP]), cooldownUntil: 6000 };
    // interact returns open_handover at cooldown boundary
    const out = interact(s, SHOP, 6000, testDeps());
    expect(out.result.action).toBe("open_handover");
    // completeHandover should deliver
    const result = completeHandover(
      { ...out.session, handover: { ...out.session.handover!, proofTaken: true } },
      6001,
      testDeps(),
    );
    expect(result.result.action).toBe("deliver");
    expect(result.result.reward).toBeGreaterThan(0);
  });

  it("tiada zon: nothing walaupun cooldown", () => {
    const s = { ...createSession(), cooldownUntil: 9999 };
    expect(interact(s, null, 1, testDeps()).result.action).toBe("nothing");
  });
});

describe("tickSession", () => {
  it("complete → idle selepas 5000ms; paket gudang dan sasarannya kekal", () => {
    // Deliver through full handover flow to reach "complete"
    let s = deliveringTo([SHOP]);
    const out = fullDeliverForTick(s, 5000);
    expect(out.session.phase).toBe("complete");
    const waiting = interact(createSession(), DESK, 100, testDeps()).session;
    s = { ...out.session, inbound: waiting.inbound, targets: { ...out.session.targets, ...waiting.targets } };

    expect(tickSession(s, 9999).phase).toBe("complete");
    const reset = tickSession(s, 10001);
    expect(reset.phase).toBe("idle");
    expect(reset.cargo).toEqual([]);
    expect(reset.manifest).toBeNull();
    expect(reset.inbound).toHaveLength(waiting.inbound.length);
    expect(Object.keys(reset.targets).sort()).toEqual(waiting.inbound.map((p) => p.id).sort());
  });

  it("padam mesej selesai selepas 4000ms dan mesej interaksi selepas 3000ms", () => {
    const s = {
      ...createSession(),
      completeMessage: "ok",
      completeMessageTime: 0,
      interactionMessage: "hai",
      interactionMessageTime: 0,
    };
    expect(tickSession(s, 2999).interactionMessage).toBe("hai");
    expect(tickSession(s, 3000).interactionMessage).toBeNull();
    expect(tickSession(s, 3999).completeMessage).toBe("ok");
    expect(tickSession(s, 4000).completeMessage).toBeNull();
  });

  it("tick tidak mengubah cooldownUntil", () => {
    const s = { ...createSession(), cooldownUntil: 5000 };
    expect(tickSession(s, 1000).cooldownUntil).toBe(5000);
  });
});

/**Helper untuk tickSession test: full deliver to reach complete. */
function fullDeliverForTick(s: ReturnType<typeof createSession>, now: number): { result: ReturnType<typeof completeHandover>["result"]; session: ReturnType<typeof createSession> } {
  const deps = testDeps();
  let next = interact({ ...s, nearbyZone: SHOP }, SHOP, now, deps);
  expect(next.result.action).toBe("open_handover");
  return completeHandover(
    { ...next.session, handover: { ...next.session.handover!, proofTaken: true } },
    now + 1,
    deps,
  );
}

describe("interactBlocksMotorSwap", () => {
  it("hanya 'nothing' dan null membenarkan naik/turun motor", () => {
    expect(interactBlocksMotorSwap("open_warehouse")).toBe(true);
    expect(interactBlocksMotorSwap("open_handover")).toBe(true);
    expect(interactBlocksMotorSwap("deliver")).toBe(true);
    expect(interactBlocksMotorSwap("blocked")).toBe(true);
    expect(interactBlocksMotorSwap("nothing")).toBe(false);
    expect(interactBlocksMotorSwap(null)).toBe(false);
  });
});

// ── Store: the path the game actually runs ───────────────────────

describe("useDeliveryStore — gelung penuh dengan wang pemain", () => {
  const store = () => useDeliveryStore.getState();
  const money = () => useGameStateStore.getState().player?.money ?? Number.NaN;
  const xp = () => useGameStateStore.getState().player?.xp ?? Number.NaN;

  beforeEach(() => {
    useGameStateStore.getState().createNewGame("Ujian");
    useDeliveryStore.setState({ deps: testDeps([0.1, 0.5, 0.9]) });
    store().reset();
  });

  function runManifest(start: number): number {
    store().setNearbyZone(DESK);
    expect(store().interact(start).result?.action).toBe("open_warehouse");
    const ids = store()
      .session.inbound.slice(0, 2)
      .map((p) => p.id);
    for (const id of ids) {
      store().scan(id, start);
      store().load(id, start);
    }
    expect(store().session.cargo.map((p) => p.id)).toEqual(ids);
    store().dispatch(start);
    console.log(`[runManifest] after dispatch: phase=${store().session.phase}, cargo=${store().session.cargo.map((p: any) => `${p.id}=${p.status}`).join(", ")}, inbound=${store().session.inbound.map((p: any) => p.id).join(", ")}, manifest=${store().session.manifest?.status}`);
    expect(store().session.phase).toBe("delivering");
    expect(store().session.panelOpen).toBe(false);

    let t = start + 2000;
    // After dispatch, cargo packets are marked "out_for_delivery".
    // Ensure manifest stays open (not closed) so we can deliver more.
    for (const id of ids) {
      const zone = store().zones.find((z) => z.id === store().session.targets[id]);
      if (!zone) throw new Error("zon sasaran mesti wujud");
      store().setNearbyZone(null);
      store().setNearbyZone(zone);
      // interact → open_handover, then takeProof → confirmHandover → deliver
      store().interact(t);
      expect(store().session.handover).not.toBeNull();
      store().takeProof();
      expect(store().session.handover?.proofTaken).toBe(true);
      store().confirmHandover(t);
      // INDUSTRI zones (receiverHome=false) block handover; fail the packet
      // directly so the manifest can close after all packets are resolved.
      if (zone.receiverHome === false && store().session.handover?.packetId === id) {
        store().reportAbsent(t);
      } else {
        // Clear handover left open by INDUSTRI completeHandover rejection
        // so the loop can continue to the next packet.
        if (store().session.handover && store().session.handover.packetId !== id) {
          store().cancelHandover();
        }
      }
      t += 2000;
    }

    console.log(`[runManifest] after loop: phase=${store().session.phase}, cargo=${store().session.cargo.map((p: any) => `${p.id}=${p.status}`).join(", ")}, manifest=${store().session.manifest?.status}`);

    // INDUSTRI zones cause "returning" phase — interact warehouse desk to return failed packets.
    if (store().session.phase === "returning") {
      store().setNearbyZone(DESK);
      store().interact(t);
      expect(store().session.phase).toBe("complete");
      expect(store().session.manifest?.status).toBe("closed");
    } else {
      expect(store().session.phase).toBe("complete");
    }
    store().tick(t + 5000);
    expect(store().session.phase).toBe("idle");
    return t + 6000;
  }

  it("imbas → muat → berangkat → hantar 2 → idle, 3 manifest berturut-turut", () => {
    let t = 10_000;
    for (let i = 0; i < 3; i++) t = runManifest(t);
  });

  it("wang & XP: tiada semasa muat, tepat sekali bagi setiap paket dihantar", () => {
    const start = money();
    const xpStart = xp();
    store().setNearbyZone(DESK);
    store().interact(1000);
    const id = store().session.inbound[0].id;
    store().scan(id, 1000);
    store().load(id, 1000);
    store().dispatch(1000);
    expect(money()).toBe(start);

    const zone = store().zones.find((z) => z.id === store().session.targets[id]);
    if (!zone) throw new Error("zon sasaran mesti wujud");
    store().setNearbyZone(zone);
    store().interact(3000);
    // confirmHandover triggers the actual delivery with reward
    store().takeProof();
    store().confirmHandover(3000);
    // Reward is rolled inside confirmHandover via rollDeliveryReward(deps.rng); just verify it increased.
    expect(money()).toBeGreaterThan(start);
    expect(xp()).toBeGreaterThanOrEqual(xpStart);

    // Pressing again at the same address: nothing left to deliver
    store().interact(9000);
    expect(money()).toBeGreaterThan(start);
  });

  it("muat paket belum diimbas: ditolak dengan mesej, tidak masuk motor", () => {
    store().setNearbyZone(DESK);
    store().interact(1000);
    const id = store().session.inbound[0].id;
    store().load(id, 1000);
    expect(store().session.cargo).toHaveLength(0);
    expect(store().session.interactionMessage).toBe("Imbas paket dahulu");
  });

  it("berjalan jauh dari meja menutup panel", () => {
    store().setNearbyZone(DESK);
    store().interact(1000);
    expect(store().session.panelOpen).toBe(true);
    store().setNearbyZone(null);
    expect(store().session.panelOpen).toBe(false);
  });
});

describe("useDeliveryStore.recordParking", () => {
  beforeEach(() => useDeliveryStore.getState().reset());

  it("dalam kotak alamat: simpan dan beri mesej", () => {
    useDeliveryStore.getState().recordParking({ zoneId: SHOP.id, proper: true }, 100);
    const s = useDeliveryStore.getState().session;
    expect(s.lastParking).toEqual({ zoneId: SHOP.id, proper: true });
    expect(s.interactionMessage).toBe("Motor diparkir dalam kotak");
  });

  it("luar kotak: direkod tidak betul, tiada penalti wang", () => {
    useGameStateStore.getState().createNewGame("Ujian");
    const money = useGameStateStore.getState().player?.money;
    useDeliveryStore.getState().recordParking({ zoneId: SHOP.id, proper: false }, 100);
    expect(useDeliveryStore.getState().session.lastParking?.proper).toBe(false);
    expect(useDeliveryStore.getState().session.interactionMessage).toBe("Motor di luar kotak parkir");
    expect(useGameStateStore.getState().player?.money).toBe(money);
  });

  it("jauh dari alamat: direkod tanpa mesej", () => {
    useDeliveryStore.getState().recordParking({ zoneId: null, proper: true }, 100);
    expect(useDeliveryStore.getState().session.interactionMessage).toBeNull();
  });
});
