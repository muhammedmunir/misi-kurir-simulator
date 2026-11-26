import type { MutableRefObject } from "react";
import type { Group } from "three";
import type { CourierPose } from "./courier-pose";

/** Sendi rig kurier; diisi oleh `CourierModel`, digerakkan oleh `applyPose`. */
export type CourierRig = {
  root: Group | null;
  hipL: Group | null;
  hipR: Group | null;
  kneeL: Group | null;
  kneeR: Group | null;
  shoulderL: Group | null;
  shoulderR: Group | null;
  elbowL: Group | null;
  elbowR: Group | null;
};

export function emptyRig(): CourierRig {
  return {
    root: null,
    hipL: null,
    hipR: null,
    kneeL: null,
    kneeR: null,
    shoulderL: null,
    shoulderR: null,
    elbowL: null,
    elbowR: null,
  };
}

export function applyPose(rig: CourierRig, p: CourierPose): void {
  if (rig.hipL) rig.hipL.rotation.x = p.hipL;
  if (rig.hipR) rig.hipR.rotation.x = p.hipR;
  if (rig.kneeL) rig.kneeL.rotation.x = p.kneeL;
  if (rig.kneeR) rig.kneeR.rotation.x = p.kneeR;
  if (rig.shoulderL) rig.shoulderL.rotation.x = p.shoulderL;
  if (rig.shoulderR) rig.shoulderR.rotation.x = p.shoulderR;
  if (rig.elbowL) rig.elbowL.rotation.x = p.elbowL;
  if (rig.elbowR) rig.elbowR.rotation.x = p.elbowR;
  if (rig.root) rig.root.position.y = p.bob;
}

// Palet uniform kurier: jaket biru tua dengan jalur amber, seluar kelabu gelap.
const JACKET = "#1d3a8a";
const ACCENT = "#f59e0b";
const PANTS = "#2b2f3a";
const SKIN = "#c68a5a";
const SHOE = "#111318";

/** Ketinggian sendi pinggul dari tapak kaki (m). Kaki menyentuh y = 0. */
export const HIP_HEIGHT = 0.9;

/**
 * Kurier berdiri ~1.75 m: kepala bertopi keledar, jaket, beg kurier di
 * belakang, dan lapan sendi berputar (pinggul, lutut, bahu, siku).
 * Hadapan = +z.
 */
export function CourierModel({ rig }: { rig: MutableRefObject<CourierRig> }) {
  const set = (k: keyof CourierRig) => (g: Group | null) => {
    rig.current[k] = g;
  };

  return (
    <group ref={set("root")}>
      {/* Badan */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.42, 0.56, 0.24]} />
        <meshStandardMaterial color={JACKET} roughness={0.8} />
      </mesh>
      {/* Jalur amber pada dada */}
      <mesh position={[0, 1.27, 0.125]}>
        <boxGeometry args={[0.43, 0.06, 0.01]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.25} />
      </mesh>
      {/* Pinggang */}
      <mesh position={[0, 0.92, 0]}>
        <boxGeometry args={[0.38, 0.12, 0.22]} />
        <meshStandardMaterial color={PANTS} roughness={0.9} />
      </mesh>
      {/* Kepala dan topi keledar */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.22, 0.24, 0.22]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.66, 0]}>
        <sphereGeometry args={[0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={ACCENT} roughness={0.35} metalness={0.1} />
      </mesh>
      {/* Visor */}
      <mesh position={[0, 1.63, 0.12]}>
        <boxGeometry args={[0.24, 0.07, 0.03]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.4} />
      </mesh>
      {/* Beg kurier */}
      <mesh position={[0, 1.2, -0.22]}>
        <boxGeometry args={[0.38, 0.42, 0.2]} />
        <meshStandardMaterial color={ACCENT} roughness={0.6} />
      </mesh>

      {/* Kaki: pinggul → paha → lutut → betis → kasut */}
      {(["L", "R"] as const).map((side) => (
        <group key={side} position={[side === "L" ? 0.11 : -0.11, HIP_HEIGHT, 0]} ref={set(`hip${side}`)}>
          <mesh position={[0, -0.22, 0]}>
            <boxGeometry args={[0.16, 0.44, 0.17]} />
            <meshStandardMaterial color={PANTS} roughness={0.9} />
          </mesh>
          <group position={[0, -0.45, 0]} ref={set(`knee${side}`)}>
            <mesh position={[0, -0.2, 0]}>
              <boxGeometry args={[0.14, 0.4, 0.15]} />
              <meshStandardMaterial color={PANTS} roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.41, 0.05]}>
              <boxGeometry args={[0.15, 0.08, 0.27]} />
              <meshStandardMaterial color={SHOE} roughness={0.6} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Tangan: bahu → lengan atas → siku → lengan bawah + tangan */}
      {(["L", "R"] as const).map((side) => (
        <group key={side} position={[side === "L" ? 0.27 : -0.27, 1.44, 0]} ref={set(`shoulder${side}`)}>
          <mesh position={[0, -0.15, 0]}>
            <boxGeometry args={[0.12, 0.32, 0.13]} />
            <meshStandardMaterial color={JACKET} roughness={0.8} />
          </mesh>
          <group position={[0, -0.31, 0]} ref={set(`elbow${side}`)}>
            <mesh position={[0, -0.14, 0]}>
              <boxGeometry args={[0.11, 0.28, 0.12]} />
              <meshStandardMaterial color={JACKET} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.32, 0]}>
              <boxGeometry args={[0.09, 0.09, 0.09]} />
              <meshStandardMaterial color={SKIN} roughness={0.7} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}
