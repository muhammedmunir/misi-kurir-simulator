import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { RIDER_STEER_PIVOT_Z } from "./rider-ik";

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
  const { scene } = useGLTF(SCOOTER_URL);
  const model = useMemo(() => {
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
      if (m.isMesh) m.castShadow = true;
    });
    return wrap;
  }, [scene]);
  return <primitive object={model} />;
}

useGLTF.preload(SCOOTER_URL);
