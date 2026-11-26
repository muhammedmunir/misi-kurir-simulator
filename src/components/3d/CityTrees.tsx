import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { emptyLotTrees } from "./kenney-building-model";
import { fitMatrix, useMergedModels } from "./merged-model";

const trees = emptyLotTrees();
const groups = (["tree-large", "tree-small"] as const).map((model) => trees.filter((tree) => tree.model === model));
const urls = ["/models/city-kit-suburban/tree-large.glb", "/models/city-kit-suburban/tree-small.glb"];

export function CityTrees() {
  const models = useMergedModels(urls);
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    groups.forEach((group, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      group.forEach((tree, j) => mesh.setMatrixAt(j, fitMatrix(models[i].box, tree, matrix)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [models]);

  return models.map(({ geometry, material }, i) => (
    <instancedMesh
      key={urls[i]}
      ref={(mesh) => {
        meshes.current[i] = mesh;
      }}
      args={[geometry, material, groups[i].length]}
    />
  ));
}
