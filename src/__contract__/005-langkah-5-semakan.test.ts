/**
 * Kontrak semakan Pelan 005 Langkah 5 — pepijat yang dijumpai semasa semakan.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 */
import { performInteract, playerState } from "@/components/3d/PlayerController";
import { rollDeliveryReward } from "@/data/economy";
import { DELIVERY_ZONES, interact } from "@/lib/delivery-system";
import { useDeliveryStore } from "@/store/delivery";
import { useGameStateStore } from "@/store/gamestate";
import { SHOP, deliveringTo, testDeps } from "@/test/delivery-fixtures";
import { beforeEach, describe, expect, it } from "vitest";

const store = () => useDeliveryStore.getState();

describe("S1 — atas motor tidak boleh membuka serah terima", () => {
  it("interact tulen tanpa ctx di alamat → bukan open_handover (tiada lalai 'berjalan kaki')", () => {
    const { result, session } = interact(deliveringTo([SHOP]), SHOP, 5000, testDeps());
    expect(result.action).not.toBe("open_handover");
    expect(session.handover ?? null).toBeNull();
  });

  it("stor interact tanpa ctx di alamat → tiada serah terima", () => {
    useDeliveryStore.setState({ deps: testDeps(), session: { ...deliveringTo([SHOP]), nearbyZone: SHOP } });
    store().interact(5000);
    expect(store().session.handover).toBeNull();
  });

  it("mesej atas motor menyuruh turun, bukan 'Tiada paket'", () => {
    const { result } = interact(deliveringTo([SHOP]), SHOP, 5000, testDeps(), { onFoot: false });
    expect(result.message).toBe("Turun dari motor dahulu");
  });

  it("performInteract (E / butang) menghantar keadaan onFoot sebenar pemain", () => {
    useDeliveryStore.setState({ deps: testDeps(), session: { ...deliveringTo([SHOP]), nearbyZone: null } });
    // Pelan 013: selepas "Berangkat" kurier memegang paket. Di sebelah motor:
    // tekan pertama = letak paket dalam motor, tekan kedua = naik motor.
    expect(playerState.isOnFoot()).toBe(true);
    expect(store().session.carry).toEqual([store().session.cargo[0].id]);
    performInteract();
    expect(store().session.carry).toEqual([]);
    expect(playerState.isOnFoot()).toBe(true);
    performInteract();
    expect(playerState.isOnFoot()).toBe(false);

    // Sampai di alamat atas motor (laju 0): tekan = turun motor, BUKAN serah terima.
    useDeliveryStore.setState({ session: { ...store().session, nearbyZone: SHOP, cooldownUntil: 0 } });
    performInteract();
    expect(store().session.handover).toBeNull();
    expect(playerState.isOnFoot()).toBe(true);

    // Kini berjalan kaki dengan paket di tangan (diambil dari motor): tekan = buka serah terima.
    const id = store().session.cargo[0].id;
    useDeliveryStore.setState({ session: { ...store().session, cooldownUntil: 0, carry: [id] } });
    performInteract();
    expect(store().session.handover?.zoneId).toBe(SHOP.id);
  });
});

describe("S2 — zon kekal seperti pelan (tiada zon rekaan)", () => {
  // Pelan 010 (pemilik meminta lebih banyak kandungan): 6 alamat ditambah selepas 3 alamat asal.
  it("DELIVERY_ZONES = meja + 3 alamat asal + 6 alamat Pelan 010", () => {
    expect(DELIVERY_ZONES.map((z) => z.id)).toEqual([
      "zone-pickup-1",
      "zone-delivery-1",
      "zone-delivery-2",
      "zone-delivery-3",
      ...[4, 5, 6, 7, 8, 9].map((n) => `zone-delivery-${n}`),
    ]);
  });

  it("zone-delivery-3 ialah Pusat Industri Timur tanpa penerima", () => {
    const z = DELIVERY_ZONES[3];
    expect(z.name).toBe("Pusat Industri Timur");
    expect(z.lot).toEqual({ x: 100, z: -60 });
    expect(z.receiverHome).toBe(false);
  });
});

describe("S3 — ganjaran serah terima tepat, sekali", () => {
  beforeEach(() => {
    useGameStateStore.getState().createNewGame("Ujian");
    useDeliveryStore.setState({ deps: testDeps() });
    store().reset();
  });

  it("confirmHandover menambah wang = ganjaran yang dilancar, totalEarnings sama", () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), nearbyZone: SHOP } });
    store().interact(5000, { onFoot: true });
    store().takeProof();
    const before = useGameStateStore.getState().player;
    if (!before) throw new Error("tiada pemain");
    store().confirmHandover(6000);
    const after = useGameStateStore.getState().player;
    const expected = rollDeliveryReward(() => 0.5);
    expect(after?.money).toBe(before.money + expected);
    expect(after?.totalEarnings).toBe(before.totalEarnings + expected);

    // Tekan sekali lagi: tiada serah terima aktif → wang tidak berubah.
    store().confirmHandover(7000);
    expect(useGameStateStore.getState().player?.money).toBe(before.money + expected);
  });
});
