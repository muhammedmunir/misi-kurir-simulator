import { DELIVERY_SYSTEM } from "@/lib/delivery-system";
import { findNearbyInteractable } from "@/lib/delivery-utils";
import { useDeliveryStore } from "@/store/delivery";
import { useDeliveryUIStore } from "@/store/delivery-ui";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

export function DeliverySystemController() {
  const prevNearbyIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      DELIVERY_SYSTEM.resetSession();
      useDeliveryUIStore.getState().clearMessages();
    };
  }, []);

  useFrame(() => {
    const playerPos = DELIVERY_SYSTEM.getPlayerPosition();
    if (!playerPos) return;

    const zones = DELIVERY_SYSTEM.getZones();
    const nearby = findNearbyInteractable(playerPos, zones);
    const session = useDeliveryStore.getState().session;
    const ui = useDeliveryUIStore.getState();

    // Set nearby zone
    useDeliveryStore.getState().setNearbyZone(nearby);

    // Update UI with zone info when zone changes
    const nearbyId = nearby?.id ?? null;
    if (nearbyId !== prevNearbyIdRef.current) {
      if (nearby) {
        ui.setActiveZone(nearby.id, nearby.name);
        if (session.hasPacket && nearby.type === "delivery" && nearby.id === session.targetZone?.id) {
          ui.setInteractionMessage(`Berhampiran: ${nearby.name} — Hantar paket (E)`);
        } else if (nearby.type === "pickup" && !session.hasPacket) {
          ui.setInteractionMessage(`Berhampiran: ${nearby.name} — Ambil paket (E)`);
        } else {
          ui.setInteractionMessage(`Berhampiran: ${nearby.name}`);
        }
      } else {
        // Left all zones - clear UI
        ui.setActiveZone(null, null);
        ui.setInteractionMessage("");
      }
      prevNearbyIdRef.current = nearbyId;
    }
  });

  return null;
}
