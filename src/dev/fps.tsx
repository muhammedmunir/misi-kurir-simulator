import { useEffect, useState } from "react";

/** FPS meter — purata bergolek sepanjang tetingkap bingkai. */
export function createFpsMeter(windowSize = 60) {
  const timestamps: number[] = [];
  return {
    tick(now: number): number {
      timestamps.push(now);
      if (timestamps.length > windowSize) {
        timestamps.splice(0, timestamps.length - windowSize);
      }
      if (timestamps.length < 2) return 0;
      const totalMs = timestamps[timestamps.length - 1] - timestamps[0];
      if (totalMs === 0) return 0;
      return Math.round(((timestamps.length - 1) * 1000) / totalMs);
    },
  };
}

/** Sahkan sama ada meter FPS perlu dipaparkan — parameter `fps` sebenar sahaja. */
export function shouldShowFps(isDev: boolean, search: string): boolean {
  return isDev && new URLSearchParams(search).has("fps");
}

/** React component untuk paparan FPS di skrin — mengukur bingkai rAF sebenar. */
export function FpsOverlay() {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    const meter = createFpsMeter(60);
    let lastShown = Number.NEGATIVE_INFINITY;
    let rafId = 0;
    const loop = (t: number) => {
      const value = meter.tick(t);
      // setState paling kerap sekali setiap 500 ms masa rAF
      if (value > 0 && t - lastShown >= 500) {
        lastShown = t;
        setFps(value);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <output
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        background: "rgba(0,0,0,0.6)",
        color: "#fff",
        padding: "4px 8px",
        borderRadius: 4,
        fontFamily: "monospace",
        fontSize: 12,
        zIndex: 9999,
        pointerEvents: "none",
        userSelect: "none",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {fps} FPS
    </output>
  );
}
