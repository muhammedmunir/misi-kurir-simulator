import type { GameSettings, Player } from "@/types/game";
import { Scene } from "@/types/scene";
import { create } from "zustand";
import { createSettings } from "./gamestate";

interface SceneManagerState {
  currentScene: Scene;
  nextScene: Scene | null;
  isTransitioning: boolean;
  navigate: (scene: Scene) => void;
  confirmScene: () => void;
  cancelTransition: () => void;
}

export const useSceneStore = create<SceneManagerState>((set) => ({
  currentScene: Scene.MENU,
  nextScene: null,
  isTransitioning: false,
  navigate: (scene: Scene) => set({ nextScene: scene, isTransitioning: true }),
  confirmScene: () =>
    set((state) => ({ currentScene: state.nextScene ?? state.currentScene, nextScene: null, isTransitioning: false })),
  cancelTransition: () => set({ nextScene: null, isTransitioning: false }),
}));

interface PlayerState {
  player: Player | null;
  updatePlayer: (updates: Partial<Player>) => void;
  resetPlayer: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  player: null,
  updatePlayer: (updates) => {
    // TODO: Update player data
    set((state) => ({ player: state.player ? { ...state.player, ...updates, updatedAt: Date.now() } : null }));
  },
  resetPlayer: () => set({ player: null }),
}));

interface GameState {
  settings: GameSettings;
  updateSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
}

export const useGameStore = create<GameState>((set) => ({
  settings: createSettings(),
  updateSetting: (key, value) => set((state) => ({ settings: { ...state.settings, [key]: value } })),
}));
