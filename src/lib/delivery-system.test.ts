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
import { CAFE, DESK, SHOP, deliveringTo, testDeps } from "@/test/delivery-fixtures";
import { beforeEach, describe, expect, it } from "vitest";

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
  it("serah paket ke alamatnya: delivered, ganjaran, baki dikira", () => {
    const s = deliveringTo([SHOP, CAFE]);
    const { result, session } = interact(s, SHOP, 5000, testDeps());
    expect(result.action).toBe("deliver");
    expect(result.reward).toBeGreaterThan(0);
    expect(session.cargo.find((p) => p.id === "pkt-0")?.status).toBe("delivered");
    expect(session.cargo.find((p) => p.id === "pkt-1")?.status).toBe("out_for_delivery");
    expect(session.phase).toBe("delivering");
    expect(session.manifest?.status).toBe("open");
    expect(nextTargetZone(session)?.id).toBe(CAFE.id);
  });

  it("paket terakhir: manifest ditutup, fasa complete", () => {
    let s = deliveringTo([SHOP, CAFE]);
    s = interact(s, SHOP, 5000, testDeps()).session;
    const { session } = interact(s, CAFE, 7000, testDeps());
    expect(session.phase).toBe("complete");
    expect(session.manifest?.status).toBe("closed");
    expect(session.manifest?.closedAt).toBe(7000);
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
    let s = deliveringTo([SHOP, SHOP]);
    s = interact(s, SHOP, 5000, testDeps()).session;
    expect(s.cargo.filter((p) => p.status === "delivered")).toHaveLength(1);
    s = interact(s, SHOP, 7000, testDeps()).session;
    expect(s.phase).toBe("complete");
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
    expect(interact(s, SHOP, 6000, testDeps()).result.action).toBe("deliver");
  });

  it("tiada zon: nothing walaupun cooldown", () => {
    const s = { ...createSession(), cooldownUntil: 9999 };
    expect(interact(s, null, 1, testDeps()).result.action).toBe("nothing");
  });
});

describe("tickSession", () => {
  it("complete → idle selepas 5000ms; paket gudang dan sasarannya kekal", () => {
    let s = interact(deliveringTo([SHOP]), SHOP, 5000, testDeps()).session;
    const waiting = interact(createSession(), DESK, 100, testDeps()).session;
    s = { ...s, inbound: waiting.inbound, targets: { ...s.targets, ...waiting.targets } };

    expect(tickSession(s, 9999).phase).toBe("complete");
    const reset = tickSession(s, 10000);
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

describe("interactBlocksMotorSwap", () => {
  it("hanya 'nothing' dan null membenarkan naik/turun motor", () => {
    expect(interactBlocksMotorSwap("open_warehouse")).toBe(true);
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
    expect(store().session.phase).toBe("delivering");
    expect(store().session.panelOpen).toBe(false);

    let t = start + 2000;
    for (const id of ids) {
      const zone = store().zones.find((z) => z.id === store().session.targets[id]);
      if (!zone) throw new Error("zon sasaran mesti wujud");
      store().setNearbyZone(null);
      store().setNearbyZone(zone);
      expect(store().interact(t).result?.action).toBe("deliver");
      t += 2000;
    }
    expect(store().session.phase).toBe("complete");
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
    const { result } = store().interact(3000);
    expect(money()).toBe(start + (result?.reward ?? Number.NaN));
    expect(xp()).toBe(xpStart + (result?.xpReward ?? Number.NaN));

    // Pressing again at the same address: nothing left to deliver
    store().interact(9000);
    expect(money()).toBe(start + (result?.reward ?? Number.NaN));
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
