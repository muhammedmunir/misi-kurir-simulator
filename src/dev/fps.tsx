import { useEffect, useRef, useState } from "react";

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

/** Sahkan sama ada meter FPS perlu dipaparkan. */
export function shouldShowFps(isDev: boolean, search: string): boolean {
  if (!isDev) return false;
  return search.includes("fps");
}

/** React component untuk paparan FPS di skrin. */
export function FpsOverlay() {
  const meterRef = useRef(createFpsMeter(60));
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000 / 30);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        right: 8,
        background: "rgba(0,0,0,0.6)",
        color: "#fff",
        padding: "4px 8px",
        borderRadius: 4,
        fontFamily: "monospace",
        fontSize: 12,
        zIndex: 9999,
        userSelect: "none",
      }}
    >
      {meterRef.current.tick(Date.now())} FPS
    </div>
  );
}
