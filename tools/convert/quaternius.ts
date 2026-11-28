import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone, retargetClip } from "three/examples/jsm/utils/SkeletonUtils.js";
import { RIG_BONES } from "../../src/components/3d/character-style";
import { simplifySkinned } from "./simplify-skinned";

const DIR = "/assets-src/quaternius/";
const BASE = "base-characters/Universal Base Characters[Standard]/";
const loader = new GLTFLoader();
const load = (path: string) => loader.loadAsync(DIR + path.split("/").map(encodeURIComponent).join("/"));
const library = () => load("animation-library/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb");
const MAX_TRIANGLES = 12000;
const outfits = {
  courier: { female: false, hair: "Buzzed", shirt: 0xf59e0b, pants: 0x1d3a8a, skin: 0xb07a52 },
  "receiver-f": { female: true, hair: "Buns", shirt: 0x2f7d6d, pants: 0x213b34, skin: 0xc68e63 },
  "receiver-m": { female: false, hair: "SimpleParted", shirt: 0x3b5b92, pants: 0x353940, skin: 0xc68e63 },
};
type Outfit = (typeof outfits)[keyof typeof outfits];

function meshes(root: THREE.Object3D): THREE.SkinnedMesh[] {
  const out: THREE.SkinnedMesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) out.push(o);
  });
  return out;
}

function triangles(mesh: THREE.Mesh): number {
  return (mesh.geometry.getIndex()?.count ?? mesh.geometry.getAttribute("position").count) / 3;
}

