import React from 'react';

export const ZapasCard = ({ zapas, isDivak, otevritZapas, smazatZapas }) => {
  const p1 = zapas.player1_name || 'Hráč 1';
  const p2 = zapas.player2_name || 'Hráč 2';
  const s1 = zapas.match_state?.sets_won?.player1 || 0;
  const s2 = zapas.match_state?.sets_won?.player2 || 0;
  const isFinished = zapas.status === 'finished';
  const isLive = zapas.status === 'live';
  
  return (
    <div style={{ background: isDivak ? '#222' : '#fff', color: isDivak ? '#fff' : '#000', borderRadius: '12px', padding: '15px', border: isLive ? '2px solid #dc3545' : (isDivak ? '1px solid #444' : '1px solid #ddd'), position: 'relative', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', boxSizing: 'border-box' }}>
      {isLive && <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#dc3545', color: 'white', fontSize: '12px', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>LIVE</div>}
      <div style={{ fontSize: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: isFinished && s1 > s2 ? 'bold' : 'normal', color: isFinished && s1 > s2 ? '#28a745' : 'inherit' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p1}</span><span>{s1}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: isFinished && s2 > s1 ? 'bold' : 'normal', color: isFinished && s2 > s1 ? '#28a745' : 'inherit' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p2}</span><span>{s2}</span>
        </div>
      </div>
      {(!isDivak || isLive || isFinished) && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button onClick={() => otevritZapas(zapas.id)} style={{ flex: 1, padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{isFinished ? 'Detail' : 'Spustit'}</button>
          {!isDivak && <button onClick={() => smazatZapas(zapas.id)} style={{ padding: '10px 15px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>🗑</button>}
        </div>
      )}
    </div>
  );
}

export const BracketMatchCard = ({ zapas, isDivak, otevritZapas }) => {
  const p1 = zapas.player1_name || 'TBD';
  const p2 = zapas.player2_name || 'TBD';
  const s1 = zapas.match_state?.sets_won?.player1 || 0;
  const s2 = zapas.match_state?.sets_won?.player2 || 0;
  const isFinished = zapas.status === 'finished';
  const isLive = zapas.status === 'live';

  const isClickable = !isDivak || isLive || isFinished;

  return (
    <div 
      onClick={() => isClickable ? otevritZapas(zapas.id) : null}
      style={{
        background: isDivak ? '#222' : '#fff',
        color: isDivak ? '#fff' : '#000',
        border: isLive ? '2px solid #dc3545' : (isDivak ? '1px solid #444' : '1px solid #ccc'),
        borderRadius: '10px',
        padding: '12px',
        width: '100%',
        maxWidth: '250px',
        cursor: isClickable ? 'pointer' : 'default',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        position: 'relative',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}
    >
      {isLive && <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#dc3545', color: 'white', fontSize: '10px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>LIVE</div>}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: isDivak ? '1px solid #444' : '1px solid #eee', fontWeight: isFinished && s1 > s2 ? 'bold' : 'normal', color: isFinished && s1 > s2 ? '#28a745' : 'inherit', fontSize: '15px' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '10px' }}>{p1}</span>
        <span style={{ fontWeight: 'bold' }}>{s1}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', fontWeight: isFinished && s2 > s1 ? 'bold' : 'normal', color: isFinished && s2 > s1 ? '#28a745' : 'inherit', fontSize: '15px' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '10px' }}>{p2}</span>
        <span style={{ fontWeight: 'bold' }}>{s2}</span>
      </div>
    </div>
  );
}