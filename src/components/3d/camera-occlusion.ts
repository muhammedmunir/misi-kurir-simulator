import { useLayoutEffect } from "react";
import { InstancedMesh, Matrix4 } from "three";
import type { MergedModel } from "./merged-model";

const NO_OCCLUSION: readonly number[] = [];
let active = NO_OCCLUSION;
const listeners = new Set<(hits: ReadonlySet<number>) => void>();

export function setCameraOcclusion(indices: readonly number[] = NO_OCCLUSION) {
  if (indices.length === active.length && indices.every((id, i) => id === active[i])) return;
  active = indices;
  const hits = new Set(indices);
  for (const listener of listeners) listener(hits);
}

/** Kongsi geometri kelompok legap; kelompok lutsinar hanya dilukis jika mempunyai instance. */
export function useOccludedInstances(
  meshes: { current: (InstancedMesh | null)[] },
  batches: readonly (readonly number[])[],
  models: readonly MergedModel[],
) {
  useLayoutEffect(() => {
    const cleanups = models.map(({ geometry, material }, i) => {
      const opaque = meshes.current[i];
      if (!opaque) return;
      const indices = batches[i];
      const matrices = indices.map((_, j) => {
        const matrix = new Matrix4();
        opaque.getMatrixAt(j, matrix);
        return matrix;
      });
      const glass = material.clone();
      glass.transparent = true;
      glass.opacity = 0.22;
      glass.depthWrite = false;
      const translucent = new InstancedMesh(geometry, glass, indices.length);
      translucent.boundingSphere = opaque.boundingSphere?.clone() ?? null;
      translucent.visible = false;
      translucent.count = 0;
      opaque.add(translucent);

      let previous: number[] = [];
      const update = (hits: ReadonlySet<number>) => {
        const hidden = indices.filter((id) => hits.has(id));
        if (hidden.length === previous.length && hidden.every((id, j) => id === previous[j])) return;
        previous = hidden;

        let solidCount = 0;
        let glassCount = 0;
        matrices.forEach((matrix, j) => {
          if (hits.has(indices[j])) translucent.setMatrixAt(glassCount++, matrix);
          else opaque.setMatrixAt(solidCount++, matrix);
        });
        opaque.count = solidCount;
        opaque.instanceMatrix.needsUpdate = true;
        translucent.count = glassCount;
        translucent.visible = glassCount > 0;
        if (glassCount > 0) translucent.instanceMatrix.needsUpdate = true;
      };
      listeners.add(update);
      update(new Set(active));
      return () => {
        update(new Set());
        listeners.delete(update);
        opaque.remove(translucent);
        translucent.dispose();
        glass.dispose();
      };
    });
    return () => {
      for (const cleanup of cleanups) cleanup?.();
    };
  }, [batches, meshes, models]);
}
