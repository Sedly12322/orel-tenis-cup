import React, { useState } from 'react';
import { supabase } from './supabase';
import { importujDataZWebu, prevedNaZapasy } from './utils/webImport';
import { jeCtyrhraPar } from './utils/constants';

export default function ImportData({ zpetDoMenu, onDataChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

  const spustitImport = async (typ) => {
    setIsLoading(true);
    setStatus(`Stahuji data z webu (${typ === 'dvouhra' ? 'dvouhra' : 'čtyřhra'})...`);
    
    try {
      const v1 = typ === 'dvouhra' ? 60 : 61;
      const data = await importujDataZWebu(v1);
      
      setStatus('Data stažena. Zpracovávám...');
      
      const { data: existingMatches } = await supabase.from('matches').select('*');
      const noveZapasy = prevedNaZapasy(data, existingMatches || []);
      
      if (noveZapasy.length === 0) {
        setStatus(`Všechny zápasy (${typ}) už v databázi existují. Nic nepřidáno.`);
        setIsLoading(false);
        return;
      }
      
      setStatus(`Přidávám ${noveZapasy.length} nových zápasů (${typ})...`);
      
      // Vkládáme po dávkách po 50
      for (let i = 0; i < noveZapasy.length; i += 50) {
        const batch = noveZapasy.slice(i, i + 50);
        const { error } = await supabase.from('matches').insert(batch);
        if (error) {
          throw new Error(`Chyba při zápisu do databáze: ${error.message}`);
        }
      }
      
      setStatus(`✅ Úspěšně přidáno ${noveZapasy.length} nových zápasů (${typ})!`);
      if (onDataChange) onDataChange();
      setTimeout(() => zpetDoMenu(), 2000);
      
    } catch (err) {
      setStatus(`❌ Chyba: ${err.message}`);
      console.error('Chyba při importu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const smazatZapasy = async (typ) => {
    const nazev = typ === 'dvouhra' ? 'dvouhry' : 'čtyřhry';
    
    if (!window.confirm(`🚨 Smazat VŠECHNY zápasy ${nazev}? Nevratné!`)) return;
    if (!window.confirm(`Jste si jistí?`)) return;
    
    setIsLoading(true);
    setStatus(`Mažu zápasy ${nazev}...`);
    
    try {
      // Nejprve zjistíme, které zápasy máme smazat
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
          // Mazání po dávkách po 50
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
        
        <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '48px' }}>🎾</span>
            <h2 style={{ margin: '10px 0', color: '#28a745' }}>Dvouhra</h2>
            <p style={{ color: '#666' }}>Skupina A + Skupina B</p>
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
          </div>
        </div>

        <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '48px' }}>👥</span>
            <h2 style={{ margin: '10px 0', color: '#17a2b8' }}>Čtyřhra</h2>
            <p style={{ color: '#666' }}>Páry (Skupina A + Playoff)</p>
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

        {status && (
          <div style={{ marginTop: '20px', padding: '15px', background: status.startsWith('✅') ? '#d4edda' : status.startsWith('❌') ? '#f8d7da' : '#fff3cd', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>
            {status}
          </div>
        )}

      </div>
    </div>
  );
}
