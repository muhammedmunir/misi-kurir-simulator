import { useSceneStore } from '@/store/game';
import { useGameStateStore } from '@/store/gamestate';
import { createPlayer, createSettings } from '@/store/gamestate';
import { Scene } from '@/types/scene';
import { useState } from 'react';

export function LoadSavePanel() {
  const navigate = useSceneStore((s) => s.navigate);
  const { createNewGame } = useGameStateStore();
  const [playerName, setPlayerName] = useState('');
  const [nameError, setNameError] = useState('');

  function handleNewGame() {
    if (!playerName.trim()) {
      setNameError('Sila masukkan nama kurir');
      return;
    }
    if (playerName.trim().length < 2) {
      setNameError('Nama mestilah sekurang-kurangnya 2 aksara');
      return;
    }
    createNewGame(playerName.trim());
    navigate(Scene.TUTORIAL);
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
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Muat / Simpan</h2>
      </div>

      {/* New game */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Permainan Baru</h3>
        <input
          type="text"
          placeholder="Nama kurir..."
          value={playerName}
          onChange={(e) => { setPlayerName(e.target.value); setNameError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleNewGame(); }}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px',
            color: '#e8e8f0',
            fontSize: '16px',
            outline: 'none',
            marginBottom: nameError ? '8px' : '0',
          }}
        />
        {nameError && (
          <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 0 0', marginTop: '4px' }}>
            {nameError}
          </p>
        )}
        <button
          onClick={handleNewGame}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: '10px',
            color: '#000',
            fontWeight: 700,
            fontSize: '16px',
            marginTop: '8px',
            cursor: 'pointer',
          }}
        >
          Mula Misi
        </button>
      </div>

      {/* Save slots */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Slot Simpan</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {['Slot 1', 'Slot 2', 'Slot 3'].map((slot, i) => (
            <div key={i} style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#555570',
              fontSize: '14px',
            }}>
              {slot} — Kosong
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
