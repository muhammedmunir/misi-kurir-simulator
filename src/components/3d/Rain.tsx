import { useGameStateStore } from "@/store/gamestate";
import { isRaining } from "@/world/daytime";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { BufferAttribute, Points } from "three";
import { DynamicDrawUsage } from "three";

const DROP_COUNT = 1400;
const SPREAD = 28;
const HEIGHT = 18;

function makeDrops() {
  const positions = new Float32Array(DROP_COUNT * 3);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (Math.random() - 0.5) * SPREAD;
    positions[i + 1] = Math.random() * HEIGHT - 4;
    positions[i + 2] = (Math.random() - 0.5) * SPREAD;
  }
  return positions;
}

export function Rain() {
  const raining = useGameStateStore((s) => isRaining(s.settings.rainMode, s.worldMinutes) && !s.settings.reducedMotion);
  const [positions] = useState(makeDrops);
  const points = useRef<Points>(null);
  const attribute = useRef<BufferAttribute>(null);

  useFrame(({ camera }, delta) => {
    if (!raining || !points.current || !attribute.current) return;
    points.current.position.copy(camera.position);
    const fall = Math.min(delta, 0.05) * 18;
    for (let i = 1; i < positions.length; i += 3) {
      const y = positions[i] - fall;
      positions[i] = y < -4 ? y + HEIGHT : y;
    }
    attribute.current.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false} visible={raining}>
      <bufferGeometry>
        <bufferAttribute ref={attribute} attach="attributes-position" args={[positions, 3]} usage={DynamicDrawUsage} />
      </bufferGeometry>
      <pointsMaterial color="#d0e3f3" size={0.034} transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}
