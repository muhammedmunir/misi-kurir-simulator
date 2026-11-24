import { DELIVERY_ZONES } from "@/lib/delivery-system";

/**
 * Placeholder figure at each delivery address.
 * A simple standing figure (head + body rectangles) — blue tint to match player.
 * Only rendered for zones with a receiver present (receiverHome !== false).
 */
export function Receiver() {
  const destinations = DELIVERY_ZONES.filter((z) => z.type === "delivery" && z.receiverHome !== false);

  return (
    <group>
      {destinations.map((zone) => {
        // Position: at zone.position, shifted -1.5 in z toward the house
        return (
          <group key={zone.id} position={[zone.position.x, 0, zone.position.z - 1.5]}>
            {/* Head */}
            <mesh position={[0, 1.6, 0]}>
              <boxGeometry args={[0.6, 0.6, 0.6]} />
              <meshStandardMaterial color="#3b82f6" roughness={0.6} />
            </mesh>
            {/* Body */}
            <mesh position={[0, 0.85, 0]}>
              <boxGeometry args={[0.7, 1, 0.5]} />
              <meshStandardMaterial color="#3b82f6" roughness={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
