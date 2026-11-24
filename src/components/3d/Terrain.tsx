import { useMemo } from "react";

export function Terrain() {
  const terrainData = useMemo(() => {
    const segments = 80;
    const size = 400;
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let y = 0; y <= segments; y++) {
      for (let x = 0; x <= segments; x++) {
        const ix = (x / segments - 0.5) * size;
        const iz = (y / segments - 0.5) * size;

        // Simple height noise using sine waves
        const height = Math.sin(ix * 0.02) * 2 + Math.cos(iz * 0.03) * 1.5 + Math.sin(ix * 0.05 + iz * 0.04) * 0.8;

        vertices.push(ix, Math.max(0, height - 1), iz);
      }
    }

    for (let y = 0; y < segments; y++) {
      for (let x = 0; x < segments; x++) {
        const a = y * (segments + 1) + x;
        const b = a + 1;
        const c = a + (segments + 1);
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    return { vertices: new Float32Array(vertices), indices };
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[terrainData.vertices, 3]} />
        <bufferAttribute attach="attributes-index" args={[new Uint32Array(terrainData.indices), 1]} />
      </bufferGeometry>
      <meshStandardMaterial color="#4a7a3a" roughness={0.85} wireframe={false} />
    </mesh>
  );
}
