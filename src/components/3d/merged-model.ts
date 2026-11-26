/**
 * Pemuat model statik Kenney untuk instancing: semua mesh dalam satu GLB
 * digabungkan menjadi SATU geometri (dalam ruang model), dengan bahan
 * `colormap` pek itu. Satu InstancedMesh setiap jenis model = satu draw call.
 */
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type MergedModel = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** Kotak sempadan geometri (unit model asal). */
  box: THREE.Box3;
};

const cache = new WeakMap<THREE.Object3D, MergedModel>();

function mergeScene(scene: THREE.Object3D): MergedModel {
  const hit = cache.get(scene);
  if (hit) return hit;
  scene.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];
  let material: THREE.Material | null = null;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    // Sama atribut untuk semua bahagian (tangen tidak diperlukan oleh bahan standard).
    for (const name of Object.keys(g.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
    }
    parts.push(g.index ? g.toNonIndexed() : g);
    material ??= Array.isArray(m.material) ? m.material[0] : m.material;
  });
  const geometry = parts.length === 1 ? parts[0] : (mergeGeometries(parts, false) ?? parts[0]);
  geometry.computeBoundingBox();
  const merged: MergedModel = {
    geometry,
    material: material ?? new THREE.MeshStandardMaterial(),
    box: geometry.boundingBox?.clone() ?? new THREE.Box3(),
  };
  cache.set(scene, merged);
  return merged;
}

/** Muat beberapa GLB dan gabungkan setiap satu. Menggantung (Suspense) sehingga dimuat. */
export function useMergedModels(urls: readonly string[]): MergedModel[] {
  const gltfs = useGLTF(urls as string[]);
  const list = Array.isArray(gltfs) ? gltfs : [gltfs];
  return useMemo(() => list.map((g) => mergeScene(g.scene)), [list]);
}

const tmp = new THREE.Object3D();

/**
 * Matriks instance yang meletakkan model supaya kotak sempadannya tepat
 * memenuhi (w, h, d) dengan tapak di y = 0, berpusat pada (x, z), diputar `rotY`.
 */
export function fitMatrix(
  box: THREE.Box3,
  target: { x: number; z: number; w: number; h: number; d: number; rotY?: number },
  out = new THREE.Matrix4(),
): THREE.Matrix4 {
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const sx = target.w / Math.max(size.x, 1e-6);
  const sy = target.h / Math.max(size.y, 1e-6);
  const sz = target.d / Math.max(size.z, 1e-6);
  // Anjakan supaya pusat XZ model di asalan dan tapaknya di y = 0 (sebelum putaran).
  const pre = new THREE.Matrix4().makeTranslation(-centre.x, -box.min.y, -centre.z);
  tmp.position.set(target.x, 0, target.z);
  tmp.rotation.set(0, target.rotY ?? 0, 0);
  tmp.scale.set(sx, sy, sz);
  tmp.updateMatrix();
  return out.multiplyMatrices(tmp.matrix, pre);
}
