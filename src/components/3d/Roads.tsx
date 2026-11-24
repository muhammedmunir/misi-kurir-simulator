import { useMemo } from 'react';

export function Roads() {
  const roads = useMemo(() => {
    // Grid roads
    const result = [];
    for (let i = -3; i <= 3; i++) {
      // Horizontal
      result.push({ x: 0, z: i * 40, rotY: 0, w: 400, d: 12 });
      // Vertical
      result.push({ x: i * 40, z: 0, rotY: Math.PI / 2, w: 12, d: 400 });
    }
    return result;
  }, []);

  return (
    <group>
      {roads.map((road, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, road.rotY, 0]} position={[road.x, 0.05, road.z]} receiveShadow>
          <planeGeometry args={[road.w, road.d]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
        </mesh>
      ))}
      {/* Road markings */}
      {Array.from({ length: 40 }, (_, i) => {
        const z = (i - 20) * 10;
        return (
          <mesh key={`mark-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, z]}>
            <planeGeometry args={[0.3, 4]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        );
      })}
      {/* Street lights */}
      {Array.from({ length: 12 }, (_, i) => {
        const z = (i - 6) * 30;
        return (
          <group key={`light-${i}`} position={[8, 0, z]}>
            {/* Pole */}
            <mesh position={[0, 4, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.15, 8, 8]} />
              <meshStandardMaterial color="#555555" metalness={0.5} />
            </mesh>
            {/* Light fixture */}
            <mesh position={[0.5, 8, 0]} castShadow>
              <boxGeometry args={[1, 0.3, 0.5]} />
              <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
