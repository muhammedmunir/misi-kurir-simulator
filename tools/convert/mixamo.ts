/**
 * Alat dev (bukan sebahagian permainan): tukar watak dan animasi Mixamo (FBX)
 * kepada GLB untuk three.js. Dijalankan dalam pelayar oleh tools/convert/run.mjs.
 *
 * - Watak: FBX "With Skin". Tekstur dikecilkan ke ≤ 1024 px (telefon).
 * - Animasi: FBX "Without Skin"; klip dinamakan semula dan digabungkan ke watak.
 * - Output: satu GLB setiap watak, dengan semua klip permainan.
 */
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

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
const MAX_TEX = 1024;

const loader = new FBXLoader();
const load = (file: string) => loader.loadAsync(SRC + encodeURIComponent(file));

const shrunk = new Map<THREE.Texture, THREE.Texture>();

function shrink(tex: THREE.Texture | null): THREE.Texture | null {
  if (!tex?.image) return tex;
  const hit = shrunk.get(tex);
  if (hit) return hit;
  const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap;
  const w = (img as HTMLImageElement).naturalWidth || img.width;
  const h = (img as HTMLImageElement).naturalHeight || img.height;
  if (!w || !h) return tex;
  const k = Math.min(1, MAX_TEX / Math.max(w, h));
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
function toStandard(m: THREE.Material): THREE.Material {
  const p = m as THREE.MeshPhongMaterial;
  const map = shrink(p.map ?? null);
  if (map) map.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.MeshStandardMaterial({
    name: p.name,
    color: p.map ? 0xffffff : (p.color ?? new THREE.Color(0xcccccc)),
    map,
    normalMap: shrink(p.normalMap ?? null),
    // Rambut dan bulu mata: peta lutsinar dengan alphaTest (tiada isih lutsinar, murah untuk telefon).
    alphaMap: shrink(p.alphaMap ?? null),
    alphaTest: p.alphaMap ? 0.45 : 0,
    roughness: 0.8,
    metalness: 0,
    side: p.alphaMap ? THREE.DoubleSide : p.side,
  });
  return s;
}

async function convert(character: string, outName: string): Promise<{ name: string; bytes: number; b64: string }> {
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
  root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(toStandard) : toStandard(mesh.material);
  });
  const bones: string[] = [];
  const meshes: string[] = [];
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone && bones.length < 4) bones.push(o.name);
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      const mat = m.material as THREE.MeshStandardMaterial;
      const img = mat.map?.image as { width?: number; height?: number; constructor?: { name: string } } | undefined;
      meshes.push(`${m.name}: v=${m.geometry.attributes.position.count} map=${img ? `${img.constructor?.name} ${img.width}x${img.height}` : "tiada"}`);
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
    __convert: (jobs: [string, string][]) => Promise<{ name: string; bytes: number; b64: string }[]>;
  }
}

window.__convert = async (jobs) => {
  const out = [];
  for (const [c, n] of jobs) out.push(await convert(c, n));
  return out;
};
log("sedia");
