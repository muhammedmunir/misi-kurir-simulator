import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { roadLayout, roadMarkingPositions, roadTransform, streetLightPositions } from "./city-layout";

const tempObj = new THREE.Object3D();

export function Roads() {
  const roads = useMemo(() => roadLayout(), []);
  const markings = useMemo(() => roadMarkingPositions(), []);
  const lights = useMemo(() => streetLightPositions(), []);

  const roadRef = useRef<THREE.InstancedMesh>(null);
  const markingRef = useRef<THREE.InstancedMesh>(null);
  const poleRef = useRef<THREE.InstancedMesh>(null);
  const lampRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const road = roadRef.current;
    if (road) {
      roads.forEach((r, i) => {
        const t = roadTransform(r);
        tempObj.position.set(...t.position);
        tempObj.rotation.set(...t.rotation);
        tempObj.scale.set(...t.scale);
        tempObj.updateMatrix();
        road.setMatrixAt(i, tempObj.matrix);
      });
      road.instanceMatrix.needsUpdate = true;
      road.computeBoundingSphere();
    }

    const marking = markingRef.current;
    if (marking) {
      markings.forEach((p, i) => {
        tempObj.position.set(p[0], p[1], p[2]);
        tempObj.rotation.set(-Math.PI / 2, 0, 0);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();
        marking.setMatrixAt(i, tempObj.matrix);
      });
      marking.instanceMatrix.needsUpdate = true;
      marking.computeBoundingSphere();
    }

    const pole = poleRef.current;
    if (pole) {
      lights.forEach((l, i) => {
        tempObj.position.set(l.x, 4, l.z);
        tempObj.rotation.set(0, 0, 0);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();
        pole.setMatrixAt(i, tempObj.matrix);
      });
      pole.instanceMatrix.needsUpdate = true;
      pole.computeBoundingSphere();
    }

    const lamp = lampRef.current;
    if (lamp) {
      lights.forEach((l, i) => {
        tempObj.position.set(l.x + 0.5, 8, l.z);
        tempObj.rotation.set(0, 0, 0);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();
        lamp.setMatrixAt(i, tempObj.matrix);
      });
      lamp.instanceMatrix.needsUpdate = true;
      lamp.computeBoundingSphere();
    }
  }, [roads, markings, lights]);

  return (
    <group>
      <instancedMesh ref={roadRef} args={[undefined, undefined, roads.length]} receiveShadow>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
      </instancedMesh>

      <instancedMesh ref={markingRef} args={[undefined, undefined, markings.length]}>
        <planeGeometry args={[0.3, 4]} />
        <meshStandardMaterial color="#ffffff" />
      </instancedMesh>

      <instancedMesh ref={poleRef} args={[undefined, undefined, lights.length]}>
        <cylinderGeometry args={[0.1, 0.15, 8, 8]} />
        <meshStandardMaterial color="#555555" metalness={0.5} />
      </instancedMesh>

      <instancedMesh ref={lampRef} args={[undefined, undefined, lights.length]}>
        <boxGeometry args={[1, 0.3, 0.5]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
      </instancedMesh>
    </group>
  );
}
