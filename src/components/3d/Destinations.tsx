import { DELIVERY_ZONES, HOUSE } from "@/lib/delivery-system";
import type { Rect } from "@/vehicles/motor-state";

const LINE = 0.15;
const LINE_Y = 0.09;

/** White outline of a parking box, painted on the road. */
function ParkingBox({ box }: { box: Rect }) {
  const w = box.halfX * 2;
  const d = box.halfZ * 2;
  const lines: [number, number, number, number][] = [
    [0, -box.halfZ, w, LINE],
    [0, box.halfZ, w, LINE],
    [-box.halfX, 0, LINE, d],
    [box.halfX, 0, LINE, d],
  ];
  return (
    <group position={[box.x, LINE_Y, box.z]}>
      {lines.map(([x, z, lw, ld]) => (
        <mesh key={`${x},${z}`} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[lw, ld]} />
          <meshStandardMaterial color="#e8e8f0" />
        </mesh>
      ))}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
    </group>
  );
}

/** Placeholder house per delivery address: faces +z, door towards the road. */
function House({ lot, color }: { lot: { x: number; z: number }; color: string }) {
  const frontZ = HOUSE.depth / 2;
  return (
    <group position={[lot.x, 0, lot.z + HOUSE.zOffset]}>
      <mesh position={[0, HOUSE.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[HOUSE.width, HOUSE.height, HOUSE.depth]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, HOUSE.height + 0.6, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[HOUSE.width * 0.75, 1.6, 4]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.2, frontZ + 0.05]}>
        <planeGeometry args={[1.4, 2.4]} />
        <meshStandardMaterial color="#5b3a1a" />
      </mesh>
    </group>
  );
}

const HOUSE_COLORS = ["#d6c7a1", "#a7c4a0", "#c9a9a6"];

export function Destinations() {
  const destinations = DELIVERY_ZONES.filter((z) => z.type === "delivery");
  return (
    <group>
      {destinations.map((z, i) => (
        <group key={z.id}>
          {z.lot && <House lot={z.lot} color={HOUSE_COLORS[i % HOUSE_COLORS.length]} />}
          {z.parking && <ParkingBox box={z.parking} />}
        </group>
      ))}
    </group>
  );
}
