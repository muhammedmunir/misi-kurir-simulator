import { STARTER_CARGO } from "@/lib/delivery-system";
import { useDeliveryStore } from "@/store/delivery";
import type { Packet } from "@/types/game";
import { cargoUsage } from "./warehouse-logic";

const STATUS_LABEL: Partial<Record<Packet["status"], string>> = {
  received: "Belum imbas",
  sorting: "Disortir",
  ready_to_dispatch: "Sedia dimuat",
  loaded: "Dalam motor",
};

function PacketRow({ packet, zoneName, action }: { packet: Packet; zoneName: string; action: React.ReactNode }) {
  return (
    <li className="wh-row">
      <div className="wh-row__info">
        <span className="wh-row__dest">
          {zoneName} · {packet.receiverName}
        </span>
        <span className="wh-row__meta">
          {packet.trackingNumber} · {packet.weight} kg · {packet.volume} unit
        </span>
        <span className="wh-row__status" data-status={packet.status}>
          {STATUS_LABEL[packet.status] ?? packet.status}
        </span>
      </div>
      {action}
    </li>
  );
}

/** Sorting desk: scan (simulated), load within cargo limits, then dispatch. */
export function WarehousePanel() {
  const session = useDeliveryStore((s) => s.session);
  const zones = useDeliveryStore((s) => s.zones);
  const { scan, load, dispatch, closePanel } = useDeliveryStore.getState();

  if (!session.panelOpen) return null;

  const zoneName = (p: Packet) => zones.find((z) => z.id === session.targets[p.id])?.name ?? "—";
  const usage = cargoUsage(session, STARTER_CARGO);

  return (
    <section className="wh-panel" aria-label="Gudang: meja sortir">
      <header className="wh-panel__head">
        <div>
          <h2 className="wh-panel__title">Meja Sortir</h2>
          <p className="wh-panel__usage">
            Motor: {usage.packets} paket · {usage.weight}/{usage.maxWeight} kg · {usage.volume}/{usage.maxVolume} unit
          </p>
        </div>
        <button type="button" className="wh-btn wh-btn--ghost" onClick={closePanel}>
          Tutup
        </button>
      </header>

      {session.interactionMessage && <output className="wh-panel__msg">{session.interactionMessage}</output>}

      <p className="wh-panel__note">Imbas ialah simulasi: ketik untuk mengimbas kod bar.</p>

      <ul className="wh-list">
        {session.inbound.map((p) => (
          <PacketRow
            key={p.id}
            packet={p}
            zoneName={zoneName(p)}
            action={
              p.status === "received" ? (
                <button type="button" className="wh-btn" onClick={() => scan(p.id, Date.now())}>
                  Imbas
                </button>
              ) : (
                <button type="button" className="wh-btn wh-btn--primary" onClick={() => load(p.id, Date.now())}>
                  Muat
                </button>
              )
            }
          />
        ))}
        {session.cargo.map((p) => (
          <PacketRow
            key={p.id}
            packet={p}
            zoneName={zoneName(p)}
            action={<span className="wh-row__tag">Dimuat</span>}
          />
        ))}
        {session.inbound.length === 0 && session.cargo.length === 0 && (
          <li className="wh-empty">Tiada paket di gudang.</li>
        )}
      </ul>

      <button
        type="button"
        className="wh-btn wh-btn--primary wh-btn--wide"
        disabled={session.cargo.length === 0}
        onClick={() => dispatch(Date.now())}
      >
        {session.cargo.length === 0 ? "Muat paket untuk berangkat" : `Berangkat (${session.cargo.length} paket)`}
      </button>
    </section>
  );
}
