import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
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

function tileMatrix(box: THREE.Box3, t: RoadTile): THREE.Matrix4 {
  const alongZ = t.axis === "z";
  const rot = alongZ === STRAIGHT_ALONG_Z ? 0 : Math.PI / 2;
  // Dalam paksi setempat jubin: arah jalan = z jika STRAIGHT_ALONG_Z, selain itu x.
  const [w, d] = STRAIGHT_ALONG_Z ? [t.w, t.len] : [t.len, t.w];
  const h = Math.max(0.02, (box.max.y - box.min.y) * THICKNESS_SCALE);
  return fitMatrix(box, { x: t.x, z: t.z, w, h, d, rotY: rot });
}

/** Jalan, simpang dan lampu jalan Kenney (CC0), 3 draw call untuk seluruh bandar. */
export function CityRoads() {
  const [straight, cross, lamp] = useMergedModels(URLS);
  const tiles = useMemo(() => roadTiles(), []);
  const straightTiles = useMemo(() => tiles.filter((t) => t.kind === "straight"), [tiles]);
  const crossTiles = useMemo(() => tiles.filter((t) => t.kind === "cross"), [tiles]);
  const lamps = useMemo(() => streetLamps(), []);
  const sRef = useRef<THREE.InstancedMesh>(null);
  const cRef = useRef<THREE.InstancedMesh>(null);
  const lRef = useRef<THREE.InstancedMesh>(null);

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
      <instancedMesh ref={sRef} args={[straight.geometry, straight.material, straightTiles.length]} receiveShadow />
      <instancedMesh ref={cRef} args={[cross.geometry, cross.material, crossTiles.length]} receiveShadow />
      <instancedMesh ref={lRef} args={[lamp.geometry, lamp.material, lamps.length]} castShadow />
    </group>
  );
}
