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
  kontumovatZapas,
  oboustrannaKontumace,
  pridatBod,
  zmenitJmenoHrace,
  znovuOtevritZapas,
  isDivak
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [manualniStrany, setManualniStrany] = useState(false);
  const [skrytOverlay, setSkrytOverlay] = useState(false); // Vlajka pro manuální skrytí okna s vítězem

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
  // Overlay se ukáže pouze pokud zápas dosáhl konce, NENÍ uzamčen v databázi a rozhodčí ho ručně neskryl
  const ukazatKonecnyOverlay = dosahlKonce && !isZapasLocked && !skrytOverlay;
  const vitezName = score?.sets_won?.player1 === 2 ? score.player1_name : score.player2_name;

  // Proměnná pro zablokování přidávání bodů (pokud je zápas zcela ukončen, nebo už bylo dosaženo 2 setů)
  const bodovaniZakazano = isZapasLocked || dosahlKonce;

  // Pokud se rozhodčí vrátí o krok zpět, resetujeme i skrytí overlaye, aby mohl znovu vyskočit
  useEffect(() => {
    if (!dosahlKonce) {
      setSkrytOverlay(false);
    }
  }, [dosahlKonce]);

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
  // TRADIČNÍ TENISOVÁ TABULKA (SCOREBOARD)
  // ====================================================
  const ScoreboardTable = () => (
    <div style={{ background: isDivak ? '#111' : '#222', borderRadius: '12px', padding: 'clamp(5px, 1vh, 15px)', color: '#fff', width: '100%', maxWidth: '1000px', margin: '0 auto clamp(5px, 1.5vh, 15px) auto', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', flexShrink: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 'clamp(14px, 2.2vh, 24px)', whiteSpace: 'nowrap' }}>
        <thead>
          <tr style={{ color: '#aaa', borderBottom: '2px solid #555' }}>
            <th style={{ textAlign: 'left', padding: 'clamp(4px, 1vh, 10px)', width: '40%' }}>Hráč</th>
            <th style={{ padding: 'clamp(4px, 1vh, 10px)', color: '#888' }}>1.</th>
            <th style={{ padding: 'clamp(4px, 1vh, 10px)', color: '#888' }}>2.</th>
            <th style={{ padding: 'clamp(4px, 1vh, 10px)', color: '#888' }}>3.</th>
            <th style={{ padding: 'clamp(4px, 1vh, 10px)', color: '#fff', borderLeft: '2px solid #555' }}>Sety</th>
            <th style={{ padding: 'clamp(4px, 1vh, 10px)', color: '#ffeb3b' }}>Hry</th>
            <th style={{ padding: 'clamp(4px, 1vh, 10px)', color: '#00ff88' }}>Míče</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #333' }}>
            <td style={{ textAlign: 'left', padding: 'clamp(4px, 1vh, 10px)', fontWeight: 'bold', color: '#fff' }}>
              {score.server === 1 ? '🎾 ' : <span style={{visibility: 'hidden'}}>🎾 </span>}
              {score.player1_name || "Hráč 1"}
            </td>
            <td style={{ padding: 'clamp(4px, 1vh, 10px)' }}>{score.completed_sets[0]?.player1_games ?? '-'}</td>
            <td style={{ padding: 'clamp(4px, 1vh, 10px)' }}>{score.completed_sets[1]?.player1_games ?? '-'}</td>
            <td style={{ padding: 'clamp(4px, 1vh, 10px)' }}>{score.completed_sets[2]?.player1_games ?? '-'}</td>
            <td style={{ padding: 'clamp(4px, 1vh, 10px)', fontWeight: 'bold', borderLeft: '2px solid #555' }}>{score.sets_won?.player1 || 0}</td>
            <td style={{ padding: 'clamp(4px, 1vh, 10px)', fontWeight: 'bold', color: '#ffeb3b' }}>{score.current_set?.player1_games || 0}</td>
            <td style={{ padding: 'clamp(4px, 1vh, 10px)', fontWeight: 'bold', color: '#00ff88', background: 'rgba(0,255,136,0.1)', borderRadius: '6px' }}>{score.current_game.player1_points}</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'left', padding: 'clamp(4px, 1vh, 10px)', fontWeight: 'bold', color: '#fff' }}>
              {score.server === 2 ? '🎾 ' : <span style={{visibility: 'hidden'}}>🎾 </span>}
              {score.player2_name || "Hráč 2"}
            </td>
            <td style={{ padding: 'clamp(4px, 1vh, 10px)' }}>{score.completed_sets[0]?.player2_games ?? '-'}</td>
            <td style={{ padding: 'clamp(4px, 1vh, 10px)' }}>{score.completed_sets[1]?.player2_games ?? '-'}</td>
            <td style={{ padding: 'clamp(4px, 1vh, 10px)' }}>{score.completed_sets[2]?.player2_games ?? '-'}</td>
            <td style={{ padding: 'clamp(4px, 1vh, 10px)', fontWeight: 'bold', borderLeft: '2px solid #555' }}>{score.sets_won?.player2 || 0}</td>
            <td style={{ padding: 'clamp(4px, 1vh, 10px)', fontWeight: 'bold', color: '#ffeb3b' }}>{score.current_set?.player2_games || 0}</td>
            <td style={{ padding: 'clamp(4px, 1vh, 10px)', fontWeight: 'bold', color: '#00ff88', background: 'rgba(0,255,136,0.1)', borderRadius: '6px' }}>{score.current_game.player2_points}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // ====================================================
  // ČISTÉ KARTY DIVÁKA (Jen jméno a Míče)
  // ====================================================
  const Hrac1_Divak = (
    <div key="h1_d" style={{ flex: '1 1 200px', background: '#111', padding: 'clamp(10px, 2vh, 30px)', borderRadius: '15px', border: score.server === 1 ? 'clamp(3px, 0.5vw, 6px) solid #00ff88' : 'clamp(3px, 0.5vw, 6px) solid transparent', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
      <h2 style={{ fontSize: 'clamp(20px, 4vh, 50px)', margin: '0 0 min(2vh, 15px) 0', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{score.player1_name || "Hráč 1"}</h2>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <span style={{ fontSize: 'clamp(80px, 25vh, 300px)', fontWeight: 'bold', color: score.is_tiebreak ? '#ff4444' : '#00ff88', lineHeight: 0.85 }}>{score.current_game.player1_points}</span>
      </div>
    </div>
  );

  const Hrac2_Divak = (
    <div key="h2_d" style={{ flex: '1 1 200px', background: '#111', padding: 'clamp(10px, 2vh, 30px)', borderRadius: '15px', border: score.server === 2 ? 'clamp(3px, 0.5vw, 6px) solid #00ff88' : 'clamp(3px, 0.5vw, 6px) solid transparent', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
      <h2 style={{ fontSize: 'clamp(20px, 4vh, 50px)', margin: '0 0 min(2vh, 15px) 0', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{score.player2_name || "Hráč 2"}</h2>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <span style={{ fontSize: 'clamp(80px, 25vh, 300px)', fontWeight: 'bold', color: score.is_tiebreak ? '#ff4444' : '#00ff88', lineHeight: 0.85 }}>{score.current_game.player2_points}</span>
      </div>
    </div>
  );

  const kartyDivak = [Hrac1_Divak, Hrac2_Divak];

  // ====================================================
  // ČISTÉ KARTY ROZHODČÍHO (Jen ovládání)
  // ====================================================
  const Hrac1_Rozhodci = (
    <div key="h1_r" style={{ flex: '1 1 200px', background: score.server === 1 ? '#e2f0d9' : '#fff', color: '#000', border: score.server === 1 ? 'clamp(3px, 0.5vw, 6px) solid #28a745' : 'clamp(3px, 0.5vw, 6px) solid #ddd', padding: 'clamp(8px, 1.5vh, 15px)', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box' }}>
      {zamknoutJmena ? (
        <h2 style={{fontSize: 'clamp(20px, 4vh, 40px)', margin: '2px 0 clamp(4px, 1vh, 15px) 0', color: '#000', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0}}>{score.player1_name}</h2>
      ) : (
        <select value={score.player1_name || 'Hráč 1'} onChange={(e) => zmenitJmenoHrace('player1_name', e.target.value)} style={{ fontSize: 'clamp(16px, 3vh, 24px)', fontWeight: 'bold', textAlign: 'center', width: '100%', padding: 'clamp(4px, 1vh, 8px)', marginBottom: 'clamp(4px, 1vh, 15px)', border: '2px solid #ccc', borderRadius: '8px', background: '#fff', color: '#000', flexShrink: 0 }}>
          <option value={score.player1_name}>{score.player1_name}</option>
          <option value="Hráč 1">Výběr hráče...</option>
          {hraciList.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
        </select>
      )}
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
         <span style={{ fontSize: 'clamp(80px, 20vh, 200px)', fontWeight: '900', lineHeight: '0.85', color: '#000' }}>{score.current_game.player1_points}</span>
      </div>
      
      <button onClick={() => !bodovaniZakazano && pridatBod(1)} disabled={bodovaniZakazano} style={{ padding: 'clamp(10px, 2.5vh, 30px) 10px', fontSize: 'clamp(24px, 5vh, 50px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '12px', width: '100%', fontWeight: '900', boxShadow: bodovaniZakazano ? 'none' : '0 4px 10px rgba(0,123,255,0.4)', opacity: bodovaniZakazano ? 0.5 : 1, marginTop: 'clamp(4px, 1vh, 10px)', flexShrink: 0 }}>+ BOD</button>
      
      <button onClick={() => !bodovaniZakazano && kontumovatZapas(1)} disabled={bodovaniZakazano} style={{ padding: 'clamp(6px, 1vh, 12px)', fontSize: 'clamp(12px, 1.8vh, 16px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', width: '100%', fontWeight: 'bold', opacity: bodovaniZakazano ? 0.5 : 1, marginTop: 'clamp(4px, 1vh, 8px)', flexShrink: 0 }}>🚩 Výhra kontumačně</button>
    </div>
  );

  const Hrac2_Rozhodci = (
    <div key="h2_r" style={{ flex: '1 1 200px', background: score.server === 2 ? '#e2f0d9' : '#fff', color: '#000', border: score.server === 2 ? 'clamp(3px, 0.5vw, 6px) solid #28a745' : 'clamp(3px, 0.5vw, 6px) solid #ddd', padding: 'clamp(8px, 1.5vh, 15px)', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box' }}>
      {zamknoutJmena ? (
        <h2 style={{fontSize: 'clamp(20px, 4vh, 40px)', margin: '2px 0 clamp(4px, 1vh, 15px) 0', color: '#000', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0}}>{score.player2_name}</h2>
      ) : (
        <select value={score.player2_name || 'Hráč 2'} onChange={(e) => zmenitJmenoHrace('player2_name', e.target.value)} style={{ fontSize: 'clamp(16px, 3vh, 24px)', fontWeight: 'bold', textAlign: 'center', width: '100%', padding: 'clamp(4px, 1vh, 8px)', marginBottom: 'clamp(4px, 1vh, 15px)', border: '2px solid #ccc', borderRadius: '8px', background: '#fff', color: '#000', flexShrink: 0 }}>
          <option value={score.player2_name}>{score.player2_name}</option>
          <option value="Hráč 2">Výběr hráče...</option>
          {hraciList.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
        </select>
      )}
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
         <span style={{ fontSize: 'clamp(80px, 20vh, 200px)', fontWeight: '900', lineHeight: '0.85', color: '#000' }}>{score.current_game.player2_points}</span>
      </div>
      
      <button onClick={() => !bodovaniZakazano && pridatBod(2)} disabled={bodovaniZakazano} style={{ padding: 'clamp(10px, 2.5vh, 30px) 10px', fontSize: 'clamp(24px, 5vh, 50px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '12px', width: '100%', fontWeight: '900', boxShadow: bodovaniZakazano ? 'none' : '0 4px 10px rgba(40,167,69,0.4)', opacity: bodovaniZakazano ? 0.5 : 1, marginTop: 'clamp(4px, 1vh, 10px)', flexShrink: 0 }}>+ BOD</button>
      
      <button onClick={() => !bodovaniZakazano && kontumovatZapas(2)} disabled={bodovaniZakazano} style={{ padding: 'clamp(6px, 1vh, 12px)', fontSize: 'clamp(12px, 1.8vh, 16px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', width: '100%', fontWeight: 'bold', opacity: bodovaniZakazano ? 0.5 : 1, marginTop: 'clamp(4px, 1vh, 8px)', flexShrink: 0 }}>🚩 Výhra kontumačně</button>
    </div>
  );

  const kartyRozhodci = zobrazitProhozene ? [Hrac2_Rozhodci, Hrac1_Rozhodci] : [Hrac1_Rozhodci, Hrac2_Rozhodci];


  // === VYKRESLENÍ: DIVÁK ===
  if (isDivak) {
    return (
      <div style={{ background: '#000', color: 'white', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 'clamp(5px, 1vw, 15px)', boxSizing: 'border-box', zIndex: 50 }}>
        
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', position: 'relative', minHeight: '35px', marginBottom: '5px' }}>
          <button onClick={zpetDoMenu} style={{ position: 'absolute', left: 0, top: 0, padding: 'clamp(6px, 1vh, 10px) clamp(10px, 2vw, 15px)', fontSize: 'clamp(12px, 1.5vh, 16px)', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', zIndex: 10 }}>← Zpět</button>
          <div style={{ position: 'absolute', right: 0, top: 0, zIndex: 10 }}>
            <button onClick={toggleFullscreen} style={{ padding: 'clamp(6px, 1vh, 10px) clamp(10px, 2vw, 15px)', fontSize: 'clamp(12px, 1.5vh, 16px)', cursor: 'pointer', background: isFullscreen ? '#ffc107' : '#17a2b8', color: isFullscreen ? '#000' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
              {isFullscreen ? '↙ Zrušit Fullscreen' : '↗ Fullscreen'}
            </button>
          </div>
        </div>

        <div style={{ flexShrink: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {dosahlKonce && <h2 style={{ color: '#28a745', fontSize: 'clamp(18px, 3vh, 30px)', margin: '0 0 5px 0' }}>🏆 VÍTĚZ: {vitezName} 🏆</h2>}
          {score.is_tiebreak && !dosahlKonce && <h2 style={{ color: '#ff4444', fontSize: 'clamp(14px, 2vh, 22px)', margin: '0 0 5px 0' }}>🔥 TIE-BREAK 🔥</h2>}
          {!dosahlKonce && !score.is_tiebreak && <h1 style={{ color: '#ffeb3b', margin: '0 0 5px 0', fontSize: 'clamp(16px, 2.5vh, 26px)' }}>{aktualniZapas?.status === 'live' ? '🔴 ŽIVĚ' : 'ZÁPAS'}</h1>}
        </div>
        
        {/* TELEVIZNÍ SCOREBOARD */}
        <ScoreboardTable />
        
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '15px', width: '100%', maxWidth: '1600px', margin: '0 auto', minHeight: 0, alignItems: 'stretch', alignContent: 'stretch', justifyContent: 'center' }}>
          {kartyDivak}
        </div>
      </div>
    );
  }

  // === VYKRESLENÍ: ROZHODČÍ NA TABLETU ===
  return (
    <div style={{ background: '#f4f7f6', color: '#000', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 'clamp(5px, 1vw, 15px)', boxSizing: 'border-box', zIndex: 50 }}>
      
      {ukazatKonecnyOverlay && !isDivak && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#fff', padding: '40px', borderRadius: '20px', textAlign: 'center', maxWidth: '600px', width: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <h1 style={{ fontSize: '45px', margin: '0 0 20px 0', color: '#28a745' }}>🏆 Konec zápasu!</h1>
            <h2 style={{ fontSize: '35px', margin: '0 0 40px 0', color: '#333' }}>Vítěz: <br/>{vitezName}</h2>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={krokZpet} style={{ flex: '1 1 auto', padding: '15px 20px', fontSize: '18px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>↩ Vzít bod zpět</button>
              <button onClick={() => setSkrytOverlay(true)} style={{ flex: '1 1 auto', padding: '15px 20px', fontSize: '18px', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>✏️ Skrýt a upravit</button>
              <button onClick={ukoncitZapas} style={{ flex: '1 1 auto', padding: '15px 20px', fontSize: '18px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Potvrdit a uložit</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(4px, 1vh, 10px)', flexWrap: 'wrap', gap: '5px' }}>
        <button onClick={zpetDoMenu} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>← Zpět do Menu</button>
        
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={toggleFullscreen} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: isFullscreen ? '#ffc107' : '#17a2b8', color: isFullscreen ? '#000' : 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            {isFullscreen ? '↙ Zrušit Fullscreen' : '↗ Fullscreen'}
          </button>
          
          <button onClick={() => setManualniStrany(!manualniStrany)} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#6f42c1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            ↔ Prohodit strany
          </button>

          <button onClick={() => !bodovaniZakazano && oboustrannaKontumace()} disabled={bodovaniZakazano} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#343a40', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', opacity: bodovaniZakazano ? 0.5 : 1 }}>
            ❌ Oboustranná kontumace
          </button>

          {isZapasLocked ? (
            <button onClick={znovuOtevritZapas} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>🔓 Odemknout</button>
          ) : (
            <>
              <button onClick={krokZpet} disabled={history.length === 0} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: history.length === 0 ? 'not-allowed' : 'pointer', background: history.length === 0 ? '#ccc' : '#e0a800', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>↩ Krok zpět</button>
              <button onClick={rucniPrepnutiPodani} disabled={bodovaniZakazano} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', opacity: bodovaniZakazano ? 0.5 : 1 }}>🔄 Změnit podání</button>
              {aktualniZapas?.status === 'planned' && <button onClick={spustitLive} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>🔴 Spustit LIVE</button>}
              {aktualniZapas?.status === 'live' && <button onClick={ukoncitZapas} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#218838', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>✅ Ukončit</button>}
            </>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0, background: '#222', color: '#00ff88', padding: 'min(1vh, 8px)', borderRadius: '8px', fontSize: 'clamp(12px, 2.5vh, 18px)', fontWeight: 'bold', marginBottom: 'clamp(4px, 1vh, 10px)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', width: '100%', maxWidth: '900px', margin: '0 auto clamp(4px, 1vh, 10px) auto' }}>
        🎤 Hlášení: <span style={{ color: '#fff' }}>"{navodProRozhodciho}"</span>
      </div>

      {score.is_tiebreak && !dosahlKonce && <h2 style={{ color: '#dc3545', fontSize: 'clamp(16px, 3vh, 32px)', margin: '0 0 clamp(4px, 1vh, 10px) 0' }}>🔥 PROBÍHÁ TIE-BREAK 🔥</h2>}
      
      <ScoreboardTable />
      
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '15px', width: '100%', maxWidth: '1200px', margin: '0 auto', minHeight: 0, alignItems: 'stretch', alignContent: 'stretch', justifyContent: 'center' }}>
        {kartyRozhodci}
      </div>
    </div>
  );
};