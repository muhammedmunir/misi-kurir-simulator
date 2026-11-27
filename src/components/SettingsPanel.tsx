import { useSceneStore } from "@/store/game";
import { useGameStateStore } from "@/store/gamestate";
import { Scene } from "@/types/scene";

function SettingToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span style={{ fontSize: "15px", color: "#e8e8f0" }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          width: "48px",
          height: "28px",
          borderRadius: "14px",
          background: value ? "#f59e0b" : "rgba(255,255,255,0.15)",
          border: "none",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "3px",
            left: value ? "23px" : "3px",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </button>
    </div>
  );
}

function SettingSelect<K extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: K;
  options: { value: K; label: string }[];
  onChange: (v: K) => void;
}) {
  return (
    <label
      style={{
        padding: "4px 0",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: "15px", color: "#e8e8f0" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as K)}
        style={{
          minHeight: "44px",
          padding: "6px 12px",
          colorScheme: "dark",
          background: "#24242d",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "8px",
          color: "#e8e8f0",
          fontSize: "14px",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SettingsPanel() {
  const navigate = useSceneStore((s) => s.navigate);
  const settings = useGameStateStore((s) => s.settings);
  const updateSetting = useGameStateStore((s) => s.updateSetting);
  const setRainMode = useGameStateStore((s) => s.setRainMode);

  return (
    <div
      className="panel"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "rgba(10, 10, 15, 0.95)",
        padding: "24px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
        <button
          type="button"
          onClick={() => navigate(Scene.MENU)}
          style={{
            padding: "8px 12px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "8px",
            marginRight: "12px",
            color: "#e8e8f0",
          }}
        >
          ← Kembali
        </button>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>Tetapan</h2>
      </div>

      {/* Settings list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#8888a0",
            marginBottom: "16px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Audio
        </h3>
        <SettingToggle label="Bunyi" value={settings.soundEnabled} onChange={(v) => updateSetting("soundEnabled", v)} />

        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#8888a0",
            marginTop: "24px",
            marginBottom: "16px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Grafik
        </h3>
        <SettingSelect
          label="Kualiti Grafik"
          value={settings.graphicsPreset}
          options={[
            { value: "low", label: "Rendah" },
            { value: "medium", label: "Sederhana" },
            { value: "high", label: "Tinggi" },
          ]}
          onChange={(v) => updateSetting("graphicsPreset", v)}
        />
        <SettingSelect
          label="Hujan"
          value={settings.rainMode}
          options={[
            { value: "auto", label: "Auto" },
            { value: "on", label: "Sentiasa hujan" },
            { value: "off", label: "Tiada hujan" },
          ]}
          onChange={setRainMode}
        />
        <SettingSelect
          label="Saiz Font"
          value={String(settings.fontScale)}
          options={[
            { value: "1", label: "Kecil" },
            { value: "1.25", label: "Sederhana" },
            { value: "1.5", label: "Besar" },
          ]}
          onChange={(v) => updateSetting("fontScale", Number(v) as 1 | 1.25 | 1.5)}
        />

        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#8888a0",
            marginTop: "24px",
            marginBottom: "16px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Aksesibiliti
        </h3>
        <SettingToggle
          label="Mod Buta Warna"
          value={settings.colorblindMode}
          onChange={(v) => updateSetting("colorblindMode", v)}
        />
        <SettingToggle
          label="Kontras Tinggi"
          value={settings.highContrast}
          onChange={(v) => updateSetting("highContrast", v)}
        />
        <SettingToggle
          label="Kurangkan Pergerakan"
          value={settings.reducedMotion}
          onChange={(v) => updateSetting("reducedMotion", v)}
        />

        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#8888a0",
            marginTop: "24px",
            marginBottom: "16px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Data
        </h3>
        <button
          type="button"
          style={{
            width: "100%",
            padding: "12px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "10px",
            color: "#ef4444",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reset Data Permainan
        </button>

        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#8888a0",
            marginTop: "24px",
            marginBottom: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Kredit
        </h3>
        {/* Atribusi wajib CC-BY-4.0 (skuter) dan pengakuan aset lain; lihat THIRD_PARTY_NOTICES.md */}
        <ul style={{ margin: 0, paddingLeft: "18px", color: "#b9bccb", fontSize: "13px", lineHeight: 1.6 }}>
          <li>
            Skuter: "Low Poly Delivery Electric Scooter" oleh ramdom_sp (spartanmelon), berdasarkan karya Neakster —
            Sketchfab, CC BY 4.0
          </li>
          <li>Watak dan animasi: Adobe Mixamo</li>
          <li>Jalan dan bandar: Kenney (kenney.nl), CC0</li>
        </ul>
      </div>
    </div>
  );
}
