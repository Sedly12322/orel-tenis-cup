import React from 'react';
import { HRACI_SKUPINA_A, HRACI_SKUPINA_B } from '../utils/constants';

export const NewMatchModal = ({ showNewMatchModal, setShowNewMatchModal, newMatchGroup, setNewMatchGroup, newMatchP1, setNewMatchP1, newMatchP2, setNewMatchP2, zapasList, spustitNovyZapas }) => {
  if (!showNewMatchModal) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '15px', textAlign: 'left', maxWidth: '500px', width: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ marginTop: 0, color: '#333', textAlign: 'center', marginBottom: '30px' }}>🎾 Nový zápas ve skupině</h2>
        
        <div style={{ marginBottom: '25px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '18px' }}>Vyberte skupinu:</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setNewMatchGroup('A'); setNewMatchP1(''); setNewMatchP2(''); }} style={{ flex: 1, padding: '12px', background: newMatchGroup === 'A' ? '#007bff' : '#e9ecef', color: newMatchGroup === 'A' ? '#fff' : '#333', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Skupina A</button>
            <button onClick={() => { setNewMatchGroup('B'); setNewMatchP1(''); setNewMatchP2(''); }} style={{ flex: 1, padding: '12px', background: newMatchGroup === 'B' ? '#007bff' : '#e9ecef', color: newMatchGroup === 'B' ? '#fff' : '#333', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Skupina B</button>
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '18px' }}>Hráč 1:</label>
          <select value={newMatchP1} onChange={e => { setNewMatchP1(e.target.value); setNewMatchP2(''); }} style={{ width: '100%', padding: '15px', fontSize: '18px', borderRadius: '8px', border: '2px solid #ccc' }}>
              <option value="">-- Vyberte prvního hráče --</option>
              {(newMatchGroup === 'A' ? HRACI_SKUPINA_A : HRACI_SKUPINA_B).map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '18px' }}>Hráč 2 (Soupeř):</label>
          <select value={newMatchP2} onChange={e => setNewMatchP2(e.target.value)} style={{ width: '100%', padding: '15px', fontSize: '18px', borderRadius: '8px', border: '2px solid #ccc', background: !newMatchP1 ? '#f4f4f4' : '#fff' }} disabled={!newMatchP1}>
              <option value="">{newMatchP1 ? '-- Vyberte soupeře --' : 'Nejprve vyberte Hráče 1'}</option>
              {newMatchP1 && (newMatchGroup === 'A' ? HRACI_SKUPINA_A : HRACI_SKUPINA_B)
                .filter(h => h !== newMatchP1)
                .filter(h => !zapasList.some(z => (z.player1_name === newMatchP1 && z.player2_name === h) || (z.player1_name === h && z.player2_name === newMatchP1)))
                .map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => setShowNewMatchModal(false)} style={{ flex: 1, padding: '15px', fontSize: '18px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Zrušit</button>
          <button onClick={spustitNovyZapas} disabled={!newMatchP1 || !newMatchP2} style={{ flex: 1, padding: '15px', fontSize: '18px', background: (!newMatchP1 || !newMatchP2) ? '#80c891' : '#28a745', color: '#fff', border: 'none', borderRadius: '8px', cursor: (!newMatchP1 || !newMatchP2) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Vytvořit zápas</button>
        </div>
      </div>
    </div>
  )
}