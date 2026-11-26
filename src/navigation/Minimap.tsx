import { playerState } from "@/components/3d/PlayerController";
import { pendingCargo } from "@/lib/delivery-system";
import { useDeliveryStore } from "@/store/delivery";
import { WAREHOUSE } from "@/warehouse/warehouse-logic";
import { useEffect, useRef } from "react";
import { MINIMAP_RANGE, clampToRadius, toMinimap } from "./minimap-math";

const ROAD_LINES = [-120, -80, -40, 0, 40, 80, 120];
const ROAD_W = 12;
const ROAD_HALF_LEN = 200;

/**
 * Minimap bulat, arah hadapan ke atas. Dilukis terus ke kanvas pada ~15 Hz
 * (tiada render semula React). Jalan, gudang (hijau), alamat dengan paket
 * (amber; di tepi jika jauh) dan alamat lain (kelabu). Disorok semasa panel terbuka.
 */
export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const draw = () => {
      const session = useDeliveryStore.getState().session;
      const hidden = session.panelOpen || session.handover !== null || session.summary != null;
      if (wrapRef.current) wrapRef.current.style.visibility = hidden ? "hidden" : "visible";
      if (hidden) return;

      const size = canvas.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(size * dpr)) {
        canvas.width = Math.round(size * dpr);
        canvas.height = Math.round(size * dpr);
      }
      const r = size / 2;
      const k = r / MINIMAP_RANGE; // piksel per meter
      const p = playerState.getPosition();
      const h = playerState.getHeading();
      const proj = (x: number, z: number) => toMinimap({ x, z }, p, h);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#1f3a1f";
      ctx.fillRect(0, 0, size, size);

      // Jalan: setiap jalan sebagai garis tebal.
      ctx.strokeStyle = "#3a3d44";
      ctx.lineWidth = ROAD_W * k;
      ctx.lineCap = "butt";
      ctx.beginPath();
      for (const v of ROAD_LINES) {
        for (const [ax, az, bx, bz] of [
          [v, -ROAD_HALF_LEN, v, ROAD_HALF_LEN],
          [-ROAD_HALF_LEN, v, ROAD_HALF_LEN, v],
        ]) {
          const a = proj(ax, az);
          const b = proj(bx, bz);
          ctx.moveTo(r + a.x * k, r + a.y * k);
          ctx.lineTo(r + b.x * k, r + b.y * k);
        }
      }
      ctx.stroke();

      // Gudang.
      const wh = proj(WAREHOUSE.center.x, WAREHOUSE.center.z);
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(r + wh.x * k, r + wh.y * k, 5, 0, Math.PI * 2);
      ctx.fill();

      // Alamat: amber jika ada paket menunggu, kelabu jika tidak.
      const targets = new Set(pendingCargo(session).map((pk) => session.targets[pk.id]));
      for (const z of useDeliveryStore.getState().zones) {
        if (z.type !== "delivery") continue;
        const active = targets.has(z.id);
        const q = proj(z.position.x, z.position.z);
        if (!active) {
          ctx.fillStyle = "rgba(200, 200, 210, 0.55)";
          ctx.beginPath();
          ctx.arc(r + q.x * k, r + q.y * k, 2.5, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        const c = clampToRadius({ x: q.x * k, y: q.y * k }, r - 7);
        ctx.fillStyle = "#f59e0b";
        ctx.strokeStyle = "#0b0b10";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(r + c.x, r + c.y, c.clamped ? 4 : 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // Pemain: anak panah di tengah, sentiasa ke atas.
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#0b0b10";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r, r - 8);
      ctx.lineTo(r + 6, r + 6);
      ctx.lineTo(r, r + 3);
      ctx.lineTo(r - 6, r + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    draw();
    const id = window.setInterval(draw, 66);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="minimap" ref={wrapRef} aria-hidden="true">
      <canvas ref={canvasRef} className="minimap__canvas" />
    </div>
  );
}
