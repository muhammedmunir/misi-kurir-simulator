import { useSceneStore } from '@/store/game';
import { useGameStateStore } from '@/store/gamestate';
import type { GameSettings } from '@/types/game';

export function SettingsPanel() {
  const navigate = useSceneStore((s) => s.navigate);
  const settings = useGameStateStore((s) => s.settings);
  const updateSetting = useGameStateStore((s) => s.updateSetting);

  function SettingRow<K extends keyof GameSettings>({ label, key, value, onChange }: { label: string; key: K; value: GameSettings[K]; onChange: (v: GameSettings[K]) => void }) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{ fontSize: '15px', color: '#e8e8f0' }}>{label}</span>
        <button
          onClick={() => onChange(key === 'soundEnabled' ? !value : value)}
          style={{
            width: '48px',
            height: '28px',
            borderRadius: '14px',
            background: value ? '#f59e0b' : 'rgba(255,255,255,0.15)',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            position: 'absolute',
            top: '3px',
            left: value ? '23px' : '3px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </button>
      </div>
    );
  }

  return (
    <div className="panel" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(10, 10, 15, 0.95)',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => navigate(Scene.MENU)} style={{
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          marginRight: '12px',
          color: '#e8e8f0',
        }}>← Kembali</button>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Tetapan</h2>
      </div>

      {/* Settings list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#8888a0', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Audio
        </h3>
        <SettingRow label="Bunyi" key="soundEnabled" value={settings.soundEnabled} onChange={(v) => updateSetting('soundEnabled', v)} />

        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#8888a0', marginTop: '24px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Grafik
        </h3>
        <div style={{
          padding: '12px 0',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '15px', color: '#e8e8f0' }}>Kualiti Grafik</span>
          <select
            value={settings.graphicsPreset}
            onChange={(e) => updateSetting('graphicsPreset', e.target.value as 'low' | 'medium' | 'high')}
            style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#e8e8f0',
              fontSize: '14px',
            }}
          >
            <option value="low">Rendah</option>
            <option value="medium">Sederhana</option>
            <option value="high">Tinggi</option>
          </select>
        </div>
        <div style={{
          padding: '12px 0',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '15px', color: '#e8e8f0' }}>Saiz Font</span>
          <select
            value={settings.fontScale}
            onChange={(e) => updateSetting('fontScale', Number(e.target.value) as 1 | 1.25 | 1.5)}
            style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#e8e8f0',
              fontSize: '14px',
            }}
          >
            <option value={1}>Kecil</option>
            <option value={1.25}>Sederhana</option>
            <option value={1.5}>Besar</option>
          </select>
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#8888a0', marginTop: '24px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Aksesibiliti
        </h3>
        <SettingRow label="Mod Buta Warna" key="colorblindMode" value={settings.colorblindMode} onChange={(v) => updateSetting('colorblindMode', v)} />
        <SettingRow label="Kontras Tinggi" key="highContrast" value={settings.highContrast} onChange={(v) => updateSetting('highContrast', v)} />
        <SettingRow label="Kurangkan Pergerakan" key="reducedMotion" value={settings.reducedMotion} onChange={(v) => updateSetting('reducedMotion', v)} />

        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#8888a0', marginTop: '24px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Data
        </h3>
        <button style={{
          width: '100%',
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '10px',
          color: '#ef4444',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          Reset Data Permainan
        </button>
      </div>
    </div>
  );
}
