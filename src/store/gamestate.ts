import { generateId } from "@/lib/utils";
import type { Delivery, GameSettings, Manifest, Player, Vehicle } from "@/types/game";
import { create } from "zustand";

// ─── Default / factory ────────────────────────────────────────────

export function createPlayer(name = "Pelanggan"): Player {
  const now = Date.now();
  return {
    id: generateId(),
    name,
    level: 1,
    xp: 0,
    xpToNext: 100,
    reputation: 0,
    money: 500000, // Rp 500k modal
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    totalEarnings: 0,
    currentVehicleId: null,
    unlockedAreas: ["bandar", "perumahan"],
    createdAt: now,
    updatedAt: now,
  };
}

export function createSettings(): GameSettings {
  return {
    soundEnabled: true,
    musicVolume: 0.7,
    sfxVolume: 0.8,
    ambientVolume: 0.5,
    graphicsPreset: "medium",
    shadowQuality: "medium",
    textureQuality: "medium",
    drawDistance: 200,
    trafficDensity: 0.5,
    fontScale: 1,
    colorblindMode: false,
    highContrast: false,
    reducedMotion: false,
    telemetryEnabled: true,
  };
}

// ─── Default vehicles ─────────────────────────────────────────────

export const DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: "gen-2-matic",
    name: "Motor Matic Gen-2",
    type: "matic",
    price: 0,
    specs: {
      maxSpeed: 60,
      acceleration: 0.6,
      handling: 0.8,
      fuelCapacity: 5,
      cargoCapacity: 20,
      cargoWeight: 15,
      fuelEfficiency: 0.8,
      durability: 0.7,
    },
    condition: 100,
    fuel: 5,
    currentLocation: "gudang",
    unlocked: true,
    owned: true,
  },
  {
    id: "bebek-classic",
    name: "Motor Bebek Klasik",
    type: "bebek",
    price: 0,
    specs: {
      maxSpeed: 55,
      acceleration: 0.7,
      handling: 0.9,
      fuelCapacity: 4,
      cargoCapacity: 25,
      cargoWeight: 20,
      fuelEfficiency: 0.9,
      durability: 0.75,
    },
    condition: 100,
    fuel: 4,
    currentLocation: "gudang",
    unlocked: true,
    owned: true,
  },
  {
    id: "kargo-up",
    name: "Motor Kargo UP",
    type: "kargo",
    price: 15000000,
    specs: {
      maxSpeed: 70,
      acceleration: 0.5,
      handling: 0.6,
      fuelCapacity: 8,
      cargoCapacity: 60,
      cargoWeight: 50,
      fuelEfficiency: 0.6,
      durability: 0.8,
    },
    condition: 100,
    fuel: 8,
    currentLocation: "gudang",
    unlocked: false,
    owned: false,
  },
  {
    id: "pickup-doble-kabin",
    name: "Pickup Doble Kabin",
    type: "pickup",
    price: 350000000,
    specs: {
      maxSpeed: 100,
      acceleration: 0.4,
      handling: 0.5,
      fuelCapacity: 80,
      cargoCapacity: 200,
      cargoWeight: 500,
      fuelEfficiency: 0.3,
      durability: 0.9,
    },
    condition: 100,
    fuel: 80,
    currentLocation: "gudang",
    unlocked: false,
    owned: false,
  },
  {
    id: "van-combi",
    name: "Van Combi",
    type: "van",
    price: 280000000,
    specs: {
      maxSpeed: 90,
      acceleration: 0.45,
      handling: 0.55,
      fuelCapacity: 60,
      cargoCapacity: 250,
      cargoWeight: 400,
      fuelEfficiency: 0.35,
      durability: 0.85,
    },
    condition: 100,
    fuel: 60,
    currentLocation: "gudang",
    unlocked: false,
    owned: false,
  },
];

// ─── Game store ───────────────────────────────────────────────────

interface GameState {
  player: Player | null;
  vehicles: Vehicle[];
  activeManifest: Manifest | null;
  activeDelivery: Delivery | null;
  settings: GameSettings;
  isNewGame: boolean;

  // Player actions
  createNewGame: (name: string) => void;
  updatePlayer: (updater: (p: Player) => Partial<Player>) => void;
  addMoney: (amount: number) => void;
  spendMoney: (amount: number) => boolean;
  addXP: (amount: number) => void;

  // Vehicle
  selectVehicle: (vehicleId: string) => void;
  upgradeVehicle: (vehicleId: string) => void;

