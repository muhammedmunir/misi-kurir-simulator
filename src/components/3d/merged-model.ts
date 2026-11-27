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

const windowMasks = new WeakMap<object, THREE.CanvasTexture>();
const windowMaterials = new WeakMap<THREE.MeshStandardMaterial, THREE.MeshStandardMaterial>();
const windowNight = { value: 0 };

export function setWindowNight(lampsOn: boolean) {
  windowNight.value = lampsOn ? 1 : 0;
}

function windowMask(map: THREE.Texture): THREE.CanvasTexture | null {
  const image = map.image as HTMLImageElement | ImageBitmap | undefined;
  if (!image?.width || !image.height) return null;
  const hit = windowMasks.get(image);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // Jalur kaca dalam atlas Kenney. Biru di jalur lain turut digunakan pada dinding.
  for (let i = 0; i < pixels.data.length; i += 4) {
    const u = ((i / 4) % canvas.width) / canvas.width;
    const r = pixels.data[i];
    const g = pixels.data[i + 1];
    const b = pixels.data[i + 2];
    const glass = u >= 0.625 && u < 0.75 && b > g + 8 && b > r + 25;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = glass ? 255 : 0;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const mask = new THREE.CanvasTexture(canvas);
  mask.flipY = map.flipY;
  mask.magFilter = map.magFilter;
  mask.minFilter = map.minFilter;
  windowMasks.set(image, mask);
  return mask;
}

function compileWindows(shader: Parameters<THREE.Material["onBeforeCompile"]>[0]) {
  shader.uniforms.windowNight = windowNight;
  shader.vertexShader = `varying float vWindowOn;\n${shader.vertexShader}`.replace(
    "#include <begin_vertex>",
    `#include <begin_vertex>
    #ifdef USE_INSTANCING
      vec2 cell = floor(instanceMatrix[3].xz + 0.5);
      vWindowOn = step(0.7, fract(dot(cell, vec2(0.754877, 0.569841))));
    #else
      vWindowOn = 0.0;
    #endif`,
  );
  shader.fragmentShader = `uniform float windowNight;\nvarying float vWindowOn;\n${shader.fragmentShader}`.replace(
    "#include <emissivemap_fragment>",
    `totalEmissiveRadiance *= windowNight * vWindowOn;
    #include <emissivemap_fragment>`,
  );
}

export function windowMaterial(material: THREE.Material): THREE.Material {
  if (!(material instanceof THREE.MeshStandardMaterial) || !material.map) return material;
  const hit = windowMaterials.get(material);
  if (hit) return hit;
  const mask = windowMask(material.map);
  if (!mask) return material;
  const lit = material.clone();
  lit.emissive.set("#ffcb81");
  lit.emissiveMap = mask;
  lit.emissiveIntensity = 0.75;
  lit.onBeforeCompile = compileWindows;
  windowMaterials.set(material, lit);
  return lit;
}
