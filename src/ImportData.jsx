import { supabase } from './supabase'

export default function ImportData() {
  // Zde jsou vložena vaše vykopírovaná data
  const rawData = [
    [ "Dvouhra muži\nSkupina A", "1", "2", "3", "4", "5", "6", "7", "8", "9", "Body", "Skóre", "Pořadí" ],
    [ "F. Paľo", "L. Stanislav", "J. Matúš", "V. Vašut", "R. Petr", "P. Hazuka, ml.", "D. Sedlář", "S. Rek", "V. Rek" ],
    [ "1", "František Paľo", "", "6-3, 7-6", "6-0, 6-4", "6-3, 6-3", "7-6, 1-6, 7-3", "7-61, 6-1", "6-1, 3-6, 7-2", "3-6, 7-5, 7-3", "", "25", "77:56", "" ],
    [ "2", "Libor Stanislav", "3-6, 6-7", "", "6-4, 6-3", "4-6, 6-3, 7-3", "6-0, 6-1", "6-3, 6-2", "", "6-3, 6-2", "6-0, 6-0", "24", "79:40", "" ],
    [ "3", "Jan Matúš", "0-6, 4-6", "4-6, 3-6", "", "6-0, 6-2", "6-2, 6-2", "1-6, 5-7", "6-3, 7-5", "6-4, 4-6, 12-10", "6-4, 6-2", "22", "76:67", "" ],
    [ "4", "Vladimír Vašut", "3-6, 3-6", "6-4, 3-6, 3-7", "0-6, 2-6", "", "", "2-6, 3-6", "6-1, 6-1", "6-75, 1-6", "6-3, 6-4", "14", "53:68", "" ],
    [ "5", "Radek Petr", "6-7, 6-1, 3-7", "0-6, 1-6", "2-6, 2-6", "", "", "", "1-6, 2-6", "3-6, 1-6", "", "6", "24:56", "" ],
    [ "6", "Pavel Hazuka, ml.", "6-71, 1-6", "3-6, 2-6", "6-1, 7-5", "6-2, 6-3", "", "", "1-6, 5-7", "6-3, 4-6, 5-7", "7-66, 6-1", "17", "66:65", "" ],
    [ "7", "Dominik Sedlář", "1-6, 6-3, 2-7", "", "3-6, 5-7", "1-6, 1-6", "6-1, 6-2", "6-1, 7-5", "", "3-6, 6-4, 8-6", "", "15", "51:53", "" ],
    [ "8", "Sidney Rek", "6-3, 5-7, 3-7", "3-6, 2-6", "4-6, 6-4, 10-12", "7-65, 6-1", "6-3, 6-1", "3-6, 6-4, 7-5", "6-3, 4-6, 6-8", "", "", "18", "70:62", "" ],
    [ "9", "Vladislav Rek", "", "0-6, 0-6", "4-6, 2-6", "3-6, 4-6", "", "6-76, 1-6", "", "", "", "4", "20:49", "" ],
    [ "Dvouhra muži\nSkupina B", "1", "2", "3", "4", "5", "6", "7", "8", "Body", "Skóre", "Pořadí" ],
    [ "P. Osterezy", "Z. Liška", "J. Darivčák", "P. Kahánek", "T. Sedlář", "J. Hrančík", "L. Osterezy", "J. Jurek" ],
    [ "1", "Petr Osterezy", "", "6-4, 4-6, 5-7", "6-1, 6-1", "7-5, 6-2", "", "", "", "6-3, 6-1", "14", "47:23", "" ],
    [ "2", "Zdeněk Liška", "4-6, 6-4, 7-5", "", "6-1, 6-4", "", "", "", "6-1, 6-0", "", "11", "34:16", "" ],
    [ "3", "Jaromír Darivčák", "1-6, 1-6", "1-6, 4-6", "", "", "7-5, 1-6, 2-7", "1-6, 0-6", "6-1, 6-1", "6-4, 6-2", "13", "40:55", "" ],
    [ "4", "Přemysl Kahánek", "5-7, 2-6", "", "", "", "5-7, 1-6", "6-7, 2-6", "6-3, 6-3", "", "7", "33:45", "" ],
    [ "5", "Tomáš Sedlář", "", "", "5-7, 6-1, 7-2", "7-5, 6-1", "", "4-6, 2-6", "6-1, 6-1", "6-1, 6-4", "16", "54:33", "" ],
    [ "6", "Jan Hrančík", "", "", "6-1, 6-0", "7-6, 6-2", "6-4, 6-2", "", "6-1, 6-2", "6-1, 6-4", "20", "61:23", "" ],
    [ "7", "Lukáš Rafael Osterezy", "", "1-6, 0-6", "1-6, 1-6", "3-6, 3-6", "1-6, 1-6", "1-6, 2-6", "", "7-6, 6-4", "9", "27:70", "" ],
    [ "8", "Jaroslav Jurek", "3-6, 1-6", "", "4-6, 2-6", "", "1-6, 4-6", "1-6, 4-6", "6-7, 4-6", "", "5", "30:61", "" ]
  ];

  const spustiImport = async () => {
    try {
      let groupA = [];
      let groupB = [];
      let currentGroup = 0;

      // 1. Rozdělení do skupin
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (row[0] && row[0].includes('Skupina A')) { currentGroup = 1; continue; }
        if (row[0] && row[0].includes('Skupina B')) { currentGroup = 2; continue; }
        if (row.length < 5 || !parseInt(row[0])) continue;
        if (currentGroup === 1) groupA.push(row);
        if (currentGroup === 2) groupB.push(row);
      }

      // 2. Vložení hráčů
      const vsichniHraci = [...groupA, ...groupB].map(r => r[1]);
      const { data: existing } = await supabase.from('players').select('name');
      const existingNames = existing ? existing.map(e => e.name) : [];
      
      for (const hrac of vsichniHraci) {
        if (!existingNames.includes(hrac)) {
          await supabase.from('players').insert([{ name: hrac }]);
          existingNames.push(hrac); // Zabránění duplicitám za běhu
        }
      }

      // 3. Extrakce a formátování zápasů
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
                  // Čištění překlepů (např. 7-61 na 7-6), ignorujeme super tie-breaky
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

      const vsechnyZapasy = [...zpracujSkupinu(groupA), ...zpracujSkupinu(groupB)];
      
      // 4. Vložení do databáze
      for (const m of vsechnyZapasy) {
        await supabase.from('matches').insert([m]);
      }

      alert(`Úspěch! Nahráno ${vsichniHraci.length} hráčů a ${vsechnyZapasy.length} zápasů.`);
    } catch (err) {
      alert("Něco se pokazilo: " + err.message);
    }
  }

  return (
    <div style={{ background: '#ffeb3b', padding: '20px', margin: '20px auto', borderRadius: '10px', maxWidth: '600px', color: '#000', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
      <h2>🛠️ Import Historie (Jednorázový skript)</h2>
      <p>Klikněte na tlačítko a počkejte pár vteřin na potvrzovací okno.</p>
      <button onClick={spustiImport} style={{ padding: '15px 30px', fontSize: '20px', cursor: 'pointer', background: '#000', color: '#fff', border: 'none', borderRadius: '5px' }}>
        Nahrát data do Supabase
      </button>
    </div>
  )
}