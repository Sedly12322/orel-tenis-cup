import React from 'react';
import { BracketMatchCard } from './SharedComponents';
import { generovatPavouka, smazatPlayoff, generovatCtyrhraPlayoff, smazatCtyrhraPlayoff } from '../utils/playoffLogic';
import { supabase } from '../supabase';
import { HRACI_SKUPINA_A, HRACI_SKUPINA_B, CTYRHRA_TYMY } from '../utils/constants';

export const BracketView = ({ zapasList, isDivak, zpetDoMenu, otevritZapas }) => {
  const handleGenerovat = () => generovatPavouka(zapasList, HRACI_SKUPINA_A, HRACI_SKUPINA_B, supabase);
  const handleSmazat = () => smazatPlayoff(zapasList, supabase);
  const handleGenerovatCtyrhra = () => generovatCtyrhraPlayoff(zapasList, CTYRHRA_TYMY, supabase);
  const handleSmazatCtyrhra = () => smazatCtyrhraPlayoff(zapasList, supabase);

  const getMatch = (code) => zapasList.find(z => z.match_state?.match_code === code);
  const qf = [getMatch('QF1'), getMatch('QF2'), getMatch('QF3'), getMatch('QF4')].filter(Boolean);
  const sf = [getMatch('SF1'), getMatch('SF2')].filter(Boolean);
  const f = [getMatch('F1')].filter(Boolean);

  const csf = [getMatch('CSF1'), getMatch('CSF2')].filter(Boolean);
  const cf = [getMatch('CF1')].filter(Boolean);

  const oldQf = zapasList.filter(z => z.round === 4 && !z.match_state?.match_code).sort((a,b) => a.id - b.id);
  const oldSf = zapasList.filter(z => z.round === 2 && !z.match_state?.match_code).sort((a,b) => a.id - b.id);
  const oldF = zapasList.filter(z => z.round === 1 && !z.match_state?.match_code);

  const finalQf = qf.length > 0 ? qf : oldQf;
  const finalSf = sf.length > 0 ? sf : oldSf;
  const finalF = f.length > 0 ? f : oldF;

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 'clamp(20px, 4vw, 40px)', background: isDivak ? '#111' : '#f4f7f6', color: isDivak ? 'white' : '#333', minHeight: '100vh' }}>
      <button onClick={zpetDoMenu} style={{ padding: '10px 20px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontSize: '16px', fontWeight: 'bold' }}>← Zpět na seznam</button>
      <h1 style={{ textAlign: 'center', fontSize: 'clamp(28px, 5vw, 40px)', marginBottom: '30px' }}>🏆 Turnajový pavouk</h1>

      {!isDivak && (
        <div style={{ textAlign: 'center', marginBottom: '40px', display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <button onClick={handleGenerovat} style={{ padding: '15px 30px', fontSize: '18px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>⚡ Vygenerovat Playoff</button>
          {zapasList.some(z => [1, 2, 4].includes(z.round)) && (
            <button onClick={handleSmazat} style={{ padding: '15px 30px', fontSize: '18px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>🗑️ Smazat Playoff</button>
          )}
          <button onClick={handleGenerovatCtyrhra} style={{ padding: '15px 30px', fontSize: '18px', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>🎾 Vygenerovat Playoff čtyřhry</button>
          {zapasList.some(z => [101, 102].includes(z.round)) && (
            <button onClick={handleSmazatCtyrhra} style={{ padding: '15px 30px', fontSize: '18px', background: '#e67e22', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>🗑️ Smazat Playoff čtyřhry</button>
          )}
        </div>
      )}

      {/* Přidaný wrapper pro správné zalamování/scrollování na mobilu */}
      <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', minWidth: '850px', padding: '0 15px', margin: '0 auto' }}>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '20px', minHeight: '600px', flex: 1 }}>
            <h3 style={{ textAlign: 'center', color: '#888', fontSize: '20px', margin: '0 0 10px 0' }}>Čtvrtfinále</h3>
            {finalQf.map(z => <BracketMatchCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} />)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '40px', minHeight: '600px', padding: '40px 0', flex: 1 }}>
            <h3 style={{ textAlign: 'center', color: '#888', fontSize: '20px', margin: '0 0 10px 0' }}>Semifinále</h3>
            {finalSf.map(z => <BracketMatchCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} />)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '600px', flex: 1 }}>
            <h3 style={{ textAlign: 'center', color: '#ffc107', fontSize: '24px', margin: '0 0 10px 0' }}>Finále</h3>
            {finalF.map(z => <BracketMatchCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} />)}
          </div>

        </div>

        {/* PAVOUK ČTYŘHRY */}
        {csf.length > 0 || cf.length > 0 ? (
          <>
            <h2 style={{ textAlign: 'center', fontSize: 'clamp(22px, 4vw, 32px)', marginTop: '60px', marginBottom: '20px' }}>🎾 Pavouk čtyřhry</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', minWidth: '600px', padding: '0 15px', margin: '0 auto' }}>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '40px', minHeight: '300px', flex: 1 }}>
                <h3 style={{ textAlign: 'center', color: '#888', fontSize: '20px', margin: '0 0 10px 0' }}>Semifinále</h3>
                {csf.map(z => <BracketMatchCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} />)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '300px', flex: 1 }}>
                <h3 style={{ textAlign: 'center', color: '#ffc107', fontSize: '24px', margin: '0 0 10px 0' }}>Finále</h3>
                {cf.map(z => <BracketMatchCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} />)}
              </div>

            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
