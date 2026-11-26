import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

/**
 * Watak Kenney Mini Characters (CC0) dengan rangka dan animasi sebenar.
 * Model asal kecil (~0.82 unit tinggi); diskala supaya tinggi = TARGET_HEIGHT meter.
 */
export const CHARACTER_URL = {
  courier: "/models/characters/character-worker.glb",
  maleA: "/models/characters/character-male-a.glb",
  maleC: "/models/characters/character-male-c.glb",
  femaleB: "/models/characters/character-female-b.glb",
  femaleD: "/models/characters/character-female-d.glb",
} as const;

export type CharacterKey = keyof typeof CHARACTER_URL;

/** Nama klip animasi dalam pek Mini Characters yang dipakai permainan. */
export type Clip = "idle" | "walk" | "sprint" | "drive" | "holding-both" | "pick-up" | "interact-right" | "emote-yes";

/**
 * Gaya chibi Kenney: lebar ≈ 0.93 × tinggi (kepala besar). 1.45 m memastikan
 * lebar (~1.35 m) masih berkadar dengan motor, pintu dan kereta.
 */
const TARGET_HEIGHT = 1.45;
const FADE = 0.2;

/**
 * Satu watak beranimasi. `clip` boleh berubah setiap render, atau `pickClip`
 * dipanggil setiap frame (tanpa render semula React) untuk memilih klip.
 */
export function CharacterGLB({
  model,
  clip = "idle",
  pickClip,
  timeScale,
}: {
  model: CharacterKey;
  clip?: Clip;
  pickClip?: () => { clip: Clip; timeScale?: number };
  timeScale?: number;
}) {
  const { scene, animations } = useGLTF(CHARACTER_URL[model]);
  const root = useRef<THREE.Group>(null);
  const instance = useMemo(() => {
    const c = cloneSkinned(scene) as THREE.Group;
    // Skala ke ketinggian manusia; kaki kekal pada y = 0.
    const box = new THREE.Box3().setFromObject(c, true);
    const h = Math.max(1e-3, box.max.y - box.min.y);
    c.scale.setScalar(TARGET_HEIGHT / h);
    c.position.y = -box.min.y * (TARGET_HEIGHT / h);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.frustumCulled = false; // rangka bergerak di luar kotak asal
    });
    return c;
  }, [scene]);
  const { actions } = useAnimations(animations, root);
  const current = useRef<Clip | null>(null);

  const play = (next: Clip, speed = 1) => {
    const a = actions[next];
    if (!a) return;
    a.timeScale = speed;
    if (current.current === next) return;
    const prev = current.current ? actions[current.current] : null;
    a.reset().fadeIn(FADE).play();
    prev?.fadeOut(FADE);
    current.current = next;
  };

  useEffect(() => {
    if (!pickClip) play(clip, timeScale ?? 1);
  });

  useFrame(() => {
    if (!pickClip) return;
    const p = pickClip();
    play(p.clip, p.timeScale ?? 1);
  });

  return (
    <group ref={root}>
      <primitive object={instance} />
    </group>
  );
}

for (const url of Object.values(CHARACTER_URL)) useGLTF.preload(url);
