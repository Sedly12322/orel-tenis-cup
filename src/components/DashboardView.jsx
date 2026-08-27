import React, { useState, useMemo, useEffect } from 'react';
import { ZapasCard, ZapasRow, CollapsibleSection } from './SharedComponents';
import { KrizovaTabulkaComponent, SkupinaTable, CtyrhraKrizovaTabulka, CtyrhraSkupinaTable } from './TableComponents';
import RocnikOTCLTabulka from './RocnikOTCLTabulka';
import ArchivKrizovaTabulka from './ArchivKrizovaTabulka';
import { HRACI_SKUPINA_A, HRACI_SKUPINA_B, CTYRHRA_TYMY, jeCtyrhraPar } from '../utils/constants';

const RODNICI = [
  { rok: 2025, popis: '17. ročník - 2025' },
  { rok: 2024, popis: '16. ročník - 2024' },
  { rok: 2023, popis: '15. ročník - 2023' },
  { rok: 2022, popis: '14. ročník - 2022' },
  { rok: 2021, popis: '13. ročník - 2021' },
  { rok: 2020, popis: '12. ročník - 2020' },
  { rok: 2019, popis: '11. ročník - 2019' },
  { rok: 2018, popis: '10. ročník - 2018' },
  { rok: 2017, popis: '9. ročník - 2017' },
  { rok: 2016, popis: '8. ročník - 2016' },
  { rok: 2015, popis: '7. ročník - 2015' },
  { rok: 2014, popis: '6. ročník - 2014' },
  { rok: 2013, popis: '5. ročník - 2013' },
  { rok: 2012, popis: '4. ročník - 2012' },
  { rok: 2011, popis: '3. ročník - 2011' },
  { rok: 2010, popis: '2. ročník - 2010' },
  { rok: 2009, popis: '1. ročník - 2009' },
];

