import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildingLayout, doorPosition, windowPositions } from "./city-layout";

const tempObj = new THREE.Object3D();

/**
 * Palet siang gaya bandar Malaysia (krim, pastel, terakota). Data susun atur
 * (`city-layout`) mengekalkan warna asal; ia dipetakan di sini semasa melukis.
 */
const DAY_PALETTE: Record<string, string> = {
  "#4a5568": "#e6dcc6",
  "#5a6578": "#cdb89a",
  "#6a7588": "#b9c6cc",
  "#3d4f5f": "#d9b49b",
  "#7a8a9a": "#e8e2d4",
  "#4b5c6d": "#aebfa5",
};
const tempColor = new THREE.Color();

export function Buildings() {
  const buildings = useMemo(() => buildingLayout(), []);
  const windows = useMemo(() => buildings.flatMap((b) => windowPositions(b)), [buildings]);
  const doors = useMemo(() => buildings.map((b) => doorPosition(b)), [buildings]);

  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const windowRef = useRef<THREE.InstancedMesh>(null);
  const doorRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    buildings.forEach((b, i) => {
      tempObj.position.set(b.x, b.y, b.z);
      tempObj.rotation.set(0, 0, 0);
      tempObj.scale.set(b.width, b.height, b.depth);
      tempObj.updateMatrix();
      body.setMatrixAt(i, tempObj.matrix);
      body.setColorAt(i, tempColor.set(DAY_PALETTE[b.color] ?? b.color));
    });
    body.instanceMatrix.needsUpdate = true;
    if (body.instanceColor) body.instanceColor.needsUpdate = true;
    body.computeBoundingSphere();

    const window = windowRef.current;
    if (window) {
      windows.forEach((p, i) => {
        tempObj.position.set(p[0], p[1], p[2]);
        tempObj.rotation.set(0, 0, 0);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();
        window.setMatrixAt(i, tempObj.matrix);
      });
      window.instanceMatrix.needsUpdate = true;
      window.computeBoundingSphere();
    }

    const door = doorRef.current;
    if (door) {
      doors.forEach((p, i) => {
        tempObj.position.set(p[0], p[1], p[2]);
        tempObj.rotation.set(0, 0, 0);
        tempObj.scale.set(1, 1, 1);
        tempObj.updateMatrix();
        door.setMatrixAt(i, tempObj.matrix);
      });
      door.instanceMatrix.needsUpdate = true;
      door.computeBoundingSphere();
    }
  }, [buildings, windows, doors]);

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, buildings.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>

      <instancedMesh ref={windowRef} args={[undefined, undefined, windows.length]}>
        <planeGeometry args={[1.2, 1.5]} />
        <meshStandardMaterial color="#2e4457" roughness={0.15} metalness={0.6} />
      </instancedMesh>

      <instancedMesh ref={doorRef} args={[undefined, undefined, doors.length]}>
        <planeGeometry args={[1.5, 3]} />
        <meshStandardMaterial color="#5a3b24" roughness={0.7} />
      </instancedMesh>
    </group>
  );
}
