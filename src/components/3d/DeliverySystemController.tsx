import { findNearbyInteractable } from "@/lib/delivery-utils";
import { useDeliveryStore } from "@/store/delivery";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export function DeliverySystemController() {
  const prevNearbyIdRef = useRef<string | null>(null);

  useFrame(() => {
    const now = Date.now();

    // tick() — auto-reset, message clear
    useDeliveryStore.getState().tick(now);

    const playerPos = useDeliveryStore.getState().playerPos;
    if (!playerPos) return;

    const zones = useDeliveryStore.getState().zones;
    const nearby = findNearbyInteractable(playerPos, zones);

    // Set nearby zone
    useDeliveryStore.getState().setNearbyZone(nearby);

    // Update UI with zone info when zone changes
    const nearbyId = nearby?.id ?? null;
    if (nearbyId !== prevNearbyIdRef.current) {
      prevNearbyIdRef.current = nearbyId;
    }
  });

  return null;
}
