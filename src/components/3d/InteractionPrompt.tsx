import { DELIVERY_SYSTEM } from "@/lib/delivery-system";
import { findNearbyInteractable } from "@/lib/delivery-utils";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

export function InteractionPrompt() {
  const groupRef = useRef<Group>(null);
  const currentZoneIdRef = useRef<string | null>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    const playerPos = DELIVERY_SYSTEM.getPlayerPosition();
    if (!playerPos) {
      groupRef.current.visible = false;
      currentZoneIdRef.current = null;
      return;
    }

    const zone = findNearbyInteractable(playerPos, DELIVERY_SYSTEM.getZones());
    DELIVERY_SYSTEM.setNearbyZone(zone);

    if (!zone) {
      groupRef.current.visible = false;
      currentZoneIdRef.current = null;
      return;
    }

    groupRef.current.visible = true;
    currentZoneIdRef.current = zone.id;

    groupRef.current.position.x = zone.position.x;
    groupRef.current.position.y = 6;
    groupRef.current.position.z = zone.position.z;

    const t = performance.now() * 0.003;
    groupRef.current.position.y = 6 + Math.sin(t) * 0.3;
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Glow sphere */}
      <mesh>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} transparent opacity={0.5} />
      </mesh>
      {/* Arrow above */}
      <mesh position={[0, 0.8, 0]}>
        <coneGeometry args={[0.3, 0.6, 8]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
