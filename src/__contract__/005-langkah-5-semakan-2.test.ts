/// <reference types="vite/client" />
/**
 * Kontrak semakan 2 Pelan 005 Langkah 5 — S3, S4, S5 yang dilaporkan siap tetapi tidak dibuat.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 */
import { rollDeliveryReward } from "@/data/economy";
import handoverSrc from "@/delivery/handover.ts?raw";
import systemTestSrc from "@/lib/delivery-system.test.ts?raw";
import systemSrc from "@/lib/delivery-system.ts?raw";
import { useDeliveryStore } from "@/store/delivery";
import { useGameStateStore } from "@/store/gamestate";
import { SHOP, deliveringTo, testDeps } from "@/test/delivery-fixtures";
import type { DeliveryAction } from "@/types/delivery";
import { beforeEach, describe, expect, it } from "vitest";

const store = () => useDeliveryStore.getState();
const count = (src: string, needle: string) => src.split(needle).length - 1;

describe("S3 — XP serah terima tepat", () => {
  beforeEach(() => {
    useGameStateStore.getState().createNewGame("Ujian");
    useDeliveryStore.setState({ deps: testDeps() });
    store().reset();
  });

  it("confirmHandover: wang + ganjaran dan XP + 37 (rng 0.5), tepat sekali", () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), nearbyZone: SHOP } });
    store().interact(5000, { onFoot: true });
    store().takeProof();
    const before = useGameStateStore.getState().player;
    if (!before) throw new Error("tiada pemain");
    store().confirmHandover(6000);
    const after = useGameStateStore.getState().player;
    expect(after?.money).toBe(before.money + rollDeliveryReward(() => 0.5));
    expect(after?.xp).toBe(before.xp + 25 + Math.floor(0.5 * 25));
  });
});

describe("S4 — satu laluan penyelesaian manifest", () => {
  it("handover.ts memanggil closeManifest sekali sahaja (dalam settlePhase)", () => {
    expect(count(handoverSrc, "closeManifest(")).toBe(1);
  });

  it("delivery-system.ts tidak menyalin logik pulang: tiada closeManifest( dan tiada 'Dipulangkan ke gudang'", () => {
    expect(count(systemSrc, "closeManifest(")).toBe(0);
    expect(count(systemSrc, "Dipulangkan ke gudang")).toBe(0);
  });

  it("delivery-system.test.ts tidak lagi melonggarkan semakan wang/XP", () => {
    expect(count(systemTestSrc, "expect(money()).toBeGreaterThan(")).toBe(0);
    expect(count(systemTestSrc, "expect(xp()).toBeGreaterThanOrEqual(")).toBe(0);
  });
});

describe("S5 — tiada tindakan mati", () => {
  // Gagal `npx tsc --noEmit` selagi "fail_handover" ada dalam DeliveryAction.
  type HasDeadAction = "fail_handover" extends DeliveryAction ? true : false;
  const hasDead: HasDeadAction = false;

  it('"fail_handover" bukan DeliveryAction', () => {
    expect(hasDead).toBe(false);
  });
});
