/** Pure motor/parking rules. PlayerController owns the mutable instance. */

export interface MotorState {
  x: number;
  z: number;
  heading: number;
  speed: number;
}

export interface Rect {
  /** Centre. */
  x: number;
  z: number;
  /** Half extents along world x / z. */
  halfX: number;
  halfZ: number;
}

export const MOUNT_DISTANCE = 3;
/** Below this speed (units/s) the rider may get off. */
export const DISMOUNT_MAX_SPEED = 1;
/** Rider steps off this far to the motor's right. */
const STEP_OFF = 1.5;

export function canDismount(speed: number): boolean {
  return Math.abs(speed) < DISMOUNT_MAX_SPEED;
}

export function distanceTo(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function canMount(player: { x: number; z: number }, motor: MotorState): boolean {
  return distanceTo(player, motor) <= MOUNT_DISTANCE;
}

/** Where the rider stands after getting off: beside the motor, on its right. */
export function dismountPosition(motor: MotorState): { x: number; z: number } {
  // forward = (sin h, cos h); right = forward × up = (-cos h, sin h)
  return {
    x: motor.x - Math.cos(motor.heading) * STEP_OFF,
    z: motor.z + Math.sin(motor.heading) * STEP_OFF,
  };
}

export function isInRect(p: { x: number; z: number }, r: Rect): boolean {
  return Math.abs(p.x - r.x) <= r.halfX && Math.abs(p.z - r.z) <= r.halfZ;
}

export interface ParkingCheck {
  /** Destination whose box (or surroundings) the motor was left at, if any. */
  zoneId: string | null;
  proper: boolean;
}

/** How close to a box still counts as "parked at that address" (for the warning). */
const NEAR_BOX = 12;

/**
 * Classify where the motor was left. Only parking near a destination matters;
 * anywhere else returns `{ zoneId: null, proper: true }`.
 */
export function checkParking(
  motor: { x: number; z: number },
  boxes: readonly { zoneId: string; box: Rect }[],
): ParkingCheck {
  for (const { zoneId, box } of boxes) {
    if (isInRect(motor, box)) return { zoneId, proper: true };
  }
  for (const { zoneId, box } of boxes) {
    if (distanceTo(motor, box) <= NEAR_BOX) return { zoneId, proper: false };
  }
  return { zoneId: null, proper: true };
}
