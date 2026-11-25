/**
 * Kontrak Pelan 005 Langkah 7a — skema save, validasi, migrasi, simpan/muat manual.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 */
import { getWorldState, playerState, restoreWorld } from "@/components/3d/PlayerController";
import { completeHandover, takeProof } from "@/delivery/handover";
import { interact } from "@/lib/delivery-system";
import { type SaveBackend, saveBackends } from "@/save/backend";
import { migrate } from "@/save/migrate";
import { loadSaved, saveNow } from "@/save/save-game";
import { SAVE_VERSION, type SaveV1, buildSave, validateSave } from "@/save/save-schema";
import { useDeliveryStore } from "@/store/delivery";
import { useGameStateStore } from "@/store/gamestate";
import { INDUSTRI, SHOP, deliveringTo, testDeps } from "@/test/delivery-fixtures";
import { beforeEach, describe, expect, it } from "vitest";

/** Backend dalam memori; `stored` disimpan sebagai JSON seperti storan sebenar. */
function memory(initial: unknown = null): SaveBackend & { writes: number; raw: () => unknown } {
  let stored: string | null = initial === null ? null : JSON.stringify(initial);
  const b = {
    writes: 0,
    raw: () => (stored === null ? null : JSON.parse(stored)),
    read: async () => (stored === null ? null : JSON.parse(stored)),
    write: async (data: unknown) => {
      b.writes += 1;
      stored = JSON.stringify(data);
    },
    clear: async () => {
      stored = null;
    },
  };
  return b;
}

const delivery = () => useDeliveryStore.getState();
const game = () => useGameStateStore.getState();

/** Keadaan permainan di tengah penghantaran: 1 dihantar, 1 masih dalam motor, pemain atas motor. */
function midDelivery() {
  game().createNewGame("Aminah");
  useDeliveryStore.setState({ deps: testDeps() });
  let s = deliveringTo([SHOP, INDUSTRI], 1000);
  s = interact(s, SHOP, 3000, testDeps(), { onFoot: true }).session;
  s = completeHandover(takeProof(s), 3000, testDeps()).session;
  useDeliveryStore.setState({ session: { ...s, nearbyZone: SHOP, panelOpen: false } });
  const player = game().player;
  if (!player) throw new Error("tiada pemain");
  useGameStateStore.setState({ player: { ...player, money: 777 } });
  restoreWorld({ pos: { x: 12, z: -34 }, onFoot: false, motor: { x: 12, z: -34, heading: 1.25 } });
}

function validSave(): SaveV1 {
  midDelivery();
  return buildSave(4000);
}

