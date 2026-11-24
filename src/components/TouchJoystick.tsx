import { type ButtonInfo, getActionButton, getInteractButtonInfo } from "@/lib/interact-button";
import { requestAction, touchInput } from "@/lib/touch";
import { useDeliveryStore } from "@/store/delivery";
import { useEffect, useRef, useState } from "react";
import { playerState } from "./3d/PlayerController";

const JOYSTICK_RADIUS = 60;
const KNOB_RADIUS = 25;

/** Touch controls are shown on coarse pointers, or forced with `?touch=1` for desktop testing. */
export function shouldShowTouchControls(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).has("touch")) return true;
  return window.matchMedia("(pointer: coarse)").matches;
}

function readActionButton(): ButtonInfo {
  const delivery = getInteractButtonInfo(useDeliveryStore.getState().session, Date.now());
  return getActionButton(delivery, {
    onFoot: playerState.isOnFoot(),
    nearMotor: playerState.isNearMotor(),
    speed: playerState.getSpeed(),
  });
}

export function TouchJoystick() {
  const [visible] = useState(shouldShowTouchControls);
  if (!visible) return null;
  return <TouchControls />;
}

function TouchControls() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const baseRef = useRef<{ x: number; y: number } | null>(null);
  const knobRef = useRef<{ x: number; y: number } | null>(null);

  const [action, setAction] = useState<ButtonInfo>(readActionButton);
  const [onFoot, setOnFoot] = useState(true);
  const [braking, setBraking] = useState(false);

  // Poll game state at ~10 Hz; React only re-renders when the result changes.
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = readActionButton();
      setAction((prev) => (prev.label === next.label && prev.enabled === next.enabled ? prev : next));
      setOnFoot(playerState.isOnFoot());
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  // Release the brake when leaving the motor so it never sticks on.
  useEffect(() => {
    if (onFoot) {
      touchInput.brake = false;
      setBraking(false);
    }
  }, [onFoot]);

  // Joystick: canvas sized in CSS px × devicePixelRatio, drawn every frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      const base = baseRef.current;
      const knob = knobRef.current;
      if (base && knob) {
        ctx.beginPath();
        ctx.arc(base.x, base.y, JOYSTICK_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(knob.x, knob.y, KNOB_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const localPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onStickDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = localPos(e);
    baseRef.current = p;
    knobRef.current = p;
  };

  const onStickMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const base = baseRef.current;
    if (e.pointerId !== pointerIdRef.current || !base) return;
    const p = localPos(e);
    let dx = p.x - base.x;
    let dy = p.y - base.y;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_RADIUS) {
      dx = (dx / dist) * JOYSTICK_RADIUS;
      dy = (dy / dist) * JOYSTICK_RADIUS;
    }
    knobRef.current = { x: base.x + dx, y: base.y + dy };
    const jx = dx / JOYSTICK_RADIUS;
    const jy = dy / JOYSTICK_RADIUS;
    touchInput.joystick.forward = -jy;
    touchInput.joystick.right = jx;
    touchInput.joystick.active = Math.abs(jx) > 0.1 || Math.abs(jy) > 0.1;
  };

  const onStickUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== pointerIdRef.current) return;
    pointerIdRef.current = null;
    baseRef.current = null;
    knobRef.current = null;
    touchInput.joystick.forward = 0;
    touchInput.joystick.right = 0;
    touchInput.joystick.active = false;
  };

  const setBrake = (on: boolean) => {
    touchInput.brake = on;
    setBraking(on);
  };

  return (
    <div className="touch-controls">
      <canvas
        ref={canvasRef}
        className="touch-stick"
        onPointerDown={onStickDown}
        onPointerMove={onStickMove}
        onPointerUp={onStickUp}
        onPointerCancel={onStickUp}
      />
      <div className="touch-buttons">
        <button
          type="button"
          className="touch-btn touch-btn--action"
          disabled={!action.enabled}
          onPointerDown={(e) => {
            e.preventDefault();
            if (action.enabled) requestAction();
          }}
        >
          {action.label}
        </button>
        <button
          type="button"
          className="touch-btn touch-btn--brake"
          data-active={braking}
          disabled={onFoot}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            setBrake(true);
          }}
          onPointerUp={() => setBrake(false)}
          onPointerCancel={() => setBrake(false)}
        >
          BREK
        </button>
      </div>
    </div>
  );
}
