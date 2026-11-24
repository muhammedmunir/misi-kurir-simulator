/**
 * Kontrak Pelan 005 Langkah 6 — kembali ke gudang, tutup manifest, ringkasan.
 * Master prompt seksyen H.10: "Kembali ke gudang, serahkan paket gagal/retur,
 * tutup manifest, lihat ringkasan performa."
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 */
import { ManifestSummaryPanel } from "@/delivery/ManifestSummaryPanel";
import { completeHandover, failHandover, takeProof } from "@/delivery/handover";
import { acknowledgeSummary, createSession, interact, tickSession } from "@/lib/delivery-system";
import { getInteractButtonInfo } from "@/lib/interact-button";
import { formatRinggit } from "@/lib/utils";
import { currentNavTarget } from "@/navigation/nav";
import { useDeliveryStore } from "@/store/delivery";
import { useGameStateStore } from "@/store/gamestate";
import { CAFE, DESK, INDUSTRI, SHOP, deliveringTo, testDeps } from "@/test/delivery-fixtures";
import type { DeliverySession, DeliveryZone } from "@/types/delivery";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const onFoot = { onFoot: true };

/** Buka serah terima di `zone`, ambil bukti, serah. Pulangkan sesi + ganjaran. */
function deliverAt(s: DeliverySession, zone: DeliveryZone, now: number) {
  const opened = interact(s, zone, now, testDeps(), onFoot);
  expect(opened.result.action).toBe("open_handover");
  const { result, session } = completeHandover(takeProof(opened.session), now, testDeps());
  expect(result.action).toBe("deliver");
  return { session, reward: result.reward ?? Number.NaN, xp: result.xpReward ?? Number.NaN };
}

function failAt(s: DeliverySession, zone: DeliveryZone, now: number): DeliverySession {
  const opened = interact(s, zone, now, testDeps(), onFoot);
  expect(opened.result.action).toBe("open_handover");
  return failHandover(opened.session, now);
}

describe("paket terakhir selesai → kembali ke gudang (manifest belum ditutup)", () => {
  it("semua dihantar → returning, manifest masih open, tiada ringkasan", () => {
    const { session } = deliverAt(deliveringTo([SHOP]), SHOP, 5000);
    expect(session.phase).toBe("returning");
    expect(session.manifest?.status).toBe("open");
    expect(session.summary).toBeNull();
    expect(session.completeMessage).toContain("kembali ke gudang");
  });

  it("navigasi semasa returning → meja gudang", () => {
    const { session } = deliverAt(deliveringTo([SHOP]), SHOP, 5000);
    expect(currentNavTarget(session)?.id).toBe(DESK.id);
  });

  it("butang di meja: semua dihantar → TUTUP MANIFEST; ada gagal → PULANGKAN PAKET", () => {
    const allDone = deliverAt(deliveringTo([SHOP]), SHOP, 5000).session;
    expect(getInteractButtonInfo({ ...allDone, nearbyZone: DESK }, 50_000)).toEqual({
      label: "TUTUP MANIFEST",
      enabled: true,
    });
    const withFailed = failAt(deliveringTo([INDUSTRI]), INDUSTRI, 5000);
    expect(getInteractButtonInfo({ ...withFailed, nearbyZone: DESK }, 50_000)).toEqual({
      label: "PULANGKAN PAKET",
      enabled: true,
    });
  });
});

