import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import { playerState } from "./PlayerController";

const CAMERA_HEIGHT_FOOT = 3;
const CAMERA_HEIGHT_MOTOR = 5;
const CAMERA_DISTANCE = 8;
const CAMERA_LERP = 6;

/** Third-person follow. Moves R3F's default (rendering) camera. */
export function CameraFollow() {
  const camPos = useRef(new Vector3(0, CAMERA_HEIGHT_FOOT, -CAMERA_DISTANCE));

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    const target = playerState.getPosition();
    const heading = playerState.getHeading();
    const isOnFoot = playerState.isOnFoot();

    // Behind the player/motor
    const camTargetX = target.x - Math.sin(heading) * CAMERA_DISTANCE;
    const camTargetZ = target.z - Math.cos(heading) * CAMERA_DISTANCE;
    const targetHeight = isOnFoot ? CAMERA_HEIGHT_FOOT : CAMERA_HEIGHT_MOTOR;

    const lerpFactor = Math.min(CAMERA_LERP * dt, 1);
    camPos.current.x += (camTargetX - camPos.current.x) * lerpFactor;
    camPos.current.y += (targetHeight - camPos.current.y) * lerpFactor * 0.5;
    camPos.current.z += (camTargetZ - camPos.current.z) * lerpFactor;

    state.camera.position.copy(camPos.current);
    state.camera.lookAt(target.x, target.y + (isOnFoot ? 1 : 0.5), target.z);
  });

  return null;
}
