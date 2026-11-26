import { interactBlocksMotorSwap } from "@/lib/delivery-system";
import { PARKING_BOXES } from "@/lib/delivery-system";
import { liveTrafficRects } from "@/lib/npc-traffic";
import { consumeAction, touchInput } from "@/lib/touch";
import { useDeliveryStore } from "@/store/delivery";
import { stepMotor } from "@/vehicles/motor-physics";
import { type MotorState, canDismount, canMount, checkParking, dismountPosition } from "@/vehicles/motor-state";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { type Group, Vector3 } from "three";
import { MOTOR_RADIUS, PLAYER_RADIUS, angleDelta, moveHeading, resolveCircle, worldColliders } from "./world-collision";

// ── Keyboard state ────────────────────────────────────────────────
const keysDown = new Set<string>();

// ── Constants ─────────────────────────────────────────────────────
const WALK_SPEED = 5;
const RUN_SPEED = 9;
const JUMP_FORCE = 9;
const GRAVITY = -20;

const MOTOR_START = { x: 2, z: 2 };
/** Asal kumpulan motor: roda (jejari 0.35, pusat +0.3) menyentuh tanah. */
const MOTOR_Y = 0.05;
/** Kaki watak bermula pada y = 0 dalam kumpulannya, jadi tanah = 0. */
const GROUND_Y = 0;
/** Ketinggian kumpulan watak semasa duduk di atas tempat duduk motor. */
const RIDER_Y = MOTOR_Y + 0.55;
/** Kadar kamera berjalan kaki menyusul arah hadapan watak (rad/s). */
const VIEW_FOLLOW = 2.5;

const COLLIDERS = worldColliders();

/**
 * Keutamaan useFrame: negatif = berjalan SEBELUM kamera (keutamaan 0), supaya
 * kamera mengikut kedudukan frame ini, bukan frame lepas (punca gegaran).
 * Nilai negatif tidak mengambil alih render R3F.
 */
export const PLAYER_FRAME_PRIORITY = -1;

/** Jejari roda motor (untuk putaran roda). */
const WHEEL_R = 0.35;

// ── Player / motor mutable state ──────────────────────────────────
const pos = new Vector3(0, GROUND_Y, 0);
const vel = new Vector3(0, 0, 0);
let grounded = true;
let onFoot = true;
/** Arah pandangan kamera semasa berjalan kaki (heading). */
let viewYaw = 0;
/** Stereng ditapis dan condongan motor (rad); lihat `stepMotor`. */
let motorSteer = 0;
let motorLean = 0;
/** Masa notis langgar terakhir (ms) supaya mesej tidak berulang setiap frame. */
let lastCrashNotice = 0;
/** Input pendikit terakhir (-1..1), untuk bunyi enjin. */
let lastThrottle = 0;
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
  motorSteer = 0;
  motorLean = 0;
  viewYaw = w.motor.heading;
  vel.set(0, 0, 0);
  pos.set(w.pos.x, onFoot ? GROUND_Y : MOTOR_Y, w.pos.z);
}

