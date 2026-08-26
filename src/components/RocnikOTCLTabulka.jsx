import React, { useMemo } from 'react';

function parsujScore(scoreStr) {
  if (!scoreStr || scoreStr === 'XX' || scoreStr.includes('K') || scoreStr.includes('S')) {
    return { text: scoreStr, sets: [], Kontumace: scoreStr.includes('K') };
  }
  
  const sets = scoreStr.split(',').map(s => s.trim()).filter(s => s.match(/^\d+-\d+/));
  return { text: scoreStr, sets, kontumace: false };
}

function getScoreColorClass(p1Sets, p2Sets) {
  if (p1Sets > p2Sets) return 'score-win';
  if (p1Sets < p2Sets) return 'score-loss';
  return 'score-neutral';
}

function RocnikOTCLTabulka({ matches, hraci, nazev, isDivak, rok }) {
  const isCtyrhra = hraci.some(h => h.includes(' / '));

  return (
    <div style={{ marginBottom: '40px', overflowX: 'auto' }}>
      <h3 style={{ 
        textAlign: 'center', 
        color: isDivak ? '#ffeb3b' : '#333',
        fontSize: '18px',
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
          {hraci.map((hrac1, i) => {
            // Najdi všechny zápasy hráče
            const zapasyHrace = matches.filter(z => z.player1_name === hrac1 || z.player2_name === hrac1);
            
            // Spočítej body
            let body = 0;
            let setyW = 0;
            let setyL = 0;
            
            zapasyHrace.forEach(z => {
              const isP1 = z.player1_name === hrac1;
              const s1 = z.match_state?.sets_won?.player1 || 0;
              const s2 = z.match_state?.sets_won?.player2 || 0;
              const mySets = isP1 ? s1 : s2;
              const enemySets = isP1 ? s2 : s1;
              
              setyW += mySets;
              setyL += enemySets;
              
              if (mySets > enemySets) {
                if (mySets === 2 && enemySets === 0) body += 4;
                else if (mySets === 2 && enemySets === 1) body += 3;
                else body += 2;
              } else {
                if (enemySets === 2 && mySets === 0) body += 0;
                else body += 1;
              }
            });
            
            // Skóre (poměr her)
            const gamesW = zapasyHrace.reduce((acc, z) => {
              if (!z.match_state?.completed_sets) return acc;
              const isP1 = z.player1_name === hrac1;
              return acc + z.match_state.completed_sets.reduce((a, s) => a + (isP1 ? s.player1_games : s.player2_games), 0);
            }, 0);
            
            const gamesL = zapasyHrace.reduce((acc, z) => {
              if (!z.match_state?.completed_sets) return acc;
              const isP1 = z.player1_name === hrac1;
              return acc + z.match_state.completed_sets.reduce((a, s) => a + (isP1 ? s.player2_games : s.player1_games), 0);
            }, 0);
            
            return (
              <tr key={i}>
                <td style={{ padding: '4px', border: '1px solid #555', textAlign: 'center', background: isDivak ? '#222' : '#f5f5f5' }}>{i + 1}</td>
                {hraci.map((hrac2, j) => {
                  if (i === j) {
                    return (
                      <td key={j} style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ccc', color: isDivak ? '#666' : '#999', textAlign: 'center' }}>
                        XX
                      </td>
                    );
                  }
                  
                  // Najdi zápas mezi hráčem i a j
                  const zapas = matches.find(z => 
                    (z.player1_name === hrac1 && z.player2_name === hrac2) ||
                    (z.player1_name === hrac2 && z.player2_name === hrac1)
                  );
                  
                  if (!zapas) {
                    return (
                      <td key={j} style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#1a1a1a' : '#fff', color: '#666', textAlign: 'center' }}>
                        -
                      </td>
                    );
                  }
                  
                  const isP1 = zapas.player1_name === hrac1;
                  const s1 = zapas.match_state?.sets_won?.player1 || 0;
                  const s2 = zapas.match_state?.sets_won?.player2 || 0;
                  const mySets = isP1 ? s1 : s2;
                  const enemySets = isP1 ? s2 : s1;
                  const scoreClass = getScoreColorClass(mySets, enemySets);
                  
                  // Zjistit výherce pro zvýraznění
                  const vyhral = mySets > enemySets;
                  
                  // Sestavit text skóre
                  const scoreText = zapas.match_state?.completed_sets?.map(s => {
                    const g1 = isP1 ? s.player1_games : s.player2_games;
                    const g2 = isP1 ? s.player2_games : s.player1_games;
                    return `${g1}-${g2}`;
                  }).join(', ') || '-';
                  
                  return (
                    <td 
                      key={j} 
                      style={{ 
                        padding: '4px', 
                        border: '1px solid #555', 
                        background: scoreClass === 'score-win' ? (isDivak ? '#1a3a1a' : '#d4edda') : 
                                   scoreClass === 'score-loss' ? (isDivak ? '#3a1a1a' : '#f8d7da') : 
                                   (isDivak ? '#1a1a1a' : '#fff'),
                        color: scoreClass === 'score-win' ? '#28a745' : 
                               scoreClass === 'score-loss' ? '#dc3545' : 
                               (isDivak ? '#fff' : '#333'),
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: vyhral ? 'bold' : 'normal'
                      }}
                      title={`${hrac1} vs ${hrac2}: ${zapas.score || '-'}`}
                    >
                      {scoreText}
                    </td>
                  );
                })}
                <td style={{ padding: '4px', border: '1px solid #555', textAlign: 'center', fontWeight: 'bold', color: '#007bff' }}>{body}</td>
                <td style={{ padding: '4px', border: '1px solid #555', textAlign: 'center', fontSize: '11px' }}>{setyW}:{setyL}</td>
                <td style={{ padding: '4px', border: '1px solid #555', textAlign: 'center' }}>{i + 1}.</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Legendau */}
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
