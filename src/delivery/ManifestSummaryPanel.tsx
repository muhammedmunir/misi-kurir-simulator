import { formatDuration, formatRinggit } from "@/lib/utils";
import { useDeliveryStore } from "@/store/delivery";

export function ManifestSummaryPanel() {
  const summary = useDeliveryStore((s) => s.session.summary);
  const acknowledgeSummary = useDeliveryStore((s) => s.acknowledgeSummary);

  if (!summary) return null;

  const { delivered, returned, earned, xp, durationMs } = summary;

  return (
    <dialog open className="wh-panel wh-summary">
      <div className="wh-panel__title">Ringkasan Manifest</div>
      <dl className="wh-summary__grid">
        <div className="wh-summary__row">
          <dt>Dihantar</dt>
          <dd>{delivered}</dd>
        </div>
        <div className="wh-summary__row">
          <dt>Dipulangkan</dt>
          <dd>{returned}</dd>
        </div>
        <div className="wh-summary__row">
          <dt>Pendapatan</dt>
          <dd className="wh-summary__value--earned">{formatRinggit(earned)}</dd>
        </div>
        <div className="wh-summary__row">
          <dt>XP</dt>
          <dd>+{xp} XP</dd>
        </div>
        <div className="wh-summary__row">
          <dt>Masa</dt>
          <dd>{formatDuration(durationMs)}</dd>
        </div>
      </dl>
      <button type="button" className="wh-btn wh-btn--primary wh-summary__btn" onClick={() => acknowledgeSummary()}>
        Manifest baharu
      </button>
    </dialog>
  );
}
