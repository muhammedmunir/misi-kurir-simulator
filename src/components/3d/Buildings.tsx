import { useMemo } from "react";

const BUILDING_COLORS = ["#4a5568", "#5a6578", "#6a7588", "#3d4f5f", "#7a8a9a", "#4b5c6d"];

export function Buildings() {
  const buildings = useMemo(() => {
    const result = [];
    const seed = 42;
    let rng = seed;
    const pseudoRandom = () => {
      rng = (rng * 16807) % 2147483647;
      return (rng - 1) / 2147483646;
    };

    // Create buildings along roads (grid pattern)
    for (let gx = -3; gx <= 3; gx++) {
      for (let gz = -3; gz <= 3; gz++) {
        if (pseudoRandom() > 0.5) continue; // Some empty lots

        const bx = gx * 40 + (pseudoRandom() - 0.5) * 10;
        const bz = gz * 40 + (pseudoRandom() - 0.5) * 10;
        const width = 6 + pseudoRandom() * 8;
        const depth = 6 + pseudoRandom() * 8;
        const height = 5 + pseudoRandom() * 20;
        const floors = Math.floor(height / 3);

        result.push({
          x: bx,
          y: height / 2,
          z: bz,
          width,
          height,
          depth,
          color: BUILDING_COLORS[Math.floor(pseudoRandom() * BUILDING_COLORS.length)],
          floors,
        });
      }
    }
    return result;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, b.y, b.z]}>
          {/* Main building */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[b.width, b.height, b.depth]} />
            <meshStandardMaterial color={b.color} roughness={0.8} />
          </mesh>

          {/* Windows */}
          {Array.from({ length: Math.min(b.floors, 5) }, (_, floor) =>
            Array.from({ length: 3 }, (_, wi) => {
              const wx = -b.width / 3 + wi * (b.width / 4);
              const wy = -b.height / 2 + 2 + floor * 3;
              return (
                <mesh key={`${i}-${floor}-${wi}`} position={[wx, wy, b.depth / 2 + 0.05]}>
                  <planeGeometry args={[1.2, 1.5]} />
                  <meshStandardMaterial color="#87ceeb" emissive="#334455" emissiveIntensity={0.3} />
                </mesh>
              );
            }),
          )}

          {/* Door */}
          <mesh position={[0, -b.height / 2 + 1.5, b.depth / 2 + 0.05]}>
            <planeGeometry args={[1.5, 3]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
