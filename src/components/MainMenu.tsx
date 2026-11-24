import { useSceneStore } from '@/store/game';
import { useGameStateStore } from '@/store/gamestate';
import { Scene } from '@/types/scene';

export function MainMenu() {
  const navigate = useSceneStore((s) => s.navigate);
  const isNewGame = useGameStateStore((s) => s.isNewGame);

  return (
    <div className="menu-screen" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%)',
      gap: '24px',
      padding: '32px 20px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1 style={{
          fontSize: 'clamp(28px, 6vw, 56px)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          margin: 0,
          background: 'linear-gradient(135deg, #f59e0b, #f97316)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          MISI KURIR
        </h1>
        <p style={{
          fontSize: 'clamp(14px, 3vw, 20px)',
          color: '#8888a0',
          marginTop: '8px',
          fontWeight: 500,
          letterSpacing: '0.1em',
        }}>
          SIMULATOR
        </p>
      </div>

      {/* Divider */}
      <div style={{
        width: '60px',
        height: '2px',
        background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)',
        margin: '8px 0',
      }} />

      {/* Menu buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px' }}>
        {!isNewGame && (
          <button
            onClick={() => navigate(Scene.GAME)}
            style={menuButtonStyle('Mulakan Misi')}
          >
            <span style={{ fontSize: '16px' }}>🚀 Mula Misi</span>
          </button>
        )}
        <button
          onClick={() => navigate(Scene.LOAD_SAVE)}
          style={menuButtonStyle(isNewGame ? 'Permulaan' : 'Muat / Simpan')}
        >
          <span style={{ fontSize: '16px' }}>
            {isNewGame ? '📦 Permainan Baru' : '💾 Muat / Simpan'}
          </span>
        </button>
        <button
          onClick={() => navigate(Scene.SETTINGS)}
          style={menuButtonStyle('Tetapan')}
        >
          <span style={{ fontSize: '16px' }}>⚙️ Tetapan</span>
        </button>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        textAlign: 'center',
        color: '#555570',
        fontSize: '12px',
      }}>
        <p>Versi 0.0.0-alpha (Phase 0)</p>
        <p style={{ marginTop: '4px' }}>© 2026 Misi Kurir Simulator</p>
      </div>
    </div>
  );
}

const menuButtonStyle: Record<string, React.CSSProperties> = {
  width: '100%',
  padding: '16px 24px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#e8e8f0',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  textAlign: 'left' as const,
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};
