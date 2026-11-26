import { Suspense } from "react";
import { Buildings } from "./Buildings";
import { CityRoads } from "./CityRoads";

export function WorldEnvironment() {
  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#5f8a45" roughness={0.95} />
      </mesh>

      {/* Jalan, simpang dan lampu jalan Kenney (Pelan 012b) */}
      <Suspense fallback={null}>
        <CityRoads />
      </Suspense>
      <Buildings />
    </group>
  );
}
