import type { SaveBackend } from "@/save/backend";
import { saveNow } from "@/save/save-game";
import { useDeliveryStore } from "@/store/delivery";
import type { DeliverySession } from "@/types/delivery";

/**
 * Mula autosave di titik selamat.
 * Pulangkan fungsi untuk menghentikannya (dipanggil semasa unmount).
 */
export function startAutosave(backend: SaveBackend): () => void {
  let pending = false;

  const unsub = useDeliveryStore.subscribe((state, prev) => {
    // Jika sudah ada simpanan yang menunggu, skip perubahan lain
    // (ini elakkan gelung kerana saveNow memanggil notify yang mengubah stor)
    if (pending) return;

    // Tukar fasa kepada "delivering" atau "complete"
    if (
      prev.session.phase !== state.session.phase &&
      (state.session.phase === "delivering" || state.session.phase === "complete")
    ) {
      pending = true;
      void saveNow(backend, Date.now());
      pending = false;
      return;
    }

    // Bandarkan senarai id:status untuk paket berstatus delivered/failed/returned
    const toIdStatus = (session: Pick<DeliverySession, "cargo">): string => {
      return session.cargo
        .filter((p) => p.status === "delivered" || p.status === "failed" || p.status === "returned")
        .map((p) => `${p.id}:${p.status}`)
        .join(",");
    };

    const prevKeys = toIdStatus(prev.session);
    const nextKeys = toIdStatus(state.session);

    if (prevKeys !== nextKeys && nextKeys.length > 0) {
      pending = true;
      void saveNow(backend, Date.now());
      pending = false;
    }
  });

  return unsub;
}
