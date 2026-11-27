import { useFrame } from "@react-three/fiber";
import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { streetLamps } from "./road-tiles";

function makePoolTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.48, "rgba(255,255,255,0.44)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

export function StreetLightPools({
  lamps,
  lampFade,
  wetness,
}: {
  lamps: ReturnType<typeof streetLamps>;
  lampFade: RefObject<number>;
  wetness: RefObject<number>;
}) {
  const poolRef = useRef<THREE.InstancedMesh>(null);
  const poolMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const poolMap = useMemo(makePoolTexture, []);
  useEffect(() => () => poolMap.dispose(), [poolMap]);

  useLayoutEffect(() => {
    const mesh = poolRef.current;
    if (!mesh) return;
    const pool = new THREE.Object3D();
    pool.rotation.x = -Math.PI / 2;
    // Permukaan asfalt rata; anjakan dari tiang menghala ke lorong di bawah kepala lampu.
    lamps.forEach((l, i) => {
      pool.position.set(l.x - Math.sin(l.rotY) * 3.8, 0.06 + 0.02, l.z + Math.cos(l.rotY) * 3.8);
      pool.updateMatrix();
      mesh.setMatrixAt(i, pool.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [lamps]);

  useFrame(() => {
    if (poolRef.current) poolRef.current.visible = lampFade.current > 0;
    if (poolMaterial.current) poolMaterial.current.opacity = (0.46 + wetness.current * 0.12) * lampFade.current;
  });

  return (
    <instancedMesh
      name="street-light-pools"
      ref={poolRef}
      args={[undefined, undefined, lamps.length]}
      userData={{ noShadow: true }}
      visible={false}
    >
      <circleGeometry args={[6.4, 24]} />
      <meshBasicMaterial
        ref={poolMaterial}
        map={poolMap}
        color="#ffd9a0"
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
