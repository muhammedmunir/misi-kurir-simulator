import { interactBlocksMotorSwap } from "@/lib/delivery-system";
import { PARKING_BOXES } from "@/lib/delivery-system";
import { consumeAction, touchInput } from "@/lib/touch";
import { useDeliveryStore } from "@/store/delivery";
import { type MotorState, canDismount, canMount, checkParking, dismountPosition } from "@/vehicles/motor-state";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { type Group, Vector3 } from "three";

// ── Keyboard state ────────────────────────────────────────────────
const keysDown = new Set<string>();

// ── Constants ─────────────────────────────────────────────────────
const WALK_SPEED = 5;
const RUN_SPEED = 9;
const JUMP_FORCE = 9;
const GRAVITY = -20;

const MOTOR_START = { x: 2, z: 2 };
const MOTOR_Y = 0.6;

const MOTOR_ACCEL = 15;
const MOTOR_MAX_SPEED = 25;
const MOTOR_TURN_SPEED = 2.5;
const MOTOR_BREAKING = -20;

// ── Player / motor mutable state ──────────────────────────────────
const pos = new Vector3(0, 1.6, 0);
const vel = new Vector3(0, 0, 0);
let grounded = true;
let onFoot = true;
/** The motor stays wherever it was left. */
const motor: MotorState = { x: MOTOR_START.x, z: MOTOR_START.z, heading: 0, speed: 0 };

// ── World state for save/load ─────────────────────────────────────
export interface WorldState {
  pos: { x: number; z: number };
  onFoot: boolean;
  motor: { x: number; z: number; heading: number };
}

export function getWorldState(): WorldState {
  return {
    pos: { x: pos.x, z: pos.z },
    onFoot,
    motor: { x: motor.x, z: motor.z, heading: motor.heading },
  };
}

export function restoreWorld(w: WorldState): void {
  onFoot = w.onFoot;
  motor.x = w.motor.x;
  motor.z = w.motor.z;
  motor.heading = w.motor.heading;
  motor.speed = 0;
  vel.set(0, 0, 0);
  pos.set(w.pos.x, onFoot ? 1.6 : MOTOR_Y, w.pos.z);
}

// Exposed for camera, HUD and touch controls
export const playerState = {
  getPosition: () => pos,
  getHeading: () =>
    onFoot
      ? Math.abs(vel.x) > 0.1 || Math.abs(vel.z) > 0.1
        ? Math.atan2(vel.x, vel.z)
        : motor.heading
      : motor.heading,
  getSpeed: () => motor.speed,
  isOnFoot: () => onFoot,
  isNearMotor: () => onFoot && canMount(pos, motor),
};

function toggleMotor(): void {
  const now = Date.now();
  if (onFoot) {
    if (!canMount(pos, motor)) return;
    onFoot = false;
    motor.speed = 0;
    pos.set(motor.x, MOTOR_Y, motor.z);
    return;
  }
  if (!canDismount(motor.speed)) {
    useDeliveryStore.getState().notify("Berhenti dulu sebelum turun motor", now);
    return;
  }
  onFoot = true;
  motor.speed = 0;
  const step = dismountPosition(motor);
  pos.set(step.x, 1.6, step.z);
  vel.set(0, 0, 0);
  useDeliveryStore.getState().recordParking(checkParking(motor, PARKING_BOXES), now);
}

/**
 * One interaction (E key or touch action button): delivery first; if the
 * delivery result does not consume the press, mount/dismount the motor.
 */
export function performInteract(): void {
  const { result } = useDeliveryStore.getState().interact(Date.now(), { onFoot });
  if (interactBlocksMotorSwap(result?.action ?? null)) return;
  toggleMotor();
}

