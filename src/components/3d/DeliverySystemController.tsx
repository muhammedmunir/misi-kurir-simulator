import { DELIVERY_SYSTEM } from "@/lib/delivery-system";
import { findNearbyInteractable } from "@/lib/delivery-utils";
import { useDeliveryUIStore } from "@/store/delivery-ui";
import { useFrame } from "@react-three/fiber";
import { useEffect } from "react";

export function DeliverySystemController() {
  useEffect(() => {
    // Reset delivery state on unmount
    return () => {
      DELIVERY_SYSTEM.resetSession();
      useDeliveryUIStore.getState().clearMessages();
    };
  }, []);

  useFrame(() => {
    const playerPos = DELIVERY_SYSTEM.getPlayerPosition();
    if (!playerPos) return;

    const { setNearbyZone, getSession } = DELIVERY_SYSTEM;
    const session = getSession();
    const ui = useDeliveryUIStore.getState();

    // Check nearby interactable zones
    const zones = DELIVERY_SYSTEM.getZones();
    const nearby = findNearbyInteractable(playerPos, zones);
    setNearbyZone(nearby);

    // Update UI with zone info
    if (nearby && nearby.id !== ui.activeZone) {
      ui.setActiveZone(nearby.id, nearby.name);
      if (session.hasPacket && nearby.type === "delivery" && nearby.id === session.targetZone?.id) {
        ui.setInteractionMessage(`Berhampiran: ${nearby.name} — Hantar paket (E)`);
      } else if (nearby.type === "pickup" && !session.hasPacket) {
        ui.setInteractionMessage(`Berhampiran: ${nearby.name} — Ambil paket (E)`);
      } else {
        ui.setInteractionMessage(`Berhampiran: ${nearby.name}`);
      }
    }

    // If player is far from all zones, clear nearby
    if (!nearby && session.nearbyZone) {
      ui.setActiveZone(null, null);
      ui.setInteractionMessage("");
    }
  });

  return null;
}
