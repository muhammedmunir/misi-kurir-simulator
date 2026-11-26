import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { useDeliveryStore } from "@/store/delivery";
import { MOTOR_PHYS, speedFov } from "@/vehicles/motor-physics";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { playerState } from "./PlayerController";
import { cameraObstacles, clampCamera } from "./camera-collision";

const CAMERA_HEIGHT_FOOT = 3;
const OBSTACLES = cameraObstacles();
const CAMERA_HEIGHT_MOTOR = 5;
const CAMERA_DISTANCE = 8;
const CAMERA_LERP = 6;
/** Jarak tambahan kamera di belakang motor pada laju maksimum. */
const CAMERA_SPEED_PULLBACK = 2;

/**
 * Sudut kamera serah terima di pintu `door` (rumah di −z). Kamera di sisi jalan,
 * sedikit ke sisi, memandang ke tengah antara kurier dan penerima. Titik pandang
 * direndahkan supaya watak berada di separuh atas skrin, di atas panel.
 */
export function handoverShot(door: { x: number; z: number }, aspect = 1) {
  // Skrin lebar: panel di kanan, jadi titik pandang dianjak ke kanan dan watak
  // muncul di separuh kiri skrin.
  if (aspect < 0.8) {
    // Potret: helaian panel menutup ~2/3 bawah skrin, jadi kamera lebih tinggi dan
    // memandang ke bawah titik watak; watak muncul ~20% dari atas skrin.
    return {
      cam: new Vector3(door.x + 2.5, 4.2, door.z + 9),
      look: new Vector3(door.x - 0.3, -3.5, door.z - 1.0),
    };
  }
  const shift = aspect > 1.3 ? 2.4 : 0;
  return {
    cam: new Vector3(door.x + 3.4 + shift, 3.0, door.z + 6.8),
    look: new Vector3(door.x - 0.3 + shift, 0.2, door.z - 1.0),
  };
}

/** Third-person follow. Moves R3F's default (rendering) camera. */
export function CameraFollow() {
  const camPos = useRef(new Vector3(0, CAMERA_HEIGHT_FOOT, -CAMERA_DISTANCE));
  const lookAt = useRef(new Vector3());

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    const target = playerState.getPosition();
    const heading = playerState.getHeading();
    const isOnFoot = playerState.isOnFoot();

    // Behind the player/motor
    const speed = isOnFoot ? 0 : Math.abs(playerState.getSpeed());
    const dist = CAMERA_DISTANCE + CAMERA_SPEED_PULLBACK * Math.min(speed / MOTOR_PHYS.maxSpeed, 1);
    const camTargetX = target.x - Math.sin(heading) * dist;
    const camTargetZ = target.z - Math.cos(heading) * dist;
    const targetHeight = isOnFoot ? CAMERA_HEIGHT_FOOT : CAMERA_HEIGHT_MOTOR;

    // Redaman eksponen: hasil sama tanpa mengira FPS (30 atau 120).
    const lerpFactor = 1 - Math.exp(-CAMERA_LERP * dt);

    // Serah terima: kamera sinematik dari sisi jalan membingkai kurier dan
    // penerima (rumah di belakang penerima tidak pernah menghalang).
    const h = useDeliveryStore.getState().session.handover;
    const door = h ? DELIVERY_ZONES.find((z) => z.id === h.zoneId)?.position : undefined;
    if (door) {
      const aspect = state.camera instanceof PerspectiveCamera ? state.camera.aspect : 1;
      const shot = handoverShot(door, aspect);
      camPos.current.lerp(shot.cam, lerpFactor);
      lookAt.current.lerp(shot.look, lerpFactor);
      state.camera.position.copy(camPos.current);
      state.camera.lookAt(lookAt.current);
      return;
    }

    camPos.current.x += (camTargetX - camPos.current.x) * lerpFactor;
    camPos.current.y += (targetHeight - camPos.current.y) * (1 - Math.exp(-CAMERA_LERP * 0.5 * dt));
    camPos.current.z += (camTargetZ - camPos.current.z) * lerpFactor;

    // Klamp kamera supaya tidak masuk ke dalam bangunan atau rumah alamat.
    const eye = { x: target.x, y: target.y + (isOnFoot ? 1 : 0.5), z: target.z };
    lookAt.current.set(eye.x, eye.y, eye.z);
    const cam = clampCamera(eye, camPos.current, OBSTACLES);
    state.camera.position.set(cam.x, cam.y, cam.z);
    state.camera.lookAt(eye.x, eye.y, eye.z);

    // FOV melebar bila laju: rasa kelajuan.
    if (state.camera instanceof PerspectiveCamera) {
      const fov = state.camera.fov + (speedFov(speed) - state.camera.fov) * (1 - Math.exp(-3 * dt));
      if (Math.abs(fov - state.camera.fov) > 0.01) {
        state.camera.fov = fov;
        state.camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}
