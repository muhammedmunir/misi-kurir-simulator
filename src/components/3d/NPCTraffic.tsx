import { type NPCTrafficVehicle, generateNPCTraffic, updateNPCTraffic } from "@/lib/npc-traffic";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";

const NPC_COUNT = 8;

/**
 * Komponen utama NPC Traffic.
 *
 * Pembaikan B8:
 * - Jana data SEKALI sahaja dalam useState initializer (bukan dua panggilan berasingan).
 * - Update setiap frame (`delta` sebenar) — tiada throttle 50ms.
 * - `heading` sudah betul dalam `generateNPCTraffic`: paksi-z → 0|π, paksi-x → ±π/2.
 */
export function NPCTraffic() {
  const [npcData, setNpcData] = useState<NPCTrafficVehicle[]>(() => generateNPCTraffic(NPC_COUNT));
  const meshRefs = useRef<Group[]>([]);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);

    setNpcData((prev) => {
      const updated = updateNPCTraffic(prev, dt);

      // Sync Three.js mesh (group) positions ke data baharu.
      for (let i = 0; i < updated.length; i++) {
        const mesh = meshRefs.current[i];
        if (mesh) {
          const npc = updated[i];
          mesh.position.set(npc.position.x, 0, npc.position.z);
          mesh.rotation.y = npc.heading;
        }
      }

      return updated;
    });
  });

  return (
    <>
      {npcData.map((npc, idx) => (
        <NPCMesh key={npc.id} npc={npc} meshRef={meshRefs} meshIdx={idx} />
      ))}
    </>
  );
}

/**
 * Satu kenderaan NPC — statik selepas render, posisi dikemas kini oleh NPCTraffic.
 */
function NPCMesh({
  npc,
  meshRef,
  meshIdx,
}: {
  npc: NPCTrafficVehicle;
  meshRef: React.MutableRefObject<Group[]>;
  meshIdx: number;
}) {
  const ref = useRef<Group>(null);

  // Daftarkan mesh ke array induk untuk sync posisi.
  useFrame(() => {
    if (ref.current) {
      meshRef.current[meshIdx] = ref.current;
    }
  }, 0);

  const wheelPositions = [
    [-0.8, 0.25, 0.9],
    [0.8, 0.25, 0.9],
    [-0.8, 0.25, -0.9],
    [0.8, 0.25, -0.9],
  ] as const;

  return (
    <group ref={ref}>
      {/* Vehicle body */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.6, 0.8, 3]} />
        <meshStandardMaterial color={npc.color} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Roof/cabin */}
      <mesh position={[0, 1.15, -0.2]}>
        <boxGeometry args={[1.4, 0.7, 1.6]} />
        <meshStandardMaterial color={npc.color} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, 1.15, 0.65]}>
        <boxGeometry args={[1.2, 0.5, 0.05]} />
        <meshStandardMaterial color="#87ceeb" roughness={0.1} metalness={0.5} />
      </mesh>
      {/* Wheels */}
      {wheelPositions.map(([x, y, z], wi) => (
        <mesh key={`wheel-${npc.id}-${wi}`} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 12]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
      ))}
      {/* Headlights */}
      <mesh position={[-0.5, 0.6, 1.52]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffffcc" emissive="#ffffcc" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.5, 0.6, 1.52]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffffcc" emissive="#ffffcc" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
