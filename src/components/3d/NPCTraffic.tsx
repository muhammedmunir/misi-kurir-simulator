import { generateNPCTraffic, updateNPCTraffic, type NPCTrafficVehicle } from "@/lib/delivery-system";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";

export function NPCTraffic() {
  const groupRef = useRef<Group>(null);
  const lastUpdateRef = useRef(0);
  const [npcIds] = useState<string[]>(() => generateNPCTraffic(8).map((n: NPCTrafficVehicle) => n.id));

  const npcDataRef = useRef<NPCTrafficVehicle[]>(generateNPCTraffic(8));
  const vehicleRefs = useRef<Group[]>([]);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    delta = Math.min(delta, 0.05);

    const now = performance.now();
    if (now - lastUpdateRef.current > 50) {
      lastUpdateRef.current = now;
      npcDataRef.current = updateNPCTraffic(npcDataRef.current, delta);
    }

    for (let i = 0; i < vehicleRefs.current.length; i++) {
      const mesh = vehicleRefs.current[i];
      if (mesh && npcDataRef.current[i]) {
        const npc = npcDataRef.current[i];
        mesh.position.x = npc.position.x;
        mesh.position.z = npc.position.z;
        mesh.rotation.y = npc.heading;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {npcIds.map((id, idx) => (
        <NPCVehicle key={id} npcRef={vehicleRefs} npcIdx={idx} npcDataRef={npcDataRef} />
      ))}
    </group>
  );
}

function NPCVehicle({
  npcRef,
  npcIdx,
  npcDataRef,
}: {
  npcRef: React.MutableRefObject<Group[]>;
  npcIdx: number;
  npcDataRef: React.MutableRefObject<NPCTrafficVehicle[]>;
}) {
  const ref = useRef<Group>(null);

  useFrame(() => {
    if (ref.current && npcRef.current) {
      npcRef.current[npcIdx] = ref.current;
    }
  }, 0);

  const npc = npcDataRef.current?.[npcIdx];
  if (!npc) return null;

  const wheelPositions = [
    [-0.8, 0.25, 0.9],
    [0.8, 0.25, 0.9],
    [-0.8, 0.25, -0.9],
    [0.8, 0.25, -0.9],
  ] as const;

  return (
    <group ref={ref} position={[npc.position.x, 0, npc.position.z]}>
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
        <mesh key={wi} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
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