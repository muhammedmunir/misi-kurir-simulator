import { create } from 'zustand';
import { Scene } from '@/types/scene';
import type { Player, GameSettings, Vehicle, Packet, Delivery, Manifest, SaveData, SaveSlot } from '@/types/game';
import * as idb from '@/lib/idb';
import { nanoid } from '@/lib/utils';

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
  confirmScene: () => set((state) => ({ currentScene: state.nextScene ?? state.currentScene, nextScene: null, isTransitioning: false })),
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
  settings: {
    soundEnabled: true,
    musicVolume: 0.7,
    sfxVolume: 0.8,
    ambientVolume: 0.5,
    graphicsPreset: 'medium',
    shadowQuality: 'medium',
    textureQuality: 'medium',
    drawDistance: 200,
    trafficDensity: 0.5,
    fontScale: 1,
    colorblindMode: false,
    highContrast: false,
    reducedMotion: false,
    telemetryEnabled: true,
  },
  updateSetting: (key, value) => set((state) => ({ settings: { ...state.settings, [key]: value } })),
}));
