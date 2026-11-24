import { generateId, generateTrackingNumber } from "./utils";

// ── Delivery Zone ──────────────────────────────────────────────────

interface DeliveryZone {
  id: string;
  name: string;
  type: "pickup" | "delivery";
  position: { x: number; z: number };
  areaCode: string;
  description: string;
  interactable?: boolean;
}

// ── Delivery System State ────────────────────────────────────────

interface DeliverySession {
  state: "idle" | "hasPacket" | "enRoute" | "arrived" | "complete";
  packetId: string | null;
  trackingNumber: string | null;
  targetZone: DeliveryZone | null;
  reward: number;
  xpReward: number;
  hasPacket: boolean;
  nearbyZone: DeliveryZone | null;
  interactionCooldown: number;
  deliveredAt: number | null;
}

const session: DeliverySession = {
  state: "idle",
  packetId: null,
  trackingNumber: null,
  targetZone: null,
  reward: 0,
  xpReward: 0,
  hasPacket: false,
  nearbyZone: null,
  interactionCooldown: 0,
  deliveredAt: null,
};

// ── Zone Data ────────────────────────────────────────────────────

const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: "zone-pickup-1",
    name: "Balik Pos Pusat",
    type: "pickup",
    position: { x: 0, z: 0 },
    areaCode: "bandar",
    description: "Balik pos untuk penghantaran pertama",
    interactable: true,
  },
  {
    id: "zone-delivery-1",
    name: "Kedai Runcit Mak Amin",
    type: "delivery",
    position: { x: 40, z: 40 },
    areaCode: "perumahan",
    description: "Penghantaran ke kedai runcit",
    interactable: true,
  },
  {
    id: "zone-delivery-2",
    name: "Kafe Kampung Digital",
    type: "delivery",
    position: { x: -40, z: -40 },
    areaCode: "pasar",
    description: "Penghantaran ke kafe tempatan",
    interactable: true,
  },
  {
    id: "zone-delivery-3",
    name: "Pusat Industri Timur",
    type: "delivery",
    position: { x: 80, z: -40 },
    areaCode: "industri",
    description: "Penghantaran kargo industri",
    interactable: true,
  },
  {
    id: "zone-pickup-2",
    name: "Balik Pos Timur",
    type: "pickup",
    position: { x: 80, z: 40 },
    areaCode: "bandar",
    description: "Balik pos kedua untuk penghantaran baru",
    interactable: true,
  },
];

// ── Public API ───────────────────────────────────────────────────

export const DELIVERY_SYSTEM = {
  getSession: () => session,
  getZones: () => DELIVERY_ZONES,
  getPlayerPosition: () => {
    // Will be set by PlayerController
    return playerPosRef.current;
  },

  setPlayerPosition: (pos: { x: number; z: number }) => {
    playerPosRef.current = pos;
  },

  setNearbyZone: (zone: DeliveryZone | null) => {
    session.nearbyZone = zone;
  },

  resetSession: () => {
    session.state = "idle";
    session.packetId = null;
    session.trackingNumber = null;
    session.targetZone = null;
    session.reward = 0;
    session.xpReward = 0;
    session.hasPacket = false;
    session.nearbyZone = null;
    session.interactionCooldown = 0;
    session.deliveredAt = null;
  },

  checkInteract: (): { action: "pickup" | "deliver" | "nothing"; message: string } | null => {
    if (session.interactionCooldown > 0) {
      session.interactionCooldown -= 0.016;
      if (session.interactionCooldown < 0) session.interactionCooldown = 0;
      return null;
    }

    if (!session.nearbyZone) return null;
    const zone = session.nearbyZone;

    if (zone.type === "pickup" && !session.hasPacket) {
      // Pick up packet
      session.hasPacket = true;
      session.packetId = generateId();
      session.trackingNumber = generateTrackingNumber("MSK");
      session.state = "hasPacket";

      // Pick random delivery zone (not the pickup zone)
      const deliveryZones = DELIVERY_ZONES.filter((z) => z.type === "delivery");
      session.targetZone = deliveryZones[Math.floor(Math.random() * deliveryZones.length)];
      session.reward = Math.floor(2000 + Math.random() * 5000);
      session.xpReward = 25 + Math.floor(Math.random() * 25);

      session.interactionCooldown = 0.5;
      return {
        action: "pickup",
        message: `Pilih paket dari ${zone.name}`,
      };
    }

    if (zone.type === "delivery" && session.hasPacket && zone.id === session.targetZone?.id) {
      // Deliver packet
      session.hasPacket = false;
      session.state = "complete";
      session.deliveredAt = Date.now();

      session.interactionCooldown = 1.0;
      return {
        action: "deliver",
        message: `Penghantaran selesai! +Rp ${session.reward.toLocaleString("id-ID")} | +${session.xpReward} XP`,
      };
    }

    if (zone.type === "pickup" && session.hasPacket) {
      return { action: "nothing", message: "Anda sudah ada paket. Hantar dulu yang sedia ada." };
    }

    return { action: "nothing", message: "Tiada aktiviti di sini" };
  },
};

// ── Player Position (set from PlayerController) ──────────────────

const playerPosRef = { current: { x: 0, z: 0 } as { x: number; z: number } };

// ── Auto-reset after complete ────────────────────────────────────

setInterval(() => {
  if (session.state === "complete" && session.deliveredAt && Date.now() - session.deliveredAt > 5000) {
    // Return to idle after 5 seconds
    session.state = "idle";
    session.targetZone = null;
    session.reward = 0;
    session.xpReward = 0;
  }
}, 1000);

// ── NPC Traffic ────────────────────────────────────────────────────

export interface NPCTrafficVehicle {
  id: string;
  position: { x: number; z: number };
  heading: number;
  speed: number;
  color: string;
  roadAxis: "x" | "z";
  roadValue: number;
  direction: 1 | -1;
}

const NPC_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#8b5cf6", "#06b6d4", "#f97316"];

const ROAD_VALUES: number[] = [];
for (let i = -3; i <= 3; i++) {
  ROAD_VALUES.push(i * 40);
}

export function generateNPCTraffic(count: number): NPCTrafficVehicle[] {
  const vehicles: NPCTrafficVehicle[] = [];

  for (let i = 0; i < count; i++) {
    const roadIdx = Math.floor(Math.random() * ROAD_VALUES.length);
    const roadValue = ROAD_VALUES[roadIdx];
    const isZAxis = Math.random() > 0.5;
    const direction = Math.random() > 0.5 ? 1 : -1;

    vehicles.push({
      id: generateId(),
      position: {
        x: isZAxis ? roadValue : (Math.random() - 0.5) * 400,
        z: isZAxis ? (Math.random() - 0.5) * 400 : roadValue,
      },
      heading: direction === 1 ? 0 : Math.PI,
      speed: 2 + Math.random() * 4,
      color: NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)],
      roadAxis: isZAxis ? "z" : "x",
      roadValue,
      direction,
    });
  }

  return vehicles;
}

export function updateNPCTraffic(vehicles: NPCTrafficVehicle[], delta: number): NPCTrafficVehicle[] {
  return vehicles.map((v) => {
    const moveAmount = v.speed * v.direction * delta;

    if (v.roadAxis === "z") {
      let newPos = v.position.z + moveAmount;
      if (newPos > 200) newPos = -200;
      if (newPos < -200) newPos = 200;
      return { ...v, position: { ...v.position, z: newPos } };
    } else {
      let newPos = v.position.x + moveAmount;
      if (newPos > 200) newPos = -200;
      if (newPos < -200) newPos = 200;
      return { ...v, position: { ...v.position, x: newPos } };
    }
  });
}
