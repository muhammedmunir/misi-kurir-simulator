import { useDeliveryStore } from "@/store/delivery";
import type { DeliverySession } from "@/types/delivery";

/** Read-only helper so we can type-check without running the game. */
function getHandoverPacket(session: DeliverySession) {
  if (!session.handover) return null;
  return session.cargo.find((p) => p.id === session.handover?.packetId) ?? null;
}

/** Handover panel rendered inside the HUD overlay. */
export function HandoverPanel() {
  const session = useDeliveryStore((s) => s.session);
  const takeProof = useDeliveryStore((s) => s.takeProof);
  const confirmHandover = useDeliveryStore((s) => s.confirmHandover);
  const reportAbsent = useDeliveryStore((s) => s.reportAbsent);
  const cancelHandover = useDeliveryStore((s) => s.cancelHandover);

  const now = Date.now();

  // Not active → panel tidak dirender
  if (!session.handover) return null;

  const packet = getHandoverPacket(session);
  if (!packet) return null;

  const zone = session.nearbyZone;
  const noReceiver = zone?.type === "delivery" && zone.receiverHome === false;
  const hasProof = session.handover.proofTaken;

  return (
    <dialog className="wh-panel" open aria-label="Panel Serah Terima">
      <h3>📦 Serah Terima</h3>

      <div className="wh-panel__row">
        <span className="wh-panel__label">Penerima:</span>
        <span>{packet.receiverName}</span>
      </div>

      <div className="wh-panel__row">
        <span className="wh-panel__label">Alamat:</span>
        <span>{zone?.name ?? "Tidak diketahui"}</span>
      </div>

      <div className="wh-panel__row">
        <span className="wh-panel__label">Penjejakan:</span>
        <span className="wh-panel__mono">{packet.trackingNumber}</span>
      </div>

      <div className="wh-panel__row">
        <span className="wh-panel__label">Status:</span>
        <span>Prabayar</span>
      </div>

      {noReceiver ? (
        <p className="wh-panel__note" style={{ color: "#f87171" }}>
          Tiada orang di rumah
        </p>
      ) : (
        <>
          <button
            type="button"
            className="wh-btn wh-btn--primary"
            style={{ minHeight: 48, marginBottom: hasProof ? 0 : 8 }}
            onClick={() => {
              takeProof();
            }}
            disabled={hasProof}
          >
            {hasProof ? "Bukti: foto diambil" : "Ambil bukti"}
          </button>

          <button
            type="button"
            className="wh-btn wh-btn--primary"
            style={{ minHeight: 48, marginBottom: 8 }}
            onClick={() => {
              confirmHandover(now);
            }}
            disabled={!hasProof}
          >
            Serahkan paket
          </button>
        </>
      )}

      <button
        type="button"
        className="wh-btn"
        style={{ minHeight: 48, marginBottom: 8 }}
        onClick={() => {
          reportAbsent(now);
        }}
      >
        Penerima tiada
      </button>

      <button
        type="button"
        className="wh-btn"
        style={{ minHeight: 48 }}
        onClick={() => {
          cancelHandover();
        }}
      >
        Batal
      </button>
    </dialog>
  );
}
