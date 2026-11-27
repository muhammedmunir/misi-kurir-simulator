import { playerState } from "@/components/3d/PlayerController";
import { useGameStateStore } from "@/store/gamestate";
import { MOTOR_PHYS } from "@/vehicles/motor-physics";
import { isRaining } from "@/world/daytime";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { type EngineSound, createEngineSound } from "./engine-sound";

/**
 * Bunyi enjin dan hujan. AudioContext hanya dicipta selepas
 * gerak isyarat pertama pengguna (dasar autoplay pelayar). Mengikut tetapan
 * "Bunyi".
 */
export function EngineAudio(): null {
  const engine = useRef<EngineSound | null>(null);

  useEffect(() => {
    const start = () => {
      if (!engine.current) engine.current = createEngineSound();
    };
    window.addEventListener("keydown", start);
    window.addEventListener("pointerdown", start);
    return () => {
      window.removeEventListener("keydown", start);
      window.removeEventListener("pointerdown", start);
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  useFrame(() => {
    const e = engine.current;
    if (!e) return;
    const { settings, worldMinutes } = useGameStateStore.getState();
    const soundOn = settings.soundEnabled;
    const riding = !playerState.isOnFoot();
    e.update(
      soundOn && riding,
      Math.abs(playerState.getSpeed()) / MOTOR_PHYS.maxSpeed,
      playerState.getThrottle(),
      soundOn && isRaining(settings.rainMode, worldMinutes),
    );
  });

  return null;
}
