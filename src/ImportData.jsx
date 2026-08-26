import React, { useState } from 'react';
import { supabase } from './supabase';
import { importujDataZWebu, prevedNaZapasy } from './utils/webImport';
import { jeCtyrhraPar, HRACI_SKUPINA_A, HRACI_SKUPINA_B, CTYRHRA_TYMY } from './utils/constants';

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

export default function ImportData({ zpetDoMenu, onDataChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedYear, setSelectedYear] = useState(2025);

  const spustitImport = async (typ, year = null) => {
    setIsLoading(true);
    const rokText = year ? `(${year})` : '';
    setStatus(`Stahuji data z webu ${rokText} (${typ === 'dvouhra' ? 'dvouhra' : 'čtyřhra'})...`);
    
    try {
      const v1 = typ === 'dvouhra' ? 60 : 61;
      const data = await importujDataZWebu(v1, year);
      
      setStatus('Data stažena. Zpracovávám...');
      
      const { data: existingMatches } = await supabase.from('matches').select('*');
      const noveZapasy = prevedNaZapasy(data, existingMatches || [], year);
      
      if (noveZapasy.length === 0) {
        setStatus(`Všechny zápasy (${typ}) ${rokText} už v databázi existují. Nic nepřidáno.`);
        setIsLoading(false);
        return;
      }
      
      setStatus(`Přidávám ${noveZapasy.length} nových zápasů (${typ}) ${rokText}...`);
      
      // Vkládáme po dávkách po 50
      for (let i = 0; i < noveZapasy.length; i += 50) {
        const batch = noveZapasy.slice(i, i + 50);
        const { error } = await supabase.from('matches').insert(batch);
        if (error) {
          throw new Error(`Chyba při zápisu do databáze: ${error.message}`);
        }
      }
      
      setStatus(`✅ Úspěšně přidáno ${noveZapasy.length} nových zápasů (${typ}) ${rokText}!`);
      if (onDataChange) onDataChange();
      setTimeout(() => zpetDoMenu(), 2000);
      
    } catch (err) {
      setStatus(`❌ Chyba: ${err.message}`);
      console.error('Chyba při importu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Aktualizace existujících dat - přiřazení ročníku 2026 pro aktuální sezónu
  const aktualniRocnik = async () => {
    if (!window.confirm('Přiřadit všechny zápasy bez ročníku do roku 2026 (aktuální)?')) return;
    setIsLoading(true);
    let count = 0;
    try {
      const { data: zapasy } = await supabase
        .from('matches')
        .select('id, match_state')
        .is('match_state.archive_year', null);
      
      if (zapasy && zapasy.length > 0) {
        for (const z of zapasy) {
          const newState = { ...z.match_state, archive_year: 2026 };
          await supabase.from('matches').update({ match_state: newState }).eq('id', z.id);
          count++;
        }
        setStatus(`✅ Aktualizováno ${count} zápasů (nastaveno archive_year: 2026)!`);
      } else {
        setStatus('Žádné zápasy bez ročníku nenalezeny.');
      }
      if (onDataChange) onDataChange();
    } catch (err) {
      setStatus(`❌ Chyba: ${err.message}`);
    }
    setIsLoading(false);
  };

  // Aktualizace existujících dat - oprava ročníku podle jmen hráčů
  const opravitRocnik = async () => {
    if (!window.confirm('Opravit ročníky všech zápasů podle seznamu hráčů?')) return;
    setIsLoading(true);
    let count2026 = 0;
    let count2025 = 0;
    try {
      const { data: zapasy } = await supabase
        .from('matches')
        .select('id, player1_name, player2_name, match_state');
      
      if (zapasy) {
        const allCurrentPlayers = [...HRACI_SKUPINA_A, ...HRACI_SKUPINA_B];
        
        for (const z of zapasy) {
          const isCurrentYear = allCurrentPlayers.includes(z.player1_name) || allCurrentPlayers.includes(z.player2_name);
          const newArchiveYear = isCurrentYear ? null : 2025;
          
          // Only update if different
          if (z.match_state?.archive_year !== newArchiveYear) {
            const newState = { ...z.match_state, archive_year: newArchiveYear };
            await supabase.from('matches').update({ match_state: newState }).eq('id', z.id);
            if (isCurrentYear) count2026++; else count2025++;
          }
        }
        setStatus(`✅ Opraveno: ${count2026} pro rok 2026, ${count2025} pro archiv!`);
      } else {
        setStatus('Žádné zápasy nenalezeny.');
      }
      if (onDataChange) onDataChange();
    } catch (err) {
      setStatus(`❌ Chyba: ${err.message}`);
    }
    setIsLoading(false);
  };

  const smazatVse = async () => {
    if (!window.confirm('🚨 Smazat VŠECHNY zápasy? Nevratné!')) return;
    if (!window.confirm('Jste si jistí? Smažou se VŠECHNA data!')) return;
    setIsLoading(true);
    setStatus('Mažu vše...');
    try {
      const { data } = await supabase.from('matches').select('id');
      if (data && data.length > 0) {
        const ids = data.map(z => z.id);
        for (let i = 0; i < ids.length; i += 50) {
          await supabase.from('matches').delete().in('id', ids.slice(i, i + 50));
        }
        setStatus(`✅ Smazáno ${ids.length} zápasů!`);
      } else {
        setStatus('Žádné zápasy k smazání.');
      }
      if (onDataChange) onDataChange();
    } catch (err) {
      setStatus(`❌ Chyba: ${err.message}`);
    }
    setIsLoading(false);
  };

  const smazatZapasy = async (typ) => {
    const nazev = typ === 'dvouhra' ? 'dvouhry' : 'čtyřhry';
    
    if (!window.confirm(`🚨 Smazat VŠECHNY zápasy ${nazev}? Nevratné!`)) return;
    if (!window.confirm(`Jste si jistí?`)) return;
    
    setIsLoading(true);
    setStatus(`Mažu zápasy ${nazev}...`);
    
    try {
      const { data: vsechny, error: selectError } = await supabase
        .from('matches')
        .select('id, player1_name, player2_name');
      
      if (selectError) {
        throw new Error(`Chyba při načítání: ${selectError.message}`);
      }
      
      if (vsechny && vsechny.length > 0) {
        const ids = vsechny
          .filter(z => typ === 'ctyrhra' ? jeCtyrhraPar(z.player1_name) || jeCtyrhraPar(z.player2_name) : !jeCtyrhraPar(z.player1_name) && !jeCtyrhraPar(z.player2_name))
          .map(z => z.id);
        
        console.log(`Mazu ${ids.length} zápasů ${nazev}...`);
        
        if (ids.length > 0) {
          for (let i = 0; i < ids.length; i += 50) {
            const batch = ids.slice(i, i + 50);
            const { error: deleteError } = await supabase
              .from('matches')
              .delete()
              .in('id', batch);
            
            if (deleteError) {
              throw new Error(`Chyba při mazání: ${deleteError.message}`);
            }
          }
        }
      }
      
      setStatus(`✅ Zápasy ${nazev} smazány!`);
      if (onDataChange) onDataChange();
      setTimeout(() => zpetDoMenu(), 2000);
      
    } catch (err) {
      setStatus(`❌ Chyba: ${err.message}`);
      console.error('Chyba při mazání:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', fontFamily: 'sans-serif', padding: '50px 20px', background: '#f4f7f6', color: '#333', minHeight: '100vh' }}>
      <button onClick={zpetDoMenu} style={{ padding: '15px 25px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>← Zpět do Menu</button>
      
      <h1 style={{ fontSize: '32px', marginBottom: '30px' }}>📥 Import z webu Orel Lichnov</h1>
      
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        
        {/* AKTUÁLNÍ ROČNÍK */}
        <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '48px' }}>🎾</span>
            <h2 style={{ margin: '10px 0', color: '#28a745' }}>Dvouhra</h2>
            <p style={{ color: '#666' }}>Skupina A + Skupina B • Aktuální ročník 2026</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button onClick={() => spustitImport('dvouhra')} disabled={isLoading}
              style={{ padding: '15px 25px', background: isLoading ? '#6c757d' : '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {isLoading ? '⏳ Importuji...' : '📥 Importovat výsledky dvouhry'}
            </button>
            <button onClick={() => smazatZapasy('dvouhra')} disabled={isLoading}
              style={{ padding: '12px 20px', background: isLoading ? '#6c757d' : '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              🗑️ Smazat všechny zápasy dvouhry
            </button>
            <button onClick={aktualniRocnik} disabled={isLoading}
              style={{ padding: '12px 20px', background: isLoading ? '#6c757d' : '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              🔧 Opravit na rok 2026
            </button>
            <button onClick={opravitRocnik} disabled={isLoading}
              style={{ padding: '12px 20px', background: isLoading ? '#6c757d' : '#ffc107', color: '#333', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              🔩 Opravit ročníky
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '48px' }}>👥</span>
            <h2 style={{ margin: '10px 0', color: '#17a2b8' }}>Čtyřhra</h2>
            <p style={{ color: '#666' }}>Páry (Skupina A + Playoff) • Aktuální ročník 2026</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button onClick={() => spustitImport('ctyrhra')} disabled={isLoading}
              style={{ padding: '15px 25px', background: isLoading ? '#6c757d' : '#17a2b8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {isLoading ? '⏳ Importuji...' : '📥 Importovat výsledky čtyřhry'}
            </button>
            <button onClick={() => smazatZapasy('ctyrhra')} disabled={isLoading}
              style={{ padding: '12px 20px', background: isLoading ? '#6c757d' : '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              🗑️ Smazat všechny zápasy čtyřhry
            </button>
          </div>
        </div>

        {/* PŘEDCHÁZEJÍCÍ ROČNÍKY */}
        <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '48px' }}>📚</span>
            <h2 style={{ margin: '10px 0', color: '#6f42c1' }}>Předešlé ročníky</h2>
            <p style={{ color: '#666' }}>Import dat z archivu (2009–2025)</p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Vyberte ročník:</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              disabled={isLoading}
              style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '2px solid #ccc', background: '#fff' }}
            >
              {RODNICI.map(r => (
                <option key={r.rok} value={r.rok}>{r.popis}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button onClick={() => spustitImport('dvouhra', selectedYear)} disabled={isLoading}
              style={{ padding: '15px 25px', background: isLoading ? '#6c757d' : '#6f42c1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {isLoading ? '⏳ Importuji...' : `📥 Importovat dvouhru (${selectedYear})`}
            </button>
            <button onClick={() => spustitImport('ctyrhra', selectedYear)} disabled={isLoading}
              style={{ padding: '15px 25px', background: isLoading ? '#6c757d' : '#6f42c1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {isLoading ? '⏳ Importuji...' : `📥 Importovat čtyřhru (${selectedYear})`}
            </button>
          </div>
        </div>

        {status && (
          <div style={{ marginTop: '20px', padding: '15px', background: status.startsWith('✅') ? '#d4edda' : status.startsWith('❌') ? '#f8d7da' : '#fff3cd', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>
            {status}
          </div>
        )}

      </div>
    </div>
  );
}
