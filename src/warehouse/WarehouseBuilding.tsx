import { WAREHOUSE_WALL_T } from "@/components/3d/world-collision";
import { WAREHOUSE } from "./warehouse-logic";

const WALL_H = 4.5;
const WALL_T = WAREHOUSE_WALL_T;
const WALL_COLOR = "#8a8f98";
const ACCENT = "#f59e0b";

/**
 * Placeholder warehouse: open-roof shell so the third-person camera can see
 * inside, door gap facing the z=0 road, sorting desk where the pickup zone is.
 * Collision: `warehouseColliders()` in `world-collision.ts` (same dimensions).
 */
export function WarehouseBuilding() {
  const { center, width, depth, doorWidth } = WAREHOUSE;
  const halfW = width / 2;
  const halfD = depth / 2;
  const sideOfDoor = (width - doorWidth) / 2;

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#5b5f66" roughness={0.9} />
      </mesh>

      {/* Back and side walls */}
      <mesh position={[0, WALL_H / 2, halfD]}>
        <boxGeometry args={[width, WALL_H, WALL_T]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} />
      </mesh>
      <mesh position={[-halfW, WALL_H / 2, 0]}>
        <boxGeometry args={[WALL_T, WALL_H, depth]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} />
      </mesh>
      <mesh position={[halfW, WALL_H / 2, 0]}>
        <boxGeometry args={[WALL_T, WALL_H, depth]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} />
      </mesh>

      {/* Front wall with door gap */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (doorWidth / 2 + sideOfDoor / 2), WALL_H / 2, -halfD]}>
          <boxGeometry args={[sideOfDoor, WALL_H, WALL_T]} />
          <meshStandardMaterial color={WALL_COLOR} roughness={0.85} />
        </mesh>
      ))}

      {/* Sign over the door */}
      <mesh position={[0, WALL_H + 0.6, -halfD - 0.1]}>
        <boxGeometry args={[doorWidth + 2, 1.2, 0.2]} />
        <meshStandardMaterial color="#1e1e2e" />
      </mesh>
      {/* Amber stripe: no text mesh, so no runtime font download */}
      <mesh position={[0, WALL_H + 0.6, -halfD - 0.25]}>
        <boxGeometry args={[doorWidth + 1.4, 0.35, 0.05]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.4} />
      </mesh>

      {/* Sorting desk (pickup zone sits in front of it) */}
      <group position={[0, 0, 2.5]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[4, 1, 1.2]} />
          <meshStandardMaterial color="#6b4f2a" roughness={0.7} />
        </mesh>
        <mesh position={[1.2, 1.15, 0]}>
          <boxGeometry args={[0.5, 0.3, 0.4]} />
          <meshStandardMaterial color={ACCENT} />
        </mesh>
      </group>

      {/* Parcel shelves along the back wall */}
      {[-6, -3, 3, 6].map((x) => (
        <group key={x} position={[x, 0, halfD - 1]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[2.4, 3, 1]} />
            <meshStandardMaterial color="#3d4451" roughness={0.8} />
          </mesh>
          {[0.6, 1.6, 2.6].map((y) => (
            <mesh key={y} position={[0, y, -0.55]}>
              <boxGeometry args={[1.8, 0.6, 0.15]} />
              <meshStandardMaterial color="#b08850" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
