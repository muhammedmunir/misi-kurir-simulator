import { generateNPCTraffic, setLiveTraffic, updateNPCTraffic } from "@/lib/npc-traffic";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useState } from "react";
import { type InstancedMesh, Matrix4 } from "three";
import { playerState } from "./PlayerController";
import { CAR_MODELS, carModelFor, carModelPath, trafficCarSize } from "./car-models";
import { fitMatrix, useMergedModels } from "./merged-model";

const NPC_COUNT = 8;
const sizes = CAR_MODELS.map((url) => trafficCarSize(carModelPath(url)));

function TrafficModels() {
  const models = useMergedModels(CAR_MODELS);
  const [initial] = useState(() => generateNPCTraffic(NPC_COUNT));
  const dataRef = useRef(initial);
  const meshRefs = useRef<(InstancedMesh | null)[]>([]);
  const matrix = useMemo(() => new Matrix4(), []);
  const counts = useMemo(() => {
    const counts = Array.from(CAR_MODELS, () => 0);
    initial.forEach((_, i) => counts[carModelFor(i)]++);
    return counts;
  }, [initial]);

  useFrame((_state, delta) => {
    const updated = updateNPCTraffic(dataRef.current, Math.min(delta, 0.05), { player: playerState.getPosition() });
    dataRef.current = updated;
    setLiveTraffic(updated);

    updated.forEach((npc, i) => {
      const modelIndex = carModelFor(i);
      const mesh = meshRefs.current[modelIndex];
      if (!mesh) return;
      const { x, z } = npc.position;
      const slot = Math.floor(i / CAR_MODELS.length);
      fitMatrix(models[modelIndex].box, { x, z, ...sizes[modelIndex], rotY: npc.heading }, matrix);
      mesh.setMatrixAt(slot, matrix);
    });
    for (const mesh of meshRefs.current) {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group userData={{ noCastShadow: true }}>
      {models.map((m, i) => (
        <instancedMesh
          key={CAR_MODELS[i]}
          ref={(mesh) => {
            meshRefs.current[i] = mesh;
          }}
          args={[m.geometry, m.material, counts[i]]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}

export function NPCTraffic() {
  return (
    <Suspense fallback={null}>
      <TrafficModels />
    </Suspense>
  );
}
