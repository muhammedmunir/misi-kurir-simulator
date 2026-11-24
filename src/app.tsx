import { useSceneStore } from "@/store/game";
import { Scene } from "@/types/scene";
import { useEffect } from "react";
import { GameScene3D } from "./components/GameScene3D";
import { HUD } from "./components/HUD";
import { LoadSavePanel } from "./components/LoadSavePanel";
import { MainMenu } from "./components/MainMenu";
import { SettingsPanel } from "./components/SettingsPanel";
import { WarehouseUI } from "./components/WarehouseUI";

export function App() {
  const { currentScene, nextScene, confirmScene } = useSceneStore();

  // Complete a requested transition after a brief delay
  useEffect(() => {
    if (nextScene === null) return;
    const timer = setTimeout(() => confirmScene(), 100);
    return () => clearTimeout(timer);
  }, [nextScene, confirmScene]);

  return (
    <div className="app-root" style={{ height: "100dvh", width: "100vw", overflow: "hidden", background: "#0a0a0f" }}>
      {currentScene === Scene.MENU && <MainMenu />}
      {currentScene === Scene.LOAD_SAVE && <LoadSavePanel />}
      {currentScene === Scene.GAME && <GameScene3D />}
      {currentScene === Scene.WAREHOUSE && <WarehouseUI />}
      {currentScene === Scene.SETTINGS && <SettingsPanel />}
      <HUD />
    </div>
  );
}
