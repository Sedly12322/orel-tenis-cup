import React, { useMemo } from 'react';

function RocnikOTCLTabulka({ matches, nazev, isDivak, rok }) {
  // Extrahovat unikátní hráče a spočítat statistiky
  const staty = useMemo(() => {
    const s = {};
    matches.forEach(z => {
      if (!s[z.player1_name]) s[z.player1_name] = { jmeno: z.player1_name, z: 0, v: 0, p: 0, setyW: 0, setyL: 0, body: 0 };
      if (!s[z.player2_name]) s[z.player2_name] = { jmeno: z.player2_name, z: 0, v: 0, p: 0, setyW: 0, setyL: 0, body: 0 };
    });
    
    matches.forEach(z => {
      const s1 = z.match_state?.sets_won?.player1 || 0;
      const s2 = z.match_state?.sets_won?.player2 || 0;
      
      if (s[z.player1_name]) {
        s[z.player1_name].z++;
        s[z.player1_name].setyW += s1;
        s[z.player1_name].setyL += s2;
        if (s1 > s2) {
          s[z.player1_name].v++;
          s[z.player1_name].body += (s1 === 2 && s2 === 0) ? 4 : (s1 === 2 && s2 === 1) ? 3 : 2;
        } else {
          s[z.player1_name].body += (s2 === 2 && s1 === 0) ? 0 : 1;
          s[z.player1_name].p++;
        }
      }
      
      if (s[z.player2_name]) {
        s[z.player2_name].z++;
        s[z.player2_name].setyW += s2;
        s[z.player2_name].setyL += s1;
        if (s2 > s1) {
          s[z.player2_name].v++;
          s[z.player2_name].body += (s2 === 2 && s1 === 0) ? 4 : (s2 === 2 && s1 === 1) ? 3 : 2;
        } else {
          s[z.player2_name].body += (s1 === 2 && s2 === 0) ? 0 : 1;
          s[z.player2_name].p++;
        }
      }
    });
    
    return Object.values(s).sort((a, b) => b.body - a.body || (b.v - a.v));
  }, [matches]);

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
        {nazev}
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
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{s.jmeno}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{s.z}</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#28a745' }}>{s.v}</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#dc3545' }}>{s.p}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{s.setyW}:{s.setyL}</td>
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#007bff' }}>{s.body}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RocnikOTCLTabulka;
