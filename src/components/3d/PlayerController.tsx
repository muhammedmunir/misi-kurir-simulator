import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Group } from 'three';

const PLAYER_SPEED = 4;
const PLAYER_RUN_SPEED = 7;
const JUMP_FORCE = 8;
const GRAVITY = -20;

// Keyboard state
const keysDown = new Set<string>();

document.addEventListener('keydown', (e) => {
  keysDown.add(e.code);
});
document.addEventListener('keyup', (e) => {
  keysDown.delete(e.code);
});

export function PlayerController() {
  const groupRef = useRef<Group>(null);
  const posRef = useRef(new Vector3(0, 1.6, 0));
  const groundedRef = useRef(true);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    // Movement direction
    const forward = (keysDown.has('KeyW') ? 1 : 0) - (keysDown.has('KeyS') ? 1 : 0);
    const right = (keysDown.has('KeyD') ? 1 : 0) - (keysDown.has('KeyA') ? 1 : 0);

    let speed = PLAYER_SPEED;
    if (keysDown.has('ShiftLeft') || keysDown.has('ShiftRight')) {
      speed = PLAYER_RUN_SPEED;
    }

    const vel = new Vector3();
    if (Math.abs(right) > 0.1 || Math.abs(forward) > 0.1) {
      const angle = Math.atan2(right, forward);
      vel.x = Math.sin(angle) * speed;
      vel.z = Math.cos(angle) * speed;
    }

    // Jump
    if ((keysDown.has('Space') || keysDown.has('ArrowUp')) && groundedRef.current) {
      vel.y = JUMP_FORCE;
      groundedRef.current = false;
    }

    // Gravity
    if (!groundedRef.current) {
      vel.y += GRAVITY * delta;
    }

    // Apply velocity
    posRef.current.x += vel.x * delta;
    posRef.current.y += vel.y * delta;
    posRef.current.z += vel.z * delta;

    // Ground collision
    if (posRef.current.y <= 1.6) {
      posRef.current.y = 1.6;
      vel.y = 0;
      groundedRef.current = true;
    }

    // Update group
    groupRef.current.position.copy(posRef.current);

    // Face movement direction
    if (Math.abs(right) > 0.1 || Math.abs(forward) > 0.1) {
      const targetAngle = Math.atan2(right, forward);
      const currentRotation = groupRef.current.rotation.y;
      let deltaAngle = targetAngle - currentRotation;

      // Normalize angle
      if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
      if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

      groupRef.current.rotation.y += deltaAngle * 10 * delta;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.6, 0.8, 0.35]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.15, 0.2, 0]}>
        <boxGeometry args={[0.2, 0.6, 0.25]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0.15, 0.2, 0]}>
        <boxGeometry args={[0.2, 0.6, 0.25]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}
