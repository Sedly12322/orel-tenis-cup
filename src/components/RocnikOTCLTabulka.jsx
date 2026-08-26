import React, { useMemo } from 'react';

function RocnikOTCLTabulka({ matches, nazev, isDivak, rok }) {
  // Extrahovat unikátní hráče a spočítat statistiky
  const staty = useMemo(() => {
    const s = {};
    matches.forEach(z => {
      if (!s[z.player1_name]) s[z.player1_name] = { jmeno: z.player1_name, z: 0, v: 0, p: 0, setyW: 0, setyL: 0, body: 0, poradi: null };
      if (!s[z.player2_name]) s[z.player2_name] = { jmeno: z.player2_name, z: 0, v: 0, p: 0, setyW: 0, setyL: 0, body: 0, poradi: null };
    });
    
    matches.forEach(z => {
      const s1 = z.match_state?.sets_won?.player1 || 0;
      const s2 = z.match_state?.sets_won?.player2 || 0;
      
      // Z body a pořadí z webu (pokud existují)
      const webBody1 = z.match_state?.web_body;
      const webPoradi1 = z.match_state?.web_poradi;
      const webBody2 = z.match_state?.web_body_p2;
      const webPoradi2 = z.match_state?.web_poradi_p2;
      
      // Player 1
      if (s[z.player1_name]) {
        s[z.player1_name].z++;
        s[z.player1_name].setyW += s1;
        s[z.player1_name].setyL += s2;
        if (webBody1 !== undefined) s[z.player1_name].body = webBody1;
        if (webPoradi1) s[z.player1_name].poradi = webPoradi1;
        
        if (s1 > s2) {
          s[z.player1_name].v++;
          if (webBody1 === undefined) {
            if (s1 === 2 && s2 === 0) s[z.player1_name].body += 4;
            else if (s1 === 2 && s2 === 1) s[z.player1_name].body += 3;
            else s[z.player1_name].body += 2;
          }
        } else {
          s[z.player1_name].p++;
          if (webBody1 === undefined) {
            if (s2 === 2 && s1 === 0) s[z.player1_name].body += 1;
            else if (s2 === 2 && s1 === 1) s[z.player1_name].body += 2;
            else s[z.player1_name].body += 1;
          }
        }
      }
      
      // Player 2
      if (s[z.player2_name]) {
        s[z.player2_name].z++;
        s[z.player2_name].setyW += s2;
        s[z.player2_name].setyL += s1;
        if (webBody2 !== undefined) s[z.player2_name].body = webBody2;
        if (webPoradi2) s[z.player2_name].poradi = webPoradi2;
        
        if (s2 > s1) {
          s[z.player2_name].v++;
          if (webBody2 === undefined) {
            if (s2 === 2 && s1 === 0) s[z.player2_name].body += 4;
            else if (s2 === 2 && s1 === 1) s[z.player2_name].body += 3;
            else s[z.player2_name].body += 2;
          }
        } else {
          s[z.player2_name].p++;
          if (webBody2 === undefined) {
            if (s1 === 2 && s2 === 0) s[z.player2_name].body += 1;
            else if (s1 === 2 && s2 === 1) s[z.player2_name].body += 2;
            else s[z.player2_name].body += 1;
          }
        }
      }
    });
    
    return Object.values(s).sort((a, b) => {
      // Pokud máme pořadí z webu, řadit podle něj
      if (a.poradi && b.poradi) {
        const pa = parseFloat(a.poradi);
        const pb = parseFloat(b.poradi);
        if (!isNaN(pa) && !isNaN(pb)) return pa - pb;
      }
      // Jinak podle bodů
      return b.body - a.body || (b.v - a.v);
    });
  }, [matches]);

  // Zjistit zda máme data z webu (archiv)
  const hasWebData = matches.length > 0 && matches[0].match_state?.web_body !== undefined;

  return (
    <div style={{ marginBottom: '30px' }}>
      <h4 style={{ 
        textAlign: 'center', 
        color: isDivak ? '#ffeb3b' : '#333',
        fontSize: '14px',
        margin: '15px 0 10px 0',
        borderBottom: '1px solid #555',
        paddingBottom: '5px'
      }}>
        {nazev} {hasWebData ? `(${rok})` : ''}
      </h4>
      
      {/* Tabulka */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%',
          borderCollapse: 'collapse',
          background: isDivak ? '#1a1a1a' : '#fff',
          color: isDivak ? '#fff' : '#333',
          fontSize: '12px'
        }}>
          <thead>
            <tr style={{ background: isDivak ? '#333' : '#e9ecef' }}>
              {hasWebData && <th style={{ padding: '8px', textAlign: 'center' }}>Poř.</th>}
              <th style={{ padding: '8px', textAlign: 'left' }}>Hráč</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Z</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>V</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>P</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Sety</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Body</th>
            </tr>
          </thead>
          <tbody>
            {staty.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #444' }}>
                {hasWebData && (
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                    {s.poradi ? s.poradi.replace('.', '') : (i + 1)}
                  </td>
                )}
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{s.jmeno}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{s.z}</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#28a745' }}>{s.v}</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#dc3545' }}>{s.p}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{s.setyW}:{s.setyL}</td>
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#007bff', fontSize: '14px' }}>{s.body}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RocnikOTCLTabulka;
