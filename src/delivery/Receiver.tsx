import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const SHIRTS = ["#3b82f6", "#16a34a", "#db2777", "#f97316", "#7c3aed", "#0d9488"];
const SKIN = "#c68a5a";
const tmp = new THREE.Object3D();
const tmpColor = new THREE.Color();

/**
 * Penerima di setiap alamat yang ada orang di rumah (receiverHome !== false):
 * berdiri 1.5 m di hadapan pintu, menghadap jalan. Kepala dan badan masing-masing
 * satu instancedMesh (2 draw call untuk semua penerima); warna baju berbeza.
 */
export function Receiver() {
  const spots = useMemo(
    () =>
      DELIVERY_ZONES.filter((z) => z.type === "delivery" && z.receiverHome !== false).map((z) => ({
        x: z.position.x,
        z: z.position.z - 1.5,
      })),
    [],
  );
  const headRef = useRef<THREE.InstancedMesh>(null);
  const bodyRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const head = headRef.current;
    const body = bodyRef.current;
    if (!head || !body) return;
    spots.forEach((s, i) => {
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.position.set(s.x, 1.62, s.z);
      tmp.updateMatrix();
      head.setMatrixAt(i, tmp.matrix);
      head.setColorAt(i, tmpColor.set(SKIN));
      tmp.position.set(s.x, 0.85, s.z);
      tmp.updateMatrix();
      body.setMatrixAt(i, tmp.matrix);
      body.setColorAt(i, tmpColor.set(SHIRTS[i % SHIRTS.length]));
    });
    for (const m of [head, body]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [spots]);

  return (
    <group>
      <instancedMesh ref={headRef} args={[undefined, undefined, spots.length]}>
        <boxGeometry args={[0.32, 0.34, 0.32]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, spots.length]}>
        <boxGeometry args={[0.5, 1.2, 0.3]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
    </group>
  );
}