  // Manifest
  createManifest: (packetIds: string[]) => void;
  setManifest: (m: Manifest | null) => void;

  // Delivery
  setActiveDelivery: (d: Delivery | null) => void;

  // Settings
  updateSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;

  // Reset
  resetGame: () => void;
}

export const useGameStateStore = create<GameState>((set) => ({
  player: null,
  vehicles: DEFAULT_VEHICLES,
  activeManifest: null,
  activeDelivery: null,
  settings: createSettings(),
  isNewGame: true,

  createNewGame: (name: string) => {
    set({
      player: createPlayer(name),
      vehicles: DEFAULT_VEHICLES.map((v) => ({ ...v, id: generateId() })),
      activeManifest: null,
      activeDelivery: null,
      settings: createSettings(),
      isNewGame: false,
    });
  },

  updatePlayer: (updater) => {
    set((state) => {
      if (!state.player) return state;
      const updates = updater(state.player);
      return { player: { ...state.player, ...updates, updatedAt: Date.now() } };
    });
  },

  addMoney: (amount: number) => {
    set((state) => {
      if (!state.player) return state;
      const earned = amount;
      return {
        player: {
          ...state.player,
          money: state.player.money + earned,
          totalEarnings: state.player.totalEarnings + earned,
          updatedAt: Date.now(),
        },
      };
    });
  },

  spendMoney: (amount: number) => {
    let result = false;
    set((state) => {
      if (!state.player) return state;
      if (state.player.money < amount) return state;
      result = true;
      return {
        player: {
          ...state.player,
          money: state.player.money - amount,
          updatedAt: Date.now(),
        },
      };
    });
    return result;
  },

  addXP: (amount: number) => {
    set((state) => {
      if (!state.player) return state;
      let newXP = state.player.xp + amount;
      let newLevel = state.player.level;
      let xpToNext = state.player.xpToNext;

      // Level up loop
      while (newXP >= xpToNext) {
        newXP -= xpToNext;
        newLevel++;
        xpToNext = Math.floor(xpToNext * 1.3);
      }

      return {
        player: {
          ...state.player,
          xp: newXP,
          level: newLevel,
          xpToNext,
          updatedAt: Date.now(),
        },
      };
    });
  },

  selectVehicle: (vehicleId: string) => {
    set((state) => {
      if (!state.player) return state;
      return {
        player: {
          ...state.player,
          currentVehicleId: vehicleId,
          updatedAt: Date.now(),
        },
      };
    });
  },

  upgradeVehicle: (vehicleId: string) => {
    set((state) => {
      if (!state.player) return state;
      return {
        vehicles: state.vehicles.map((v) => {
          if (v.id !== vehicleId) return v;
          return {
            ...v,
            specs: {
              ...v.specs,
              maxSpeed: Math.round(v.specs.maxSpeed * 1.1 * 10) / 10,
              acceleration: Math.round(Math.min(v.specs.acceleration * 1.1, 1) * 100) / 100,
              handling: Math.round(Math.min(v.specs.handling * 1.1, 1) * 100) / 100,
              durability: Math.min(v.specs.durability + 0.1, 1),
              fuelEfficiency: Math.round(Math.min(v.specs.fuelEfficiency * 1.05, 1) * 100) / 100,
            },
            condition: Math.min(v.condition + 20, 100),
          };
        }),
      };
    });
  },

  createManifest: (packetIds: string[]) => {
    set((state) => {
      if (!state.player) return state;
      const now = new Date();
      const date = now.toISOString().split("T")[0];
      return {
        ...state,
        activeManifest: {
          id: generateId(),
          date,
          packets: packetIds,
          totalPackets: packetIds.length,
          totalWeight: 0,
          totalVolume: 0,
          codTotal: 0,
          status: "open",
          createdAt: Date.now(),
          closedAt: null,
        },
      };
    });
  },

  setManifest: (m: Manifest | null) => {
    set({ activeManifest: m });
  },

  setActiveDelivery: (d: Delivery | null) => {
    set({ activeDelivery: d });
  },

  updateSetting: (key, value) => {
    set((state) => ({ settings: { ...state.settings, [key]: value } }));
  },

  resetGame: () => {
    set({
      player: null,
      vehicles: DEFAULT_VEHICLES,
      activeManifest: null,
      activeDelivery: null,
      settings: createSettings(),
      isNewGame: true,
    });
  },
}));
