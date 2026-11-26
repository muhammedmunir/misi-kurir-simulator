import { type NPCTrafficVehicle, generateNPCTraffic, setLiveTraffic, updateNPCTraffic } from "@/lib/npc-traffic";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";

const NPC_COUNT = 8;

/**
 * NPC traffic. Vehicle list is generated once; positions are advanced in a ref
 * and written straight to the Three.js groups, so React never re-renders per frame.
 */
export function NPCTraffic() {
  const [initial] = useState<NPCTrafficVehicle[]>(() => generateNPCTraffic(NPC_COUNT));
  const dataRef = useRef<NPCTrafficVehicle[]>(initial);
  const groupRefs = useRef<(Group | null)[]>([]);

  useFrame((_state, delta) => {
    const updated = updateNPCTraffic(dataRef.current, Math.min(delta, 0.05));
    dataRef.current = updated;
    setLiveTraffic(updated);
    for (let i = 0; i < updated.length; i++) {
      const group = groupRefs.current[i];
      if (!group) continue;
      group.position.set(updated[i].position.x, 0, updated[i].position.z);
      group.rotation.y = updated[i].heading;
    }
  });

  return (
    <>
      {initial.map((npc, idx) => (
        <NPCMesh
          key={npc.id}
          npc={npc}
          groupRef={(g) => {
            groupRefs.current[idx] = g;
          }}
        />
      ))}
    </>
  );
}

/** One NPC vehicle. Static after mount; NPCTraffic moves its root group. */
function NPCMesh({ npc, groupRef }: { npc: NPCTrafficVehicle; groupRef: (g: Group | null) => void }) {
  const wheelPositions = [
    [-0.8, 0.25, 0.9],
    [0.8, 0.25, 0.9],
    [-0.8, 0.25, -0.9],
    [0.8, 0.25, -0.9],
  ] as const;

  return (
    <group
      ref={groupRef}
      position={[npc.position.x, 0, npc.position.z]}
      rotation={[0, npc.heading, 0]}
      userData={{ noCastShadow: true }}
    >
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
