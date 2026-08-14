import React, { useState } from 'react';
import { supabase } from './supabase';

export default function ImportData({ zpetDoMenu }) {
  const [importText, setImportText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const zkopirovatSkript = () => {
    navigator.clipboard.writeText(`javascript:(function(){const tabulky=document.querySelectorAll('table');let vsechnaData=[];if(tabulky.length>0){tabulky.forEach((tabulka)=>{const radky=tabulka.querySelectorAll('tr');radky.forEach((radek)=>{const bunky=radek.querySelectorAll('td, th');const textyBunek=Array.from(bunky).map(bunka=>bunka.innerText.trim());if(textyBunek.length>0&&textyBunek.some(text=>text!=="")){vsechnaData.push(textyBunek);}});});}const vysledekJSON=JSON.stringify(vsechnaData,null,2);const textarea=document.createElement('textarea');textarea.value=vysledekJSON;document.body.appendChild(textarea);textarea.select();document.execCommand('copy');document.body.removeChild(textarea);alert('Data jsou zkopírována do schránky!');})();`);
    alert('Záložkový skript zkopírován!\n\n1. Vytvořte v prohlížeči novou záložku.\n2. Upravte ji a do políčka URL (adresa) vložte tento kód.\n3. Jděte na orellichnov.cz a na záložku klikněte.');
  }

  const spustitAktualizaci = async () => {
    if (!importText.trim()) {
      alert('Nejprve vložte zkopírovaná data!');
      return;
    }

    setIsLoading(true);

    try {
      const rawData = JSON.parse(importText);
      let groupA = [], groupB = [], currentGroup = 0;

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (row[0] && row[0].includes('Skupina A')) { currentGroup = 1; continue; }
        if (row[0] && row[0].includes('Skupina B')) { currentGroup = 2; continue; }
        if (row.length < 5 || !parseInt(row[0])) continue; 
        
        if (currentGroup === 1) groupA.push(row);
        if (currentGroup === 2) groupB.push(row);
      }

      const vsichniHraci = [...groupA, ...groupB].map(r => r[1]);
      const { data: existingPlayers } = await supabase.from('players').select('name');
      const existingNames = existingPlayers ? existingPlayers.map(e => e.name) : [];
      
      let pridaniHraci = 0;
      for (const hrac of vsichniHraci) {
        if (!existingNames.includes(hrac)) {
          await supabase.from('players').insert([{ name: hrac }]);
          existingNames.push(hrac);
          pridaniHraci++;
        }
      }

      const zpracujSkupinu = (skupina) => {
        const matchInserts = [];
        for (let i = 0; i < skupina.length; i++) {
          const p1Name = skupina[i][1];
          for (let j = i + 1; j < skupina.length; j++) {
            const scoreStr = skupina[i][j + 2];
            if (scoreStr && scoreStr.trim() !== "") {
              const p2Name = skupina[j][1];
              const sets = scoreStr.split(',').map(s => s.trim());
              const completed_sets = []; 
              let p1Won = 0; let p2Won = 0;

              sets.forEach(set => {
                let g1 = 0, g2 = 0; 
                const m = set.match(/^(\d+)-(\d+)/);
                if (m) {
                  g1 = parseInt(m[1]); g2 = parseInt(m[2]);
                  if (g1 > 9 && ![10, 11, 12, 13, 14, 15].includes(g1)) g1 = parseInt(m[1].charAt(0));
                  if (g2 > 9 && ![10, 11, 12, 13, 14, 15].includes(g2)) g2 = parseInt(m[2].charAt(0));
                  completed_sets.push({ player1_games: g1, player2_games: g2 });
                  if (g1 > g2) p1Won++; else if (g2 > g1) p2Won++;
                }
              });

              matchInserts.push({
                player1_name: p1Name, player2_name: p2Name, status: 'finished', round: null,
                match_state: { 
                  player1_name: p1Name, player2_name: p2Name, server: 1, 
                  sets_won: { player1: p1Won, player2: p2Won }, 
                  completed_sets: completed_sets, 
                  current_set: { player1_games: 0, player2_games: 0 }, 
                  current_game: { player1_points: "0", player2_points: "0" }, 
                  is_tiebreak: false 
                }
              });
            }
          }
        }
        return matchInserts;
      };

      const noveZapasy = [...zpracujSkupinu(groupA), ...zpracujSkupinu(groupB)];
      const { data: existujici } = await supabase.from('matches').select('*');
      
      let updatovano = 0; let pridano = 0;

      for (const novy of noveZapasy) {
        const matchExistuje = existujici.find(e => 
          (e.player1_name === novy.player1_name && e.player2_name === novy.player2_name) || 
          (e.player1_name === novy.player2_name && e.player2_name === novy.player1_name)
        );

        if (matchExistuje) {
          await supabase.from('matches').update({ 
            player1_name: novy.player1_name, 
            player2_name: novy.player2_name, 
            status: 'finished', 
            match_state: novy.match_state 
          }).eq('id', matchExistuje.id);
          updatovano++;
        } else { 
          await supabase.from('matches').insert([novy]); 
          pridano++; 
        }
      }

      alert(`Úspěšná synchronizace s webem!\n\nNové zápasy: ${pridano}\nAktualizované zápasy: ${updatovano}\nNoví hráči: ${pridaniHraci}`);
      setImportText('');
      zpetDoMenu();

    } catch (err) { 
      alert("Něco se pokazilo. Zkopírovali jste data správně?\n\nDetaily chyby: " + err.message); 
    } finally {
      setIsLoading(false);
    }
  }

  // --- NOVINKA: Reset celého turnaje ---
  const smazatVsechnyZapasy = async () => {
    if (window.confirm('🚨 POZOR! Opravdu chcete smazat VŠECHNY zápasy? \n\nTato akce je nevratná a smaže úplně celou historii turnaje!')) {
      if (window.confirm('Jste si absolutně jistí? Zmizí pavouk, rozehrané zápasy i všechny tabulky.')) {
        setIsLoading(true);
        try {
          // Příkaz pro smazání všech záznamů (kde id není null)
          await supabase.from('matches').delete().not('id', 'is', null);
          alert('Všechny zápasy byly úspěšně smazány. Turnaj byl resetován.');
          zpetDoMenu();
        } catch (err) {
          alert('Nepodařilo se smazat zápasy. Chyba: ' + err.message);
        } finally {
          setIsLoading(false);
        }
      }
    }
  }

  return (
    <div style={{ textAlign: 'center', fontFamily: 'sans-serif', padding: '50px 20px', background: '#f4f7f6', color: '#333', minHeight: '100vh' }}>
      <button onClick={zpetDoMenu} style={{ padding: '15px 25px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>← Zpět do Menu</button>
      
      <h1 style={{ fontSize: '32px', marginBottom: '30px' }}>📥 Import z webu Orel Lichnov</h1>
      
      <div style={{ maxWidth: '700px', margin: '0 auto', background: '#fff', padding: '40px', borderRadius: '15px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
        
        <div style={{ marginBottom: '40px', textAlign: 'left', background: '#e9ecef', padding: '20px', borderRadius: '10px' }}>
          <h3 style={{ marginTop: 0 }}>Krok 1: Příprava (pokud taháte z mobilu)</h3>
          <p>Tlačítkem níže si zkopírujete "Záložkový skript". Ten si v prohlížeči uložte do libovolné záložky (jako URL). Jakmile budete na stránce Orel Lichnov, klikněte na záložku a tabulky se vám samy zkopírují.</p>
          <button onClick={zkopirovatSkript} style={{ padding: '15px 20px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
            📋 Zkopírovat Bookmarklet skript
          </button>
        </div>

        <div style={{ textAlign: 'left' }}>
          <h3 style={{ marginTop: 0 }}>Krok 2: Vložení dat</h3>
          <p>Do pole níže vložte (Ctrl+V) vykopírovaný kód.</p>
          <textarea 
            value={importText} 
            onChange={(e) => setImportText(e.target.value)} 
            style={{ width: '100%', height: '150px', padding: '15px', fontSize: '14px', fontFamily: 'monospace', border: '2px solid #ccc', borderRadius: '8px', marginBottom: '20px', boxSizing: 'border-box' }} 
            placeholder='Např.: [ [ "Dvouhra muži...", "1", "2" ], ... ]' 
          />
          <button 
            onClick={spustitAktualizaci} 
            disabled={isLoading}
            style={{ padding: '20px 30px', background: isLoading ? '#6c757d' : '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontSize: '22px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%' }}
          >
            {isLoading ? '⏳ Zpracovávám data...' : '🔄 Zapsat výsledky do aplikace'}
          </button>
        </div>

        {/* NEBEZPEČNÁ ZÓNA */}
        <div style={{ marginTop: '50px', borderTop: '2px solid #ccc', paddingTop: '30px', textAlign: 'left' }}>
          <h3 style={{ color: '#dc3545', marginTop: 0 }}>⚠ Nebezpečná zóna</h3>
          <p style={{ color: '#666' }}>Pokud se vám importovaná data zduplikovala, nebo chcete začít celý turnaj úplně od nuly, můžete zde nevratně smazat všechny zápasy z databáze.</p>
          <button 
            onClick={smazatVsechnyZapasy} 
            disabled={isLoading}
            style={{ padding: '15px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%' }}
          >
            🗑️ Smazat VŠECHNY zápasy (Reset turnaje)
          </button>
        </div>

      </div>
    </div>
  )
}