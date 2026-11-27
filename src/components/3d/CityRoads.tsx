import { useGameStateStore } from "@/store/gamestate";
import { dayPhase, isRaining } from "@/world/daytime";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { StreetLightPools } from "./StreetLightPools";
import { fitMatrix, useMergedModels } from "./merged-model";
import { type RoadTile, roadTiles, streetLamps } from "./road-tiles";

const BASE = "/models/city-kit-roads";
const URLS = [`${BASE}/road-straight.glb`, `${BASE}/road-crossroad.glb`, `${BASE}/light-square.glb`];

/**
 * Orientasi jubin Kenney: jubin lurus menghala paksi x setempat (disahkan secara
 * visual, Pelan 012b), jadi jalan utara-selatan diputar 90°.
 */
const STRAIGHT_ALONG_Z = false;
/** Ketebalan jubin: skala menegak lebih kecil daripada mendatar supaya bebendul ~12 cm. */
const THICKNESS_SCALE = 6;
const LAMP_HEIGHT = 7;

// Hanya kanta pada atlas Kenney memancar; tiang dan perumah kekal gelap.
const MASK_SIZE = 32;
const mask = new Uint8Array(MASK_SIZE * MASK_SIZE * 4);
for (const y of [19, 20]) {
  for (const x of [16, 17]) mask.fill(255, (y * MASK_SIZE + x) * 4, (y * MASK_SIZE + x + 1) * 4);
}
const LAMP_LENS = new THREE.DataTexture(mask, MASK_SIZE, MASK_SIZE);
LAMP_LENS.needsUpdate = true;

function tileMatrix(box: THREE.Box3, t: RoadTile): THREE.Matrix4 {
  const alongZ = t.axis === "z";
  const rot = alongZ === STRAIGHT_ALONG_Z ? 0 : Math.PI / 2;
  // Dalam paksi setempat jubin: arah jalan = z jika STRAIGHT_ALONG_Z, selain itu x.
  const [w, d] = STRAIGHT_ALONG_Z ? [t.w, t.len] : [t.len, t.w];
  const h = Math.max(0.02, (box.max.y - box.min.y) * THICKNESS_SCALE);
  return fitMatrix(box, { x: t.x, z: t.z, w, h, d, rotY: rot });
}

/** Jubin, kepala lampu dan kolam cahaya dikumpulkan mengikut geometri. */
export function CityRoads() {
  const [straight, cross, lamp] = useMergedModels(URLS);
  const tiles = useMemo(() => roadTiles(), []);
  const straightTiles = useMemo(() => tiles.filter((t) => t.kind === "straight"), [tiles]);
  const crossTiles = useMemo(() => tiles.filter((t) => t.kind === "cross"), [tiles]);
  const lamps = useMemo(() => streetLamps(), []);
  const sRef = useRef<THREE.InstancedMesh>(null);
  const cRef = useRef<THREE.InstancedMesh>(null);
  const lRef = useRef<THREE.InstancedMesh>(null);
  const wetness = useRef(0);
  const lampFade = useRef(0);
  const lampsOn = useGameStateStore((s) => dayPhase(s.worldMinutes).lampsOn);
  const wet = useGameStateStore((s) => isRaining(s.settings.rainMode, s.worldMinutes));
  const surfaces = useMemo(
    () => [straight.material, cross.material, lamp.material].map((m) => (m as THREE.MeshStandardMaterial).clone()),
    [straight.material, cross.material, lamp.material],
  );
  const [straightSurface, crossSurface, lampSurface] = surfaces;

  useEffect(
    () => () => {
      for (const surface of surfaces) surface.dispose();
    },
    [surfaces],
  );

  useLayoutEffect(() => {
    lampSurface.emissive.set("#ffd9a0");
    lampSurface.emissiveMap = LAMP_LENS;
    lampSurface.emissiveIntensity = 0;
    lampSurface.needsUpdate = true;
  }, [lampSurface]);

  useFrame((_, delta) => {
    const wetTarget = wet ? 1 : 0;
    const lampTarget = lampsOn ? 1 : 0;
    wetness.current +=
      Math.sign(wetTarget - wetness.current) * Math.min(delta / 3, Math.abs(wetTarget - wetness.current));
    lampFade.current +=
      Math.sign(lampTarget - lampFade.current) * Math.min(delta, Math.abs(lampTarget - lampFade.current));
    const blend = wetness.current;
    const dryStraight = straight.material as THREE.MeshStandardMaterial;
    const dryCross = cross.material as THREE.MeshStandardMaterial;
    straightSurface.color.copy(dryStraight.color).multiplyScalar(1 - blend * 0.15);
    crossSurface.color.copy(dryCross.color).multiplyScalar(1 - blend * 0.15);
    straightSurface.roughness = THREE.MathUtils.lerp(dryStraight.roughness, 0.25, blend);
    crossSurface.roughness = THREE.MathUtils.lerp(dryCross.roughness, 0.25, blend);
    lampSurface.emissiveIntensity = 2.2 * lampFade.current;
  });

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    straightTiles.forEach((t, i) => sRef.current?.setMatrixAt(i, tileMatrix(straight.box, t)));
    crossTiles.forEach((t, i) => cRef.current?.setMatrixAt(i, tileMatrix(cross.box, t)));
    const lb = lamp.box;
    const size = lb.getSize(new THREE.Vector3());
    const k = LAMP_HEIGHT / Math.max(size.y, 1e-6);
    lamps.forEach((l, i) =>
      lRef.current?.setMatrixAt(
        i,
        fitMatrix(lb, { x: l.x, z: l.z, w: size.x * k, h: LAMP_HEIGHT, d: size.z * k, rotY: l.rotY }, m),
      ),
    );
    for (const r of [sRef, cRef, lRef]) {
      if (!r.current) continue;
      r.current.instanceMatrix.needsUpdate = true;
      r.current.computeBoundingSphere();
    }
  }, [straight, cross, lamp, straightTiles, crossTiles, lamps]);

  return (
    <group>
      <instancedMesh ref={sRef} args={[straight.geometry, straightSurface, straightTiles.length]} receiveShadow />
      <instancedMesh ref={cRef} args={[cross.geometry, crossSurface, crossTiles.length]} receiveShadow />
      <instancedMesh ref={lRef} args={[lamp.geometry, lampSurface, lamps.length]} castShadow />
      <StreetLightPools lamps={lamps} lampFade={lampFade} wetness={wetness} />
    </group>
  );
}
