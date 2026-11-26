import { Buildings } from "./Buildings";
import { Roads } from "./Roads";

export function WorldEnvironment() {
  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#5f8a45" roughness={0.95} />
      </mesh>

      <Roads />
      <Buildings />
    </group>
  );
}
