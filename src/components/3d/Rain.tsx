import { useGameStateStore } from "@/store/gamestate";
import { isRaining } from "@/world/daytime";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { type BufferAttribute, DynamicDrawUsage, type LineSegments } from "three";

const DROP_COUNT = 1400;
const SPREAD = 30;
const HEIGHT = 20;
const FLOOR = -4;

function makeDrops() {
  const positions = new Float32Array(DROP_COUNT * 6);
  for (let i = 0; i < positions.length; i += 6) {
    positions[i] = (Math.random() - 0.5) * SPREAD;
    positions[i + 1] = Math.random() * HEIGHT + FLOOR;
    positions[i + 2] = (Math.random() - 0.5) * SPREAD;
  }
  return positions;
}

export function Rain() {
  const raining = useGameStateStore((s) => isRaining(s.settings.rainMode, s.worldMinutes) && !s.settings.reducedMotion);
  const [positions] = useState(makeDrops);
  const lines = useRef<LineSegments>(null);
  const attribute = useRef<BufferAttribute>(null);

  useFrame(({ camera }, delta) => {
    if (!raining || !lines.current || !attribute.current) return;
    lines.current.position.copy(camera.position);
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < positions.length; i += 6) {
      const x = positions[i] - dt * 4;
      const y = positions[i + 1] - dt * 18;
      positions[i] = x < -SPREAD / 2 ? x + SPREAD : x;
      positions[i + 1] = y < FLOOR ? y + HEIGHT : y;
      positions[i + 3] = positions[i] + 0.11;
      positions[i + 4] = positions[i + 1] + 0.49;
      positions[i + 5] = positions[i + 2];
    }
    attribute.current.needsUpdate = true;
  });

  return (
    <lineSegments name="weather-rain" ref={lines} frustumCulled={false} visible={raining}>
      <bufferGeometry>
        <bufferAttribute ref={attribute} attach="attributes-position" args={[positions, 3]} usage={DynamicDrawUsage} />
      </bufferGeometry>
      <lineBasicMaterial color="#bed1e2" transparent opacity={0.35} depthWrite={false} />
    </lineSegments>
  );
}
