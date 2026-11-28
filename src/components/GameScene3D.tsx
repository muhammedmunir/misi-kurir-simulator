import { EngineAudio } from "@/audio/EngineAudio";
import { Receiver } from "@/delivery/Receiver";
import { FpsOverlay, shouldShowFps } from "@/dev/fps";
import { RenderInfoProbe } from "@/dev/render-info";
import { Minimap } from "@/navigation/Minimap";
import { NavArrow } from "@/navigation/NavArrow";
import { startAutosave } from "@/save/autosave";
import { saveBackends } from "@/save/backend";
import { useGameStateStore } from "@/store/gamestate";
import { WarehouseBuilding } from "@/warehouse/WarehouseBuilding";
import { WarehousePanel } from "@/warehouse/WarehousePanel";
import { advanceTime } from "@/world/daytime";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Atmosphere } from "./3d/Atmosphere";
import { CameraFollow } from "./3d/CameraFollow";
import { CityBlocks } from "./3d/CityBlocks";
import { DeliverySystemController } from "./3d/DeliverySystemController";
import { DeliveryZones } from "./3d/DeliveryZones";
import { Destinations } from "./3d/Destinations";
import { HUD3D } from "./3d/HUD3D";
import { InteractionPrompt } from "./3d/InteractionPrompt";
import { NPCTraffic } from "./3d/NPCTraffic";
import { PlayerController } from "./3d/PlayerController";
import { Rain } from "./3d/Rain";
import { StreetProps } from "./3d/StreetProps";
import { WorldEnvironment } from "./3d/WorldEnvironment";
import { TouchJoystick } from "./TouchJoystick";

export function GameScene3D() {
  const [contextLost, setContextLost] = useState(false);

  const handleContextLost = useCallback((e: Event) => {
    e.preventDefault();
    setContextLost(true);
  }, []);

  useEffect(() => startAutosave(saveBackends.current), []);

  useEffect(() => {
    if (contextLost) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const seconds = (now - last) / 1000;
      last = now;
      useGameStateStore.setState((s) => ({ worldMinutes: advanceTime(s.worldMinutes, seconds) }));
    }, 500);
    return () => window.clearInterval(timer);
  }, [contextLost]);

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
        camera={{ position: [0, 5, 10], fov: 60, far: 900 }}
        style={{ background: "#cfe0ee" }}
      >
        {/* Langit, kabus, matahari dan bayang-bayang (Pelan 011). Canvas shadows={false}:
            Atmosphere menghidupkan shadowMap terus pada renderer ikut tetapan grafik. */}
        <Atmosphere />
        <Rain />

        <Physics gravity={[0, -20, 0]}>
          {/* Camera follow player */}
          <CameraFollow />

          {/* Player + Motor */}
          <PlayerController />
          <EngineAudio />

          {/* World */}
          <WorldEnvironment />
          <Suspense fallback={null}>
            <CityBlocks />
          </Suspense>
          <Suspense fallback={null}>
            <StreetProps />
          </Suspense>
          <WarehouseBuilding />
          <Destinations />

          {/* Delivery zones */}
          <DeliveryZones />

          {/* NPC Traffic */}
          <NPCTraffic />

          {/* Receiver figures at delivery zones */}
          <Receiver />

          {/* Interaction prompt */}
          <InteractionPrompt />

          {/* Delivery system controller */}
          <DeliverySystemController />

          {/* 3D overlay HUD */}
          <HUD3D />
        </Physics>

        {import.meta.env.DEV && <RenderInfoProbe />}
      </Canvas>

      {/* Touch controls overlay */}
      <TouchJoystick />
      <WarehousePanel />
      <NavArrow />
      <Minimap />
      {shouldShowFps(import.meta.env.DEV, window.location.search) && <FpsOverlay />}
    </div>
  );
}
