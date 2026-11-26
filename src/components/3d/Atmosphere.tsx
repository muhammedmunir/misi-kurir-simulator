import { useGameStateStore } from "@/store/gamestate";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { playerState } from "./PlayerController";

/** Warna ufuk: latar, kabus dan bahagian bawah langit mesti sama supaya tiada jahitan. */
export const HORIZON = "#cfe0ee";
const ZENITH = "#3f7cc4";
const SUN_COLOR = "#fff1d8";
/** Arah matahari (dari sasaran ke matahari): petang tropika, condong dari barat daya. */
const SUN_OFFSET = new THREE.Vector3(-45, 75, -30);
/** Separuh lebar kotak bayang-bayang di sekeliling pemain (m). */
const SHADOW_HALF = 32;

/**
 * Bayang-bayang aktif? "Rendah": tidak. "Sederhana": hanya pada penunjuk halus
 * (desktop), kerana telefon bajet rendah (Redmi 9) tidak mampu pas bayang-bayang.
 * "Tinggi": sentiasa.
 */
export function shadowsEnabled(preset: "low" | "medium" | "high", coarsePointer: boolean): boolean {
  if (preset === "low") return false;
  if (preset === "high") return true;
  return !coarsePointer;
}

/** Kereta NPC dan penanda tidak membuang bayang (jimat satu pas render setiap satu). */
function noCastAncestor(o: THREE.Object3D): boolean {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.userData.noCastShadow) return true;
  return false;
}

function isCoarse(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

/** Kubah langit bergradien (ufuk cerah → zenit biru), tanpa tekstur. */
function SkyDome() {
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(380, 32, 16);
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const top = new THREE.Color(ZENITH);
    const horizon = new THREE.Color(HORIZON);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = Math.max(0, pos.getY(i) / 380); // 0 di ufuk, 1 di zenit
      c.copy(horizon).lerp(top, h ** 0.6);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);
  return (
    <mesh geometry={geometry} userData={{ noShadow: true }} renderOrder={-1}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}

/**
 * Pencahayaan siang: langit, kabus, lampu hemisfera dan matahari yang
 * mengikut pemain (bayang-bayang tajam hanya di sekeliling pemain).
 */
export function Atmosphere() {
  const preset = useGameStateStore((s) => s.settings.graphicsPreset);
  const shadows = shadowsEnabled(preset, isCoarse());
  const { gl, scene } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    scene.fog = new THREE.Fog(HORIZON, 90, 320);
    scene.background = new THREE.Color(HORIZON);
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene]);

  useEffect(() => {
    gl.shadowMap.enabled = shadows;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    // Tandakan pembuang bayang selepas adegan dipasang. Satah rata (jalan, tanah,
    // garisan) hanya menerima; objek berjilid membuang dan menerima.
    const id = window.setTimeout(() => {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || m.userData.noShadow) return;
        const flat = m.geometry instanceof THREE.PlaneGeometry || m.geometry instanceof THREE.RingGeometry;
        m.receiveShadow = shadows;
        m.castShadow = shadows && !flat && !noCastAncestor(m);
      });
      scene.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (mat) mat.needsUpdate = true;
      });
    }, 300);
    return () => window.clearTimeout(id);
  }, [gl, scene, shadows]);

  useFrame(() => {
    const light = sun.current;
    if (!light) return;
    const p = playerState.getPosition();
    light.target.position.set(p.x, 0, p.z);
    light.position.set(p.x + SUN_OFFSET.x, SUN_OFFSET.y, p.z + SUN_OFFSET.z);
    light.target.updateMatrixWorld();
  });

  return (
    <>
      <SkyDome />
      <hemisphereLight args={["#d7e9ff", "#6b5a3e", 1.15]} />
      <directionalLight
        ref={sun}
        color={SUN_COLOR}
        intensity={2.4}
        castShadow={shadows}
        shadow-mapSize-width={preset === "high" ? 2048 : 1024}
        shadow-mapSize-height={preset === "high" ? 2048 : 1024}
        shadow-camera-left={-SHADOW_HALF}
        shadow-camera-right={SHADOW_HALF}
        shadow-camera-top={SHADOW_HALF}
        shadow-camera-bottom={-SHADOW_HALF}
        shadow-camera-near={10}
        shadow-camera-far={200}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
    </>
  );
}