describe("skema & validasi", () => {
  beforeEach(() => delivery().reset());

  it("buildSave mengambil keadaan sebenar daripada stor dan dunia", () => {
    const save = validSave();
    expect(save.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(1);
    expect(save.savedAt).toBe(4000);
    expect(save.player.money).toBe(777);
    expect(save.world).toEqual({ pos: { x: 12, z: -34 }, onFoot: false, motor: { x: 12, z: -34, heading: 1.25 } });
    expect(save.session.phase).toBe("delivering");
    expect(save.session.cargo.map((p) => p.status).sort()).toEqual(["delivered", "out_for_delivery"]);
    expect(save.session.manifest?.status).toBe("open");
  });

  it("medan sementara tidak disimpan (handover, panel, zon berdekatan, mesej, cooldown)", () => {
    const session = validSave().session as unknown as Record<string, unknown>;
    for (const k of [
      "handover",
      "panelOpen",
      "nearbyZone",
      "cooldownUntil",
      "interactionMessage",
      "completeMessage",
      "lastParking",
    ]) {
      expect(session).not.toHaveProperty(k);
    }
  });

  it("save sah lulus validateSave, juga selepas pusingan JSON", () => {
    const save = validSave();
    expect(validateSave(save)).toEqual({ ok: true, save });
    const viaJson = validateSave(JSON.parse(JSON.stringify(save)));
    expect(viaJson.ok).toBe(true);
  });

  // biome-ignore lint/suspicious/noExplicitAny: ujian sengaja merosakkan bentuk JSON
  const broken: [string, (s: any) => unknown][] = [
    ["null", () => null],
    ["bukan objek", () => "save"],
    ["tiada player", (s) => ({ ...s, player: undefined })],
    ["wang NaN", (s) => ({ ...s, player: { ...s.player, money: Number.NaN } })],
    ["wang negatif", (s) => ({ ...s, player: { ...s.player, money: -5 } })],
    ["kedudukan Infinity", (s) => ({ ...s, world: { ...s.world, pos: { x: Number.POSITIVE_INFINITY, z: 0 } } })],
    ["kedudukan di luar dunia", (s) => ({ ...s, world: { ...s.world, motor: { ...s.world.motor, x: 5000 } } })],
    ["onFoot bukan boolean", (s) => ({ ...s, world: { ...s.world, onFoot: "ya" } })],
    ["fasa tidak dikenali", (s) => ({ ...s, session: { ...s.session, phase: "flying" } })],
    [
      "status paket tidak dikenali",
      (s) => ({ ...s, session: { ...s.session, cargo: [{ ...s.session.cargo[0], status: "lost" }] } }),
    ],
    [
      "sasaran zon tidak wujud",
      (s) => ({ ...s, session: { ...s.session, targets: { ...s.session.targets, x: "zone-hilang" } } }),
    ],
    [
      "kargo tiada dalam manifest terbuka",
      (s) => ({ ...s, session: { ...s.session, manifest: { ...s.session.manifest, packets: [] } } }),
    ],
    ["tally negatif", (s) => ({ ...s, session: { ...s.session, tally: { earned: -1, xp: 0 } } })],
  ];

  for (const [name, mutate] of broken) {
    it(`ditolak: ${name}`, () => {
      const r = validateSave(mutate(JSON.parse(JSON.stringify(validSave()))));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
    });
  }
});

describe("migrasi", () => {
  it("v1 dipulangkan tanpa ubahan", () => {
    const save = validSave();
    expect(migrate(save)).toEqual({ ok: true, data: save });
  });

  it("versi lebih baharu ditolak dengan mesej jelas", () => {
    const r = migrate({ ...validSave(), version: 99 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("lebih baharu");
  });

  it("format lama (SaveData dengan slots) ditolak", () => {
    expect(migrate({ slots: [], selectedSlot: 0 }).ok).toBe(false);
  });
});

describe("simpan & muat melalui backend", () => {
  beforeEach(() => delivery().reset());

  it("saveBackends.current lalai ialah backend IndexedDB (bukan undefined)", () => {
    expect(typeof saveBackends.current.read).toBe("function");
    expect(typeof saveBackends.current.write).toBe("function");
  });

  it("saveNow → ubah semua → loadSaved memulihkan pemain, dunia dan penghantaran", async () => {
    midDelivery();
    const backend = memory();
    const savedSession = delivery().session;

    expect(await saveNow(backend, 4000)).toBe(true);
    expect(backend.writes).toBe(1);
    expect(delivery().session.interactionMessage).toBe("Tersimpan");

    // Rosakkan keadaan semasa.
    game().createNewGame("Orang Lain");
    delivery().reset();
    restoreWorld({ pos: { x: 0, z: 0 }, onFoot: true, motor: { x: 2, z: 2, heading: 0 } });

    const r = await loadSaved(backend);
    expect(r).toEqual({ ok: true });
    expect(game().player?.name).toBe("Aminah");
    expect(game().player?.money).toBe(777);
    expect(game().isNewGame).toBe(false);
    const s = delivery().session;
    expect(s.phase).toBe("delivering");
    expect(s.cargo).toEqual(savedSession.cargo);
    expect(s.manifest).toEqual(savedSession.manifest);
    expect(s.targets).toEqual(savedSession.targets);
    expect(s.tally).toEqual(savedSession.tally);
    expect(s.handover).toBeNull();
    expect(s.panelOpen).toBe(false);
    expect(getWorldState()).toEqual({ pos: { x: 12, z: -34 }, onFoot: false, motor: { x: 12, z: -34, heading: 1.25 } });
    expect(playerState.isOnFoot()).toBe(false);
    expect(playerState.getSpeed()).toBe(0);
  });

  it("tiada simpanan → ok:false 'Tiada simpanan', keadaan tidak berubah", async () => {
    midDelivery();
    const before = delivery().session;
    const r = await loadSaved(memory());
    expect(r).toEqual({ ok: false, error: "Tiada simpanan" });
    expect(delivery().session).toBe(before);
    expect(game().player?.money).toBe(777);
  });

  it("simpanan rosak → ok:false 'Simpanan rosak: …', keadaan tidak berubah", async () => {
    midDelivery();
    const bad = { ...JSON.parse(JSON.stringify(buildSave(4000))), world: { pos: { x: "a" } } };
    const before = delivery().session;
    const r = await loadSaved(memory(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.startsWith("Simpanan rosak")).toBe(true);
    expect(delivery().session).toBe(before);
    expect(game().player?.name).toBe("Aminah");
  });

  it("backend gagal menulis → saveNow false, mesej 'Gagal menyimpan'", async () => {
    midDelivery();
    const failing: SaveBackend = {
      read: async () => null,
      write: async () => {
        throw new Error("kuota penuh");
      },
      clear: async () => {},
    };
    expect(await saveNow(failing, 4000)).toBe(false);
    expect(delivery().session.interactionMessage).toBe("Gagal menyimpan");
  });

  it("tanpa pemain (menu utama) → saveNow false, tiada tulisan", async () => {
    useGameStateStore.setState({ player: null });
    const backend = memory();
    expect(await saveNow(backend, 4000)).toBe(false);
    expect(backend.writes).toBe(0);
  });
});
