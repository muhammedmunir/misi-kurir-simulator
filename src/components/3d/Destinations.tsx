import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { Suspense, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useOccludedInstances } from "./camera-occlusion";
import { buildingLayout } from "./city-layout";
import { destinationHouses } from "./kenney-building-model";
import { fitMatrix, useMergedModels } from "./merged-model";

const LINE = 0.15;
const LINE_Y = 0.09;
const tmp = new THREE.Object3D();

type Inst = { p: [number, number, number]; r: [number, number, number]; s: [number, number, number] };

export function destinationInstances() {
  const lines: Inst[] = [];
  const pads: Inst[] = [];
  for (const z of DELIVERY_ZONES) {
    if (z.type !== "delivery") continue;
    const b = z.parking;
    if (!b) continue;
    const w = b.halfX * 2;
    const d = b.halfZ * 2;
    const flat: [number, number, number] = [-Math.PI / 2, 0, 0];
    lines.push({ p: [b.x, LINE_Y, b.z - b.halfZ], r: flat, s: [w, LINE, 1] });
    lines.push({ p: [b.x, LINE_Y, b.z + b.halfZ], r: flat, s: [w, LINE, 1] });
    lines.push({ p: [b.x - b.halfX, LINE_Y, b.z], r: flat, s: [LINE, d, 1] });
    lines.push({ p: [b.x + b.halfX, LINE_Y, b.z], r: flat, s: [LINE, d, 1] });
    pads.push({ p: [b.x, LINE_Y, b.z], r: flat, s: [1.2, 1.2, 1] });
  }
  return { bodies: destinationHouses(), lines, pads };
}

const { bodies, lines, pads } = destinationInstances();
const housesByModel = new Map<string, ((typeof bodies)[number] & { obstacle: number })[]>();
const firstHouseObstacle = buildingLayout().length;
bodies.forEach((house, i) => {
  const houses = housesByModel.get(house.model);
  const instance = { ...house, obstacle: firstHouseObstacle + i };
  if (houses) houses.push(instance);
  else housesByModel.set(house.model, [instance]);
});
const batches = Array.from(housesByModel);
const obstacles = batches.map(([, houses]) => houses.map(({ obstacle }) => obstacle));
const urls = batches.map(([name]) => `/models/city-kit-suburban/${name}.glb`);

function AddressHouses() {
  const models = useMergedModels(urls);
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    batches.forEach(([, houses], i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      houses.forEach((house, j) => {
        mesh.setMatrixAt(j, fitMatrix(models[i].box, house, matrix));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [models]);
  useOccludedInstances(meshes, obstacles, models);

  return batches.map(([name, houses], i) => (
    <instancedMesh
      key={name}
      ref={(mesh) => {
        meshes.current[i] = mesh;
      }}
      args={[models[i].geometry, models[i].material, houses.length]}
    />
  ));
}

function fill(mesh: THREE.InstancedMesh | null, items: Inst[]) {
  if (!mesh) return;
  items.forEach((it, i) => {
    tmp.position.set(...it.p);
    tmp.rotation.set(...it.r);
    tmp.scale.set(...it.s);
    tmp.updateMatrix();
    mesh.setMatrixAt(i, tmp.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

export function Destinations() {
  const lineRef = useRef<THREE.InstancedMesh>(null);
  const padRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    fill(lineRef.current, lines);
    fill(padRef.current, pads);
  }, []);

  return (
    <group>
      <Suspense fallback={null}>
        <AddressHouses />
      </Suspense>
      <instancedMesh ref={lineRef} args={[undefined, undefined, lines.length]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#e8e8f0" />
      </instancedMesh>
      <instancedMesh ref={padRef} args={[undefined, undefined, pads.length]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#3b82f6" />
      </instancedMesh>
    </group>
  );
}
