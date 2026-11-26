import { type NPCTrafficVehicle, generateNPCTraffic, setLiveTraffic, updateNPCTraffic } from "@/lib/npc-traffic";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const NPC_COUNT = 8;

function local(p: [number, number, number], r: [number, number, number] = [0, 0, 0]): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),
    new THREE.Vector3(1, 1, 1),
  );
}

/** Bahagian kereta dalam koordinat setempat (hadapan = +z). Satu instancedMesh bagi setiap jenis. */
const BODY = [local([0, 0.6, 0])];
const CABIN = [local([0, 1.15, -0.2])];
const GLASS = [local([0, 1.15, 0.62])];
const WHEELS = (
  [
    [-0.8, 0.3, 0.95],
    [0.8, 0.3, 0.95],
    [-0.8, 0.3, -0.95],
    [0.8, 0.3, -0.95],
  ] as [number, number, number][]
).map((p) => local(p, [0, 0, Math.PI / 2]));
const HEAD = [local([-0.5, 0.62, 1.51]), local([0.5, 0.62, 1.51])];
const TAIL = [local([-0.55, 0.65, -1.51]), local([0.55, 0.65, -1.51])];

const carM = new THREE.Matrix4();
const outM = new THREE.Matrix4();
const q = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);
const one = new THREE.Vector3(1, 1, 1);
const v3 = new THREE.Vector3();
const tmpColor = new THREE.Color();

/**
 * Trafik NPC. Senarai kenderaan dijana sekali; kedudukan dimajukan dalam ref.
 * Semua kereta dilukis dengan instancing: 6 draw call untuk semua kereta,
 * tanpa mengira bilangan (sebelum ini ~9 mesh setiap kereta).
 */
export function NPCTraffic() {
  const [initial] = useState<NPCTrafficVehicle[]>(() => generateNPCTraffic(NPC_COUNT));
  const dataRef = useRef<NPCTrafficVehicle[]>(initial);
  const refs = {
    body: useRef<THREE.InstancedMesh>(null),
    cabin: useRef<THREE.InstancedMesh>(null),
    glass: useRef<THREE.InstancedMesh>(null),
    wheel: useRef<THREE.InstancedMesh>(null),
    head: useRef<THREE.InstancedMesh>(null),
    tail: useRef<THREE.InstancedMesh>(null),
  };
  const groups: [keyof typeof refs, THREE.Matrix4[]][] = useMemo(
    () => [
      ["body", BODY],
      ["cabin", CABIN],
      ["glass", GLASS],
      ["wheel", WHEELS],
      ["head", HEAD],
      ["tail", TAIL],
    ],
    [],
  );

  // Warna badan setiap kereta (sekali).
  useLayoutEffect(() => {
    for (const key of ["body", "cabin"] as const) {
      const mesh = refs[key].current;
      if (!mesh) continue;
      initial.forEach((npc, i) => mesh.setColorAt(i, tmpColor.set(npc.color)));
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  useFrame((_state, delta) => {
    const updated = updateNPCTraffic(dataRef.current, Math.min(delta, 0.05));
    dataRef.current = updated;
    setLiveTraffic(updated);
    for (const [key, parts] of groups) {
      const mesh = refs[key].current;
      if (!mesh) continue;
      updated.forEach((npc, i) => {
        carM.compose(v3.set(npc.position.x, 0, npc.position.z), q.setFromAxisAngle(up, npc.heading), one);
        parts.forEach((part, j) => {
          mesh.setMatrixAt(i * parts.length + j, outM.multiplyMatrices(carM, part));
        });
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  const n = initial.length;
  return (
    <group userData={{ noCastShadow: true }}>
      <instancedMesh ref={refs.body} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={[1.6, 0.8, 3]} />
        <meshStandardMaterial roughness={0.35} metalness={0.35} />
      </instancedMesh>
      <instancedMesh ref={refs.cabin} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={[1.4, 0.7, 1.6]} />
        <meshStandardMaterial roughness={0.35} metalness={0.35} />
      </instancedMesh>
      <instancedMesh ref={refs.glass} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={[1.25, 0.5, 0.06]} />
        <meshStandardMaterial color="#1f2f3d" roughness={0.1} metalness={0.7} />
      </instancedMesh>
      <instancedMesh ref={refs.wheel} args={[undefined, undefined, n * WHEELS.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.32, 0.32, 0.22, 12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={refs.head} args={[undefined, undefined, n * HEAD.length]} frustumCulled={false}>
        <boxGeometry args={[0.32, 0.14, 0.04]} />
        <meshStandardMaterial color="#fff6d6" emissive="#fff6d6" emissiveIntensity={0.6} />
      </instancedMesh>
      <instancedMesh ref={refs.tail} args={[undefined, undefined, n * TAIL.length]} frustumCulled={false}>
        <boxGeometry args={[0.3, 0.12, 0.04]} />
        <meshStandardMaterial color="#d11a1a" emissive="#d11a1a" emissiveIntensity={0.6} />
      </instancedMesh>
    </group>
  );
}
