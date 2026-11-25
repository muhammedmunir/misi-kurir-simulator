/** Dev-only: mendedahkan kiraan draw call renderer kepada ujian (`window.__mks.renderInfo()`). */
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

export function RenderInfoProbe(): null {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    registerRenderer(gl);
    return () => registerRenderer(null);
  }, [gl]);
  return null;
}
