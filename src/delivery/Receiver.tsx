import { CharacterGLB, type CharacterKey } from "@/components/3d/CharacterGLB";
import { playerState } from "@/components/3d/PlayerController";
import { DELIVERY_ZONES, pendingCargo } from "@/lib/delivery-system";
import { useDeliveryStore } from "@/store/delivery";
import type { DeliverySession } from "@/types/delivery";
import { Suspense, useEffect, useMemo, useState } from "react";

/** Penerima keluar ke pintu bila pemain berada dalam jarak ini (m). */
export const RECEIVER_SHOW_RADIUS = 45;
const MODELS: CharacterKey[] = ["receiverF", "receiverM"];

type Spot = { id: string; x: number; z: number; model: CharacterKey };

/** Penerima yang patut dipaparkan untuk kedudukan pemain `p`. */
export function visibleReceivers(spots: readonly Spot[], p: { x: number; z: number }): string[] {
  return spots.filter((s) => Math.hypot(s.x - p.x, s.z - p.z) <= RECEIVER_SHOW_RADIUS).map((s) => s.id);
}

/** Tapis alamat paket aktif dahulu, kemudian guna jejari paparan asal. */
export function visiblePendingReceivers(
  spots: readonly Spot[],
  position: { x: number; z: number },
  session: DeliverySession,
): string[] {
  if (session.phase !== "delivering") return [];
  const pendingZones = new Set(pendingCargo(session).map((packet) => session.targets[packet.id]));
  return visibleReceivers(
    spots.filter((spot) => pendingZones.has(spot.id)),
    position,
  );
}

/** Penerima menunggu di hadapan pintu dan menghulur tangan semasa serah terima. */
export function Receiver() {
  const spots = useMemo<Spot[]>(
    () =>
      DELIVERY_ZONES.filter((z) => z.type === "delivery" && z.receiverHome !== false).map((z, i) => ({
        id: z.id,
        x: z.position.x,
        z: z.position.z - 1.5,
        model: MODELS[i % MODELS.length],
      })),
    [],
  );
  const [shown, setShown] = useState<string[]>([]);
  const handoverZone = useDeliveryStore((s) => s.session.handover?.zoneId ?? null);
  // Pelanggan COD menghulur wang kertas sehingga baki diberi.
  const showCash = useDeliveryStore((s) => {
    const h = s.session.handover;
    if (!h || h.codCollected) return false;
    return s.session.cargo.find((p) => p.id === h.packetId)?.paymentMethod === "cod";
  });

  useEffect(() => {
    const tick = () => {
      const next = visiblePendingReceivers(spots, playerState.getPosition(), useDeliveryStore.getState().session);
      setShown((prev) => (prev.join() === next.join() ? prev : next));
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [spots]);

  return (
    <group>
      {spots
        .filter((s) => shown.includes(s.id))
        .map((s) => (
          <group key={s.id} position={[s.x, 0, s.z]}>
            <Suspense fallback={null}>
              <CharacterGLB model={s.model} clip={handoverZone === s.id ? "take" : "idle"} />
            </Suspense>
            {handoverZone === s.id && showCash && (
              <mesh position={[-0.2, 1.05, 0.38]} rotation={[-0.4, 0.3, 0]}>
                <boxGeometry args={[0.3, 0.015, 0.14]} />
                <meshStandardMaterial color="#5fae6e" roughness={0.8} />
              </mesh>
            )}
          </group>
        ))}
    </group>
  );
}
