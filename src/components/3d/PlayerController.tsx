import { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboard, useTouches } from '@react-three/drei';
import { Vector3, Euler } from 'three';
import { useGameStateStore } from '@/store/gamestate';

const PLAYER_SPEED = 4;
const PLAYER_RUN_SPEED = 7;
const JUMP_FORCE = 8;
const GRAVITY = -20;

export function PlayerController() {
  const groupRef = useRef<THREE.Group>();
  const velocityRef = useRef(new Vector3(0, 0, 0));
  const onGroundRef = useRef(true);

  const [keys] = useKeyboard();
  const touches = useTouches();

  const positionRef = useRef(new Vector3(0, 1.6, 0));
  const yawRef = useRef(0);
  const pitchRef = useRef(-0.3);

  const player = useGameStateStore((s) => s.player);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    // Movement direction
    const moveX = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    const moveZ = (keys['KeyS'] ? 1 : 0) - (keys['KeyW'] ? 1 : 0);

    // Touch controls (virtual joystick)
    let touchX = 0;
    let touchZ = 0;
    touches.forEach((t) => {
      if (t.identifier?.toString().includes('joystick')) {
        touchX = Math.max(-1, Math.min(1, t.point.x * 2));
        touchZ = Math.max(-1, Math.min(1, t.point.y * 2));
      }
    });

    const finalMoveX = moveX || touchX;
    const finalMoveZ = moveZ || touchZ;
    const isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
    const speed = isRunning ? PLAYER_RUN_SPEED : PLAYER_SPEED;

    const velocity = new Vector3();
    if (Math.abs(finalMoveX) > 0.1 || Math.abs(finalMoveZ) > 0.1) {
      const angle = Math.atan2(finalMoveX, finalMoveZ);
      velocity.x = Math.sin(angle) * speed;
      velocity.z = Math.cos(angle) * speed;
    }

    // Jump
    if ((keys['Space'] || keys['ArrowUp']) && onGroundRef.current) {
      velocity.y = JUMP_FORCE;
      onGroundRef.current = false;
    }

    // Gravity
    if (!onGroundRef.current) {
      velocity.y += GRAVITY * delta;
    }

    // Apply velocity
    positionRef.current.x += velocity.x * delta;
    positionRef.current.y += velocity.y * delta;
    positionRef.current.z += velocity.z * delta;

    // Ground collision
    if (positionRef.current.y <= 1.6) {
      positionRef.current.y = 1.6;
      velocity.y = 0;
      onGroundRef.current = true;
    }

    // Update group
    groupRef.current.position.copy(positionRef.current);

    // Face movement direction
    if (Math.abs(finalMoveX) > 0.1 || Math.abs(finalMoveZ) > 0.1) {
      const targetAngle = Math.atan2(finalMoveX, finalMoveZ);
      const currentRotation = groupRef.current.rotation.y;
      const deltaAngle = targetAngle - currentRotation;

      // Smooth rotation
      let adjustedDelta = deltaAngle;
      if (deltaAngle > Math.PI) adjustedDelta -= Math.PI * 2;
      if (deltaAngle < -Math.PI) adjustedDelta += Math.PI * 2;

      groupRef.current.rotation.y += adjustedDelta * 10 * delta;
    }

    // Simple character body (placeholder)
    // Head
    // Torso
    // Arms
    // Legs
  });

  return (
    <group ref={groupRef}>
      {/* Simple character placeholder - box stack */}
      {/* Head */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.6, 0.8, 0.35]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.15, 0.2, 0]} castShadow>
        <boxGeometry args={[0.2, 0.6, 0.25]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0.15, 0.2, 0]} castShadow>
        <boxGeometry args={[0.2, 0.6, 0.25]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}
