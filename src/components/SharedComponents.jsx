import { vypocitejTabulku, zkraceneJmeno } from '../utils/gameLogic'

// Globální detekce diváka
const isDivak = window.location.search.includes('divak=1')

export const ZapasCard = ({ zapas, otevritZapas, smazatZapas }) => (
  <div style={{ background: isDivak ? '#333' : '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', border: isDivak ? '1px solid #444' : '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
    <div style={{ background: zapas.status === 'live' ? '#dc3545' : (isDivak ? '#444' : '#e9ecef'), color: zapas.status === 'live' ? 'white' : (isDivak ? '#aaa' : '#555'), padding: '10px 15px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>{zapas.status === 'live' ? '🔴 LIVE' : 'Konečný výsledek'}</span>
      {!isDivak && <button onClick={(e) => { e.stopPropagation(); smazatZapas(zapas.id); }} style={{ background: 'transparent', border: 'none', color: zapas.status === 'live' ? '#fff' : '#dc3545', cursor: 'pointer', fontSize: '18px' }}>🗑️</button>}
    </div>
    <div onClick={() => otevritZapas(zapas.id)} style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{color: isDivak ? '#fff' : '#000'}}>{zapas.player1_name || 'Hráč 1'}</span>
        <span style={{ color: '#007bff', background: isDivak ? '#222' : '#f0f0f0', padding: '5px 12px', borderRadius: '5px' }}>{zapas.match_state?.sets_won?.player1 || 0}</span>
      </div>
      <div style={{ width: '100%', height: '1px', background: isDivak ? '#555' : '#eee' }}></div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{color: isDivak ? '#fff' : '#000'}}>{zapas.player2_name || 'Hráč 2'}</span>
        <span style={{ color: '#007bff', background: isDivak ? '#222' : '#f0f0f0', padding: '5px 12px', borderRadius: '5px' }}>{zapas.match_state?.sets_won?.player2 || 0}</span>
      </div>
    </div>
  </div>
)

export const BracketMatchCard = ({ zapas, otevritZapas }) => {
  let stBg = isDivak ? '#333' : '#fff';
  let stCol = isDivak ? '#fff' : '#000';
  if (zapas.status === 'live') { stBg = '#dc3545'; stCol = '#fff'; }
  else if (zapas.status === 'finished') { stBg = isDivak ? '#222' : '#e9ecef'; stCol = '#888'; }

  return (
    <div onClick={() => otevritZapas(zapas.id)} style={{ background: stBg, border: '1px solid #aaa', padding: '10px', borderRadius: '8px', marginBottom: '15px', cursor: 'pointer', width: '200px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 'bold', borderBottom: '1px solid #555', paddingBottom: '5px', marginBottom: '5px', color: stCol }}>
        {zapas.player1_name || 'Hráč 1'}
        {zapas.status === 'finished' && <span style={{float: 'right'}}>{zapas.match_state?.sets_won?.player1}</span>}
      </div>
      <div style={{ fontWeight: 'bold', color: stCol }}>
        {zapas.player2_name || 'Hráč 2'}
        {zapas.status === 'finished' && <span style={{float: 'right'}}>{zapas.match_state?.sets_won?.player2}</span>}
      </div>
      {zapas.status === 'live' && <div style={{ color: '#fff', fontSize: '12px', marginTop: '5px', fontWeight: 'bold', textAlign: 'center' }}>🔴 LIVE</div>}
    </div>
  )
}

export const KrizovaTabulkaComponent = ({ matches, hraciList, nazev }) => {
  const { staty } = vypocitejTabulku(matches, hraciList);
  
  const getScoreText = (radkovyHrac, sloupcovyHrac) => {
    const match = matches.find(m => m.status === 'finished' && ((m.player1_name === radkovyHrac && m.player2_name === sloupcovyHrac) || (m.player1_name === sloupcovyHrac && m.player2_name === radkovyHrac)));
    if (!match || !match.match_state || !match.match_state.completed_sets) return "";
    return match.match_state.completed_sets.map(set => {
      if (match.player1_name === radkovyHrac) return `${set.player1_games}-${set.player2_games}`;
      else return `${set.player2_games}-${set.player1_games}`;
    }).join(', ');
  }

  return (
    <div style={{ overflowX: 'auto', background: isDivak ? '#333' : '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
      <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'center', fontSize: '15px' }}>
        <thead>
          <tr style={{ background: isDivak ? '#444' : '#e9ecef', color: isDivak ? '#fff' : '#000' }}>
            <th style={{ padding: '12px', border: '1px solid #ccc', textAlign: 'left', minWidth: '180px' }}>Dvouhra muži<br/>{nazev}</th>
            {hraciList.map((_, i) => <th key={i} style={{ padding: '12px', border: '1px solid #ccc', width: '60px' }}>{i + 1}</th>)}
            <th style={{ padding: '12px', border: '1px solid #ccc' }}>Body</th>
            <th style={{ padding: '12px', border: '1px solid #ccc' }}>Skóre</th>
            <th style={{ padding: '12px', border: '1px solid #ccc' }}>Pořadí</th>
          </tr>
          <tr style={{ background: isDivak ? '#555' : '#f8f9fa', color: isDivak ? '#ccc' : '#555', fontSize: '13px' }}>
            <th style={{ border: '1px solid #ccc' }}></th>
            {hraciList.map((h, i) => <th key={i} style={{ padding: '5px', border: '1px solid #ccc', whiteSpace: 'nowrap' }}>{zkraceneJmeno(h)}</th>)}
            <th style={{ border: '1px solid #ccc' }}></th><th style={{ border: '1px solid #ccc' }}></th><th style={{ border: '1px solid #ccc' }}></th>
          </tr>
        </thead>
        <tbody>
          {hraciList.map((hrac, rIdx) => {
            const s = staty[hrac];
            return (
              <tr key={hrac} style={{ background: isDivak ? '#2c2c2c' : '#fff' }}>
                <td style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', border: '1px solid #ccc', whiteSpace: 'nowrap', color: isDivak ? '#fff' : '#000' }}><span style={{ marginRight: '15px', color: '#888' }}>{rIdx + 1}</span> {hrac}</td>
                {hraciList.map((colHrac, cIdx) => {
                  if (rIdx === cIdx) return <td key={cIdx} style={{ background: isDivak ? '#555' : '#ddd', border: '1px solid #ccc' }}></td>
                  return <td key={cIdx} style={{ padding: '12px', border: '1px solid #ccc', whiteSpace: 'nowrap', color: isDivak ? '#ddd' : '#444' }}>{getScoreText(hrac, colHrac)}</td>
                })}
                <td style={{ padding: '12px', fontWeight: 'bold', border: '1px solid #ccc', color: '#007bff' }}>{s.body}</td>
                <td style={{ padding: '12px', border: '1px solid #ccc', color: isDivak ? '#fff' : '#000' }}>{s.gamesW}:{s.gamesL}</td>
                <td style={{ padding: '12px', fontWeight: 'bold', border: '1px solid #ccc', background: s.poradi === 1 ? '#ffd700' : s.poradi === 2 ? '#e3e4e5' : s.poradi === 3 ? '#cd7f32' : 'transparent', color: (s.poradi <= 3 && !isDivak) ? '#000' : (isDivak ? '#fff' : 'inherit') }}>{s.poradi}.</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export const SkupinaTable = ({ matches, hraciList, nazev }) => {
  const { serazeni: vysledky } = vypocitejTabulku(matches, hraciList);
  if (vysledky.length === 0) return null;

  return (
    <div style={{ overflowX: 'auto', background: isDivak ? '#333' : '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
      <h2 style={{ margin: '0 0 20px 0', color: isDivak ? '#ffeb3b' : '#000' }}>📊 {nazev}</h2>
      <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'center', fontSize: '18px' }}>
        <thead>
          <tr style={{ background: isDivak ? '#444' : '#e9ecef', color: isDivak ? '#fff' : '#000' }}>
            <th style={{ padding: '12px' }}>#</th><th style={{ padding: '12px', textAlign: 'left' }}>Hráč</th><th style={{ padding: '12px' }}>Z</th><th style={{ padding: '12px' }}>V</th><th style={{ padding: '12px' }}>P</th><th style={{ padding: '12px' }}>Sety</th><th style={{ padding: '12px' }}>Gemy</th><th style={{ padding: '12px', fontSize: '22px' }}>Body</th>
          </tr>
        </thead>
        <tbody>
          {vysledky.map((s, idx) => (
            <tr key={s.jmeno} style={{ borderBottom: '1px solid #ddd', background: idx === 0 ? (isDivak ? '#3a503a' : '#e2f0d9') : 'transparent', color: isDivak ? '#fff' : '#000' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>{idx + 1}.</td><td style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>{s.jmeno}</td><td style={{ padding: '12px' }}>{s.z}</td><td style={{ padding: '12px', color: '#28a745', fontWeight: 'bold' }}>{s.v}</td><td style={{ padding: '12px', color: '#dc3545' }}>{s.p}</td><td style={{ padding: '12px' }}>{s.setsW}:{s.setsL}</td><td style={{ padding: '12px' }}>{s.gamesW}:{s.gamesL}</td><td style={{ padding: '12px', fontWeight: 'bold', fontSize: '22px', color: '#007bff' }}>{s.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}