const RocnikDashboard = ({ zapasy, rok, isDivak, supabase, onDataChange }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [zobrazeni, setZobrazeni] = useState('klasicka');
  
  // Guard clause - žádná data
  if (!zapasy || !Array.isArray(zapasy) || zapasy.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
        <p>Žádná data pro rok {rok}</p>
        {isDivak && <p style={{ fontSize: '14px', color: '#666' }}>Zkuste vybrat jiný rok</p>}
      </div>
    );
  }

  const smazatRok = async () => {
    const rokText = `rok ${rok}`;
    if (!window.confirm(`🚨 Opravdu smazat VŠECHNY zápasy z ${rokText}? Nevratné!`)) return;
    setIsDeleting(true);
    try {
      const { data } = await supabase.from('matches').select('id, match_state');
      if (data) {
        const ids = data
          .filter(z => z.match_state?.archive_year == rok)
          .map(z => z.id);
        if (ids.length > 0) {
          for (let i = 0; i < ids.length; i += 50) {
            await supabase.from('matches').delete().in('id', ids.slice(i, i + 50));
          }
          alert(`✅ Smazáno ${ids.length} zápasů z ${rokText}!`);
          if (onDataChange) await onDataChange();
        }
      }
    } catch (err) {
      alert(`❌ Chyba: ${err.message}`);
    }
    setIsDeleting(false);
  };

  // Pro archivní roky: rozděl na skupiny podle match_state.skupina
  const zapasySkupinaA = zapasy.filter(z => z.match_state?.skupina === 'A');
  const zapasySkupinaB = zapasy.filter(z => z.match_state?.skupina === 'B');
  const zapasyFinale = zapasy.filter(z => z.match_state?.skupina === 'FINALE');
  const zapasyCtyrhra = zapasy.filter(z => jeCtyrhraPar(z.player1_name) || jeCtyrhraPar(z.player2_name));

  // Extrakce unikátních hráčů z dat - rozděleno podle skupin
  const hraciSkupinaA = useMemo(() => {
    const hraci = new Set();
    zapasySkupinaA.forEach(z => {
      hraci.add(z.player1_name);
      hraci.add(z.player2_name);
    });
    return Array.from(hraci).sort();
  }, [zapasySkupinaA]);

  const hraciSkupinaB = useMemo(() => {
    const hraci = new Set();
    zapasySkupinaB.forEach(z => {
      hraci.add(z.player1_name);
      hraci.add(z.player2_name);
    });
    return Array.from(hraci).sort();
  }, [zapasySkupinaB]);

  const hraciDvouhra = useMemo(() => [...hraciSkupinaA, ...hraciSkupinaB], [hraciSkupinaA, hraciSkupinaB]);

  const hraciCtyrhra = useMemo(() => {
    const hraci = new Set();
    zapasyCtyrhra.forEach(z => {
      hraci.add(z.player1_name);
      hraci.add(z.player2_name);
    });
    return Array.from(hraci).sort();
  }, [zapasyCtyrhra]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: isDivak ? '#ffeb3b' : '#333', margin: 0 }}>
          Výsledky z roku {rok}
        </h2>
        {!isDivak && (
          <button onClick={smazatRok} disabled={isDeleting} 
            style={{ padding: '8px 15px', fontSize: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#dc3545', color: '#fff' }}>
            {isDeleting ? '⏳' : '🗑️ Smazat rok'}
          </button>
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', flexWrap: 'wrap' }}>
        <button onClick={() => setZobrazeni('klasicka')} style={{ padding: '10px 20px', fontSize: 'clamp(16px, 3vw, 20px)', background: zobrazeni === 'klasicka' ? '#007bff' : (isDivak ? '#444' : '#ddd'), color: zobrazeni === 'klasicka' ? 'white' : (isDivak ? '#ccc' : '#333'), border: 'none', borderRadius: '8px 0 0 8px', cursor: 'pointer', fontWeight: 'bold' }}>Klasická tabulka</button>
        <button onClick={() => setZobrazeni('krizova')} style={{ padding: '10px 20px', fontSize: 'clamp(16px, 3vw, 20px)', background: zobrazeni === 'krizova' ? '#007bff' : (isDivak ? '#444' : '#ddd'), color: zobrazeni === 'krizova' ? 'white' : (isDivak ? '#ccc' : '#333'), border: 'none', borderRadius: '0 8px 8px 0', cursor: 'pointer', fontWeight: 'bold' }}>Křížová tabulka</button>
      </div>
      
      {zobrazeni === 'klasicka' ? (
        <>
          {zapasySkupinaA.length > 0 && (
            <RocnikOTCLTabulka matches={zapasySkupinaA} nazev="Dvouhra - Skupina A" isDivak={isDivak} rok={rok} />
          )}
          
          {zapasySkupinaB.length > 0 && (
            <RocnikOTCLTabulka matches={zapasySkupinaB} nazev="Dvouhra - Skupina B" isDivak={isDivak} rok={rok} />
          )}
          
          {zapasyFinale.length > 0 && (
            <RocnikOTCLTabulka matches={zapasyFinale} nazev="Dvouhra - Finále" isDivak={isDivak} rok={rok} />
          )}
          
          {zapasyCtyrhra.length > 0 && (
            <RocnikOTCLTabulka matches={zapasyCtyrhra} nazev="Čtyřhra" isDivak={isDivak} rok={rok} />
          )}
        </>
      ) : (
        <>
          <ArchivKrizovaTabulka matches={zapasySkupinaA} nazev="Skupina A" isDivak={isDivak} rok={rok} />
          <ArchivKrizovaTabulka matches={zapasySkupinaB} nazev="Skupina B" isDivak={isDivak} rok={rok} />
        </>
      )}
    </div>
  );
};

export const DashboardView = ({
  zapasList, isDivak, otevritZapas, smazatZapas, 
  otevritNovyZapasModal, typTabulky, setTypTabulky,
  tvMessage, tvMessageInput, setTvMessageInput, ulozitTvZpravu,
  selectedYear,
  supabase,
  onDataChange
}) => {
  const [zobrazeneRok, setZobrazeneRok] = useState(2026);

  const zapasyProRok = useMemo(() => {
    const result = { 2026: [] };
    zapasList.forEach(z => {
      const rok = z.match_state?.archive_year || 2026;
      if (!result[rok]) result[rok] = [];
      result[rok].push(z);
    });
    return result;
  }, [zapasList]);

  const zapasyAktualni = zapasyProRok[2026] || [];

  const smazatRok = async (rok) => {
    const rokText = rok === 2026 ? 'aktuálního roku' : `roku ${rok}`;
    if (!window.confirm(`🚨 Opravdu smazat VŠECHNY zápasy z ${rokText}? Nevratné!`)) return;
    
    try {
      const { data } = await supabase.from('matches').select('id, match_state');
      if (data) {
        const ids = data
          .filter(z => rok === 2026 ? !z.match_state?.archive_year : z.match_state?.archive_year == rok)
          .map(z => z.id);
        
        if (ids.length > 0) {
          for (let i = 0; i < ids.length; i += 50) {
            await supabase.from('matches').delete().in('id', ids.slice(i, i + 50));
          }
          alert(`✅ Smazáno ${ids.length} zápasů z ${rokText}`);
          if (onDataChange) await onDataChange();
        }
      }
    } catch (err) {
      alert(`❌ Chyba: ${err.message}`);
    }
  };

  if (zobrazeneRok !== 2026) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(20px, 4vw, 50px) clamp(10px, 2vw, 20px)' }}>
        <div style={{ marginBottom: '30px', textAlign: 'center', background: isDivak ? '#222' : '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <label style={{ fontWeight: 'bold', marginRight: '10px', color: isDivak ? '#fff' : '#333' }}>📅 Ročník: </label>
          <select value={zobrazeneRok} onChange={(e) => setZobrazeneRok(Number(e.target.value))} 
            style={{ padding: '8px 15px', fontSize: '16px', borderRadius: '8px', border: '2px solid #ccc', cursor: 'pointer' }}>
            <option value={2026}>18. ročník - 2026 (aktuální) ({zapasyAktualni.length})</option>
            {RODNICI.map(r => {
              const pocet = (zapasyProRok[r.rok] || []).length;
              return <option key={r.rok} value={r.rok}>{r.popis} ({pocet})</option>;
            })}
          </select>
        </div>
        <RocnikDashboard zapasy={zapasyProRok[zobrazeneRok] || []} rok={zobrazeneRok} isDivak={isDivak} supabase={supabase} onDataChange={onDataChange} />
      </div>
    );
  }

  // Aktuální rok dashboard
  const liveZapasy = zapasyAktualni.filter(z => z.status === 'live');
  const neZiveZapasy = zapasyAktualni.filter(z => z.status !== 'live' && z.status !== 'tv_message'); 
  const zapasyA = neZiveZapasy.filter(z => HRACI_SKUPINA_A.includes(z.player1_name) && HRACI_SKUPINA_A.includes(z.player2_name));
  const zapasyB = neZiveZapasy.filter(z => HRACI_SKUPINA_B.includes(z.player1_name) && HRACI_SKUPINA_B.includes(z.player2_name));
  const zapasyCtyrhra = neZiveZapasy.filter(z => jeCtyrhraPar(z.player1_name) && jeCtyrhraPar(z.player2_name));
  const zapasyOstatni = neZiveZapasy.filter(z => !zapasyA.includes(z) && !zapasyB.includes(z) && !zapasyCtyrhra.includes(z) && z.round === null);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(20px, 4vw, 50px) clamp(10px, 2vw, 20px)' }}>
      
      <div style={{ marginBottom: '30px', textAlign: 'center', background: isDivak ? '#222' : '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <label style={{ fontWeight: 'bold', marginRight: '10px', color: isDivak ? '#fff' : '#333' }}>📅 Ročník: </label>
        <select value={zobrazeneRok} onChange={(e) => setZobrazeneRok(Number(e.target.value))} 
          style={{ padding: '8px 15px', fontSize: '16px', borderRadius: '8px', border: '2px solid #ccc', cursor: 'pointer' }}>
          <option value={2026}>18. ročník - 2026 (aktuální) ({zapasyAktualni.length})</option>
          {RODNICI.map(r => {
            const pocet = (zapasyProRok[r.rok] || []).length;
            return <option key={r.rok} value={r.rok}>{r.popis} ({pocet})</option>;
          })}
        </select>
        {!isDivak && (
          <button onClick={() => smazatRok(2026)} style={{ marginLeft: '15px', padding: '8px 15px', fontSize: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#dc3545', color: '#fff' }}>
            🗑️ Smazat aktuální
          </button>
        )}
      </div>

      {tvMessage && (
        <div style={{ marginBottom: '40px', background: isDivak ? 'rgba(255, 235, 59, 0.1)' : '#fff3cd', border: '2px solid #ffeb3b', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: isDivak ? '#ffeb3b' : '#856404' }}>📢 Oznámení pořadatele</h3>
          <p style={{ margin: '10px 0 0 0', fontSize: 'clamp(16px, 2.5vw, 20px)', color: isDivak ? '#fff' : '#856404', fontWeight: 'bold' }}>{tvMessage}</p>
        </div>
      )}

      {!isDivak && (
        <div style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '30px' }}>📺</span>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Oznámení divákům a na TV:</label>
              <input type="text" value={tvMessageInput} onChange={e => setTvMessageInput(e.target.value)} placeholder="Např. Další zápas začíná v 18:00..."
                style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '2px solid #ccc', boxSizing: 'border-box' }} />
            </div>
            <button onClick={ulozitTvZpravu} style={{ padding: '12px 25px', background: '#6f42c1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-end', height: '45px', fontSize: '16px' }}>Uložit zprávu</button>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={otevritNovyZapasModal} style={{ padding: '15px 30px', fontSize: 'clamp(18px, 3vw, 26px)', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '50px', boxShadow: '0 6px 20px rgba(40,167,69,0.4)', fontWeight: 'bold' }}>
              ➕ Vytvořit nový zápas
            </button>
          </div>
        </div>
      )}
      
      <div style={{ marginBottom: '60px' }}>
        <h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '10px', color: '#dc3545', fontSize: 'clamp(22px, 4vw, 32px)' }}>🔴 Právě se hraje (LIVE)</h2>
        {liveZapasy.length === 0 ? (
          <p style={{ color: '#888', fontSize: 'clamp(16px, 3vw, 22px)' }}>Aktuálně se nehraje žádný zápas.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '20px', marginTop: '20px' }}>
            {liveZapasy.map(z => <ZapasCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', flexWrap: 'wrap' }}>
        <button onClick={() => setTypTabulky('klasicka')} style={{ padding: '10px 20px', fontSize: 'clamp(16px, 3vw, 20px)', background: typTabulky === 'klasicka' ? '#007bff' : (isDivak ? '#444' : '#ddd'), color: typTabulky === 'klasicka' ? 'white' : (isDivak ? '#ccc' : '#333'), border: 'none', borderRadius: '8px 0 0 8px', cursor: 'pointer', fontWeight: 'bold' }}>Klasická tabulka</button>
        <button onClick={() => setTypTabulky('krizova')} style={{ padding: '10px 20px', fontSize: 'clamp(16px, 3vw, 20px)', background: typTabulky === 'krizova' ? '#007bff' : (isDivak ? '#444' : '#ddd'), color: typTabulky === 'krizova' ? 'white' : (isDivak ? '#ccc' : '#333'), border: 'none', borderRadius: '0 8px 8px 0', cursor: 'pointer', fontWeight: 'bold' }}>Křížová tabulka</button>
      </div>
      
      {typTabulky === 'klasicka' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '50px', marginBottom: '60px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
            <div style={{ flex: '1 1 min(100%, 600px)', overflowX: 'auto' }}><SkupinaTable matches={zapasyA} hraciList={HRACI_SKUPINA_A} nazev="Skupina A" isDivak={isDivak} /></div>
            <div style={{ flex: '1 1 min(100%, 600px)', overflowX: 'auto' }}><SkupinaTable matches={zapasyB} hraciList={HRACI_SKUPINA_B} nazev="Skupina B" isDivak={isDivak} /></div>
          </div>
          <CtyrhraSkupinaTable matches={zapasyCtyrhra} tymy={CTYRHRA_TYMY} nazev="Čtyřhra" isDivak={isDivak} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '50px', marginBottom: '60px' }}>
          <KrizovaTabulkaComponent matches={zapasyA} hraciList={HRACI_SKUPINA_A} nazev="Skupina A" isDivak={isDivak} />
          <KrizovaTabulkaComponent matches={zapasyB} hraciList={HRACI_SKUPINA_B} nazev="Skupina B" isDivak={isDivak} />
        </div>
      )}

      <CtyrhraKrizovaTabulka matches={zapasyCtyrhra} tymy={CTYRHRA_TYMY} nazev="Čtyřhra" isDivak={isDivak} />

      {zapasyCtyrhra.length > 0 && (
        <CollapsibleSection title="🎾 Zápasy - Čtyřhra" count={zapasyCtyrhra.length} isDivak={isDivak}>
          <div style={{ background: isDivak ? '#222' : '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {zapasyCtyrhra.map(z => <ZapasRow key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection title="✅ Zápasy - Skupina A" count={zapasyA.length} isDivak={isDivak}>
        <div style={{ background: isDivak ? '#222' : '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {zapasyA.map(z => <ZapasRow key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="✅ Zápasy - Skupina B" count={zapasyB.length} isDivak={isDivak}>
        <div style={{ background: isDivak ? '#222' : '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {zapasyB.map(z => <ZapasRow key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
        </div>
      </CollapsibleSection>

      {zapasyOstatni.length > 0 && (
        <CollapsibleSection title="🏆 Zápasy - Ostatní (Playoff)" count={zapasyOstatni.length} isDivak={isDivak}>
          <div style={{ background: isDivak ? '#222' : '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {zapasyOstatni.map(z => <ZapasRow key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}
