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
    <group>
      {zones.map((zone) => {
        const isActive = activeIds.includes(zone.id);
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

            {/* Pillar */}
            <mesh position={[0, 2, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 4, 8]} />
              <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.3} />
            </mesh>

            {/* Sign top */}
            <mesh position={[0, 4.2, 0]}>
              <boxGeometry args={[1.5, 0.8, 0.15]} />
              <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={isActive ? 0.8 : 0.3} />
            </mesh>

            {/* Point light for delivery zones */}
            {zone.type === "delivery" && (
              <pointLight color={color} intensity={isActive ? 2 : 0.5} distance={8} position={[0, 3, 0]} />
            )}

            {/* Beacon for active zone */}
            {isActive && (
              <mesh position={[0, 6, 0]}>
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
