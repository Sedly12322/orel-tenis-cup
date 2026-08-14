import { vypocitejTabulku, zkraceneJmeno } from '../utils/gameLogic'

export const ZapasCard = ({ zapas, isDivak, otevritZapas, smazatZapas }) => {
  const getSetyText = () => {
    if (!zapas.match_state?.completed_sets || zapas.match_state.completed_sets.length === 0) return "";
    return zapas.match_state.completed_sets
      .map(s => `${s.player1_games}:${s.player2_games}`)
      .join(', ');
  };

  // Vizuální rozlišení hlavičky podle toho, jestli se hraje, dohrálo se, nebo je to teprve naplánováno
  let headerBg = isDivak ? '#444' : '#e9ecef';
  let headerCol = isDivak ? '#aaa' : '#555';
  let statusText = 'Konečný výsledek';

  if (zapas.status === 'live') {
    headerBg = '#dc3545';
    headerCol = 'white';
    statusText = '🔴 LIVE';
  } else if (zapas.status === 'planned') {
    headerBg = isDivak ? '#333' : '#fff3cd'; 
    headerCol = isDivak ? '#888' : '#856404';
    statusText = '⏳ Naplánováno (Koncept)';
  }

  return (
    <div style={{ background: isDivak ? '#222' : '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', border: isDivak ? '1px solid #444' : '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: headerBg, color: headerCol, padding: '10px 15px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{statusText}</span>
        {!isDivak && smazatZapas && (
          <button onClick={(e) => { e.stopPropagation(); smazatZapas(zapas.id); }} style={{ background: 'transparent', border: 'none', color: zapas.status === 'live' ? '#fff' : '#dc3545', cursor: 'pointer', fontSize: '18px' }}>🗑️</button>
        )}
      </div>
      
      <div onClick={() => otevritZapas && otevritZapas(zapas.id)} style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', color: isDivak ? '#fff' : '#000' }}>
          <span>{zapas.player1_name || 'Hráč 1'}</span>
          <span style={{ color: zapas.status === 'live' ? '#007bff' : (zapas.status === 'planned' ? '#aaa' : (zapas.match_state?.sets_won?.player1 > zapas.match_state?.sets_won?.player2 ? '#28a745' : '#888')) }}>
            {zapas.match_state?.sets_won?.player1 || 0}
          </span>
        </div>
        
        <div style={{ width: '100%', height: '1px', background: isDivak ? '#444' : '#eee' }}></div>
        
        <div style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', color: isDivak ? '#fff' : '#000' }}>
          <span>{zapas.player2_name || 'Hráč 2'}</span>
          <span style={{ color: zapas.status === 'live' ? '#007bff' : (zapas.status === 'planned' ? '#aaa' : (zapas.match_state?.sets_won?.player2 > zapas.match_state?.sets_won?.player1 ? '#28a745' : '#888')) }}>
            {zapas.match_state?.sets_won?.player2 || 0}
          </span>
        </div>

        {zapas.status === 'finished' && getSetyText() && (
          <div style={{ marginTop: '8px', textAlign: 'center', color: isDivak ? '#aaa' : '#666', fontSize: '14px', fontStyle: 'italic' }}>
            Průběh: {getSetyText()}
          </div>
        )}
      </div>
    </div>
  )
}

export const BracketMatchCard = ({ zapas, otevritZapas, isDivak }) => {
  const isUnresolved1 = zapas.player1_name?.includes('Vítěz');
  const isUnresolved2 = zapas.player2_name?.includes('Vítěz');
  const isUnresolved = isUnresolved1 || isUnresolved2;

  let stBg = isDivak ? '#333' : '#fff';
  let stCol = isDivak ? '#fff' : '#000';
  let borderCol = '#aaa';

  if (isUnresolved) {
    stBg = isDivak ? '#1a1a1a' : '#f4f4f4';
    stCol = isDivak ? '#666' : '#999';
    borderCol = isDivak ? '#333' : '#ddd';
  } else if (zapas.status === 'live') {
    stBg = '#dc3545'; stCol = '#fff'; borderCol = '#dc3545';
  } else if (zapas.status === 'finished') {
    stBg = isDivak ? '#222' : '#e9ecef'; stCol = '#888'; borderCol = '#888';
  }

  return (
    <div 
      onClick={() => { if (!isUnresolved && otevritZapas) otevritZapas(zapas.id); }} 
      style={{ 
        background: stBg, 
        border: `2px solid ${borderCol}`, 
        padding: '15px', 
        borderRadius: '10px', 
        marginBottom: '15px', 
        cursor: isUnresolved ? 'default' : 'pointer', 
        width: '240px', 
        boxShadow: isUnresolved ? 'none' : '0 4px 8px rgba(0,0,0,0.1)',
        opacity: isUnresolved ? 0.8 : 1
      }}
    >
      <div style={{ fontWeight: 'bold', borderBottom: `1px solid ${borderCol}`, paddingBottom: '10px', marginBottom: '10px', color: stCol, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{zapas.player1_name || 'Hráč 1'}</span>
        {zapas.status === 'finished' && <span style={{fontSize:'18px', color: '#007bff'}}>{zapas.match_state?.sets_won?.player1}</span>}
      </div>

      <div style={{ fontWeight: 'bold', color: stCol, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{zapas.player2_name || 'Hráč 2'}</span>
        {zapas.status === 'finished' && <span style={{fontSize:'18px', color: '#007bff'}}>{zapas.match_state?.sets_won?.player2}</span>}
      </div>
      
      {zapas.status === 'live' && <div style={{ color: '#fff', fontSize: '12px', marginTop: '10px', fontWeight: 'bold', textAlign: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '5px', padding: '4px' }}>🔴 LIVE</div>}
      
      {isUnresolved && <div style={{ color: stCol, fontSize: '11px', marginTop: '8px', textAlign: 'center', fontStyle: 'italic' }}>Čeká se na postupující z předchozího kola</div>}
    </div>
  )
}