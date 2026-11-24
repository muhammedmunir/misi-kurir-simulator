import { playerState } from "@/components/3d/PlayerController";
import { currentNavTarget, formatDistance, navTo } from "@/navigation/nav";
import { useDeliveryStore } from "@/store/delivery";
import { useEffect, useRef, useState } from "react";

function read(): { name: string; dist: number; turn: number } | null {
  const session = useDeliveryStore.getState().session;
  const target = currentNavTarget(session);
  if (!target) return null;

  const pos = playerState.getPosition();
  const heading = playerState.getHeading();
  const { distance, turn } = navTo({ x: pos.x, z: pos.z }, heading, target.position);

  return { name: target.name, dist: Math.round(distance), turn };
}

export function NavArrow() {
  const initial = useRef(read());

  const [disp, setDisp] = useState(() => {
    const r = initial.current;
    return {
      name: r?.name ?? "",
      dist: r?.dist ?? -1,
      turn: r?.turn ?? 0,
    };
  });

  useEffect(() => {
    if (disp.name === "") return;

    const id = setInterval(() => {
      const next = read();
      if (next === null) {
        setDisp({ name: "", dist: -1, turn: 0 });
        return;
      }
      const rDist = next.dist;
      const rTurn = next.turn;
      const rName = next.name;

      if (rDist !== disp.dist || rName !== disp.name || Math.abs(rTurn - disp.turn) > 0.05) {
        setDisp({ name: rName, dist: rDist, turn: rTurn });
      }
    }, 100);

    return () => clearInterval(id);
  }, [disp.dist, disp.turn, disp.name]);

  if (disp.name === "") return null;

  const session = useDeliveryStore.getState().session;
  if (session.panelOpen) return null;

  return (
    <div className="nav-hud">
      <div className="nav-hud__content">
        <span className="nav-hud__target">{disp.name}</span>
        <span className="nav-hud__dist">{formatDistance(disp.dist >= 0 ? disp.dist : 0)}</span>
        <div className="nav-hud__arrow" style={{ transform: `rotate(${disp.turn}rad)` }} data-nav-arrow>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <polygon points="12,2 22,20 16,20 16,24 8,24 8,20 2,20" fill="var(--color-primary)" />
          </svg>
        </div>
      </div>
    </div>
  );
}
