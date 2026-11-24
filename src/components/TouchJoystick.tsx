import { useCallback, useEffect, useRef } from "react";

export interface JoystickInput {
  forward: number;
  right: number;
  active: boolean;
}

export interface TouchInput {
  joystick: JoystickInput;
  brake: boolean;
  horn: boolean;
  action: boolean;
  cameraAngle: number;
}

export type TouchInputCallback = (input: TouchInput) => void;

const JOYSTICK_RADIUS = 60;
const KNOB_RADIUS = 25;
const BTN_W = 60;
const BTN_H = 48;

export function TouchJoystick({ onInput }: { onInput: TouchInputCallback }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchStateRef = useRef<Record<number, { type: "joystick" | "brake" | "horn" | "action" }>>({});
  const baseRef = useRef<{ x: number; y: number } | null>(null);
  const knobRef = useRef<{ x: number; y: number } | null>(null);
  const isBrakingRef = useRef(false);
  const isActionRef = useRef(false);

  const getCanvasPos = useCallback((canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const halfW = canvas.width / 2;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);

        if (pos.x < halfW) {
          touchStateRef.current[touch.identifier] = { type: "joystick" };
          baseRef.current = { x: pos.x, y: pos.y };
          knobRef.current = { x: pos.x, y: pos.y };
        } else {
          // Zon kanan: HORN / ACTION / BRAKE
          if (pos.y >= 280 && pos.y < 280 + BTN_H) {
            touchStateRef.current[touch.identifier] = { type: "action" };
          } else if (pos.y > canvas.height / 2) {
            touchStateRef.current[touch.identifier] = { type: "brake" };
            isBrakingRef.current = true;
          } else {
            touchStateRef.current[touch.identifier] = { type: "horn" };
          }
        }
      }
    },
    [getCanvasPos],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas || !baseRef.current) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touchStateRef.current[touch.identifier]?.type === "joystick") {
          const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);
          let dx = pos.x - baseRef.current.x;
          let dy = pos.y - baseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > JOYSTICK_RADIUS) {
            dx = (dx / dist) * JOYSTICK_RADIUS;
            dy = (dy / dist) * JOYSTICK_RADIUS;
          }
          knobRef.current = { x: baseRef.current.x + dx, y: baseRef.current.y + dy };
        }
      }
    },
    [getCanvasPos],
  );

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    for (const touch of e.changedTouches) {
      const state = touchStateRef.current[touch.identifier];
      if (state) {
        if (state.type === "brake") isBrakingRef.current = false;
        if (state.type === "action") isActionRef.current = false;
        if (state.type === "joystick") {
          baseRef.current = null;
          knobRef.current = null;
        }
        delete touchStateRef.current[touch.identifier];
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Render loop
  const animRef = useRef(0);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const rx = w - BTN_W - 16; // right edge x

      // Joystick
      if (baseRef.current) {
        const { x: bx, y: by } = baseRef.current;
        ctx.beginPath();
        ctx.arc(bx, by, JOYSTICK_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (knobRef.current) {
          const { x: kx, y: ky } = knobRef.current;
          ctx.beginPath();
          ctx.arc(kx, ky, KNOB_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(245, 158, 11, 0.5)";
          ctx.fill();
          ctx.strokeStyle = "rgba(245, 158, 11, 0.8)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // ACTION button (tengah kanan)
      const actionY = 280;
      ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(rx, actionY, BTN_W, BTN_H, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#93c5fd";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("INTERAKSI", rx + BTN_W / 2, actionY + BTN_H / 2 + 5);

      // HORN button (atas kanan)
      ctx.fillStyle = "rgba(245, 158, 11, 0.3)";
      ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(rx, 16, BTN_W, BTN_H, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("HORN", rx + BTN_W / 2, 16 + BTN_H / 2 + 5);

      // BRAKE button (bawah kanan)
      ctx.fillStyle = isBrakingRef.current ? "rgba(239, 68, 68, 0.6)" : "rgba(239, 68, 68, 0.3)";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
      ctx.beginPath();
      ctx.roundRect(rx, h - BTN_H - 16, BTN_W, BTN_H, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.fillText("BRAKE", rx + BTN_W / 2, h - BTN_H - 16 + BTN_H / 2 + 5);

      // Report input
      let jx = 0;
      let jy = 0;
      if (baseRef.current && knobRef.current) {
        jx = (knobRef.current.x - baseRef.current.x) / JOYSTICK_RADIUS;
        jy = (knobRef.current.y - baseRef.current.y) / JOYSTICK_RADIUS;
        const m = Math.sqrt(jx * jx + jy * jy);
        if (m > 1) {
          jx /= m;
          jy /= m;
        }
      }

      onInput({
        joystick: { forward: -jy, right: jx, active: Math.abs(jx) > 0.1 || Math.abs(jy) > 0.1 },
        brake: isBrakingRef.current,
        horn: false,
        action: isActionRef.current,
        cameraAngle: 0,
      });

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [onInput]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={700}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "40%",
        zIndex: 999,
        touchAction: "none",
        pointerEvents: "none",
      }}
    />
  );
}
