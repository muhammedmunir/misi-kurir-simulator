import { useSceneStore } from '@/store/game';
import { Scene } from '@/types/scene';
import { useGameStateStore } from '@/store/gamestate';

export function HUD() {
  const navigate = useSceneStore((s) => s.navigate);
  const currentScene = useSceneStore((s) => s.currentScene);
  const player = useGameStateStore((s) => s.player);

  if (!player || (currentScene !== 'game' && currentScene !== 'warehouse')) return null;

  return (
    <div className="hud-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      pointerEvents: 'none',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
      }}>
        {/* Player info */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>Lv.{player.level}</span>
            <div style={{
              width: '60px',
              height: '4px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(player.xp / player.xpToNext) * 100}%`,
                height: '100%',
                background: '#f59e0b',
                borderRadius: '2px',
              }} />
            </div>
          </div>
          <div style={{
            background: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#22c55e',
          }}>
            Rp {(player.money).toLocaleString('id-ID')}
          </div>
        </div>

        {/* Menu button */}
        <button
          onClick={() => navigate(Scene.MENU)}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '14px',
            color: '#e8e8f0',
          }}
        >
          ☰
        </button>
      </div>

      {/* Bottom HUD */}
      {currentScene === 'game' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}>
          {/* Controls placeholder */}
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}>
            <button style={hudBtnStyle}>
              <span style={{ fontSize: '20px' }}>📷</span>
            </button>
            <button style={hudBtnStyle}>
              <span style={{ fontSize: '20px' }}>🔦</span>
            </button>
            <button style={hudBtnStyle}>
              <span style={{ fontSize: '20px' }}> horn</span>
            </button>
          </div>

          {/* Mission info */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '12px',
            padding: '10px 16px',
            maxWidth: '200px',
          }}>
            <p style={{ fontSize: '12px', color: '#f59e0b', marginBottom: '2px' }}>Misi Aktif</p>
            <p style={{ fontSize: '14px', fontWeight: 600 }}>Penghantaran #1</p>
          </div>
        </div>
      )}
    </div>
  );
}

const hudBtnStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#e8e8f0',
};
