import { useGameStateStore } from "@/store/gamestate";
import { scooterLightingOn } from "@/world/daytime";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RIDER_STEER_PIVOT_Z } from "./rider-ik";
import { isScooterRidden } from "./scooter-ride";

/**
 * Skuter elektrik penghantaran — "Low Poly Delivery Electric Scooter" oleh
 * ramdom_sp (spartanmelon) di Sketchfab, CC-BY-4.0 (lihat THIRD_PARTY_NOTICES).
 * Dinormalkan: panjang SCOOTER_LENGTH, tayar di y = 0, hadapan = +z.
 */
export const SCOOTER_URL = "/models/scooter/delivery-scooter.glb";
const SCOOTER_LENGTH = 1.9;
/** Model asal menghadap −z; diputar supaya hadapan = +z (paksi motor permainan). */
const FACING_FIX = Math.PI;

export function ScooterGLB() {
  const lightsOn = useGameStateStore((s) => scooterLightingOn(s.settings.rainMode, s.worldMinutes));
  const { scene } = useGLTF(SCOOTER_URL);
  const { model, lenses } = useMemo(() => {
    const lenses: THREE.MeshStandardMaterial[] = [];
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    const k = SCOOTER_LENGTH / Math.max(size.x, size.z);
    const centre = box.getCenter(new THREE.Vector3());
    const wrap = new THREE.Group();
    c.position.set(-centre.x, -box.min.y, -centre.z);
    const inner = new THREE.Group();
    inner.add(c);
    inner.scale.setScalar(k);
    inner.rotation.y = (size.x > size.z ? Math.PI / 2 : 0) + FACING_FIX;
    wrap.add(inner);
    const frontAssembly = c.getObjectByName(THREE.PropertyBinding.sanitizeNodeName("Cylinder.007_0"));
    if (frontAssembly) {
      const pivot = new THREE.Group();
      pivot.name = "scooter-steering";
      pivot.position.z = RIDER_STEER_PIVOT_Z;
      wrap.add(pivot);
      pivot.attach(frontAssembly);
    }
    wrap.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      if (!(m.material instanceof THREE.MeshStandardMaterial)) return;
      if (m.material.name !== "RedLight" && m.material.name !== "FrontLight") return;
      const lens = m.material.clone();
      lens.emissive.set(lens.name === "RedLight" ? "#ff3823" : "#ffe3b5");
      lens.emissiveIntensity = 0;
      m.material = lens;
      lenses.push(lens);
    });
    return { model: wrap, lenses };
  }, [scene]);
  useFrame(() => {
    const on = lightsOn && isScooterRidden();
    const level = on ? 1.6 : 0;
    if (lenses[0] && lenses[0].emissiveIntensity === level) return;
    for (const lens of lenses) lens.emissiveIntensity = level;
  });
  useEffect(
    () => () => {
      for (const lens of lenses) lens.dispose();
    },
    [lenses],
  );
  return <primitive object={model} />;
}

useGLTF.preload(SCOOTER_URL);
