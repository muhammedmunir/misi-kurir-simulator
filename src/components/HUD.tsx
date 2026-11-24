import { saveGame } from "@/lib/idb";
import { useDeliveryStore } from "@/store/delivery";
import { useDeliveryUIStore } from "@/store/delivery-ui";
import { useSceneStore } from "@/store/game";
import { useGameStateStore } from "@/store/gamestate";
import { Scene } from "@/types/scene";
import { playerState } from "./3d/PlayerController";

export function HUD() {
  const navigate = useSceneStore((s) => s.navigate);
  const currentScene = useSceneStore((s) => s.currentScene);
  const player = useGameStateStore((s) => s.player);
  const interactionMessage = useDeliveryUIStore((s) => s.interactionMessage);
  const completeMessage = useDeliveryUIStore((s) => s.completeMessage);
  const hasPacket = useDeliveryStore((s) => s.session.hasPacket);
  const trackingNumber = useDeliveryStore((s) => s.session.trackingNumber);
  const targetZone = useDeliveryStore((s) => s.session.targetZone);

  const isOnFoot = playerState.isOnFoot();
  const speed = Math.abs(Math.round(playerState.getSpeed()));

  if (!player || (currentScene !== Scene.GAME && currentScene !== Scene.WAREHOUSE)) return null;

  const handleSave = async () => {
    const gamestate = useGameStateStore.getState();
    if (!gamestate.player) return;
    const saveData = {
      slots: [
        {
          id: "slot-1",
          timestamp: Date.now(),
          player: gamestate.player,
          manifest: gamestate.activeManifest,
          packets: [],
          deliveries: [],
          vehicles: gamestate.vehicles,
          settings: gamestate.settings,
          version: "0.0.0",
        },
      ],
      selectedSlot: 0,
      lastPlayTime: Date.now(),
      totalPlayTime: 0,
    };
    await saveGame(saveData);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              borderRadius: "8px",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#f59e0b" }}>Lv.{player.level}</span>
            <div
              style={{
                width: "60px",
                height: "4px",
                background: "rgba(255,255,255,0.2)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(player.xp / player.xpToNext) * 100}%`,
                  height: "100%",
                  background: "#f59e0b",
                  borderRadius: "2px",
                }}
              />
            </div>
          </div>
          <div
            style={{
              background: "rgba(34, 197, 94, 0.2)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#22c55e",
            }}
          >
            Rp {player.money.toLocaleString("id-ID")}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", pointerEvents: "auto" }}>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: "8px 12px",
              background: "rgba(245, 158, 11, 0.3)",
              border: "1px solid rgba(245, 158, 11, 0.5)",
              borderRadius: "8px",
              color: "#f59e0b",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            💾 Simpan
          </button>
          <button
            type="button"
            onClick={() => navigate(Scene.MENU)}
            style={{
              padding: "8px 12px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              color: "#e8e8f0",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Menu
          </button>
        </div>
      </div>

      {/* Bottom */}
      {currentScene === Scene.GAME && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "16px",
            background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              background: isOnFoot ? "rgba(59, 130, 246, 0.2)" : "rgba(220, 38, 38, 0.2)",
              border: isOnFoot ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid rgba(220, 38, 38, 0.4)",
              borderRadius: "12px",
              padding: "10px 16px",
              pointerEvents: "auto",
            }}
          >
            <p style={{ fontSize: "12px", color: isOnFoot ? "#3b82f6" : "#dc2626", margin: "0 0 2px" }}>
              {isOnFoot ? "Berjalan" : "Memandu Motor"}
            </p>
            {!isOnFoot && <p style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: 0 }}>{speed} km/j</p>}
            <p style={{ fontSize: "11px", color: "#8888a0", margin: "4px 0 0" }}>
              Tekan E untuk {isOnFoot ? "naik motor" : "turun motor / interaksi"}
            </p>
          </div>

          {/* Delivery / Mission info */}
          <div
            style={{
              background: hasPacket ? "rgba(245, 158, 11, 0.25)" : "rgba(34, 197, 94, 0.2)",
              border: hasPacket ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(34, 197, 94, 0.4)",
              borderRadius: "12px",
              padding: "10px 16px",
              maxWidth: "250px",
            }}
          >
            <p style={{ fontSize: "12px", color: hasPacket ? "#f59e0b" : "#22c55e", margin: "0 0 2px" }}>
              {hasPacket ? "📦 Bawa Paket" : "🔍 Cari Paket"}
            </p>
            {hasPacket && trackingNumber && (
              <p style={{ fontSize: "11px", color: "#e8e8f0", margin: "0 0 2px" }}>{trackingNumber}</p>
            )}
            {hasPacket && targetZone && (
              <p style={{ fontSize: "11px", color: "#e8e8f0", margin: "0 0 2px" }}>Sasaran: {targetZone.name}</p>
            )}
            {completeMessage && (
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#22c55e", margin: "4px 0 0" }}>
                ✅ {completeMessage}
              </p>
            )}
            {interactionMessage && !completeMessage && (
              <p style={{ fontSize: "11px", color: "#f59e0b", margin: "4px 0 0" }}>{interactionMessage}</p>
            )}
            {!hasPacket && !interactionMessage && (
              <p style={{ fontSize: "12px", fontWeight: 600 }}>Ke Pejabat Pos Pusat (E)</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
