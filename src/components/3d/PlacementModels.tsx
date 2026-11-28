import { useLayoutEffect, useRef } from "react";
import { type InstancedMesh, Matrix4 } from "three";
import { useOccludedInstances } from "./camera-occlusion";
import type { Placement } from "./city-blocks";
import { fitMatrix, useMergedModels, windowMaterial } from "./merged-model";

export function batchPlacements(placements: readonly Placement[], firstObstacle?: number) {
  const byModel = new Map<string, { placements: Placement[]; obstacles: number[] }>();
  let obstacle = firstObstacle ?? -1;
  for (const p of placements) {
    let batch = byModel.get(p.model);
    if (!batch) {
      batch = { placements: [], obstacles: [] };
      byModel.set(p.model, batch);
    }
    batch.placements.push(p);
    if (firstObstacle !== undefined && p.solid && p.h >= 2) batch.obstacles.push(obstacle++);
  }
  const batches = [...byModel];
  return {
    batches,
    urls: batches.map(([model]) => `/models/${model}.glb`),
    obstacles: batches.map(([, batch]) => batch.obstacles),
  };
}

export function PlacementModels({ data }: { data: ReturnType<typeof batchPlacements> }) {
  const { batches, urls, obstacles } = data;
  const models = useMergedModels(urls);
  const meshes = useRef<(InstancedMesh | null)[]>([]);
  const occluders = useRef<(InstancedMesh | null)[]>([]);

  useLayoutEffect(() => {
    const matrix = new Matrix4();
    batches.forEach(([model, batch], i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      batch.placements.forEach((p, j) => {
        fitMatrix(models[i].box, p, matrix);
        if (model.endsWith("/detail-awning-wide")) matrix.elements[13] += 2.65;
        mesh.setMatrixAt(j, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [batches, models]);

  useOccludedInstances(occluders, obstacles, models);

  return batches.map(([model, batch], i) => (
    <instancedMesh
      key={model}
      name={model}
      ref={(mesh) => {
        meshes.current[i] = mesh;
        if (obstacles[i].length) occluders.current[i] = mesh;
      }}
      args={[
        models[i].geometry,
        model.startsWith("city-kit-suburban/building-type-") ? windowMaterial(models[i].material) : models[i].material,
        batch.placements.length,
      ]}
      userData={obstacles[i].length ? undefined : { noShadow: true }}
      castShadow={obstacles[i].length > 0}
      receiveShadow={obstacles[i].length > 0}
    />
  ));
}
