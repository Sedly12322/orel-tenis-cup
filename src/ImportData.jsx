import React, { useState } from 'react';
import { supabase } from './supabase';
import { importujDataZWebu, prevedNaZapasy } from './utils/webImport';
import { jeCtyrhraPar, HRACI_SKUPINA_A, HRACI_SKUPINA_B } from './utils/constants';

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

// Pomocné funkce pro parsování HTML mimo komponentu
function normalizujPar(raw) {
  const jmena = String(raw)
    .split(/\s*\n\s*|\s*\/\s*/)
    .map(j => j.replace(/^[\s]+|[\s]+$/g, ''))
    .filter(Boolean);
  return jmena.join(' / ');
}

function parsujScore(scoreStr) {
  const sets = [];
  if (!scoreStr || scoreStr.includes('K')) return sets;
  
  const casti = scoreStr.split(',').map(s => s.trim());
  for (const cast of casti) {
    const match = cast.match(/^(\d+)-(\d+)/);
    if (match) {
      let g1 = parseInt(match[1]);
      let g2 = parseInt(match[2]);
      if (g1 > 9 && ![10,11,12,13,14,15].includes(g1)) g1 = parseInt(match[1].charAt(0));
      if (g2 > 9 && ![10,11,12,13,14,15].includes(g2)) g2 = parseInt(match[2].charAt(0));
      sets.push({ player1_games: g1, player2_games: g2 });
    }
  }
  return sets;
}

function getTextFromCell(cell) {
  if (!cell) return '';
  if (typeof cell.textContent !== 'undefined') return cell.textContent.trim();
  let html = String(cell.innerHTML || '');
  html = html.replace(/&nbsp;/g, ' ').replace(/<BR\s*\/?>/gi, '\n');
  html = html.replace(/<[^>]*>/g, '');
  html = html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return html.trim();
}

function parsujTabulkuHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table.vysledky');
  
  const vysledky = { skupinaA: [], skupinaB: [], finalek: [], ctyrhra: [] };
  
  tables.forEach((table) => {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 3) return;
    
    // Najdi hlavičku s názvem skupiny - h3 před tabulkou
    let nazevSkupiny = '';
    let prev = table.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'H3') {
        nazevSkupiny = prev.textContent.trim();
        break;
      }
      prev = prev.previousElementSibling;
    }
    
    // Hráči z těla tabulky (sloupec 1 každého datového řádku), ne z hlavičky
    const hraciMap = new Map(); // index -> jméno (z řádků dat)
    for (let i = 2; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length >= 2) {
        const idx = parseInt(getTextFromCell(cells[0])) || (i - 1);
        const jmeno = normalizujPar(getTextFromCell(cells[1]));
        if (jmeno && jmeno !== 'XX') {
          hraciMap.set(idx, jmeno);
        }
      }
    }
    
    // Seřadit hráče podle indexu
    const hraci = Array.from(hraciMap.entries()).sort((a, b) => a[0] - b[0]).map(e => e[1]);
    
    // Parsuj zápasy z řádků 2+ (jen horní trojúhelník - ne dvojité zápasy)
    const zapasy = [];
    for (let i = 2; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length < 3) continue;
      
      const hrac1 = normalizujPar(getTextFromCell(cells[1]));
      if (!hrac1 || hrac1 === 'XX') continue;
      
      const hrac1Index = i - 2;
      
      for (let j = 2; j < cells.length - 3; j++) {
        const hrac2Index = j - 2;
        if (hrac2Index >= hrac1Index) continue; // Horní trojúhelník
        
        const skore = getTextFromCell(cells[j]);
        if (skore && skore !== 'XX' && (j - 2) < hraci.length) {
          const hrac2 = normalizujPar(hraci[j - 2]);
          zapasy.push({ player1: hrac1, player2: hrac2, score: skore });
        }
      }
    }
    
    // Přiřaď do skupiny podle hlavičky
    if (nazevSkupiny.includes('Finále')) {
      vysledky.finalek = zapasy;
    } else if (nazevSkupiny.includes('Skupina A') || nazevSkupiny.includes('skupina A')) {
      vysledky.skupinaA = zapasy;
    } else if (nazevSkupiny.includes('Skupina B') || nazevSkupiny.includes('skupina B')) {
      vysledky.skupinaB = zapasy;
    } else if (nazevSkupiny.includes('Čtyřhra') || nazevSkupiny.toLowerCase().includes('čtyřhra')) {
      vysledky.ctyrhra = zapasy;
    }
  });
  
  return vysledky;
}