// ── Component ─────────────────────────────────────────────────────
export function PlayerController() {
  const groupRef = useRef<Group>(null);
  const motorRef = useRef<Group>(null);

  // Keyboard handlers inside useEffect (not module level)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysDown.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // E key interaction
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore auto-repeat
      if (e.code !== "KeyE" || e.repeat) return;
      e.preventDefault();

      performInteract();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);

    // ── Sync player position to delivery system ───────────────
    useDeliveryStore.getState().setPlayerPosition({ x: pos.x, z: pos.z });

    // ── Handle touch action button ────────────────────────────
    if (consumeAction()) performInteract();

    // ── Gather input from keyboard + touch ────────────────────
    let inputForward = 0;
    let inputRight = 0;

    if (keysDown.has("KeyW") || keysDown.has("ArrowUp")) inputForward += 1;
    if (keysDown.has("KeyS") || keysDown.has("ArrowDown")) inputForward -= 1;
    if (keysDown.has("KeyD") || keysDown.has("ArrowRight")) inputRight += 1;
    if (keysDown.has("KeyA") || keysDown.has("ArrowLeft")) inputRight -= 1;

    // Touch overrides
    const ti = touchInput;
    if (ti.joystick.active) {
      inputForward = ti.joystick.forward;
      inputRight = ti.joystick.right;
    }

    // ── ON FOOT ───────────────────────────────────────────────
    if (onFoot) {
      const isRunning = keysDown.has("ShiftLeft") || keysDown.has("ShiftRight");
      const speed = isRunning ? RUN_SPEED : WALK_SPEED;

      if (Math.abs(inputRight) > 0.15 || Math.abs(inputForward) > 0.15) {
        const angle = Math.atan2(inputRight, inputForward);
        vel.x = Math.sin(angle) * speed;
        vel.z = Math.cos(angle) * speed;
      } else {
        vel.x *= 0.85;
        vel.z *= 0.85;
      }

      // Jump (space or joystick forward peak)
      if ((keysDown.has("Space") || ti.joystick.forward > 0.8) && grounded) {
        vel.y = JUMP_FORCE;
        grounded = false;
      }

      if (!grounded) vel.y += GRAVITY * dt;

      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      pos.z += vel.z * dt;

      if (pos.y <= 1.6) {
        pos.y = 1.6;
        vel.y = 0;
        grounded = true;
      }

      groupRef.current.position.copy(pos);

      // Face movement
      if (Math.abs(inputRight) > 0.15 || Math.abs(inputForward) > 0.15) {
        const targetAngle = Math.atan2(inputRight, inputForward);
        const curRot = groupRef.current.rotation.y;
        let dA = targetAngle - curRot;
        if (dA > Math.PI) dA -= Math.PI * 2;
        if (dA < -Math.PI) dA += Math.PI * 2;
        groupRef.current.rotation.y += dA * 12 * dt;
      }

      groupRef.current.visible = true;

      // ── ON MOTOR ──────────────────────────────────────────────
    } else {
      groupRef.current.visible = false;

      // Throttle / brake
      if (inputForward > 0.15) {
        motor.speed += MOTOR_ACCEL * dt;
      } else if (inputForward < -0.15) {
        motor.speed += MOTOR_BREAKING * dt;
      } else {
        // Natural friction
        if (motor.speed > 0.5) {
          motor.speed -= 5 * dt;
        } else if (motor.speed < -0.5) {
          motor.speed += 5 * dt;
        } else {
          motor.speed = 0;
        }
      }

      // Brake button
      if (ti.brake) {
        if (motor.speed > 0.5) motor.speed -= 25 * dt;
        else if (motor.speed < -0.5) motor.speed += 25 * dt;
        else motor.speed = 0;
      }

      // Clamp
      motor.speed = Math.max(-MOTOR_MAX_SPEED * 0.3, Math.min(MOTOR_MAX_SPEED, motor.speed));

      // Steering (only when moving)
      if (Math.abs(inputRight) > 0.15 && Math.abs(motor.speed) > 0.5) {
        const turnFactor = Math.min(Math.abs(motor.speed) / 10, 1);
        motor.heading +=
          (inputRight > 0 ? 1 : -1) * MOTOR_TURN_SPEED * turnFactor * dt * (Math.abs(motor.speed) / MOTOR_MAX_SPEED);
      }

      // Move motor; the rider (and camera target) moves with it
      motor.x += Math.sin(motor.heading) * motor.speed * dt;
      motor.z += Math.cos(motor.heading) * motor.speed * dt;
      pos.set(motor.x, MOTOR_Y, motor.z);
    }

    // ── Motor mesh: sibling of the player group, placed in world space ──
    if (motorRef.current) {
      motorRef.current.position.set(motor.x, MOTOR_Y, motor.z);
      motorRef.current.rotation.y = motor.heading;
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {/* ── Player ── */}
        <group name="player">
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[0.5, 0.7, 0.3]} />
            <meshStandardMaterial color="#3b82f6" />
          </mesh>
          <mesh position={[-0.12, 0.25, 0]}>
            <boxGeometry args={[0.18, 0.5, 0.2]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.12, 0.25, 0]}>
            <boxGeometry args={[0.18, 0.5, 0.2]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          {/* Courier bag */}
          <mesh position={[0, 0.9, -0.25]}>
            <boxGeometry args={[0.35, 0.35, 0.15]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
        </group>
      </group>

      {/* ── Motor ── */}
      <group ref={motorRef} position={[MOTOR_START.x, MOTOR_Y, MOTOR_START.z]}>
        <group name="motor">
          {/* Front wheel */}
          <mesh position={[0, 0.3, 0.8]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.35, 0.35, 0.1, 16]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          {/* Rear wheel */}
          <mesh position={[0, 0.3, -0.8]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.35, 0.35, 0.1, 16]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          {/* Body/frame */}
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.5, 0.6, 1.6]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          {/* Handlebars */}
          <mesh position={[0, 1.0, 0.85]}>
            <boxGeometry args={[0.6, 0.05, 0.05]} />
            <meshStandardMaterial color="#888888" />
          </mesh>
          {/* Seat */}
          <mesh position={[0, 0.95, -0.1]}>
            <boxGeometry args={[0.4, 0.1, 0.7]} />
            <meshStandardMaterial color="#2d2d2d" />
          </mesh>
          {/* Headlight */}
          <mesh position={[0, 0.8, 0.82]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#ffffaa" emissive="#ffffaa" emissiveIntensity={0.5} />
          </mesh>
          {/* Exhaust */}
          <mesh position={[0.2, 0.2, -0.9]}>
            <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
            <meshStandardMaterial color="#555555" />
          </mesh>
        </group>
      </group>
    </>
  );
}