// Exposed for camera, HUD and touch controls
export const playerState = {
  getPosition: () => pos,
  /** Arah pandangan kamera: viewYaw semasa berjalan, arah motor semasa memandu. */
  getHeading: () => (onFoot ? viewYaw : motor.heading),
  getSpeed: () => motor.speed,
  getThrottle: () => lastThrottle,
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
  const safe = resolveCircle(step, PLAYER_RADIUS, COLLIDERS);
  pos.set(safe.x, GROUND_Y, safe.z);
  vel.set(0, 0, 0);
  viewYaw = motor.heading;
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
  const wheelRefs = useRef<(Group | null)[]>([]);

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

      // Arah relatif kepada kamera: D/joystick kanan = kanan skrin.
      const angle = moveHeading(viewYaw, inputForward, inputRight);
      if (angle !== null) {
        const mag = Math.min(1, Math.hypot(inputForward, inputRight));
        vel.x = Math.sin(angle) * speed * mag;
        vel.z = Math.cos(angle) * speed * mag;
        // Kamera menyusul perlahan hanya bila bergerak ke hadapan, supaya
        // A/D bergerak ke sisi tanpa kamera berpusing.
        if (inputForward > 0.2) {
          const d = angleDelta(angle, viewYaw);
          viewYaw += Math.max(-1, Math.min(1, d)) * VIEW_FOLLOW * inputForward * dt;
        }
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
      const solved = resolveCircle(pos, PLAYER_RADIUS, COLLIDERS);
      pos.x = solved.x;
      pos.z = solved.z;

      if (pos.y <= GROUND_Y) {
        pos.y = GROUND_Y;
        vel.y = 0;
        grounded = true;
      }

      groupRef.current.position.copy(pos);

      // Face movement
      if (angle !== null) {
        const curRot = groupRef.current.rotation.y;
        groupRef.current.rotation.y = curRot + angleDelta(angle, curRot) * Math.min(1, 12 * dt);
      }
      groupRef.current.rotation.z = 0;

      // ── ON MOTOR ──────────────────────────────────────────────
    } else {
      lastThrottle = inputForward;
      const next = stepMotor(
        { speed: motor.speed, heading: motor.heading, steer: motorSteer, lean: motorLean },
        { throttle: inputForward, steer: inputRight, handBrake: ti.brake },
        dt,
      );
      motor.speed = next.speed;
      motor.heading = next.heading;
      motorSteer = next.steer;
      motorLean = next.lean;

      // Move motor; the rider (and camera target) moves with it
      motor.x += Math.sin(motor.heading) * motor.speed * dt;
      motor.z += Math.cos(motor.heading) * motor.speed * dt;
      const solved = resolveCircle(motor, MOTOR_RADIUS, COLLIDERS);
      if (solved.hit) {
        motor.x = solved.x;
        motor.z = solved.z;
        motor.speed *= 0.5; // hentaman: hilang separuh laju
      }
      const hitCar = resolveCircle(motor, MOTOR_RADIUS, liveTrafficRects());
      if (hitCar.hit) {
        motor.x = hitCar.x;
        motor.z = hitCar.z;
        const now = Date.now();
        if (Math.abs(motor.speed) > 4 && now - lastCrashNotice > 2500) {
          lastCrashNotice = now;
          useDeliveryStore.getState().notify("Hati-hati! Anda melanggar kenderaan", now);
        }
        motor.speed *= 0.2;
      }
      pos.set(motor.x, MOTOR_Y, motor.z);

      // Penunggang duduk di atas motor dan condong bersamanya (paksi condong = tanah).
      const h = RIDER_Y - MOTOR_Y;
      groupRef.current.position.set(
        motor.x - h * Math.sin(motorLean) * Math.cos(motor.heading),
        MOTOR_Y + h * Math.cos(motorLean),
        motor.z + h * Math.sin(motorLean) * Math.sin(motor.heading),
      );
      groupRef.current.rotation.set(0, motor.heading, motorLean);
    }

    // ── Motor mesh: sibling of the player group, placed in world space ──
    if (motorRef.current) {
      motorRef.current.position.set(motor.x, MOTOR_Y, motor.z);
      motorRef.current.rotation.set(0, motor.heading, onFoot ? 0 : motorLean);
      const spin = (motor.speed * dt) / WHEEL_R;
      for (const w of wheelRefs.current) if (w) w.rotation.x += spin;
    }
  }, PLAYER_FRAME_PRIORITY);

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
          {/* Roda depan dan belakang: kumpulan berputar pada paksi x mengikut laju */}
          {[0.8, -0.8].map((z, i) => (
            <group
              key={z}
              position={[0, 0.3, z]}
              ref={(g) => {
                wheelRefs.current[i] = g;
              }}
            >
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.1, 16]} />
                <meshStandardMaterial color="#1a1a1a" />
              </mesh>
              {/* Jejari: menunjukkan putaran roda */}
              <mesh>
                <boxGeometry args={[0.12, 0.5, 0.06]} />
                <meshStandardMaterial color="#9ca3af" />
              </mesh>
            </group>
          ))}
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