describe("tutup manifest di meja gudang → ringkasan", () => {
  it("semua dihantar: close_manifest, manifest closed, ringkasan tepat", () => {
    const d = deliverAt(deliveringTo([SHOP], 1000), SHOP, 5000);
    const { result, session } = interact(d.session, DESK, 9000, testDeps(), onFoot);
    expect(result.action).toBe("close_manifest");
    expect(session.phase).toBe("complete");
    expect(session.manifest?.status).toBe("closed");
    expect(session.summary).toEqual({
      manifestId: session.manifest?.id,
      delivered: 1,
      returned: 0,
      earned: d.reward,
      xp: d.xp,
      durationMs: 8000, // manifest.createdAt 1000 → ditutup 9000
    });
  });

  it("campuran: 2 dihantar + 1 gagal → return_packets, ringkasan jumlahkan ganjaran", () => {
    let s = deliveringTo([SHOP, INDUSTRI, CAFE], 1000);
    const a = deliverAt(s, SHOP, 3000);
    s = failAt(a.session, INDUSTRI, 5000);
    expect(s.phase).toBe("delivering");
    const b = deliverAt(s, CAFE, 7000);
    expect(b.session.phase).toBe("returning");

    const { result, session } = interact(b.session, DESK, 11_000, testDeps(), onFoot);
    expect(result.action).toBe("return_packets");
    expect(session.cargo.map((p) => p.status).sort()).toEqual(["delivered", "delivered", "returned"]);
    expect(session.summary).toMatchObject({
      delivered: 2,
      returned: 1,
      earned: a.reward + b.reward,
      xp: a.xp + b.xp,
      durationMs: 10_000,
    });
  });

  it("tally bermula sifar dan dikumpul semasa serahan", () => {
    expect(createSession().tally).toEqual({ earned: 0, xp: 0 });
    const d = deliverAt(deliveringTo([SHOP, CAFE]), SHOP, 5000);
    expect(d.session.tally).toEqual({ earned: d.reward, xp: d.xp });
  });
});

describe("complete kekal sehingga pemain menutup ringkasan", () => {
  const closed = () => {
    const d = deliverAt(deliveringTo([SHOP], 1000), SHOP, 5000);
    return interact(d.session, DESK, 9000, testDeps(), onFoot).session;
  };

  it("tickSession tidak lagi reset sendiri selepas 5 s", () => {
    const s = tickSession(closed(), 9000 + 60_000);
    expect(s.phase).toBe("complete");
    expect(s.summary).not.toBeNull();
  });

  it("acknowledgeSummary → idle, kargo/manifest/ringkasan/tally dikosongkan, paket gudang kekal", () => {
    const before = closed();
    const s = acknowledgeSummary(before);
    expect(s.phase).toBe("idle");
    expect(s.manifest).toBeNull();
    expect(s.cargo).toEqual([]);
    expect(s.summary).toBeNull();
    expect(s.tally).toEqual({ earned: 0, xp: 0 });
    expect(s.inbound).toEqual(before.inbound);
  });

  it("acknowledgeSummary di luar fasa complete tidak mengubah apa-apa", () => {
    const s = deliveringTo([SHOP]);
    expect(acknowledgeSummary(s)).toBe(s);
  });
});

// ── Stor + panel ringkasan ─────────────────────────────────────

describe("ManifestSummaryPanel + stor", () => {
  let container: HTMLDivElement;
  let root: Root;
  const store = () => useDeliveryStore.getState();
  const money = () => useGameStateStore.getState().player?.money ?? Number.NaN;
  const text = () => container.textContent ?? "";
  const button = (label: string) =>
    [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === label) ?? null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    useGameStateStore.getState().createNewGame("Ujian");
    useDeliveryStore.setState({ deps: testDeps() });
    store().reset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    store().reset();
  });

  it("tiada ringkasan → tidak dirender", () => {
    act(() => root.render(<ManifestSummaryPanel />));
    expect(text()).toBe("");
  });

  it("aliran penuh melalui stor: serah → meja → panel ringkasan → Manifest baharu", () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP], 1000), nearbyZone: SHOP } });
    store().interact(5000, onFoot);
    store().takeProof();
    const start = money();
    store().confirmHandover(5000);
    const earned = money() - start;
    expect(earned).toBeGreaterThan(0);
    expect(store().session.phase).toBe("returning");

    store().setNearbyZone(DESK);
    const r = store().interact(9000, onFoot).result;
    expect(r?.action).toBe("close_manifest");
    // Menutup manifest tidak memberi wang sekali lagi.
    expect(money()).toBe(start + earned);

    act(() => root.render(<ManifestSummaryPanel />));
    expect(text()).toContain("Ringkasan Manifest");
    expect(text()).toContain("Dihantar");
    expect(text()).toContain("Dipulangkan");
    expect(text()).toContain(formatRinggit(earned));
    expect(text()).toContain("0:08");

    const b = button("Manifest baharu");
    if (!b) throw new Error(`butang "Manifest baharu" tiada; teks panel: ${text()}`);
    act(() => b.click());
    expect(store().session.phase).toBe("idle");
    expect(store().session.summary).toBeNull();
    expect(text()).toBe("");
  });
});
