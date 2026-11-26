import { pendingCargo } from "@/lib/delivery-system";
import { useDeliveryStore } from "@/store/delivery";
import type { DeliverySession } from "@/types/delivery";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

function pendingTargetIds(s: DeliverySession): string[] {
  return pendingCargo(s).map((p) => s.targets[p.id]);
}

export function DeliveryZones() {
  const zones = useMemo(() => useDeliveryStore.getState().zones, []);

  // Highlight every zone that still has a packet waiting to be handed over.
  const activeIds = useDeliveryStore(useShallow((s) => pendingTargetIds(s.session)));

  return (
    <group userData={{ noCastShadow: true }}>
      {zones.map((zone) => {
        const isActive = activeIds.includes(zone.id);
        // Penanda hanya untuk gudang dan alamat yang masih ada paket (seperti aplikasi kurir sebenar).
        if (zone.type === "delivery" && !isActive) return null;
        const color = zone.type === "pickup" ? "#22c55e" : isActive ? "#f59e0b" : "#3b82f6";
        const emissive = zone.type === "pickup" ? "#22c55e" : isActive ? "#f59e0b" : "#1e40af";

        return (
          <group key={zone.id} position={[zone.position.x, 0, zone.position.z]}>
            {/* Base ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <ringGeometry args={[2, 3, 32]} />
              <meshStandardMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={isActive ? 0.6 : 0.2}
                transparent
                opacity={0.7}
              />
            </mesh>

            {/* Beacon for active zone */}
            {isActive && (
              <mesh position={[0, 4.5, 0]}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshStandardMaterial
                  color="#f59e0b"
                  emissive="#f59e0b"
                  emissiveIntensity={1}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
