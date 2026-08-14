import React, { useState, useEffect } from 'react';
import { generujHlaseni } from '../utils/gameLogic';

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
  znovuOtevritZapas,
  tvMode,
  setTvMode,
  isDivak
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [manualniStrany, setManualniStrany] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const aktualniZapas = zapasList.find(z => z.id === activeMatchId);
  const isZapasLocked = aktualniZapas?.status === 'finished';
  const zamknoutJmena = (aktualniZapas?.round !== null && aktualniZapas?.status !== 'planned') || isZapasLocked;
  
  const minulyStav = history.length > 0 ? history[history.length - 1] : null;
  const navodProRozhodciho = generujHlaseni(score, minulyStav);

  const dosahlKonce = score?.sets_won?.player1 === 2 || score?.sets_won?.player2 === 2;
  const ukazatKonecnyOverlay = dosahlKonce && !isZapasLocked;
  const vitezName = score?.sets_won?.player1 === 2 ? score.player1_name : score.player2_name;

  // --- MATEMATIKA PRO PŘEHAZOVÁNÍ STRAN ---
  let currentStartSide = 0; 

  if (score?.completed_sets) {
    for (let set of score.completed_sets) {
      const gemyVSetu = set.player1_games + set.player2_games;
      const sideDuringLastGame = (currentStartSide + Math.floor(gemyVSetu / 2)) % 2;
      if (gemyVSetu % 2 !== 0) currentStartSide = 1 - sideDuringLastGame;
      else currentStartSide = sideDuringLastGame;
    }
  }

  const aktualniSetyGemy = (score?.current_set?.player1_games || 0) + (score?.current_set?.player2_games || 0);
  let finalSide = (currentStartSide + Math.floor((aktualniSetyGemy + 1) / 2)) % 2;

  if (score?.is_tiebreak) {
    const tbPoints = (parseInt(score?.current_game?.player1_points) || 0) + (parseInt(score?.current_game?.player2_points) || 0);
    const tbSwapsCount = Math.floor(tbPoints / 6);
    finalSide = (finalSide + tbSwapsCount) % 2;
  }

  const automatickyProhozeno = finalSide !== 0;
  const zobrazitProhozene = automatickyProhozeno !== manualniStrany;

  // ====================================================
  // PLYNULÉ KARTY HRÁČŮ PRO DIVÁKA
  // ====================================================
  const Hrac1_Divak = (
    <div key="h1_d" style={{ flex: '1 1 0', minWidth: '250px', background: '#111', padding: 'clamp(10px, 2vh, 30px)', borderRadius: '15px', border: score.server === 1 ? 'clamp(3px, 0.5vw, 6px) solid #00ff88' : 'clamp(3px, 0.5vw, 6px) solid transparent', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <h2 style={{ fontSize: 'clamp(18px, 4vh, 40px)', margin: 0, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{score.server === 1 && "🎾 "} {score.player1_name || "Hráč 1"}</h2>
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-around', margin: 'clamp(5px, 2vh, 15px) 0', background: '#222', padding: 'clamp(5px, 1vh, 10px)', borderRadius: '10px' }}>
        <div><span style={{ fontSize: 'clamp(12px, 2vh, 20px)', color: '#aaa' }}>Sety</span><br/><strong style={{ fontSize: 'clamp(20px, 5vh, 40px)' }}>{score.sets_won?.player1 || 0}</strong></div>
        <div><span style={{ fontSize: 'clamp(12px, 2vh, 20px)', color: '#aaa' }}>Hry</span><br/><strong style={{ fontSize: 'clamp(20px, 5vh, 40px)', color: '#ffeb3b' }}>{score.current_set?.player1_games || 0}</strong></div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <span style={{ fontSize: 'clamp(60px, 20vh, 250px)', fontWeight: 'bold', color: score.is_tiebreak ? '#ff4444' : '#00ff88', lineHeight: 1 }}>{score.current_game.player1_points}</span>
      </div>
    </div>
  );

  const Hrac2_Divak = (
    <div key="h2_d" style={{ flex: '1 1 0', minWidth: '250px', background: '#111', padding: 'clamp(10px, 2vh, 30px)', borderRadius: '15px', border: score.server === 2 ? 'clamp(3px, 0.5vw, 6px) solid #00ff88' : 'clamp(3px, 0.5vw, 6px) solid transparent', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <h2 style={{ fontSize: 'clamp(18px, 4vh, 40px)', margin: 0, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{score.server === 2 && "🎾 "} {score.player2_name || "Hráč 2"}</h2>
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-around', margin: 'clamp(5px, 2vh, 15px) 0', background: '#222', padding: 'clamp(5px, 1vh, 10px)', borderRadius: '10px' }}>
        <div><span style={{ fontSize: 'clamp(12px, 2vh, 20px)', color: '#aaa' }}>Sety</span><br/><strong style={{ fontSize: 'clamp(20px, 5vh, 40px)' }}>{score.sets_won?.player2 || 0}</strong></div>
        <div><span style={{ fontSize: 'clamp(12px, 2vh, 20px)', color: '#aaa' }}>Hry</span><br/><strong style={{ fontSize: 'clamp(20px, 5vh, 40px)', color: '#ffeb3b' }}>{score.current_set?.player2_games || 0}</strong></div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <span style={{ fontSize: 'clamp(60px, 20vh, 250px)', fontWeight: 'bold', color: score.is_tiebreak ? '#ff4444' : '#00ff88', lineHeight: 1 }}>{score.current_game.player2_points}</span>
      </div>
    </div>
  );

  const kartyDivak = [Hrac1_Divak, Hrac2_Divak];

  // ====================================================
  // PLYNULÉ (RESPONSIVE) KARTY HRÁČŮ PRO ROZHODČÍHO
  // ====================================================

  const Hrac1_Rozhodci = (
    <div key="h1_r" style={{ flex: '1 1 0', minWidth: '250px', background: score.server === 1 ? '#e2f0d9' : '#fff', color: '#000', border: score.server === 1 ? 'clamp(3px, 0.5vw, 6px) solid #28a745' : 'clamp(3px, 0.5vw, 6px) solid #ddd', padding: 'min(2vh, 15px)', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box' }}>
      <div style={{ minHeight: 'clamp(20px, 3vh, 35px)', visibility: score.server === 1 ? 'visible' : 'hidden', flexShrink: 0 }}><div style={{ fontSize: 'clamp(16px, 2.5vh, 24px)', fontWeight: 'bold', color: '#218838', marginBottom: 'min(1vh, 5px)' }}>🎾 PODÁVÁ</div></div>
      
      {zamknoutJmena ? (
        <h2 style={{fontSize: 'clamp(20px, 4vh, 32px)', margin: 'min(1vh, 5px) 0 min(1.5vh, 15px) 0', color: '#000', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0}}>{score.player1_name}</h2>
      ) : (
        <select value={score.player1_name || 'Hráč 1'} onChange={(e) => zmenitJmenoHrace('player1_name', e.target.value)} style={{ fontSize: 'clamp(16px, 3vh, 24px)', fontWeight: 'bold', textAlign: 'center', width: '100%', padding: 'min(1vh, 8px)', marginBottom: 'min(1.5vh, 15px)', border: '2px solid #ccc', borderRadius: '8px', background: '#fff', color: '#000', flexShrink: 0 }}>
          <option value={score.player1_name}>{score.player1_name}</option>
          <option value="Hráč 1">Výběr hráče...</option>
          {hraciList.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
        </select>
      )}
      
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-around', background: '#f8f9fa', border: '2px solid #ccc', padding: 'min(1vh, 10px)', borderRadius: '10px', marginBottom: 'min(1vh, 10px)' }}>
        <div><span style={{ fontSize: 'clamp(14px, 2vh, 20px)', color: '#333', fontWeight: 'bold' }}>Sety</span><br/><strong style={{ fontSize: 'clamp(24px, 4vh, 40px)', color: '#000' }}>{score.sets_won?.player1 || 0}</strong></div>
        <div><span style={{ fontSize: 'clamp(14px, 2vh, 20px)', color: '#333', fontWeight: 'bold' }}>Hry</span><br/><strong style={{ fontSize: 'clamp(24px, 4vh, 40px)', color: '#000' }}>{score.current_set?.player1_games || 0}</strong></div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
         <span style={{ fontSize: 'clamp(60px, 15vh, 150px)', fontWeight: '900', lineHeight: '1', color: '#000' }}>{score.current_game.player1_points}</span>
      </div>
      
      <button onClick={() => !isZapasLocked && pridatBod(1)} disabled={isZapasLocked} style={{ padding: 'clamp(10px, 2vh, 20px) 15px', fontSize: 'clamp(20px, 4vh, 36px)', cursor: isZapasLocked ? 'not-allowed' : 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '12px', width: '100%', fontWeight: '900', boxShadow: isZapasLocked ? 'none' : '0 4px 10px rgba(0,123,255,0.4)', opacity: isZapasLocked ? 0.5 : 1, marginTop: 'min(1vh, 10px)', flexShrink: 0 }}>+ BOD</button>
    </div>
  );

  const Hrac2_Rozhodci = (
    <div key="h2_r" style={{ flex: '1 1 0', minWidth: '250px', background: score.server === 2 ? '#e2f0d9' : '#fff', color: '#000', border: score.server === 2 ? 'clamp(3px, 0.5vw, 6px) solid #28a745' : 'clamp(3px, 0.5vw, 6px) solid #ddd', padding: 'min(2vh, 15px)', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box' }}>
      <div style={{ minHeight: 'clamp(20px, 3vh, 35px)', visibility: score.server === 2 ? 'visible' : 'hidden', flexShrink: 0 }}><div style={{ fontSize: 'clamp(16px, 2.5vh, 24px)', fontWeight: 'bold', color: '#218838', marginBottom: 'min(1vh, 5px)' }}>🎾 PODÁVÁ</div></div>
      
      {zamknoutJmena ? (
        <h2 style={{fontSize: 'clamp(20px, 4vh, 32px)', margin: 'min(1vh, 5px) 0 min(1.5vh, 15px) 0', color: '#000', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0}}>{score.player2_name}</h2>
      ) : (
        <select value={score.player2_name || 'Hráč 2'} onChange={(e) => zmenitJmenoHrace('player2_name', e.target.value)} style={{ fontSize: 'clamp(16px, 3vh, 24px)', fontWeight: 'bold', textAlign: 'center', width: '100%', padding: 'min(1vh, 8px)', marginBottom: 'min(1.5vh, 15px)', border: '2px solid #ccc', borderRadius: '8px', background: '#fff', color: '#000', flexShrink: 0 }}>
          <option value={score.player2_name}>{score.player2_name}</option>
          <option value="Hráč 2">Výběr hráče...</option>
          {hraciList.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
        </select>
      )}
      
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-around', background: '#f8f9fa', border: '2px solid #ccc', padding: 'min(1vh, 10px)', borderRadius: '10px', marginBottom: 'min(1vh, 10px)' }}>
        <div><span style={{ fontSize: 'clamp(14px, 2vh, 20px)', color: '#333', fontWeight: 'bold' }}>Sety</span><br/><strong style={{ fontSize: 'clamp(24px, 4vh, 40px)', color: '#000' }}>{score.sets_won?.player2 || 0}</strong></div>
        <div><span style={{ fontSize: 'clamp(14px, 2vh, 20px)', color: '#333', fontWeight: 'bold' }}>Hry</span><br/><strong style={{ fontSize: 'clamp(24px, 4vh, 40px)', color: '#000' }}>{score.current_set?.player2_games || 0}</strong></div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
         <span style={{ fontSize: 'clamp(60px, 15vh, 150px)', fontWeight: '900', lineHeight: '1', color: '#000' }}>{score.current_game.player2_points}</span>
      </div>
      
      <button onClick={() => !isZapasLocked && pridatBod(2)} disabled={isZapasLocked} style={{ padding: 'clamp(10px, 2vh, 20px) 15px', fontSize: 'clamp(20px, 4vh, 36px)', cursor: isZapasLocked ? 'not-allowed' : 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '12px', width: '100%', fontWeight: '900', boxShadow: isZapasLocked ? 'none' : '0 4px 10px rgba(40,167,69,0.4)', opacity: isZapasLocked ? 0.5 : 1, marginTop: 'min(1vh, 10px)', flexShrink: 0 }}>+ BOD</button>
    </div>
  );

  const kartyRozhodci = zobrazitProhozene ? [Hrac2_Rozhodci, Hrac1_Rozhodci] : [Hrac1_Rozhodci, Hrac2_Rozhodci];


  // === VYKRESLENÍ: DIVÁK ===
  if (isDivak) {
    return (
      <div style={{ background: '#000', color: 'white', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '10px', boxSizing: 'border-box', zIndex: 50 }}>
        
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', position: 'relative', minHeight: '40px', marginBottom: '5px' }}>
          <button onClick={zpetDoMenu} style={{ position: 'absolute', left: 0, top: 0, padding: '8px 15px', fontSize: '14px', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', zIndex: 10 }}>← Zpět</button>
          <div style={{ position: 'absolute', right: 0, top: 0, zIndex: 10 }}>
            <button onClick={toggleFullscreen} style={{ padding: '8px 15px', fontSize: '14px', cursor: 'pointer', background: isFullscreen ? '#ffc107' : '#17a2b8', color: isFullscreen ? '#000' : 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
              {isFullscreen ? '↙ Zrušit Fullscreen' : '↗ Fullscreen'}
            </button>
          </div>
        </div>

        <div style={{ flexShrink: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ color: '#ffeb3b', margin: '0 0 5px 0', fontSize: 'min(3.5vh, 22px)' }}>{aktualniZapas?.status === 'live' ? '🔴 ŽIVĚ' : 'ZÁPAS'}</h1>
          {dosahlKonce && <h2 style={{ color: '#28a745', fontSize: 'min(4vh, 26px)', margin: '0 0 5px 0' }}>🏆 VÍTĚZ: {vitezName} 🏆</h2>}
          {score.is_tiebreak && !dosahlKonce && <h2 style={{ color: '#ff4444', fontSize: 'min(3vh, 20px)', margin: '0 0 5px 0' }}>TIE-BREAK</h2>}
          
          <div style={{ display: 'flex', gap: '8px', fontSize: 'min(2.5vh, 18px)', fontWeight: 'bold', flexWrap: 'wrap', justifyContent: 'center', margin: '5px 0 10px 0' }}>
            {score?.completed_sets?.map((set, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '6px', color: '#fff' }}>
                {set.player1_games}:{set.player2_games}
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%', maxWidth: '1600px', margin: '0 auto', minHeight: 0 }}>
          {kartyDivak}
        </div>
      </div>
    );
  }

  // === VYKRESLENÍ: ROZHODČÍ NA TABLETU ===
  return (
    // Zde je aplikováno 'position: fixed' a 'overflow: hidden' i na rozhodčího
    <div style={{ background: '#f4f7f6', color: '#000', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '10px', boxSizing: 'border-box', zIndex: 50 }}>
      
      {ukazatKonecnyOverlay && !isDivak && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#fff', padding: '40px', borderRadius: '20px', textAlign: 'center', maxWidth: '600px', width: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <h1 style={{ fontSize: '45px', margin: '0 0 20px 0', color: '#28a745' }}>🏆 Konec zápasu!</h1>
            <h2 style={{ fontSize: '35px', margin: '0 0 40px 0', color: '#333' }}>Vítěz: <br/>{vitezName}</h2>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={krokZpet} style={{ flex: '1 1 auto', padding: '20px 30px', fontSize: '22px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>↩ Vzít bod zpět</button>
              <button onClick={ukoncitZapas} style={{ flex: '1 1 auto', padding: '20px 30px', fontSize: '22px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Potvrdit a uložit</button>
            </div>
          </div>
        </div>
      )}

      {/* Ovládací panel nahoře */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'min(1vh, 10px)', flexWrap: 'wrap', gap: '5px' }}>
        <button onClick={zpetDoMenu} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>← Zpět do Menu</button>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={toggleFullscreen} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: isFullscreen ? '#ffc107' : '#17a2b8', color: isFullscreen ? '#000' : 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            {isFullscreen ? '↙ Zrušit Fullscreen' : '↗ Fullscreen'}
          </button>
          
          <button onClick={() => setManualniStrany(!manualniStrany)} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#6f42c1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            ↔ Prohodit strany
          </button>

          {isZapasLocked ? (
            <button onClick={znovuOtevritZapas} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>🔓 Odemknout</button>
          ) : (
            <>
              <button onClick={krokZpet} disabled={history.length === 0} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: history.length === 0 ? 'not-allowed' : 'pointer', background: history.length === 0 ? '#ccc' : '#e0a800', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>↩ Krok zpět</button>
              <button onClick={rucniPrepnutiPodani} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>🔄 Změnit podání</button>
              {aktualniZapas?.status === 'planned' && <button onClick={spustitLive} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>🔴 Spustit LIVE</button>}
              {aktualniZapas?.status === 'live' && <button onClick={ukoncitZapas} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#218838', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>✅ Ukončit</button>}
            </>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0, background: '#222', color: '#00ff88', padding: 'min(1vh, 10px)', borderRadius: '10px', fontSize: 'clamp(14px, 2.5vh, 20px)', fontWeight: 'bold', marginBottom: 'min(1.5vh, 10px)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', width: '100%', maxWidth: '900px', margin: '0 auto min(1.5vh, 10px) auto' }}>
        🎤 Hlášení: <span style={{ color: '#fff' }}>"{navodProRozhodciho}"</span>
      </div>

      {score.is_tiebreak && !dosahlKonce && <h2 style={{ color: '#dc3545', fontSize: 'clamp(20px, 3vh, 32px)', margin: '0 0 min(1vh, 10px) 0' }}>🔥 PROBÍHÁ TIE-BREAK 🔥</h2>}
      
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', marginBottom: 'min(1.5vh, 15px)' }}>
        <div style={{ display: 'flex', gap: '8px', fontSize: 'clamp(14px, 2vh, 18px)', fontWeight: 'bold', flexWrap: 'wrap', justifyContent: 'center' }}>
          {score?.completed_sets?.map((set, i) => (
            <div key={i} style={{ background: '#e9ecef', padding: '4px 12px', borderRadius: '6px', color: '#333', border: '1px solid #ccc' }}>
              {set.player1_games}:{set.player2_games}
            </div>
          ))}
        </div>
      </div>
      
      {/* Kontejner s kartami si vezme zbytek místa */}
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%', maxWidth: '1600px', margin: '0 auto', minHeight: 0, alignItems: 'stretch', justifyContent: 'center' }}>
        {kartyRozhodci}
      </div>
    </div>
  );
};