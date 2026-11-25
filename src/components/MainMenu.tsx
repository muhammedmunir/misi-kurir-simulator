import { saveBackends } from "@/save/backend";
import { loadSaved } from "@/save/save-game";
import { useSceneStore } from "@/store/game";
import { useGameStateStore } from "@/store/gamestate";
import { Scene } from "@/types/scene";
import { useEffect, useState } from "react";

function menuButtonStyle(label: string): React.CSSProperties {
  // Label is ignored but kept for potential future use (e.g., dynamic styling)
  void label;
  return {
    width: "100%",
    padding: "16px 24px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "#e8e8f0",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "left" as const,
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };
}

export function MainMenu() {
  const navigate = useSceneStore((s) => s.navigate);
  const isNewGame = useGameStateStore((s) => s.isNewGame);
  const [hasSave, setHasSave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const backend = saveBackends.current;
    backend
      .read()
      .then((data) => {
        if (!cancelled) setHasSave(data != null);
      })
      .catch(() => {
        if (!cancelled) setHasSave(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleContinue = async () => {
    const r = await loadSaved(saveBackends.current);
    if (r.ok) {
      navigate(Scene.GAME);
    } else {
      setError(r.error);
    }
  };

  return (
    <div className="menu-screen" style={containerStyle}>
      {/* Logo */}
      <div style={logoContainerStyle}>
        <h1 style={titleStyle}>MISI KURIR</h1>
        <p style={subtitleStyle}>SIMULATOR</p>
      </div>

      {/* Divider */}
      <div style={dividerStyle} />

      {/* Menu buttons */}
      <div style={buttonContainerStyle}>
        {hasSave && (
          <button
            type="button"
            onClick={handleContinue}
            style={{
              ...menuButtonStyle("Teruskan"),
              background: "var(--color-primary, #f59e0b)",
              color: "var(--color-primary-text, #000)",
            }}
          >
            <span style={{ fontSize: "16px" }}>▶ Teruskan</span>
          </button>
        )}
        {!isNewGame && (
          <button type="button" onClick={() => navigate(Scene.GAME)} style={menuButtonStyle("Mulakan Misi")}>
            <span style={{ fontSize: "16px" }}>🚀 Mula Misi</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(Scene.LOAD_SAVE)}
          style={menuButtonStyle(isNewGame ? "Permulaan" : "Muat / Simpan")}
        >
          <span style={{ fontSize: "16px" }}>{isNewGame ? "📦 Permainan Baru" : "💾 Muat / Simpan"}</span>
        </button>
        <button type="button" onClick={() => navigate(Scene.SETTINGS)} style={menuButtonStyle("Tetapan")}>
          <span style={{ fontSize: "16px" }}>⚙️ Tetapan</span>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p
          role="alert"
          style={{ color: "var(--color-error, #ef4444)", textAlign: "center", maxWidth: "320px", margin: "0 20px" }}
        >
          {error}
          <br />
          <span style={{ fontSize: "14px" }}>Mulakan Permainan Baru untuk bermain semula.</span>
        </p>
      )}

      {/* Footer */}
      <div style={footerStyle}>
        <p>Versi 0.0.0-alpha (Phase 0)</p>
        <p style={{ marginTop: "4px" }}>© 2026 Misi Kurir Simulator</p>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%)",
  gap: "24px",
  padding: "32px 20px",
};

const logoContainerStyle: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "16px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "clamp(28px, 6vw, 56px)",
  fontWeight: 800,
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
  margin: 0,
  background: "linear-gradient(135deg, #f59e0b, #f97316)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "clamp(14px, 3vw, 20px)",
  color: "#8888a0",
  marginTop: "8px",
  fontWeight: 500,
  letterSpacing: "0.1em",
};

const dividerStyle: React.CSSProperties = {
  width: "60px",
  height: "2px",
  background: "linear-gradient(90deg, transparent, #f59e0b, transparent)",
  margin: "8px 0",
};

const buttonContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  width: "100%",
  maxWidth: "320px",
};

const footerStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "24px",
  textAlign: "center",
  color: "#555570",
  fontSize: "12px",
};
