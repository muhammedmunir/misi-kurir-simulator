import { useGameStateStore } from "@/store/gamestate";
import { dayPhase, isRaining } from "@/world/daytime";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { playerState } from "./PlayerController";

/** Warna ufuk: latar, kabus dan bahagian bawah langit mesti sama supaya tiada jahitan. */
export const HORIZON = "#cfe0ee";
const SKY_RADIUS = 380;
const OVERCAST = new THREE.Color("#748397");
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

function makeSkyGeometry() {
  const geometry = new THREE.SphereGeometry(SKY_RADIUS, 32, 16);
  const position = geometry.getAttribute("position");
  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(position.count * 3), 3).setUsage(THREE.DynamicDrawUsage),
  );
  return geometry;
}

function tintSky(geometry: THREE.BufferGeometry, horizon: THREE.Color, zenith: THREE.Color) {
  const position = geometry.getAttribute("position");
  const colors = geometry.getAttribute("color");
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const height = Math.max(0, position.getY(i) / SKY_RADIUS);
    color.copy(horizon).lerp(zenith, height ** 0.6);
    colors.setXYZ(i, color.r, color.g, color.b);
  }
  colors.needsUpdate = true;
}

/**
 * Pencahayaan siang dan malam: langit, kabus, lampu hemisfera dan matahari yang
 * mengikut pemain (bayang-bayang tajam hanya di sekeliling pemain).
 */
export function Atmosphere() {
  const preset = useGameStateStore((s) => s.settings.graphicsPreset);
  const shadows = shadowsEnabled(preset, isCoarse());
  const { gl, scene } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemisphere = useRef<THREE.HemisphereLight>(null);
  const skyGeometry = useMemo(makeSkyGeometry, []);
  const lastTint = useRef(Number.NEGATIVE_INFINITY);

  useEffect(() => () => skyGeometry.dispose(), [skyGeometry]);

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

  useFrame(({ clock }) => {
    const light = sun.current;
    if (!light) return;
    const p = playerState.getPosition();
    light.target.position.set(p.x, 0, p.z);
    light.position.set(p.x + SUN_OFFSET.x, SUN_OFFSET.y, p.z + SUN_OFFSET.z);
    light.target.updateMatrixWorld();

    if (clock.elapsedTime - lastTint.current < 0.5) return;
    lastTint.current = clock.elapsedTime;
    const { worldMinutes, settings } = useGameStateStore.getState();
    const phase = dayPhase(worldMinutes);
    const wet = isRaining(settings.rainMode, worldMinutes);
    const horizon = new THREE.Color(phase.horizon);
    const zenith = new THREE.Color(phase.sky);
    if (wet) {
      horizon.lerp(OVERCAST, phase.sun * 0.62);
      zenith.lerp(OVERCAST, phase.sun * 0.7);
    }
    tintSky(skyGeometry, horizon, zenith);
    if (scene.background instanceof THREE.Color) scene.background.copy(horizon);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(horizon);
      scene.fog.near = wet ? 45 : 90;
      scene.fog.far = wet ? 200 : 320;
    }
    light.intensity = 2.4 * phase.sun * (wet ? 0.62 : 1);
    light.castShadow = shadows && phase.sun > 0;
    if (hemisphere.current) hemisphere.current.intensity = 0.4 + phase.sun * (wet ? 0.6 : 0.75);
  });

  return (
    <>
      <mesh geometry={skyGeometry} userData={{ noShadow: true }} renderOrder={-1}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <hemisphereLight ref={hemisphere} color="#d7e9ff" groundColor="#6b5a3e" />
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
