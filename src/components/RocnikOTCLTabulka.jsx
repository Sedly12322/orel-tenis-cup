import React, { useMemo } from 'react';

function RocnikOTCLTabulka({ matches, nazev, isDivak, rok }) {
  // Extrahovat unikátní hráče z zápasů
  const hraci = useMemo(() => {
    const hraciSet = new Set();
    matches.forEach(z => {
      hraciSet.add(z.player1_name);
      hraciSet.add(z.player2_name);
    });
    return Array.from(hraciSet).sort();
  }, [matches]);

  // Spočítat statistiky pro každého hráče
  const staty = useMemo(() => {
    const s = {};
    hraci.forEach(h => {
      s[h] = { z: 0, v: 0, setyW: 0, setyL: 0, body: 0 };
    });
    
    matches.forEach(z => {
      const isP1 = z.player1_name;
      const s1 = z.match_state?.sets_won?.player1 || 0;
      const s2 = z.match_state?.sets_won?.player2 || 0;
      
      if (s[isP1]) {
        s[isP1].z++;
        s[isP1].setyW += s1;
        s[isP1].setyL += s2;
        if (s1 > s2) {
          s[isP1].v++;
          if (s1 === 2 && s2 === 0) s[isP1].body += 4;
          else if (s1 === 2 && s2 === 1) s[isP1].body += 3;
          else s[isP1].body += 2;
        } else {
          if (s2 === 2 && s1 === 0) s[isP1].body += 0;
          else s[isP1].body += 1;
        }
      }
      
      const isP2 = z.player2_name;
      if (s[isP2]) {
        s[isP2].z++;
        s[isP2].setyW += s2;
        s[isP2].setyL += s1;
        if (s2 > s1) {
          s[isP2].v++;
          if (s2 === 2 && s1 === 0) s[isP2].body += 4;
          else if (s2 === 2 && s1 === 1) s[isP2].body += 3;
          else s[isP2].body += 2;
        } else {
          if (s1 === 2 && s2 === 0) s[isP2].body += 0;
          else s[isP2].body += 1;
        }
      }
    });
    
    return s;
  }, [matches, hraci]);

  // Sestavit data pro tabulkaři - jen horní trojúhelník
  const data = useMemo(() => {
    const d = [];
    for (let i = 0; i < hraci.length; i++) {
      const row = [];
      for (let j = 0; j < hraci.length; j++) {
        if (i === j) {
          row.push({ type: 'diagonal' });
        } else if (j > i) {
          // Najdi zápas
          const zapas = matches.find(z => 
            (z.player1_name === hraci[i] && z.player2_name === hraci[j]) ||
            (z.player1_name === hraci[j] && z.player2_name === hraci[i])
          );
          
          if (zapas) {
            const isP1 = zapas.player1_name === hraci[i];
            const s1 = zapas.match_state?.sets_won?.player1 || 0;
            const s2 = zapas.match_state?.sets_won?.player2 || 0;
            const mySets = isP1 ? s1 : s2;
            const enemySets = isP1 ? s2 : s1;
            
            const scoreText = zapas.match_state?.completed_sets?.map(s => {
              const g1 = isP1 ? s.player1_games : s.player2_games;
              const g2 = isP1 ? s.player2_games : s.player1_games;
              return `${g1}-${g2}`;
            }).join(', ') || '-';
            
            row.push({ 
              type: 'match', 
              score: scoreText,
              vyhral: mySets > enemySets,
              prohral: mySets < enemySets
            });
          } else {
            row.push({ type: 'empty' });
          }
        } else {
          row.push({ type: 'skip' }); // Dolní trojúhelník - nezobrazovat
        }
      }
      d.push(row);
    }
    return d;
  }, [hraci, matches]);

  return (
    <div style={{ marginBottom: '40px', overflowX: 'auto' }}>
      <h3 style={{ 
        textAlign: 'center', 
        color: isDivak ? '#ffeb3b' : '#333',
        fontSize: '16px',
        margin: '20px 0 10px 0'
      }}>
        {nazev} ({rok})
      </h3>
      
      <table style={{ 
        margin: '0 auto',
        borderCollapse: 'collapse',
        background: isDivak ? '#1a1a1a' : '#fff',
        color: isDivak ? '#fff' : '#333',
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <thead>
          {/* Čísla hráčů */}
          <tr>
            <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd', minWidth: '30px' }}></th>
            {hraci.map((_, i) => (
              <th key={i} style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd', minWidth: '60px', textAlign: 'center' }}>
                {i + 1}
              </th>
            ))}
            <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd', minWidth: '40px' }}>Body</th>
            <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd', minWidth: '50px' }}>Skóre</th>
            <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd', minWidth: '40px' }}>Poř.</th>
          </tr>
          {/* Jména hráčů */}
          <tr>
            <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd', minWidth: '100px' }}></th>
            {hraci.map((hrac, i) => (
              <th key={i} style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd', textAlign: 'left', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {hrac.split(' / ').pop().split(' ').pop()}
              </th>
            ))}
            <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd' }}></th>
            <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd' }}></th>
            <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd' }}></th>
          </tr>
        </thead>
        <tbody>
          {hraci.map((hrac1, i) => (
            <tr key={i}>
              <td style={{ padding: '4px', border: '1px solid #555', textAlign: 'center', background: isDivak ? '#222' : '#f5f5f5' }}>{i + 1}</td>
              {data[i]?.map((cell, j) => {
                if (cell.type === 'diagonal') {
                  return (
                    <td key={j} style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ccc', color: isDivak ? '#666' : '#999', textAlign: 'center' }}>
                      XX
                    </td>
                  );
                }
                
                if (cell.type === 'skip') {
                  return (
                    <td key={j} style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#1a1a1a' : '#f9f9f9' }}>
                      &nbsp;
                    </td>
                  );
                }
                
                if (cell.type === 'empty') {
                  return (
                    <td key={j} style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#1a1a1a' : '#fff', color: '#666', textAlign: 'center' }}>
                      -
                    </td>
                  );
                }
                
                return (
                  <td 
                    key={j} 
                    style={{ 
                      padding: '4px', 
                      border: '1px solid #555', 
                      background: cell.vyhral ? (isDivak ? '#1a3a1a' : '#d4edda') : 
                                 cell.prohral ? (isDivak ? '#3a1a1a' : '#f8d7da') : 
                                 (isDivak ? '#1a1a1a' : '#fff'),
                      color: cell.vyhral ? '#28a745' : 
                             cell.prohral ? '#dc3545' : 
                             (isDivak ? '#fff' : '#333'),
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: cell.vyhral ? 'bold' : 'normal'
                    }}
                    title={`${hrac1} vs ${hraci[j]}: ${cell.score}`}
                  >
                    {cell.score}
                  </td>
                );
              })}
              <td style={{ padding: '4px', border: '1px solid #555', textAlign: 'center', fontWeight: 'bold', color: '#007bff' }}>
                {staty[hrac1]?.body || 0}
              </td>
              <td style={{ padding: '4px', border: '1px solid #555', textAlign: 'center', fontSize: '11px' }}>
                {staty[hrac1]?.setyW || 0}:{staty[hrac1]?.setyL || 0}
              </td>
              <td style={{ padding: '4px', border: '1px solid #555', textAlign: 'center' }}>
                {i + 1}.
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Legenda */}
      <div style={{ 
        marginTop: '20px', 
        textAlign: 'center', 
        fontSize: '12px', 
        color: isDivak ? '#888' : '#666',
        fontStyle: 'italic'
      }}>
        S = Skreč, K = Kontumace | Zelená = výhra, Červená = prohra
      </div>
    </div>
  );
}

export default RocnikOTCLTabulka;
