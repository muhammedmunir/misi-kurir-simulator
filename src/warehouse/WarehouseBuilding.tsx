import { PlacementModels, batchPlacements } from "@/components/3d/PlacementModels";
import { WAREHOUSE_WALL_T } from "@/components/3d/world-collision";
import { Suspense, useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { WAREHOUSE } from "./warehouse-logic";

const WALL_H = 4.5;
const WALL_T = WAREHOUSE_WALL_T;
const WALL_COLOR = "#d0d7d3";
const ACCENT = "#f59e0b";
const yard = batchPlacements([
  { model: "city-kit-roads/construction-cone", x: -5, z: -10.8, w: 0.45, h: 0.7, d: 0.45, rotY: 0, solid: false },
  { model: "city-kit-roads/construction-cone", x: 5, z: -10.8, w: 0.45, h: 0.7, d: 0.45, rotY: 0, solid: false },
  { model: "car-kit/box", x: -7, z: -10, w: 1, h: 0.85, d: 0.9, rotY: 0, solid: false },
  { model: "car-kit/delivery", x: 8.4, z: -11.4, w: 2.3, h: 2.45, d: 4.8, rotY: Math.PI / 2, solid: false },
]);

function paintedTexture(kind: "wall" | "shutter" | "sign") {
  const canvas = document.createElement("canvas");
  canvas.width = kind === "sign" ? 1024 : 256;
  canvas.height = kind === "sign" ? 128 : 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    if (kind === "sign") {
      ctx.fillStyle = "#fffdf4";
      ctx.fillRect(0, 0, 1024, 128);
      ctx.fillStyle = ACCENT;
      ctx.fillRect(0, 0, 26, 128);
      ctx.fillRect(998, 0, 26, 128);
      ctx.fillStyle = "#232c30";
      ctx.font = "bold 88px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PUSAT POS KURIR", 512, 68, 930);
    } else {
      ctx.fillStyle = kind === "wall" ? "#9baeb1" : "#56616a";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 256; i += 8) {
        ctx.fillStyle = "#263940";
        if (kind === "wall") ctx.fillRect(i, 0, 2, 256);
        else ctx.fillRect(0, i, 256, 2);
        ctx.fillStyle = "#d0d6d3";
        if (kind === "wall") ctx.fillRect(i + 2, 0, 1, 256);
        else ctx.fillRect(0, i + 2, 256, 1);
      }
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Placeholder warehouse: open-roof shell so the third-person camera can see
 * inside, door gap facing the z=0 road, sorting desk where the pickup zone is.
 * Collision: `warehouseColliders()` in `world-collision.ts` (same dimensions).
 */
export function WarehouseBuilding() {
  const { center, width, depth, doorWidth } = WAREHOUSE;
  const halfW = width / 2;
  const halfD = depth / 2;
  const sideOfDoor = (width - doorWidth) / 2;
  const [wall, shutter, sign] = useMemo(
    () => [paintedTexture("wall"), paintedTexture("shutter"), paintedTexture("sign")],
    [],
  );
  useEffect(
    () => () => {
      wall.dispose();
      shutter.dispose();
      sign.dispose();
    },
    [wall, shutter, sign],
  );

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#5b5f66" roughness={0.9} />
      </mesh>

      {/* Back and side walls */}
      <mesh position={[0, WALL_H / 2, halfD]}>
        <boxGeometry args={[width, WALL_H, WALL_T]} />
        <meshStandardMaterial color={WALL_COLOR} map={wall} roughness={0.8} />
      </mesh>
      <mesh position={[-halfW, WALL_H / 2, 0]}>
        <boxGeometry args={[WALL_T, WALL_H, depth]} />
        <meshStandardMaterial color={WALL_COLOR} map={wall} roughness={0.8} />
      </mesh>
      <mesh position={[halfW, WALL_H / 2, 0]}>
        <boxGeometry args={[WALL_T, WALL_H, depth]} />
        <meshStandardMaterial color={WALL_COLOR} map={wall} roughness={0.8} />
      </mesh>

      {/* Front wall with door gap */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (doorWidth / 2 + sideOfDoor / 2), WALL_H / 2, -halfD]}>
          <boxGeometry args={[sideOfDoor, WALL_H, WALL_T]} />
          <meshStandardMaterial color={WALL_COLOR} map={wall} roughness={0.8} />
        </mesh>
      ))}

      {/* Pintu gulung dibuka; ruang di bawahnya kekal boleh dilalui. */}
      <mesh position={[0, 3.75, -halfD]}>
        <boxGeometry args={[doorWidth, 1.5, WALL_T]} />
        <meshStandardMaterial map={shutter} roughness={0.7} />
      </mesh>
      <mesh position={[0, WALL_H + 0.48, -halfD - 0.22]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[doorWidth + 2, 0.96]} />
        <meshBasicMaterial map={sign} />
      </mesh>
      <Suspense fallback={null}>
        <PlacementModels data={yard} />
      </Suspense>

      {/* Sorting desk (pickup zone sits in front of it) */}
      <group position={[0, 0, 2.5]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[4, 1, 1.2]} />
          <meshStandardMaterial color="#6b4f2a" roughness={0.7} />
        </mesh>
        <mesh position={[1.2, 1.15, 0]}>
          <boxGeometry args={[0.5, 0.3, 0.4]} />
          <meshStandardMaterial color={ACCENT} />
        </mesh>
      </group>

      {/* Parcel shelves along the back wall */}
      {[-6, -3, 3, 6].map((x) => (
        <group key={x} position={[x, 0, halfD - 1]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[2.4, 3, 1]} />
            <meshStandardMaterial color="#3d4451" roughness={0.8} />
          </mesh>
          {[0.6, 1.6, 2.6].map((y) => (
            <mesh key={y} position={[0, y, -0.55]}>
              <boxGeometry args={[1.8, 0.6, 0.15]} />
              <meshStandardMaterial color="#b08850" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
