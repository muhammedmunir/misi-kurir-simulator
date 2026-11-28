import { canCollectCustomerCod } from "@/delivery/customer";
import { formatRinggit } from "@/lib/utils";
import type { DeliverySession } from "@/types/delivery";
import type { Packet } from "@/types/game";

/** Mesej bila pemain memilih baki yang salah. */
export const COD_WRONG_CHANGE = "Baki salah — kira semula";

/** Bundar ke sen (RM). */
const sen = (n: number) => Math.round(n * 100) / 100;

/** Wang kertas terkecil antara RM20, RM50 dan RM100 yang ≥ jumlah. */
export function codNote(amount: number): number {
  if (amount <= 20) return 20;
  if (amount <= 50) return 50;
  return 100;
}

/** Baki yang perlu dikembalikan: wang kertas − jumlah, tepat ke sen. */
export function codChange(amount: number): number {
  return sen(codNote(amount) - amount);
}

/**
 * Tiga pilihan baki berjarak RM1. Jawapan betul pada kedudukan k di mana
 * k = round(jumlah × 2) mod 3 — supaya tidak sentiasa di tengah.
 */
export function codChangeOptions(amount: number): number[] {
  const change = codChange(amount);
  const k = Math.round(amount * 2) % 3;
  const mula = Math.max(0, change - k);
  return [sen(mula), sen(mula + 1), sen(mula + 2)];
}

/**
 * Kutip bayaran COD: bandingkan baki dengan baki yang betul bagi paket
 * serah terima aktif. Baki salah hanya memaparkan amaran; baki betul
 * menanda handover.codCollected. Tiada wang ditambah kepada pemain.
 */
export function collectCod(session: DeliverySession, change: number, now: number): DeliverySession {
  const h = session.handover;
  if (!h || h.codCollected || !canCollectCustomerCod(h.mood)) return session;
  const packet = session.cargo.find((p) => p.id === h.packetId);
  if (!packet || packet.paymentMethod !== "cod") return session;

  if (sen(change) !== codChange(packet.codAmount)) {
    return {
      ...session,
      interactionMessage: COD_WRONG_CHANGE,
      interactionMessageTime: now,
    };
  }

  return {
    ...session,
    handover: { ...h, codCollected: true },
    interactionMessage: `COD diterima: ${formatRinggit(packet.codAmount)}`,
    interactionMessageTime: now,
  };
}

/** Jumlah tunai COD yang disetor, tidak termasuk paket yang dititip tanpa kutipan. */
export function codCollectedTotal(cargo: readonly Packet[]): number {
  return sen(
    cargo.reduce(
      (sum, p) =>
        p.paymentMethod === "cod" && p.status === "delivered" && p.codCollected !== false ? sum + p.codAmount : sum,
      0,
    ),
  );
}