function paint(mesh: THREE.SkinnedMesh, outfit: Outfit) {
  const g = mesh.geometry;
  const ids = g.getAttribute("skinIndex");
  const weights = g.getAttribute("skinWeight");
  const colors = new Float32Array(ids.count * 3);
  const shirt = new THREE.Color(outfit.shirt);
  const pants = new THREE.Color(outfit.pants);
  const shoes = new THREE.Color(0x191b20);
  const skin = new THREE.Color(outfit.skin);
  for (let i = 0; i < ids.count; i++) {
    let dominant = 0;
    for (let j = 1; j < 4; j++) if (weights.getComponent(i, j) > weights.getComponent(i, dominant)) dominant = j;
    const bone = mesh.skeleton.bones[ids.getComponent(i, dominant)].name;
    const color = /^(foot|ball)_/.test(bone)
      ? shoes
      : /^(pelvis$|thigh_|calf_)/.test(bone)
        ? pants
        : /^(spine|clavicle|upperarm)_/.test(bone) || (outfit.female && /^lowerarm_/.test(bone))
          ? shirt
          : skin;
    color.toArray(colors, i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  mesh.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
}

function addHair(scene: THREE.Object3D, body: THREE.SkinnedMesh, hair: THREE.SkinnedMesh) {
  const parent = body.parent;
  if (!parent) throw new Error("Tiada induk untuk rangka rambut");
  const bones = hair.skeleton.bones.map(({ name }) => {
    const bone = body.skeleton.getBoneByName(name);
    if (!bone) throw new Error(`Tulang rambut tidak sepadan: ${name}`);
    return bone;
  });
  const skeleton = new THREE.Skeleton(bones, hair.skeleton.boneInverses);
  parent.add(hair);
  hair.bind(skeleton, hair.bindMatrix);
  scene.updateMatrixWorld(true);
}

function fromUAL(clip: THREE.AnimationClip, name: string, source: THREE.SkinnedMesh, target: THREE.SkinnedMesh) {
  const tracks = clip.tracks.flatMap((original) => {
    const { nodeName, propertyName } = THREE.PropertyBinding.parseTrackName(original.name);
    if (!nodeName) return [];
    const src = source.skeleton.getBoneByName(nodeName);
    const dst = target.skeleton.getBoneByName(nodeName);
    if (!src || !dst || nodeName === "root") return [];
    const track = original.clone();
    if (propertyName === "quaternion") {
      const q = new THREE.Quaternion();
      const offset = dst.quaternion.clone().multiply(src.quaternion.clone().invert());
      for (let i = 0; i < track.values.length; i += 4)
        q.fromArray(track.values, i).premultiply(offset).toArray(track.values, i);
      return [track];
    }
    if (propertyName !== "position" || nodeName !== RIG_BONES.quaternius.hips) return [];
    const v = new THREE.Vector3();
    for (let i = 0; i < track.values.length; i += 3)
      v.fromArray(track.values, i).sub(src.position).add(dst.position).toArray(track.values, i);
    return [track];
  });
  return new THREE.AnimationClip(name, clip.duration, tracks).optimize();
}

async function fromMixamo(file: string, target: THREE.SkinnedMesh) {
  const fbx = new FBXLoader();
  const source = await fbx.loadAsync(`/assets-src/${encodeURIComponent(file)}`);
  const clip = source.animations[0];
  const joints: THREE.Bone[] = [];
  source.traverse((o) => {
    if (o instanceof THREE.Bone) joints.push(o);
  });
  const prefix = /^(mixamorig\d*:?)(?:Hips)$/.exec(joints.find((o) => /Hips$/.test(o.name))?.name ?? "")?.[1];
  if (!clip || !prefix) throw new Error(`Tiada klip atau rangka Mixamo dalam ${file}`);
  const riggedSource = Object.assign(source, { skeleton: new THREE.Skeleton(joints) });
  const { mixamo, quaternius } = RIG_BONES;
  const roles = Object.keys(quaternius) as (keyof typeof quaternius)[];
  const names = Object.fromEntries(roles.map((role) => [quaternius[role], prefix + mixamo[role]]));
  Object.assign(names, {
    spine_03: `${prefix}Spine2`,
    neck_01: `${prefix}Neck`,
    Head: `${prefix}Head`,
    clavicle_l: `${prefix}LeftShoulder`,
    clavicle_r: `${prefix}RightShoulder`,
  });
  const available = (bone: string) => riggedSource.skeleton.getBoneByName(names[bone]);
  if (roles.some((role) => !available(quaternius[role]))) throw new Error("Rantai Mixamo tidak lengkap");
  const bind = target.skeleton.bones.map(
    (bone) => [bone, bone.position.clone(), bone.quaternion.clone(), bone.scale.clone()] as const,
  );
  try {
    const sourceHips = available(quaternius.hips);
    if (!sourceHips) throw new Error("Tiada pinggul Mixamo");
    riggedSource.updateMatrixWorld(true);
    target.updateWorldMatrix(true, true);
    const offsets: Record<string, THREE.Matrix4> = {};
    const rotation = new THREE.Quaternion();
    const targetRotation = new THREE.Quaternion();
    for (const bone of target.skeleton.bones) {
      const srcBone = available(bone.name);
      if (!srcBone) continue;
      srcBone.getWorldQuaternion(rotation).invert().multiply(bone.getWorldQuaternion(targetRotation));
      offsets[bone.name] = new THREE.Matrix4().makeRotationFromQuaternion(rotation);
    }
    const result = retargetClip(target, riggedSource, clip, {
      names,
      localOffsets: offsets,
      hip: sourceHips.name,
      hipInfluence: new THREE.Vector3(0, 0, 0),
      fps: 24,
    });
    // Untuk carry, badan kekal pada ketinggian asal dan kaki tidak perlu menjejak FBX.
    result.tracks = result.tracks.filter(
      (t) =>
        /^\.bones\[(?:spine_|neck_|Head|clavicle_|upperarm_|lowerarm_|hand_)/.test(t.name) &&
        t.name.endsWith(".quaternion"),
    );
    for (const t of result.tracks) t.name = t.name.replace(/^\.bones\[([^\]]+)\]/, "$1");
    if (!result.tracks.length || result.tracks.some((t) => t.values.some((value) => !Number.isFinite(value)))) {
      throw new Error("Trek retarget tidak sah");
    }
    return result;
  } finally {
    for (const [bone, p, q, s] of bind) {
      bone.position.copy(p);
      bone.quaternion.copy(q);
      bone.scale.copy(s);
    }
    target.updateWorldMatrix(true, true);
  }
}

const clothes = document.getElementById("log");
async function convert(name: keyof typeof outfits) {
  const outfit = outfits[name];
  const gender = outfit.female ? "Female" : "Male";
  const [{ scene }, header, ual] = await Promise.all([
    load(`${BASE}Base Characters/Godot - UE/Superhero_${gender}_FullBody.gltf`),
    load(`${BASE}Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/Hair_${outfit.hair}.gltf`),
    library(),
  ]);
  const parts = meshes(scene);
  const body = parts.find((mesh) => /superhero/i.test(mesh.name));
  const hair = meshes(header.scene)[0];
  const mannequin = meshes(ual.scene)[0];
  if (!body || !hair || !mannequin) throw new Error(`Aset rig tidak lengkap: ${name}`);
  const missing = Object.values(RIG_BONES.quaternius).filter((bone) => !body.skeleton.getBoneByName(bone));
  if (missing.length)
    throw new Error(
      `Peranan IK tiada: ${missing.join(", ")}; wujud: ${body.skeleton.bones.map((b) => b.name).join(", ")}`,
    );
  addHair(scene, body, hair);
  parts.push(hair);
  const before = parts.reduce((n, mesh) => n + triangles(mesh), 0);
  const ratio = Math.min(1, MAX_TRIANGLES / before);
  for (const mesh of parts) {
    mesh.geometry.deleteAttribute("tangent");
    mesh.geometry.deleteAttribute("uv");
    mesh.geometry = simplifySkinned(mesh.geometry, Math.floor(triangles(mesh) * ratio));
    if (mesh === body) paint(mesh, outfit);
    else if (mesh.name === "Eyes") {
      // Tekstur mata dikekalkan untuk iris; had 512 px diperiksa sebelum eksport.
      const map = (mesh.material as THREE.MeshStandardMaterial).map;
      if (map && Math.max(map.image.width, map.image.height) > 512) {
        const c = document.createElement("canvas");
        const ratio = 512 / Math.max(map.image.width, map.image.height);
        c.width = Math.max(1, Math.round(map.image.width * ratio));
        c.height = Math.max(1, Math.round(map.image.height * ratio));
        c.getContext("2d")?.drawImage(map.image, 0, 0, c.width, c.height);
        map.source = new THREE.Source(c);
        map.needsUpdate = true;
      }
      // GLTFLoader memerlukan koordinat UV asal untuk mata.
      const original = parts.find((part) => part === mesh);
      void original;
      mesh.material = new THREE.MeshStandardMaterial({ color: 0x282321, roughness: 0.55 });
    } else mesh.material = new THREE.MeshStandardMaterial({ color: 0x2b211e, roughness: 0.92 });
  }
  const after = parts.reduce((n, mesh) => n + triangles(mesh), 0);
  if (after > MAX_TRIANGLES) throw new Error(`${name}: ${after} segi tiga melebihi bajet`);

  const mapping = {
    idle: "Idle_Loop",
    walk: "Walk_Loop",
    run: "Sprint_Loop",
    carry: "Push_Loop",
    pickup: "PickUp_Table",
    take: "Interact",
    drive: "Driving_Loop",
  };
  const animations = Object.entries(mapping).map(([dest, src]) => {
    const clip = ual.animations.find((a) => a.name === src);
    if (!clip) throw new Error(`Tiada klip UAL: ${src}`);
    return fromUAL(clip, dest, mannequin, body);
  });
  const fallbacks = ["take: Interact (UAL; gerak menerima terdekat)"];
  try {
    const target = meshes(clone(scene)).find((mesh) => mesh.name === body.name);
    if (!target) throw new Error("Salinan rig tidak tersedia");
    const carry = await fromMixamo("Carrying.fbx", target);
    const base = animations.find((a) => a.name === "idle");
    if (!base) throw new Error("Klip idle tiada");
    const names = new Set(carry.tracks.map((t) => t.name));
    const index = animations.findIndex((a) => a.name === "carry");
    animations[index] = new THREE.AnimationClip("carry", carry.duration, [
      ...base.tracks.filter((t) => !names.has(t.name)).map((t) => t.clone()),
      ...carry.tracks,
    ]).optimize();
    fallbacks.push("carry: Carrying.fbx (retarget Mixamo; jangan edar sebagai CC0)");
  } catch (error) {
    fallbacks.push(`carry: Push_Loop (UAL; ${String(error)})`);
  }
  // `take` juga tiada dalam UAL; cuba sumber Mixamo sebelum menerima pengganti.
  try {
    const target = meshes(clone(scene)).find((mesh) => mesh.name === body.name);
    if (!target) throw new Error("Salinan rig tidak tersedia");
    const take = await fromMixamo("Taking Item.fbx", target);
    const index = animations.findIndex((a) => a.name === "take");
    const names = new Set(take.tracks.map((t) => t.name));
    animations[index] = new THREE.AnimationClip("take", take.duration, [
      ...animations[index].tracks.filter((t) => !names.has(t.name)),
      ...take.tracks,
    ]).optimize();
    fallbacks[0] = "take: Taking Item.fbx (retarget Mixamo; jangan edar sebagai CC0)";
  } catch (error) {
    fallbacks[0] += `; ${String(error)}`;
  }
  const output = (await new GLTFExporter().parseAsync(scene, { binary: true, animations })) as ArrayBuffer;
  const bytes = new Uint8Array(output);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  if (clothes) clothes.textContent += `\n${name}: glTF + GLB, ${before} → ${after} segi tiga; ${fallbacks.join("; ")}`;
  return { name: `${name}.glb`, bytes: bytes.length, b64: btoa(binary) };
}

declare global {
  interface Window {
    __convertQuaternius: typeof convert;
  }
}
window.__convertQuaternius = convert;
