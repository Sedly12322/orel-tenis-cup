import React from 'react';
import { HRACI_SKUPINA_A, HRACI_SKUPINA_B, CTYRHRA_TYMY, jeCtyrhraPar } from '../utils/constants';

export const NewMatchModal = ({ showNewMatchModal, setShowNewMatchModal, newMatchGroup, setNewMatchGroup, newMatchP1, setNewMatchP1, newMatchP2, setNewMatchP2, zapasList, spustitNovyZapas }) => {
  if (!showNewMatchModal) return null;

  const isCtyrhra = newMatchGroup === 'CTYRHRA';
  const hraci = isCtyrhra ? CTYRHRA_TYMY : (newMatchGroup === 'A' ? HRACI_SKUPINA_A : HRACI_SKUPINA_B);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '15px', textAlign: 'left', maxWidth: '500px', width: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ marginTop: 0, color: '#333', textAlign: 'center', marginBottom: '30px' }}>🎾 Nový zápas</h2>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '18px' }}>Vyberte skupinu:</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[['A', 'Dvouhra - Sk. A'], ['B', 'Dvouhra - Sk. B'], ['CTYRHRA', 'Čtyřhra']].map(([key, label]) => (
              <button key={key} onClick={() => { setNewMatchGroup(key); setNewMatchP1(''); setNewMatchP2(''); }} style={{ flex: 1, padding: '12px', background: newMatchGroup === key ? '#007bff' : '#e9ecef', color: newMatchGroup === key ? '#fff' : '#333', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', minWidth: '110px' }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '18px' }}>{isCtyrhra ? 'Pár 1:' : 'Hráč 1:'}</label>
          <select value={newMatchP1} onChange={e => { setNewMatchP1(e.target.value); setNewMatchP2(''); }} style={{ width: '100%', padding: '15px', fontSize: '18px', borderRadius: '8px', border: '2px solid #ccc' }}>
              <option value="">-- Vyberte {isCtyrhra ? 'první pár' : 'prvního hráče'} --</option>
              {hraci.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '18px' }}>{isCtyrhra ? 'Pár 2 (Soupeř):' : 'Hráč 2 (Soupeř):'}</label>
          <select value={newMatchP2} onChange={e => setNewMatchP2(e.target.value)} style={{ width: '100%', padding: '15px', fontSize: '18px', borderRadius: '8px', border: '2px solid #ccc', background: !newMatchP1 ? '#f4f4f4' : '#fff' }} disabled={!newMatchP1}>
              <option value="">{newMatchP1 ? `-- Vyberte soupeře --` : `Nejprve vyberte ${isCtyrhra ? 'Pár 1' : 'Hráče 1'}`}</option>
              {newMatchP1 && hraci
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
