import * as THREE from "three";
import { Buildings } from "./Buildings";
import { Roads } from "./Roads";
import { Terrain } from "./Terrain";

export function WorldEnvironment() {
  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#3a5a2a" roughness={0.9} />
      </mesh>

      <Terrain />
      <Roads />
      <Buildings />

      {/* Sky dome */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[400, 32, 32]} />
        <meshBasicMaterial color="#1a1a3a" side={THREE.BackSide} />
      </mesh>
    </group>
  );
}
