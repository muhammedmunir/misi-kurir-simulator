import { DELIVERY_ZONES, HOUSE } from "@/lib/delivery-system";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const LINE = 0.15;
const LINE_Y = 0.09;
const HOUSE_COLORS = ["#d6c7a1", "#a7c4a0", "#c9a9a6", "#b8c4d6", "#e0c9a6"];

const tmp = new THREE.Object3D();
const tmpColor = new THREE.Color();

type Inst = { p: [number, number, number]; r?: [number, number, number]; s?: [number, number, number] };

/** Kedudukan instance setiap bahagian rumah dan kotak parkir — satu draw call setiap jenis. */
export function destinationInstances() {
  const dest = DELIVERY_ZONES.filter((z) => z.type === "delivery");
  const bodies: Inst[] = [];
  const roofs: Inst[] = [];
  const doors: Inst[] = [];
  const lines: Inst[] = [];
  const pads: Inst[] = [];
  for (const z of dest) {
    if (z.lot) {
      const cz = z.lot.z + HOUSE.zOffset;
      bodies.push({ p: [z.lot.x, HOUSE.height / 2, cz] });
      roofs.push({ p: [z.lot.x, HOUSE.height + 0.6, cz], r: [0, Math.PI / 4, 0] });
      doors.push({ p: [z.lot.x, 1.2, cz + HOUSE.depth / 2 + 0.05] });
    }
    const b = z.parking;
    if (b) {
      const w = b.halfX * 2;
      const d = b.halfZ * 2;
      const flat: [number, number, number] = [-Math.PI / 2, 0, 0];
      lines.push({ p: [b.x, LINE_Y, b.z - b.halfZ], r: flat, s: [w, LINE, 1] });
      lines.push({ p: [b.x, LINE_Y, b.z + b.halfZ], r: flat, s: [w, LINE, 1] });
      lines.push({ p: [b.x - b.halfX, LINE_Y, b.z], r: flat, s: [LINE, d, 1] });
      lines.push({ p: [b.x + b.halfX, LINE_Y, b.z], r: flat, s: [LINE, d, 1] });
      pads.push({ p: [b.x, LINE_Y, b.z], r: flat, s: [1.2, 1.2, 1] });
    }
  }
  return { bodies, roofs, doors, lines, pads };
}

function fill(mesh: THREE.InstancedMesh | null, items: Inst[], colors?: string[]) {
  if (!mesh) return;
  items.forEach((it, i) => {
    tmp.position.set(...it.p);
    tmp.rotation.set(...(it.r ?? [0, 0, 0]));
    tmp.scale.set(...(it.s ?? [1, 1, 1]));
    tmp.updateMatrix();
    mesh.setMatrixAt(i, tmp.matrix);
    if (colors) mesh.setColorAt(i, tmpColor.set(colors[i % colors.length]));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/** Rumah alamat (menghadap +z) dan kotak parkir di jalan, dilukis dengan instancing. */
export function Destinations() {
  const inst = useMemo(() => destinationInstances(), []);
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const doorRef = useRef<THREE.InstancedMesh>(null);
  const lineRef = useRef<THREE.InstancedMesh>(null);
  const padRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    fill(bodyRef.current, inst.bodies, HOUSE_COLORS);
    fill(roofRef.current, inst.roofs);
    fill(doorRef.current, inst.doors);
    fill(lineRef.current, inst.lines);
    fill(padRef.current, inst.pads);
  }, [inst]);

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, inst.bodies.length]}>
        <boxGeometry args={[HOUSE.width, HOUSE.height, HOUSE.depth]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={roofRef} args={[undefined, undefined, inst.roofs.length]}>
        <coneGeometry args={[HOUSE.width * 0.75, 1.6, 4]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={doorRef} args={[undefined, undefined, inst.doors.length]}>
        <planeGeometry args={[1.4, 2.4]} />
        <meshStandardMaterial color="#5b3a1a" />
      </instancedMesh>
      <instancedMesh ref={lineRef} args={[undefined, undefined, inst.lines.length]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#e8e8f0" />
      </instancedMesh>
      <instancedMesh ref={padRef} args={[undefined, undefined, inst.pads.length]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#3b82f6" />
      </instancedMesh>
    </group>
  );
}
