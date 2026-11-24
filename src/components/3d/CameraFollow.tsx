import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { type PerspectiveCamera, Vector3 } from "three";
import { playerState } from "./PlayerController";

const CAMERA_HEIGHT_FOOT = 3;
const CAMERA_HEIGHT_MOTOR = 5;
const CAMERA_DISTANCE = 8;
const CAMERA_LERP = 6;

export function CameraFollow() {
  const camRef = useRef<PerspectiveCamera>(null);
  const camPos = useRef(new Vector3(0, CAMERA_HEIGHT_FOOT, CAMERA_DISTANCE));

  useFrame((_state, delta) => {
    if (!camRef.current) return;
    delta = Math.min(delta, 0.05);

    const target = playerState.getPosition();
    const heading = playerState.getHeading();
    const isOnFoot = playerState.isOnFoot();

    // Camera offset: behind the player/motor
    const camTargetX = target.x - Math.sin(heading) * CAMERA_DISTANCE;
    const camTargetZ = target.z - Math.cos(heading) * CAMERA_DISTANCE;
    const targetHeight = isOnFoot ? CAMERA_HEIGHT_FOOT : CAMERA_HEIGHT_MOTOR;

    // Lerp toward target
    const lerpFactor = Math.min(CAMERA_LERP * delta, 1);
    camPos.current.x += (camTargetX - camPos.current.x) * lerpFactor;
    camPos.current.y += (targetHeight - camPos.current.y) * lerpFactor * 0.5;
    camPos.current.z += (camTargetZ - camPos.current.z) * lerpFactor;

    camRef.current.position.copy(camPos.current);
    camRef.current.lookAt(target.x, target.y + (isOnFoot ? 1 : 0.5), target.z);
  });

  return <camera ref={camRef} />;
}
