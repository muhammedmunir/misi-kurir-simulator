import { Suspense, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useOccludedInstances } from "./camera-occlusion";
import { type BuildingLot, buildingLayout } from "./city-layout";
import { commercialBuildingModel } from "./kenney-building-model";
import { fitMatrix, useMergedModels, windowMaterial } from "./merged-model";

const lotsByModel = new Map<string, (BuildingLot & { obstacle: number })[]>();
buildingLayout().forEach((lot, i) => {
  const name = commercialBuildingModel(lot.height, i);
  const lots = lotsByModel.get(name);
  const instance = { ...lot, obstacle: i };
  if (lots) lots.push(instance);
  else lotsByModel.set(name, [instance]);
});
const batches = Array.from(lotsByModel);
const obstacles = batches.map(([, lots]) => lots.map(({ obstacle }) => obstacle));
const urls = batches.map(([name]) => `/models/city-kit-commercial/${name}.glb`);

function CommercialBuildings() {
  const models = useMergedModels(urls);
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    batches.forEach(([, lots], i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      lots.forEach(({ x, z, width: w, height: h, depth: d }, j) => {
        mesh.setMatrixAt(j, fitMatrix(models[i].box, { x, z, w, h, d }, matrix));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [models]);
  useOccludedInstances(meshes, obstacles, models);

  return batches.map(([name, lots], i) => (
    <instancedMesh
      key={name}
      ref={(mesh) => {
        meshes.current[i] = mesh;
      }}
      args={[models[i].geometry, windowMaterial(models[i].material), lots.length]}
    />
  ));
}

export function Buildings() {
  return (
    <Suspense fallback={null}>
      <CommercialBuildings />
    </Suspense>
  );
}
