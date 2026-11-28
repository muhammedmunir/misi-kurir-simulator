/**
 * Alat dev (bukan sebahagian permainan): tukar watak dan animasi Mixamo (FBX)
 * kepada GLB untuk three.js. Dijalankan dalam pelayar oleh tools/convert/run.mjs.
 *
 * - Watak: FBX "With Skin". Tekstur kurier ≤ 1024 px, penerima ≤ 512 px.
 * - Animasi: FBX "Without Skin"; klip dinamakan semula dan digabungkan ke watak.
 * - Output: satu GLB setiap watak, dengan semua klip permainan.
 */
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

import { simplifySkinned } from "./simplify-skinned";

const log = (m: string) => {
  const el = document.getElementById("log");
  if (el) el.textContent += `\n${m}`;
};

const SRC = "/assets-src/";
const CLIPS: Record<string, string> = {
  idle: "Idle.fbx",
  walk: "Walking.fbx",
  run: "Running.fbx",
  carry: "Carrying.fbx",
  pickup: "Picking Up.fbx",
  take: "Taking Item.fbx",
  drive: "Driving.fbx",
};
const MAX_TRIANGLES = 12000;

const loader = new FBXLoader();
const load = (file: string) => loader.loadAsync(SRC + encodeURIComponent(file));

function shrink(
  tex: THREE.Texture | null,
  maxSize: number,
  shrunk: Map<THREE.Texture, THREE.Texture>,
): THREE.Texture | null {
  if (!tex?.image) return tex;
  const hit = shrunk.get(tex);
  if (hit) return hit;
  const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap;
  const w = (img as HTMLImageElement).naturalWidth || img.width;
  const h = (img as HTMLImageElement).naturalHeight || img.height;
  if (!w || !h) return tex;
  const k = Math.min(1, maxSize / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  c.getContext("2d")?.drawImage(img as CanvasImageSource, 0, 0, c.width, c.height);
  const out = new THREE.CanvasTexture(c);
  out.flipY = tex.flipY;
  out.wrapS = tex.wrapS;
  out.wrapT = tex.wrapT;
  out.colorSpace = tex.colorSpace;
  out.userData.mimeType = "image/jpeg";
  shrunk.set(tex, out);
  return out;
}

/** Bahan Phong Mixamo → MeshStandardMaterial (warna + normal sahaja). */
function averageColor(texture: THREE.Texture): THREE.Color {
  const image = texture.image as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Konteks warna tekstur tidak tersedia");
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const linear = Array.from(
    { length: 256 },
    (_, i) =>
      THREE.ColorManagement.convert(
        new THREE.Color().setRGB(i / 255, 0, 0),
        THREE.SRGBColorSpace,
        THREE.LinearSRGBColorSpace,
      ).r,
  );
  let r = 0,
    g = 0,
    b = 0,
    sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    r += linear[data[i]] * a;
    g += linear[data[i + 1]] * a;
    b += linear[data[i + 2]] * a;
    sum += a;
  }
  return sum ? new THREE.Color(r / sum, g / sum, b / sum) : new THREE.Color(0xffffff);
}

// GLB menyimpan topeng alpha dalam saluran A baseColorTexture, bukan sebagai alphaMap berasingan.
function alphaTexture(alphaMap: THREE.Texture): THREE.Texture {
  const image = alphaMap.image as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Konteks topeng alpha tidak tersedia");
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    pixels.data[i + 3] = pixels.data[i + 1];
    pixels.data.fill(255, i, i + 3);
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = alphaMap.clone();
  texture.source = new THREE.Source(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.mimeType = "image/png";
  texture.needsUpdate = true;
  return texture;
}

function toStandard(
  m: THREE.Material,
  maxSize: number,
  shrunk: Map<THREE.Texture, THREE.Texture>,
  flat: boolean,
): THREE.Material {
  const p = m as THREE.MeshPhongMaterial;
  const map = flat ? null : shrink(p.map ?? null, maxSize, shrunk);
  if (map) map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    name: p.name,
    color: p.map ? (flat ? averageColor(p.map) : 0xffffff) : (p.color ?? new THREE.Color(0xcccccc)),
    map,
    normalMap: flat ? null : shrink(p.normalMap ?? null, maxSize, shrunk),
    alphaMap: shrink(p.alphaMap ?? null, maxSize, shrunk),
    alphaTest: p.alphaMap ? 0.45 : p.alphaTest,
    roughness: flat ? 0.9 : 0.8,
    flatShading: false,
    metalness: 0,
    side: p.alphaMap ? THREE.DoubleSide : p.side,
  });
}

