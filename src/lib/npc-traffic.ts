const NPC_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#8b5cf6", "#06b6d4", "#f97316"];

const ROAD_VALUES: number[] = [];
for (let i = -3; i <= 3; i++) {
  ROAD_VALUES.push(i * 40);
}

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

export function generateNPCTraffic(count: number, rng: () => number = Math.random): NPCTrafficVehicle[] {
  const vehicles: NPCTrafficVehicle[] = [];

  for (let i = 0; i < count; i++) {
    const r = rng;
    const roadIdx = Math.floor(r() * ROAD_VALUES.length);
    const roadValue = ROAD_VALUES[roadIdx];
    const isZAxis = r() > 0.5;
    const direction = (r() > 0.5 ? 1 : -1) as 1 | -1;

    vehicles.push({
      id: `npc-${i}`,
      position: {
        x: isZAxis ? roadValue : (r() - 0.5) * 400,
        z: isZAxis ? (r() - 0.5) * 400 : roadValue,
      },
      heading: isZAxis ? (direction === 1 ? 0 : Math.PI) : direction === 1 ? Math.PI / 2 : -Math.PI / 2,
      speed: 2 + r() * 4,
      color: NPC_COLORS[Math.floor(r() * NPC_COLORS.length)],
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
    }
    let newPos = v.position.x + moveAmount;
    if (newPos > 200) newPos = -200;
    if (newPos < -200) newPos = 200;
    return { ...v, position: { ...v.position, x: newPos } };
  });
}
