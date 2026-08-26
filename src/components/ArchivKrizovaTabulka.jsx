import React, { useMemo } from 'react';

function ArchivKrizovaTabulka({ matches, nazev, isDivak, rok }) {
  // Extrahovat unikátní hráče a jejich statistiky z webu
  const { hraci, hraciStat, matice } = useMemo(() => {
    const hraciSet = new Set();
    matches.forEach(z => {
      hraciSet.add(z.player1_name);
      hraciSet.add(z.player2_name);
    });
    
    const hraciList = Array.from(hraciSet).sort();
    
    // Mapa hráč -> index
    const hraciIdx = {};
    hraciList.forEach((h, i) => { hraciIdx[h] = i; });
    
    // Matice výsledků (null = nehráno, {score, vyhral} = výsledek)
    const m = Array(hraciList.length).fill(null).map(() => Array(hraciList.length).fill(null));
    
    matches.forEach(z => {
      const i1 = hraciIdx[z.player1_name];
      const i2 = hraciIdx[z.player2_name];
      if (i1 === undefined || i2 === undefined) return;
      
      const s1 = z.match_state?.sets_won?.player1 || 0;
      const s2 = z.match_state?.sets_won?.player2 || 0;
      
      m[i1][i2] = {
        score: z.match_state?.score_original || '-',
        vyhral: s1 > s2,
        prohral: s1 < s2
      };
      m[i2][i1] = {
        score: z.match_state?.score_original || '-',
        vyhral: s2 > s1,
        prohral: s2 < s1
      };
    });
    
    // Shromáždit statistiky z webu (pokud existují)
    const statMap = {};
    matches.forEach(z => {
      const p1 = z.match_state?.web_body;
      const p1por = z.match_state?.web_poradi;
      const p2 = z.match_state?.web_body_p2;
      const p2por = z.match_state?.web_poradi_p2;
      
      if (p1 !== undefined) statMap[z.player1_name] = { body: p1, poradi: p1por };
      if (p2 !== undefined) statMap[z.player2_name] = { body: p2, poradi: p2por };
    });
    
    return { hraci: hraciList, hraciStat: statMap, matice: m };
  }, [matches]);

  if (!hraci || hraci.length === 0) return null;

  // Zjistit zda máme data z webu
  const hasWebData = Object.keys(hraciStat).length > 0;

  // Seřadit hráče podle pořadí z webu (pokud existuje)
  const hraciSorted = useMemo(() => {
    if (!hasWebData) return hraci;
    
    return [...hraci].sort((a, b) => {
      const sa = hraciStat[a];
      const sb = hraciStat[b];
      if (sa?.poradi && sb?.poradi) {
        const pa = parseFloat(sa.poradi);
        const pb = parseFloat(sb.poradi);
        if (!isNaN(pa) && !isNaN(pb)) return pa - pb;
      }
      return 0;
    });
  }, [hraci, hraciStat, hasWebData]);

  return (
    <div style={{ marginBottom: '30px', overflowX: 'auto' }}>
      <h4 style={{ 
        textAlign: 'center', 
        color: isDivak ? '#ffeb3b' : '#333',
        fontSize: '14px',
        margin: '15px 0 10px 0',
        borderBottom: '1px solid #555',
        paddingBottom: '5px'
      }}>
        {nazev} ({rok})
      </h4>
      
      <table style={{ 
        margin: '0 auto',
        borderCollapse: 'collapse',
        background: isDivak ? '#1a1a1a' : '#fff',
        color: isDivak ? '#fff' : '#333',
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <thead>
          {/* Čísla hráčů */}
          <tr>
            <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd', minWidth: '30px' }}></th>
            {hraciSorted.map((_, i) => (
              <th key={i} style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd', minWidth: '55px', textAlign: 'center', fontSize: '10px' }}>
                {i + 1}
              </th>
            ))}
            {hasWebData && <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd', minWidth: '35px' }}>Body</th>}
            {hasWebData && <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd', minWidth: '35px' }}>Poř.</th>}
          </tr>
          {/* Jména hráčů */}
          <tr>
            <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd', minWidth: '80px' }}></th>
            {hraciSorted.map((hrac, i) => (
              <th key={i} style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd', textAlign: 'left', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '10px' }}>
                {hrac.split(' ').pop()}
              </th>
            ))}
            {hasWebData && <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd' }}></th>}
            {hasWebData && <th style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ddd' }}></th>}
          </tr>
        </thead>
        <tbody>
          {hraciSorted.map((hrac1, i) => {
            const stat1 = hraciStat[hrac1];
            return (
              <tr key={i}>
                <td style={{ padding: '4px', border: '1px solid #555', textAlign: 'center', background: isDivak ? '#222' : '#f5f5f5', fontSize: '10px' }}>{i + 1}</td>
                {hraciSorted.map((hrac2, j) => {
                  if (i === j) {
                    return (
                      <td key={j} style={{ padding: '4px', border: '1px solid #555', background: isDivak ? '#333' : '#ccc', color: isDivak ? '#666' : '#999', textAlign: 'center' }}>
                        XX
                      </td>
                    );
                  }
                  
                  // Najdi zápas
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
                  const scoreClass = mySets > enemySets ? 'score-win' : mySets < enemySets ? 'score-loss' : 'score-neutral';
                  
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
                        fontSize: '10px',
                        fontWeight: vyhral ? 'bold' : 'normal'
                      }}
                      title={`${hrac1} vs ${hrac2}: ${zapas.match_state?.score_original || '-'}`}
                    >
                      {scoreText}
                    </td>
                  );
                })}
                {hasWebData && (
                  <td style={{ padding: '4px', border: '1px solid #555', textAlign: 'center', fontWeight: 'bold', color: '#007bff', fontSize: '12px' }}>
                    {stat1?.body || '-'}
                  </td>
                )}
                {hasWebData && (
                  <td style={{ padding: '4px', border: '1px solid #555', textAlign: 'center', fontSize: '12px' }}>
                    {stat1?.poradi || '-'}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ArchivKrizovaTabulka;
