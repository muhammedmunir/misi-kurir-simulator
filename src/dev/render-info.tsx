/**
 * Dev-only: mendedahkan kiraan draw call renderer (`window.__mks.renderInfo()`)
 * dan sampel kamera per frame (`window.__mks.cameraSamples()`) kepada ujian.
 */
import { playerState } from "@/components/3d/PlayerController";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

type InfoSource = { info: { render: { calls: number; triangles: number } } };

let current: InfoSource | null = null;

export function registerRenderer(r: InfoSource | null): void {
  current = r;
}

export function readRenderInfo(): { calls: number; triangles: number } | null {
  if (!current) return null;
  return {
    calls: current.info.render.calls,
    triangles: current.info.render.triangles,
  };
}

/** Satu sampel selepas setiap render: kedudukan kamera dan sasaran (pemain/motor). */
export type CameraSample = { cx: number; cy: number; cz: number; px: number; pz: number; t: number };

const SAMPLE_MAX = 240;
const samples: CameraSample[] = [];

/** Sampel terkini (paling lama dahulu), sehingga 240 frame. */
export function readCameraSamples(): CameraSample[] {
  return samples.slice();
}

export function RenderInfoProbe(): null {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    registerRenderer(gl);
    return () => registerRenderer(null);
  }, [gl]);
  useEffect(() => {
    // onAfterRender: dipanggil selepas SEMUA useFrame dan render, jadi ini ialah apa yang pemain lihat.
    scene.onAfterRender = () => {
      const p = playerState.getPosition();
      samples.push({
        cx: camera.position.x,
        cy: camera.position.y,
        cz: camera.position.z,
        px: p.x,
        pz: p.z,
        t: performance.now(),
      });
      if (samples.length > SAMPLE_MAX) samples.shift();
    };
    return () => {
      scene.onAfterRender = () => {};
    };
  }, [scene, camera]);
  return null;
}
