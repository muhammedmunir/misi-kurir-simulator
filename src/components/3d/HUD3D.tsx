import { Html } from '@react-three/drei';

export function HUD3D() {
  return (
    <group>
      {/* Compass */}
      <mesh position={[4, 6, -4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
}
