export type PacketStatus =
  | "incoming"
  | "received"
  | "sorting"
  | "ready_to_dispatch"
  | "loaded"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned"
  | "cancelled";

export type PaymentMethod = "cod" | "prepaid" | "wallet";

export type Priority = "normal" | "express" | "urgent";

export interface Packet {
  id: string;
  trackingNumber: string;
  senderName: string;
  receiverName: string;
  senderAddress: string;
  receiverAddress: string;
  areaCode: string;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  volume: number;
  paymentMethod: PaymentMethod;
  codAmount: number;
  priority: Priority;
  specialInstructions: string;
  status: PacketStatus;
  history: PacketHistoryEntry[];
  /** False jika paket COD dititip tanpa kutipan; rekod lama menganggap COD paket dihantar telah dikutip. */
  codCollected?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PacketHistoryEntry {
  status: PacketStatus;
  timestamp: number;
  reason: string;
}

export interface Manifest {
  id: string;
  date: string;
  packets: string[];
  totalPackets: number;
  totalWeight: number;
  totalVolume: number;
  codTotal: number;
  status: "open" | "closed" | "archived";
  createdAt: number;
  closedAt: number | null;
}

export type VehicleType = "matic" | "bebek" | "kargo" | "touring" | "pickup" | "van" | "truk";

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  price: number;
  specs: {
    maxSpeed: number;
    acceleration: number;
    handling: number;
    fuelCapacity: number;
    cargoCapacity: number;
    cargoWeight: number;
    fuelEfficiency: number;
    durability: number;
  };
  condition: number;
  fuel: number;
  currentLocation: string;
  unlocked: boolean;
  owned: boolean;
}

export type AreaCode =
  | "bandar"
  | "perumahan"
  | "pasar"
  | "industri"
  | "kampung"
  | "sawah"
  | "perbukitan"
  | "johor"
  | "pinang"
  | "melaka"
  | "kelantan";

export interface Delivery {
  id: string;
  packetId: string;
  trackingNumber: string;
  receiverName: string;
  receiverAddress: string;
  areaCode: AreaCode;
  destination: { x: number; y: number; z: number };
  distance: number;
  codAmount: number;
  reward: number;
  xpReward: number;
  estimatedTime: number;
  status: "pending" | "active" | "completed" | "failed" | "returning";
  startedAt: number | null;
  completedAt: number | null;
  failureReason: string | null;
  proofUrl: string | null;
}

export interface Player {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  reputation: number;
  money: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  totalEarnings: number;
  currentVehicleId: string | null;
  unlockedAreas: AreaCode[];
  createdAt: number;
  updatedAt: number;
}

export interface GameSettings {
  rainMode: "auto" | "on" | "off";
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  graphicsPreset: "low" | "medium" | "high";
  shadowQuality: "none" | "low" | "medium" | "high";
  textureQuality: "low" | "medium" | "high";
  drawDistance: number;
  trafficDensity: number;
  fontScale: 1 | 1.25 | 1.5;
  colorblindMode: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  telemetryEnabled: boolean;
}

export interface SaveSlot {
  id: string;
  timestamp: number;
  player: Player;
  manifest: Manifest | null;
  packets: Packet[];
  deliveries: Delivery[];
  vehicles: Vehicle[];
  settings: GameSettings;
  version: string;
}

export interface SaveData {
  slots: SaveSlot[];
  selectedSlot: number;
  lastPlayTime: number;
  totalPlayTime: number;
}
