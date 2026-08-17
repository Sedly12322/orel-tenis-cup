import React from 'react';
import { BracketMatchCard } from './SharedComponents';
import { generovatPavouka, smazatPlayoff } from '../utils/playoffLogic';
import { supabase } from '../supabase';
import { HRACI_SKUPINA_A, HRACI_SKUPINA_B } from '../utils/constants';

export const BracketView = ({ zapasList, isDivak, zpetDoMenu, otevritZapas }) => {
  const handleGenerovat = () => generovatPavouka(zapasList, HRACI_SKUPINA_A, HRACI_SKUPINA_B, supabase);
  const handleSmazat = () => smazatPlayoff(zapasList, supabase);

  // Bezpečné načítání pomocí kódů
  const getMatch = (code) => zapasList.find(z => z.match_state?.match_code === code);
  const qf = [getMatch('QF1'), getMatch('QF2'), getMatch('QF3'), getMatch('QF4')].filter(Boolean);
  const sf = [getMatch('SF1'), getMatch('SF2')].filter(Boolean);
  const f = [getMatch('F1')].filter(Boolean);

  // Zpětná kompatibilita pro již existující staré pavouky
  const oldQf = zapasList.filter(z => z.round === 4 && !z.match_state?.match_code).sort((a,b) => a.id - b.id);
  const oldSf = zapasList.filter(z => z.round === 2 && !z.match_state?.match_code).sort((a,b) => a.id - b.id);
  const oldF = zapasList.filter(z => z.round === 1 && !z.match_state?.match_code);

  const finalQf = qf.length > 0 ? qf : oldQf;
  const finalSf = sf.length > 0 ? sf : oldSf;
  const finalF = f.length > 0 ? f : oldF;

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '40px', background: isDivak ? '#111' : '#f4f7f6', color: isDivak ? 'white' : '#333', minHeight: '100vh' }}>
      <button onClick={zpetDoMenu} style={{ padding: '15px 25px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontSize: '18px' }}>← Zpět na seznam</button>
      <h1 style={{ textAlign: 'center', fontSize: '40px' }}>🏆 Turnajový pavouk</h1>

      {!isDivak && (
        <div style={{ textAlign: 'center', marginBottom: '40px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <button onClick={handleGenerovat} style={{ padding: '20px 40px', fontSize: '22px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>⚡ Vygenerovat Playoff</button>
          {zapasList.some(z => [1, 2, 4].includes(z.round)) && (
            <button onClick={handleSmazat} style={{ padding: '20px 40px', fontSize: '22px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>🗑️ Smazat Playoff</button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', overflowX: 'auto', paddingBottom: '30px', minWidth: '900px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '20px', minHeight: '700px' }}>
          <h3 style={{ textAlign: 'center', color: '#888', fontSize: '24px', margin: '0 0 20px 0' }}>Čtvrtfinále</h3>
          {finalQf.map(z => <BracketMatchCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '40px', minHeight: '700px', padding: '60px 0' }}>
          <h3 style={{ textAlign: 'center', color: '#888', fontSize: '24px', margin: '0 0 20px 0' }}>Semifinále</h3>
          {finalSf.map(z => <BracketMatchCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '700px' }}>
          <h3 style={{ textAlign: 'center', color: '#ffc107', fontSize: '28px', margin: '0 0 20px 0' }}>Finále</h3>
          {finalF.map(z => <BracketMatchCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} />)}
        </div>
      </div>
    </div>
  )
}