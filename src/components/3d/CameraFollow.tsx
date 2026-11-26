import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import { playerState } from "./PlayerController";
import { cameraObstacles, clampCamera } from "./camera-collision";

const CAMERA_HEIGHT_FOOT = 3;
const OBSTACLES = cameraObstacles();
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

    // Redaman eksponen: hasil sama tanpa mengira FPS (30 atau 120).
    const lerpFactor = 1 - Math.exp(-CAMERA_LERP * dt);
    camPos.current.x += (camTargetX - camPos.current.x) * lerpFactor;
    camPos.current.y += (targetHeight - camPos.current.y) * (1 - Math.exp(-CAMERA_LERP * 0.5 * dt));
    camPos.current.z += (camTargetZ - camPos.current.z) * lerpFactor;

    // Klamp kamera supaya tidak masuk ke dalam bangunan atau rumah alamat.
    const eye = { x: target.x, y: target.y + (isOnFoot ? 1 : 0.5), z: target.z };
    const cam = clampCamera(eye, camPos.current, OBSTACLES);
    state.camera.position.set(cam.x, cam.y, cam.z);
    state.camera.lookAt(eye.x, eye.y, eye.z);
  });

  return null;
}
