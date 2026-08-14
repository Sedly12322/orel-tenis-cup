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
  zmenitJmenoHrace,
  tvMode // NOVĚ PŘIDÁNO: Přijímáme informaci o tom, zda je zapnutá TV
}) => {
  const aktualniZapas = zapasList.find(z => z.id === activeMatchId);
  const zamknoutJmena = (aktualniZapas?.round !== null && aktualniZapas?.status !== 'planned') || (aktualniZapas?.status === 'finished');
  
  const minulyStav = history.length > 0 ? history[history.length - 1] : null;
  const navodProRozhodciho = generujHlaseni(score, minulyStav);

  const RenderSety = () => (
    <div style={{ display: 'flex', gap: '10px', fontSize: tvMode ? '40px' : '24px', fontWeight: 'bold' }}>
      {score?.completed_sets?.map((set, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 15px', borderRadius: '8px', color: isDivak ? '#fff' : '#000' }}>
          {set.player1_games}:{set.player2_games}
        </div>
      ))}
    </div>
  );

  // === DIVÁK (REŽIM MOBIL vs. REŽIM TV) ===
  if (isDivak) {
    return (
      <div style={{ textAlign: 'center', background: '#000', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: tvMode ? 'center' : 'flex-start', padding: tvMode ? '20px' : '60px 15px 20px 15px', width: '100%', position: 'relative' }}>
        
        {/* Na mobilu chceme normální tlačítko zpět. Na TV ho chceme spíše nenápadné, aby nerušilo obraz. */}
        {!tvMode ? (
          <button onClick={zpetDoMenu} style={{ position: 'absolute', top: '15px', left: '15px', padding: '10px 15px', fontSize: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>← Zpět</button>
        ) : (
          <button onClick={zpetDoMenu} style={{ position: 'absolute', top: '20px', left: '20px', padding: '15px 25px', fontSize: '20px', background: '#222', color: '#555', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>←</button>
        )}

        <h1 style={{ color: '#ffeb3b', margin: '0 0 10px 0', fontSize: tvMode ? '50px' : '24px' }}>{aktualniZapas?.status === 'live' ? '🔴 ŽIVĚ' : 'ZÁPAS'}</h1>
        {score.is_tiebreak && <h2 style={{ color: '#ff4444', fontSize: tvMode ? '40px' : '20px', margin: '5px 0' }}>TIE-BREAK</h2>}
        
        <div style={{ display: 'flex', justifyContent: 'center', margin: tvMode ? '30px 0' : '15px 0' }}><RenderSety /></div>
        
        {/* HLAVNÍ KONTEJNER - Flex column na mobilu, Flex row na TV */}
        <div style={{ display: 'flex', flexDirection: tvMode ? 'row' : 'column', gap: tvMode ? '60px' : '20px', width: '100%', maxWidth: tvMode ? '1400px' : '450px', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* HRÁČ 1 */}
          <div style={{ flex: '1 1 100%', width: '100%', background: '#111', padding: tvMode ? '50px' : '20px', borderRadius: '15px', border: score.server === 1 ? (tvMode ? '6px solid #00ff88' : '3px solid #00ff88') : '3px solid transparent' }}>
            <h2 style={{ fontSize: tvMode ? '50px' : '26px', margin: 0, color: '#fff' }}>{score.server === 1 && "🎾 "} {score.player1_name || "Hráč 1"}</h2>
            <div style={{ display: 'flex', justifyContent: 'space-around', margin: tvMode ? '30px 0' : '15px 0', background: '#222', padding: '10px', borderRadius: '10px' }}>
              <div><span style={{ fontSize: tvMode ? '24px' : '14px', color: '#aaa' }}>Sety</span><br/><strong style={{ fontSize: tvMode ? '50px' : '26px' }}>{score.sets_won?.player1 || 0}</strong></div>
              <div><span style={{ fontSize: tvMode ? '24px' : '14px', color: '#aaa' }}>Gemy</span><br/><strong style={{ fontSize: tvMode ? '50px' : '26px', color: '#ffeb3b' }}>{score.current_set?.player1_games || 0}</strong></div>
            </div>
            <div style={{ fontSize: tvMode ? '200px' : '110px', fontWeight: 'bold', color: score.is_tiebreak ? '#ff4444' : '#00ff88', lineHeight: 1 }}>{score.current_game.player1_points}</div>
          </div>
          
          {/* HRÁČ 2 */}
          <div style={{ flex: '1 1 100%', width: '100%', background: '#111', padding: tvMode ? '50px' : '20px', borderRadius: '15px', border: score.server === 2 ? (tvMode ? '6px solid #00ff88' : '3px solid #00ff88') : '3px solid transparent' }}>
            <h2 style={{ fontSize: tvMode ? '50px' : '26px', margin: 0, color: '#fff' }}>{score.server === 2 && "🎾 "} {score.player2_name || "Hráč 2"}</h2>
            <div style={{ display: 'flex', justifyContent: 'space-around', margin: tvMode ? '30px 0' : '15px 0', background: '#222', padding: '10px', borderRadius: '10px' }}>
              <div><span style={{ fontSize: tvMode ? '24px' : '14px', color: '#aaa' }}>Sety</span><br/><strong style={{ fontSize: tvMode ? '50px' : '26px' }}>{score.sets_won?.player2 || 0}</strong></div>
              <div><span style={{ fontSize: tvMode ? '24px' : '14px', color: '#aaa' }}>Gemy</span><br/><strong style={{ fontSize: tvMode ? '50px' : '26px', color: '#ffeb3b' }}>{score.current_set?.player2_games || 0}</strong></div>
            </div>
            <div style={{ fontSize: tvMode ? '200px' : '110px', fontWeight: 'bold', color: score.is_tiebreak ? '#ff4444' : '#00ff88', lineHeight: 1 }}>{score.current_game.player2_points}</div>
          </div>

        </div>
      </div>
    )
  }

  // === ROZHODČÍ NA TABLETU (Kód zůstává stejný) ===
  return (
    <div style={{ textAlign: 'center', padding: '15px', background: '#f4f7f6', color: '#000', minHeight: '100vh', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <button onClick={zpetDoMenu} style={{ padding: '15px 25px', fontSize: '20px', background: '#444', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>← Zpět do Menu</button>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={krokZpet} disabled={history.length === 0} style={{ padding: '15px 25px', fontSize: '20px', cursor: history.length === 0 ? 'not-allowed' : 'pointer', background: history.length === 0 ? '#ccc' : '#e0a800', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>↩ Krok zpět</button>
          <button onClick={rucniPrepnutiPodani} style={{ padding: '15px 25px', fontSize: '20px', cursor: 'pointer', background: '#6c757d', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>🔄 Změnit podání</button>
          {aktualniZapas?.status === 'planned' && <button onClick={spustitLive} style={{ padding: '15px 25px', fontSize: '20px', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>🔴 Spustit LIVE</button>}
          {aktualniZapas?.status === 'live' && <button onClick={ukoncitZapas} style={{ padding: '15px 25px', fontSize: '20px', cursor: 'pointer', background: '#218838', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>✅ Ukončit zápas</button>}
        </div>
      </div>
      <div style={{ background: '#222', color: '#00ff88', padding: '15px', borderRadius: '12px', fontSize: '30px', fontWeight: 'bold', marginBottom: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', width: '100%', maxWidth: '1000px', margin: '0 auto 20px auto' }}>
        🎤 Hlášení: <span style={{ color: '#fff' }}>"{navodProRozhodciho}"</span>
      </div>
      {score.is_tiebreak && <h2 style={{ color: '#dc3545', fontSize: '40px', margin: '0 0 15px 0' }}>🔥 PROBÍHÁ TIE-BREAK 🔥</h2>}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}><RenderSety /></div>
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '20px', width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ flex: '1 1 350px', background: score.server === 1 ? '#e2f0d9' : '#fff', color: '#000', border: score.server === 1 ? '6px solid #28a745' : '6px solid #ddd', padding: '30px 20px', borderRadius: '20px', boxShadow: '0 8px 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ minHeight: '45px', visibility: score.server === 1 ? 'visible' : 'hidden' }}><div style={{ fontSize: '32px', fontWeight: 'bold', color: '#218838', marginBottom: '10px' }}>🎾 PODÁVÁ</div></div>
          {zamknoutJmena ? <h2 style={{fontSize: '40px', margin: '10px 0 25px 0', color: '#000', fontWeight: '900'}}>{score.player1_name}</h2> : <select value={score.player1_name || 'Hráč 1'} onChange={(e) => zmenitJmenoHrace('player1_name', e.target.value)} style={{ fontSize: '30px', fontWeight: 'bold', textAlign: 'center', width: '100%', padding: '10px', marginBottom: '20px', border: '3px solid #ccc', borderRadius: '10px', background: '#fff', color: '#000' }}><option value={score.player1_name}>{score.player1_name}</option><option value="Hráč 1">Výběr hráče...</option>{hraciList.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}</select>}
          <div style={{ display: 'flex', justifyContent: 'space-around', background: '#f8f9fa', border: '2px solid #ccc', padding: '15px', borderRadius: '15px', marginBottom: '20px' }}><div><span style={{ fontSize: '26px', color: '#333', fontWeight: 'bold' }}>Sety</span><br/><strong style={{ fontSize: '50px', color: '#000' }}>{score.sets_won?.player1 || 0}</strong></div><div><span style={{ fontSize: '26px', color: '#333', fontWeight: 'bold' }}>Gemy</span><br/><strong style={{ fontSize: '50px', color: '#000' }}>{score.current_set?.player1_games || 0}</strong></div></div>
          <div style={{ fontSize: '150px', margin: '10px 0', fontWeight: '900', lineHeight: '1', color: '#000' }}>{score.current_game.player1_points}</div>
          <button onClick={() => pridatBod(1)} style={{ padding: '30px 20px', fontSize: '45px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '15px', width: '100%', fontWeight: '900', boxShadow: '0 6px 15px rgba(0,123,255,0.5)', marginTop: 'auto' }}>+ BOD</button>
        </div>
        <div style={{ flex: '1 1 350px', background: score.server === 2 ? '#e2f0d9' : '#fff', color: '#000', border: score.server === 2 ? '6px solid #28a745' : '6px solid #ddd', padding: '30px 20px', borderRadius: '20px', boxShadow: '0 8px 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ minHeight: '45px', visibility: score.server === 2 ? 'visible' : 'hidden' }}><div style={{ fontSize: '32px', fontWeight: 'bold', color: '#218838', marginBottom: '10px' }}>🎾 PODÁVÁ</div></div>
          {zamknoutJmena ? <h2 style={{fontSize: '40px', margin: '10px 0 25px 0', color: '#000', fontWeight: '900'}}>{score.player2_name}</h2> : <select value={score.player2_name || 'Hráč 2'} onChange={(e) => zmenitJmenoHrace('player2_name', e.target.value)} style={{ fontSize: '30px', fontWeight: 'bold', textAlign: 'center', width: '100%', padding: '10px', marginBottom: '20px', border: '3px solid #ccc', borderRadius: '10px', background: '#fff', color: '#000' }}><option value={score.player2_name}>{score.player2_name}</option><option value="Hráč 2">Výběr hráče...</option>{hraciList.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}</select>}
          <div style={{ display: 'flex', justifyContent: 'space-around', background: '#f8f9fa', border: '2px solid #ccc', padding: '15px', borderRadius: '15px', marginBottom: '20px' }}><div><span style={{ fontSize: '26px', color: '#333', fontWeight: 'bold' }}>Sety</span><br/><strong style={{ fontSize: '50px', color: '#000' }}>{score.sets_won?.player2 || 0}</strong></div><div><span style={{ fontSize: '26px', color: '#333', fontWeight: 'bold' }}>Gemy</span><br/><strong style={{ fontSize: '50px', color: '#000' }}>{score.current_set?.player2_games || 0}</strong></div></div>
          <div style={{ fontSize: '150px', margin: '10px 0', fontWeight: '900', lineHeight: '1', color: '#000' }}>{score.current_game.player2_points}</div>
          <button onClick={() => pridatBod(2)} style={{ padding: '30px 20px', fontSize: '45px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '15px', width: '100%', fontWeight: '900', boxShadow: '0 6px 15px rgba(40,167,69,0.5)', marginTop: 'auto' }}>+ BOD</button>
        </div>
      </div>
    </div>
  )
}