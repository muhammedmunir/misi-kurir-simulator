import { useLayoutEffect } from "react";
import { InstancedMesh, Matrix4 } from "three";
import type { MergedModel } from "./merged-model";

const NO_OCCLUSION: readonly number[] = [];
let active = NO_OCCLUSION;
let activeHidden = NO_OCCLUSION;
const listeners = new Set<(hits: ReadonlySet<number>, hidden: ReadonlySet<number>) => void>();
const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((id, i) => id === b[i]);

/**
 * `indices`: halangan di antara mata dan kamera → dilukis lutsinar.
 * `hidden`: halangan yang MENGANDUNGI kamera → tidak dilukis langsung (lutsinar dari dalam
 * menjadi kabus hijau-kelabu yang menutup skrin).
 */
export function setCameraOcclusion(
  indices: readonly number[] = NO_OCCLUSION,
  hidden: readonly number[] = NO_OCCLUSION,
) {
  if (same(indices, active) && same(hidden, activeHidden)) return;
  active = indices;
  activeHidden = hidden;
  const hits = new Set(indices);
  const gone = new Set(hidden);
  for (const listener of listeners) listener(hits, gone);
}

/** Kongsi geometri kelompok legap; kelompok lutsinar hanya dilukis jika mempunyai instance. */
export function useOccludedInstances(
  meshes: { current: (InstancedMesh | null)[] },
  batches: readonly (readonly number[])[],
  models: readonly MergedModel[],
) {
  useLayoutEffect(() => {
    const cleanups = models.map(({ geometry }, i) => {
      const opaque = meshes.current[i];
      if (!opaque) return;
      const indices = batches[i];
      const matrices = indices.map((_, j) => {
        const matrix = new Matrix4();
        opaque.getMatrixAt(j, matrix);
        return matrix;
      });
      const material = Array.isArray(opaque.material) ? opaque.material[0] : opaque.material;
      const glass = material.clone();
      glass.onBeforeCompile = material.onBeforeCompile;
      glass.transparent = true;
      glass.opacity = 0.22;
      glass.depthWrite = false;
      const translucent = new InstancedMesh(geometry, glass, indices.length);
      translucent.boundingSphere = opaque.boundingSphere?.clone() ?? null;
      translucent.visible = false;
      translucent.count = 0;
      opaque.add(translucent);

      let previous = "";
      const update = (hits: ReadonlySet<number>, gone: ReadonlySet<number>) => {
        const key = indices.map((id) => (gone.has(id) ? "x" : hits.has(id) ? "g" : "o")).join("");
        if (key === previous) return;
        previous = key;

        let solidCount = 0;
        let glassCount = 0;
        matrices.forEach((matrix, j) => {
          if (gone.has(indices[j])) return;
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
      update(new Set(active), new Set(activeHidden));
      return () => {
        update(new Set(), new Set());
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
