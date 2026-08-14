import React from 'react';
import { generujHlaseni } from '../utils/gameLogic';

const isDivak = window.location.search.includes('divak=1');

export const MatchView = ({
  score,
  activeMatchId,
  zapasList,
  hraciList,
  history,
  zpetDoMenu,
  krokZpet,
  rucniPrepnutiPodani,
  spustitLive,
  ukoncitZapas,
  pridatBod,
  zmenitJmenoHrace
}) => {
  const aktualniZapas = zapasList.find(z => z.id === activeMatchId);
  const zamknoutJmena = (aktualniZapas?.round !== null && aktualniZapas?.status !== 'planned') || (aktualniZapas?.status === 'finished');
  
  const minulyStav = history.length > 0 ? history[history.length - 1] : null;
  const navodProRozhodciho = generujHlaseni(score, minulyStav);

  const RenderSety = () => (
    <div style={{ display: 'flex', gap: '15px', fontSize: '30px', fontWeight: 'bold' }}>
      {score?.completed_sets?.map((set, i) => (
        <div key={i} style={{ background: 'rgba(0,0,0,0.1)', padding: '10px 20px', borderRadius: '8px' }}>{set.player1_games}:{set.player2_games}</div>
      ))}
    </div>
  );

  if (isDivak) {
    return (
      <div style={{ textAlign: 'center', fontFamily: 'sans-serif', background: '#000', color: 'white', minHeight: '100vh', paddingTop: '40px' }}>
        <button onClick={zpetDoMenu} style={{ position: 'absolute', top: '30px', left: '30px', padding: '15px 25px', fontSize: '20px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>← Zpět na turnaj</button>
        <h1 style={{ color: '#ffeb3b', margin: 0, fontSize: '50px' }}>{aktualniZapas?.status === 'live' ? '🔴 ŽIVĚ' : 'ZÁPAS'}</h1>
        {score.is_tiebreak && <h2 style={{ color: '#ff4444', fontSize: '40px' }}>TIE-BREAK</h2>}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '30px 0', color: '#aaa' }}><RenderSety /></div>
        
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '100px', marginTop: '50px' }}>
          <div style={{ width: '400px' }}>
            <h2 style={{ fontSize: '50px', margin: 0 }}>{score.server === 1 && "🎾 "} {score.player1_name || "Hráč 1"}</h2>
            <p style={{ fontSize: '30px', color: '#ffeb3b', margin: '15px 0' }}>Sety: {score.sets_won?.player1 || 0}</p>
            <div style={{ background: '#333', padding: '20px', borderRadius: '15px' }}><span style={{ fontSize: '40px', color: '#aaa' }}>Gemy: </span><span style={{ fontSize: '60px', fontWeight: 'bold' }}>{score.current_set?.player1_games || 0}</span></div>
            <p style={{ fontSize: '180px', margin: '30px 0', fontWeight: 'bold', color: score.is_tiebreak ? '#ff4444' : '#00ff88', textShadow: '0px 0px 20px rgba(0,255,136,0.3)' }}>{score.current_game.player1_points}</p>
          </div>
          <div style={{ width: '400px' }}>
            <h2 style={{ fontSize: '50px', margin: 0 }}>{score.server === 2 && "🎾 "} {score.player2_name || "Hráč 2"}</h2>
            <p style={{ fontSize: '30px', color: '#ffeb3b', margin: '15px 0' }}>Sety: {score.sets_won?.player2 || 0}</p>
            <div style={{ background: '#333', padding: '20px', borderRadius: '15px' }}><span style={{ fontSize: '40px', color: '#aaa' }}>Gemy: </span><span style={{ fontSize: '60px', fontWeight: 'bold' }}>{score.current_set?.player2_games || 0}</span></div>
            <p style={{ fontSize: '180px', margin: '30px 0', fontWeight: 'bold', color: score.is_tiebreak ? '#ff4444' : '#00ff88', textShadow: '0px 0px 20px rgba(0,255,136,0.3)' }}>{score.current_game.player2_points}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'sans-serif', background: '#f4f7f6', color: '#333', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <button onClick={zpetDoMenu} style={{ padding: '15px 30px', fontSize: '20px', background: '#444', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>← Zpět do Menu</button>
        
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button onClick={krokZpet} disabled={history.length === 0} style={{ padding: '15px 30px', fontSize: '20px', cursor: history.length === 0 ? 'not-allowed' : 'pointer', background: history.length === 0 ? '#ccc' : '#ffc107', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>↩ Krok zpět</button>
          <button onClick={rucniPrepnutiPodani} style={{ padding: '15px 30px', fontSize: '20px', cursor: 'pointer', background: '#6c757d', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>🔄 Změnit podání</button>
          {aktualniZapas?.status === 'planned' && <button onClick={spustitLive} style={{ padding: '15px 30px', fontSize: '20px', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>🔴 Spustit LIVE</button>}
          {aktualniZapas?.status === 'live' && <button onClick={ukoncitZapas} style={{ padding: '15px 30px', fontSize: '20px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>✅ Ukončit zápas</button>}
        </div>
      </div>

      <div style={{ background: '#222', color: '#00ff88', padding: '20px', borderRadius: '15px', fontSize: '32px', fontWeight: 'bold', marginBottom: '30px', boxShadow: '0 6px 15px rgba(0,0,0,0.2)', display: 'inline-block', minWidth: '60%' }}>
        🎤 Hlášení: <span style={{ color: '#fff' }}>"{navodProRozhodciho}"</span>
      </div>

      {score.is_tiebreak && <h2 style={{ color: '#dc3545', fontSize: '40px', margin: '0 0 20px 0' }}>🔥 PROBÍHÁ TIE-BREAK 🔥</h2>}
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}><RenderSety /></div>
      
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '30px', padding: '0 20px' }}>
        <div style={{ flex: '1 1 400px', background: score.server === 1 ? '#e2f0d9' : '#fff', color: '#333', border: score.server === 1 ? '6px solid #28a745' : '6px solid transparent', padding: '40px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ minHeight: '50px' }}>{score.server === 1 && <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#28a745', marginBottom: '15px' }}>🎾 PODÁVÁ</div>}</div>
          
          {zamknoutJmena ? (
            <h2 style={{fontSize: '40px', margin: '10px 0 30px 0', color: '#333'}}>{score.player1_name}</h2>
          ) : (
            <select value={score.player1_name || 'Hráč 1'} onChange={(e) => zmenitJmenoHrace('player1_name', e.target.value)} style={{ fontSize: '32px', fontWeight: 'bold', textAlign: 'center', width: '100%', padding: '15px', marginBottom: '20px', border: '2px solid #ccc', borderRadius: '10px', background: '#fff', color: '#333' }}>
              <option value={score.player1_name}>{score.player1_name}</option>
              <option value="Hráč 1">Výběr hráče...</option>{hraciList.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
            </select>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-around', background: '#f8f9fa', padding: '20px', borderRadius: '15px', marginBottom: '30px', color: '#333' }}>
            <div><span style={{ fontSize: '24px', color: '#666' }}>Sety</span><br/><strong style={{ fontSize: '40px' }}>{score.sets_won?.player1 || 0}</strong></div>
            <div><span style={{ fontSize: '24px', color: '#666' }}>Gemy</span><br/><strong style={{ fontSize: '50px', color: '#007bff' }}>{score.current_set?.player1_games || 0}</strong></div>
          </div>
          
          <div style={{ fontSize: '140px', margin: '20px 0', fontWeight: 'bold', lineHeight: '1', color: '#111' }}>{score.current_game.player1_points}</div>
          <button onClick={() => pridatBod(1)} style={{ padding: '40px 20px', fontSize: '45px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '20px', width: '100%', fontWeight: 'bold', boxShadow: '0 8px 20px rgba(0,123,255,0.4)', marginTop: 'auto' }}>+ BOD</button>
        </div>
        
        <div style={{ flex: '1 1 400px', background: score.server === 2 ? '#e2f0d9' : '#fff', color: '#333', border: score.server === 2 ? '6px solid #28a745' : '6px solid transparent', padding: '40px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ minHeight: '50px' }}>{score.server === 2 && <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#28a745', marginBottom: '15px' }}>🎾 PODÁVÁ</div>}</div>
          
          {zamknoutJmena ? (
            <h2 style={{fontSize: '40px', margin: '10px 0 30px 0', color: '#333'}}>{score.player2_name}</h2>
          ) : (
            <select value={score.player2_name || 'Hráč 2'} onChange={(e) => zmenitJmenoHrace('player2_name', e.target.value)} style={{ fontSize: '32px', fontWeight: 'bold', textAlign: 'center', width: '100%', padding: '15px', marginBottom: '20px', border: '2px solid #ccc', borderRadius: '10px', background: '#fff', color: '#333' }}>
              <option value={score.player2_name}>{score.player2_name}</option>
              <option value="Hráč 2">Výběr hráče...</option>{hraciList.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
            </select>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-around', background: '#f8f9fa', padding: '20px', borderRadius: '15px', marginBottom: '30px', color: '#333' }}>
            <div><span style={{ fontSize: '24px', color: '#666' }}>Sety</span><br/><strong style={{ fontSize: '40px' }}>{score.sets_won?.player2 || 0}</strong></div>
            <div><span style={{ fontSize: '24px', color: '#666' }}>Gemy</span><br/><strong style={{ fontSize: '50px', color: '#007bff' }}>{score.current_set?.player2_games || 0}</strong></div>
          </div>
          
          <div style={{ fontSize: '140px', margin: '20px 0', fontWeight: 'bold', lineHeight: '1', color: '#111' }}>{score.current_game.player2_points}</div>
          <button onClick={() => pridatBod(2)} style={{ padding: '40px 20px', fontSize: '45px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '20px', width: '100%', fontWeight: 'bold', boxShadow: '0 8px 20px rgba(40,167,69,0.4)', marginTop: 'auto' }}>+ BOD</button>
        </div>
      </div>
    </div>
  )
}