async function convert(character: string, outName: string, { flat }: { flat: boolean }) {
  if (flat) outName = outName.replace(/\.glb$/, "-rata.glb");
  log(`watak ${character}…`);
  const root = await load(character);
  root.animations = [];
  // Tunggu semua tekstur terbenam selesai dimuat (FBXLoader memuatkannya secara
  // asinkron selepas loadAsync selesai) sebelum dikecilkan.
  const textures: THREE.Texture[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const p = m as THREE.MeshPhongMaterial;
      for (const t of [p.map, p.normalMap, p.alphaMap]) if (t) textures.push(t);
    }
  });
  const ready = () =>
    textures.every((t) => {
      const im = t.image as HTMLImageElement | undefined;
      return im && (im.naturalWidth || (im as unknown as { width: number }).width) > 0;
    });
  for (let i = 0; i < 300 && !ready(); i++) await new Promise((r) => setTimeout(r, 100));
  log(`  ${textures.length} tekstur sedia: ${ready()}`);
  // Nama tulang "mixamorig:Hips" → "mixamorigHips", sama dengan nama dalam trek klip.
  root.traverse((o) => {
    o.name = THREE.PropertyBinding.sanitizeNodeName(o.name);
  });
  const maxSize = outName.startsWith("receiver-") ? 512 : 1024;
  const shrunk = new Map<THREE.Texture, THREE.Texture>();
  const skinned: THREE.SkinnedMesh[] = [];
  const triangles = (g: THREE.BufferGeometry) => (g.getIndex()?.count ?? g.getAttribute("position").count) / 3;
  let fixedTriangles = 0;
  root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    const convertMaterial = (m: THREE.Material) => toStandard(m, maxSize, shrunk, flat);
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convertMaterial) : convertMaterial(mesh.material);
    if (mesh.isSkinnedMesh) skinned.push(mesh);
    else fixedTriangles += triangles(mesh.geometry);
  });
  const originalTriangles = skinned.reduce((sum, mesh) => sum + triangles(mesh.geometry), 0);
  const ratio = Math.min(1, (MAX_TRIANGLES - fixedTriangles) / originalTriangles);
  for (const mesh of skinned) {
    mesh.geometry = simplifySkinned(mesh.geometry, Math.floor(triangles(mesh.geometry) * ratio));
  }
  const finalTriangles = skinned.reduce((sum, mesh) => sum + triangles(mesh.geometry), fixedTriangles);
  if (finalTriangles > MAX_TRIANGLES) throw new Error(`${character}: ${finalTriangles} segi tiga melebihi bajet`);
  log(`  segi tiga: ${originalTriangles + fixedTriangles} → ${finalTriangles}`);
  const bones: string[] = [];
  const meshes: string[] = [];
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone && bones.length < 4) bones.push(o.name);
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      const mat = m.material as THREE.MeshStandardMaterial;
      const img = mat.map?.image as { width?: number; height?: number; constructor?: { name: string } } | undefined;
      meshes.push(
        `${m.name}: v=${m.geometry.attributes.position.count} map=${img ? `${img.constructor?.name} ${img.width}x${img.height}` : "tiada"}`,
      );
    }
  });
  log(`  tulang: ${bones.join(", ")}`);
  log(`  mesh: ${meshes.join(" | ")}`);
  // Awalan rangka berbeza antara watak (mixamorig, mixamorig2, …): kesan daripada
  // tulang Hips, kemudian namakan semula trek klip supaya sepadan.
  let prefix = "mixamorig";
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone && o.name.endsWith("Hips")) prefix = o.name.slice(0, -"Hips".length);
  });
  log(`  awalan rangka: ${prefix}`);
  for (const [name, file] of Object.entries(CLIPS)) {
    const anim = await load(file);
    const clip = anim.animations[0];
    if (!clip) throw new Error(`tiada klip dalam ${file}`);
    clip.name = name;
    for (const t of clip.tracks) t.name = t.name.replace(/^mixamorig\d*/, prefix);
    root.animations.push(clip);
    log(`  + ${name} (${clip.duration.toFixed(2)} s, ${clip.tracks.length} trek; ${clip.tracks[1]?.name})`);
  }
  if (flat) {
    const masks = new Map<THREE.Texture, THREE.Texture>();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const material of [mesh.material].flat() as THREE.MeshStandardMaterial[]) {
        if (!material.alphaMap) continue;
        let mask = masks.get(material.alphaMap);
        if (!mask) {
          mask = alphaTexture(material.alphaMap);
          masks.set(material.alphaMap, mask);
        }
        material.map = mask;
        material.alphaMap = null;
      }
    });
  }
  const exporter = new GLTFExporter();
  const glb = (await exporter.parseAsync(root, {
    binary: true,
    animations: root.animations,
    onlyVisible: true,
  })) as ArrayBuffer;
  const bytes = new Uint8Array(glb);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  log(`  = ${outName}: ${(bytes.length / 1024).toFixed(0)} KB`);
  return { name: outName, bytes: bytes.length, b64: btoa(bin) };
}

declare global {
  interface Window {
    __convert: typeof convert;
  }
}

window.__convert = convert;
log("sedia");
