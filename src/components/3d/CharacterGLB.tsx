import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

/**
 * Watak realistik Mixamo (ditukar ke GLB oleh tools/convert). Semua watak
 * berkongsi klip yang sama: idle, walk, run, carry, pickup, take, drive.
 */
export const CHARACTER_URL = {
  courier: "/models/mixamo/courier.glb",
  receiverF: "/models/mixamo/receiver-f.glb",
  receiverM: "/models/mixamo/receiver-m.glb",
} as const;

export type CharacterKey = keyof typeof CHARACTER_URL;

/** Klip animasi. `carryWalk` dijana: kaki dari `walk`, badan/tangan dari `carry`. */
export type Clip = "idle" | "walk" | "run" | "carry" | "carryWalk" | "pickup" | "take" | "drive";

const TARGET_HEIGHT = 1.75;
const FADE = 0.25;
/** Tulang bahagian atas badan (nama Mixamo, tanpa awalan). */
const UPPER = /(Spine|Neck|Head|Shoulder|Arm|Hand|Thumb|Index|Middle|Ring|Pinky)/;

/**
 * Gabungkan dua klip: trek bahagian atas badan daripada `upper`, selebihnya
 * daripada `lower`. Dipakai untuk berjalan sambil memegang kotak.
 */
export function layeredClip(name: string, lower: THREE.AnimationClip, upper: THREE.AnimationClip): THREE.AnimationClip {
  const isUpper = (track: string) => UPPER.test(track.split(".")[0]);
  const tracks = [
    ...lower.tracks.filter((t) => !isUpper(t.name)).map((t) => t.clone()),
    ...upper.tracks.filter((t) => isUpper(t.name)).map((t) => t.clone()),
  ];
  return new THREE.AnimationClip(name, lower.duration, tracks);
}

/**
 * Klip dirakam pada Remy. Untuk watak lain (perkadaran berbeza), trek kedudukan
 * pinggul menyebabkan watak terapung atau tenggelam, jadi hanya putaran dikekalkan.
 */
export function retargetClips(animations: THREE.AnimationClip[], keepHipsPosition: boolean): THREE.AnimationClip[] {
  const clips = keepHipsPosition
    ? animations
    : animations.map(
        (a) =>
          new THREE.AnimationClip(
            a.name,
            a.duration,
            a.tracks.filter((t) => !/Hips\.position$/.test(t.name)),
          ),
      );
  const walk = clips.find((a) => a.name === "walk");
  const carry = clips.find((a) => a.name === "carry");
  if (!walk || !carry) return clips;
  return [...clips, layeredClip("carryWalk", walk, carry)];
}

/**
 * Satu watak beranimasi. `clip` boleh berubah setiap render, atau `pickClip`
 * dipanggil setiap frame (tanpa render semula React) untuk memilih klip.
 */
export function CharacterGLB({
  model,
  clip = "idle",
  pickClip,
  timeScale,
  beforeAnimate,
  afterAnimate,
}: {
  model: CharacterKey;
  clip?: Clip;
  pickClip?: () => { clip: Clip; timeScale?: number };
  timeScale?: number;
  beforeAnimate?: () => void;
  afterAnimate?: (root: THREE.Object3D, dt: number) => void;
}) {
  const { scene, animations } = useGLTF(CHARACTER_URL[model]);
  const clips = useMemo(() => retargetClips(animations, model === "courier"), [animations, model]);
  const root = useRef<THREE.Group>(null);
  const instance = useMemo(() => {
    const c = cloneSkinned(scene) as THREE.Group;
    // Skala ke ketinggian manusia; kaki pada y = 0.
    const box = new THREE.Box3().setFromObject(c, true);
    const h = Math.max(1e-3, box.max.y - box.min.y);
    const k = TARGET_HEIGHT / h;
    c.scale.multiplyScalar(k);
    c.position.y = -box.min.y * k;
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.frustumCulled = false; // rangka bergerak di luar kotak asal
    });
    return c;
  }, [scene]);
  // Pulihkan pose klip sebelum mixer: Three.js tidak menulis semula trek yang tidak berubah.
  useFrame(() => beforeAnimate?.());
  const { actions } = useAnimations(clips, root);
  const current = useRef<Clip | null>(null);

  const play = (next: Clip, speed = 1) => {
    const a = actions[next];
    if (!a) return;
    a.timeScale = speed;
    if (current.current === next && a.isScheduled()) return;
    const prev = current.current && current.current !== next ? actions[current.current] : null;
    a.reset().fadeIn(FADE).play();
    prev?.fadeOut(FADE);
    current.current = next;
  };

  useEffect(() => {
    if (!pickClip) play(clip, timeScale ?? 1);
  });

  useFrame((_state, dt) => {
    if (pickClip) {
      const p = pickClip();
      play(p.clip, p.timeScale ?? 1);
    }
    if (root.current) afterAnimate?.(root.current, dt);
  });

  return (
    <group ref={root}>
      <primitive object={instance} />
    </group>
  );
}

for (const url of Object.values(CHARACTER_URL)) useGLTF.preload(url);