export default function ImportData({ zpetDoMenu, onDataChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedYear, setSelectedYear] = useState(2025);

  const spustitImport = async (typ, year = null) => {
    setIsLoading(true);
    const rokText = year ? `(${year})` : '';
    setStatus(`Stahuji data z webu ${rokText}...`);
    
    try {
      const v1 = typ === 'dvouhra' ? 60 : 61;
      const data = await importujDataZWebu(v1, year);
      
      setStatus('Data stažena. Zpracovávám...');
      
      const { data: existingMatches } = await supabase.from('matches').select('*');
      const noveZapasy = prevedNaZapasy(data, existingMatches || [], year);
      
      if (noveZapasy.length === 0) {
        setStatus(`Všechny zápasy (${typ}) ${rokText} už v databázi existují.`);
        setIsLoading(false);
        return;
      }
      
      setStatus(`Přidávám ${noveZapasy.length} nových zápasů...`);
      
      for (let i = 0; i < noveZapasy.length; i += 50) {
        const batch = noveZapasy.slice(i, i + 50);
        const { error } = await supabase.from('matches').insert(batch);
        if (error) throw new Error(error.message);
      }
      
      setStatus(`✅ Úspěšně přidáno ${noveZapasy.length} zápasů!`);
      if (onDataChange) onDataChange();
      setTimeout(() => zpetDoMenu(), 2000);
      
    } catch (err) {
      setStatus(`❌ Chyba: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const smazatZapasy = async (typ) => {
    const nazev = typ === 'dvouhra' ? 'dvouhry' : 'čtyřhry';
    if (!window.confirm(`🚨 Smazat VŠECHNY zápasy ${nazev}? Nevratné!`)) return;
    
    setIsLoading(true);
    setStatus(`Mažu zápasy ${nazev}...`);
    
    try {
      const { data: vsechny } = await supabase.from('matches').select('id, player1_name, player2_name');
      
      if (vsechny && vsechny.length > 0) {
        const ids = vsechny
          .filter(z => typ === 'ctyrhra' ? (jeCtyrhraPar(z.player1_name) || jeCtyrhraPar(z.player2_name)) : (!jeCtyrhraPar(z.player1_name) && !jeCtyrhraPar(z.player2_name)))
          .map(z => z.id);
        
        if (ids.length > 0) {
          for (let i = 0; i < ids.length; i += 50) {
            await supabase.from('matches').delete().in('id', ids.slice(i, i + 50));
          }
          setStatus(`✅ Smazáno ${ids.length} zápasů!`);
        } else {
          setStatus(`Žádné zápasy ${nazev} nenalezeny.`);
        }
      }
      if (onDataChange) onDataChange();
    } catch (err) {
      setStatus(`❌ Chyba: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const smazatVse = async () => {
    if (!window.confirm('🚨 Smazat VŠECHNY zápasy? Nevratné!')) return;
    setIsLoading(true);
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

  // Nová funkce: Nahrát archivní HTML soubor
  const nahratArchiv = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsLoading(true);
    setStatus(`Nahrávám soubor ${file.name}...`);
    
    try {
      const text = await file.text();
      const data = parsujTabulkuHTML(text);
      
      const { data: existingMatches } = await supabase.from('matches').select('*');
      const year = selectedYear;
      
      const noveZapasy = prevedNaZapasy(data, existingMatches || [], year);
      
      if (noveZapasy.length === 0) {
        setStatus(`Všechny zápasy z tohoto souboru už v databázi existují.`);
        setIsLoading(false);
        event.target.value = '';
        return;
      }
      
      for (let i = 0; i < noveZapasy.length; i += 50) {
        const batch = noveZapasy.slice(i, i + 50);
        const { error } = await supabase.from('matches').insert(batch);
        if (error) throw new Error(error.message);
      }
      
      setStatus(`✅ Úspěšně nahráno ${noveZapasy.length} zápasů z archívu!`);
      if (onDataChange) onDataChange();
      
    } catch (err) {
      setStatus(`❌ Chyba při nahrávání: ${err.message}`);
    } finally {
      setIsLoading(false);
      event.target.value = '';
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

        {/* ARCHIV - NAHRÁT SOUBOR */}
        <div style={{ background: '#fff3cd', padding: '30px', borderRadius: '15px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', marginBottom: '30px', border: '3px solid #ffc107' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '48px' }}>📚</span>
            <h2 style={{ margin: '10px 0', color: '#856404' }}>Předchozí ročníky (Archiv)</h2>
            <p style={{ color: '#856404' }}>
              Vyber ročník, stáhni HTML z webu a nahrát ho sem.<br/>
              <strong>Postup:</strong> Jdi na <a href="https://orellichnov.cz/otcl/vysledky/" target="_blank" rel="noreferrer" style={{ color: '#856404', textDecoration: 'underline' }}>orellichnov.cz/otcl/vysledky/</a>, 
              vyber rok v dropdownu, klikni na "Dvouhra muži" nebo "Čtyřhra", pak Ctrl+S (Uložit stránku jako...).
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
              <label style={{ fontWeight: 'bold', color: '#856404' }}>Ročník:</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ padding: '8px 15px', fontSize: '16px', borderRadius: '8px', border: '2px solid #ffc107' }}
              >
                {RODNICI.map(r => (
                  <option key={r.rok} value={r.rok}>{r.popis}</option>
                ))}
              </select>
            </div>
            
            <label style={{ 
              padding: '15px 25px', 
              background: isLoading ? '#6c757d' : '#ffc107', 
              color: '#333', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '18px', 
              cursor: isLoading ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              {isLoading ? '⏳ Nahrávám...' : `📂 Vybrat HTML soubor (archív ${selectedYear})`}
              <input 
                type="file" 
                accept=".html,.htm" 
                onChange={nahratArchiv}
                disabled={isLoading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* SMAZAT VŠE */}
        <div style={{ background: '#f8d7da', padding: '20px', borderRadius: '15px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', border: '2px solid #f5c6cb' }}>
          <button onClick={smazatVse} disabled={isLoading}
            style={{ padding: '15px 25px', background: isLoading ? '#6c757d' : '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
            💥 Smazat VŠECHNY zápasy
          </button>
        </div>
        
        {/* STATUS */}
        {status && (
          <div style={{ marginTop: '30px', padding: '20px', background: status.startsWith('✅') ? '#d4edda' : status.startsWith('❌') ? '#f8d7da' : '#fff3cd', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold' }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
