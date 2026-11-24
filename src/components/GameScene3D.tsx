import { WarehouseBuilding } from "@/warehouse/WarehouseBuilding";
import { WarehousePanel } from "@/warehouse/WarehousePanel";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Physics } from "@react-three/rapier";
import { useCallback, useEffect, useState } from "react";
import { CameraFollow } from "./3d/CameraFollow";
import { DeliverySystemController } from "./3d/DeliverySystemController";
import { DeliveryZones } from "./3d/DeliveryZones";
import { Destinations } from "./3d/Destinations";
import { HUD3D } from "./3d/HUD3D";
import { InteractionPrompt } from "./3d/InteractionPrompt";
import { NPCTraffic } from "./3d/NPCTraffic";
import { PlayerController } from "./3d/PlayerController";
import { WorldEnvironment } from "./3d/WorldEnvironment";
import { TouchJoystick } from "./TouchJoystick";

export function GameScene3D() {
  const [contextLost, setContextLost] = useState(false);

  const handleContextLost = useCallback((e: Event) => {
    e.preventDefault();
    setContextLost(true);
  }, []);

  useEffect(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    canvas.addEventListener("webglcontextlost", handleContextLost);
    return () => canvas.removeEventListener("webglcontextlost", handleContextLost);
  }, [handleContextLost]);

  if (contextLost) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0f",
          gap: "16px",
          padding: "24px",
        }}
      >
        <h3 style={{ color: "#ef4444" }}>Masalah WebGL</h3>
        <p style={{ color: "#8888a0", textAlign: "center" }}>
          Pelayar anda tidak menyokong WebGL 2 atau sumber terhad.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "12px 24px",
            background: "#f59e0b",
            borderRadius: "8px",
            color: "#000",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Muat Semula
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <Canvas
        shadows={false}
        dpr={[1, 1.5]}
        camera={{ position: [0, 5, 10], fov: 60 }}
        style={{ background: "#0a0a0f" }}
      >
        <color attach="background" args={["#0a0a0f"]} />

        <Physics gravity={[0, -20, 0]}>
          {/* Camera follow player */}
          <CameraFollow />

          {/* Player + Motor */}
          <PlayerController />

          {/* World */}
          <WorldEnvironment />
          <WarehouseBuilding />
          <Destinations />

          {/* Delivery zones */}
          <DeliveryZones />

          {/* NPC Traffic */}
          <NPCTraffic />

          {/* Interaction prompt */}
          <InteractionPrompt />

          {/* Delivery system controller */}
          <DeliverySystemController />

          {/* Lights */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 20, 5]} intensity={1.2} castShadow={false} />

          {/* 3D overlay HUD */}
          <HUD3D />
        </Physics>

        {/* Post-processing */}
        <EffectComposer enableNormalPass={false}>
          <Bloom luminanceThreshold={0.9} intensity={0.15} />
        </EffectComposer>
      </Canvas>

      {/* Touch controls overlay */}
      <TouchJoystick />
      <WarehousePanel />
    </div>
  );
}
