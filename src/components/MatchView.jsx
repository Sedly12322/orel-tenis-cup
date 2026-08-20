import React, { useState, useEffect } from 'react';
import { generujHlaseni } from '../utils/gameLogic';

const HawkEyeAnimation = ({ onClose }) => (
  <div onClick={onClose} className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 999999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}>
    <div style={{ position: 'relative', width: 'clamp(200px, 40vw, 400px)', height: 'clamp(300px, 60vh, 500px)', border: '2px solid rgba(255,255,255,0.3)', background: '#115278', transform: 'perspective(600px) rotateX(50deg)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
       <div style={{ position: 'absolute', top: 0, bottom: 0, right: '20%', width: '8px', background: '#fff', boxShadow: '0 0 10px rgba(255,255,255,0.5)' }}></div>
       <div style={{ position: 'absolute', top: '45%', right: '5%', width: '12%', height: '10%', background: 'rgba(0,0,0,0.3)', borderRadius: '50%', opacity: 0, animation: 'markAppear 4.5s linear forwards', transform: 'rotate(20deg)' }}></div>
       <div style={{ position: 'absolute', width: '30px', height: '30px', background: '#eaff00', borderRadius: '50%', boxShadow: 'inset -5px -5px 10px rgba(0,0,0,0.4), 0 0 10px #eaff00', animation: 'ballFly 4.5s linear forwards', zIndex: 10 }}></div>
    </div>
    <div style={{ position: 'absolute', bottom: '15%', fontSize: 'clamp(80px, 15vw, 200px)', fontWeight: '900', color: '#ff3333', opacity: 0, animation: 'outText 4.5s linear forwards', textShadow: '0 0 30px #ff3333', letterSpacing: '10px' }}>OUT</div>
    <style>{`
      @keyframes ballFly { 
        0% { top: -20%; left: -20%; transform: scale(4) translateZ(200px); opacity: 0; } 
        10% { opacity: 1; }
        45% { top: 46%; left: 83%; transform: scale(1) translateZ(0); } 
        60% { top: 120%; left: 120%; transform: scale(2) translateZ(100px); opacity: 1; }
        80% { opacity: 0; }
        100% { opacity: 0; top: 120%; left: 120%; }
      }
      @keyframes markAppear { 0% { opacity: 0; } 44% { opacity: 0; } 45% { opacity: 1; } 100% { opacity: 1; } }
      @keyframes outText { 0% { opacity: 0; transform: scale(0.5); } 55% { opacity: 0; transform: scale(0.5); } 60% { opacity: 1; transform: scale(1.2); } 65% { transform: scale(1); } 90% { opacity: 1; } 100% { opacity: 0; } }
    `}</style>
  </div>
);

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
  pridatChybuPodani,
  zmenitJmenoHrace,
  znovuOtevritZapas,
  isDivak,
  isKiosk
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [manualniStrany, setManualniStrany] = useState(false);
  const [skrytOverlay, setSkrytOverlay] = useState(false);
  const [showHawkEye, setShowHawkEye] = useState(false);
  const [lastHawkEye, setLastHawkEye] = useState(null);
  
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    let interval;
    if (score?.start_time) {
      const updateTimer = () => {
        const end = score.end_time || Date.now();
        const diff = Math.floor((end - score.start_time) / 1000);
        const h = String(Math.floor(diff / 3600)).padStart(2, '0');
        const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        setElapsedTime(`${h}:${m}:${s}`);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => clearInterval(interval);
  }, [score?.start_time, score?.end_time]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(err => console.log(err)); } 
    else { if (document.exitFullscreen) document.exitFullscreen(); }
  };

  const tiskDoPDF = () => { window.print(); };

  const aktualniZapas = zapasList.find(z => z.id === activeMatchId);
  const isZapasLocked = aktualniZapas?.status === 'finished';
  const zamknoutJmena = (aktualniZapas?.round !== null && aktualniZapas?.status !== 'planned') || isZapasLocked;
  
  const minulyStav = history.length > 0 ? history[history.length - 1] : null;
  const navodProRozhodciho = generujHlaseni(score, minulyStav);

  const dosahlKonce = score?.sets_won?.player1 === 2 || score?.sets_won?.player2 === 2;
  const ukazatKonecnyOverlay = dosahlKonce && !isZapasLocked && !skrytOverlay;
  const vitezName = score?.sets_won?.player1 === 2 ? score.player1_name : score.player2_name;
  const bodovaniZakazano = isZapasLocked || dosahlKonce;

  useEffect(() => {
    if (score?.hawk_eye_timestamp && score.hawk_eye_timestamp !== lastHawkEye) {
      setLastHawkEye(score.hawk_eye_timestamp);
      if (Date.now() - score.hawk_eye_timestamp < 10000) {
        setShowHawkEye(true);
        setTimeout(() => setShowHawkEye(false), 4500); 
      }
    }
  }, [score?.hawk_eye_timestamp, lastHawkEye]);

  useEffect(() => {
    if (!dosahlKonce) setSkrytOverlay(false);
  }, [dosahlKonce]);

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

  let prubehText = score.completed_sets?.length > 0 
    ? score.completed_sets.map(s => `${s.player1_games}:${s.player2_games}`).join(', ') 
    : '';

  if (!dosahlKonce && (score.current_set?.player1_games > 0 || score.current_set?.player2_games > 0 || score.current_game?.player1_points !== "0" || score.current_game?.player2_points !== "0")) {
    const p1g = score.current_set?.player1_games || 0;
    const p2g = score.current_set?.player2_games || 0;
    const p1p = score.current_game?.player1_points || "0";
    const p2p = score.current_game?.player2_points || "0";
    const probihaStr = score.is_tiebreak 
      ? `(rozehráno: tie-break ${p1p}:${p2p})` 
      : `(rozehráno: ${p1g}:${p2g}, míče ${p1p}:${p2p})`;
    prubehText = prubehText ? `${prubehText} ... ${probihaStr}` : probihaStr;
  }
  if (!prubehText) prubehText = "Zápas právě začal (0:0)";

  const ScoreboardTable = () => {
    // 1. Zvětšené pouze pro KIOSK (TV). 2. Pro mobil a rozhodčího bezpečně malé, aby se nerozbilo.
    const cellPad = isKiosk ? 'clamp(10px, 3vh, 25px)' : 'clamp(4px, 1vh, 10px)';
    const tblFont = isKiosk ? 'clamp(24px, 5vh, 60px)' : 'clamp(12px, 2.2vh, 20px)';
    const tblMaxWidth = isKiosk ? '1800px' : '1000px';
    const btmBorder = isKiosk ? '4px solid #555' : '2px solid #555';
    const leftBorder = isKiosk ? '4px solid #555' : '2px solid #555';
    const trBtmBorder = isKiosk ? '2px solid #333' : '1px solid #333';
    const faultSize = isKiosk ? '20px' : '12px';

    return (
      <div style={{ background: isDivak ? '#111' : '#222', borderRadius: '15px', padding: 'clamp(5px, 1.5vh, 20px)', color: '#fff', width: '100%', maxWidth: tblMaxWidth, margin: '0 auto clamp(5px, 1vh, 15px) auto', boxShadow: '0 8px 25px rgba(0,0,0,0.5)', flexShrink: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: tblFont, whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ color: '#aaa', borderBottom: btmBorder }}>
              <th style={{ textAlign: 'left', padding: cellPad, width: '40%' }}>Hráč</th>
              <th style={{ padding: cellPad, color: '#888' }}>1.</th>
              <th style={{ padding: cellPad, color: '#888' }}>2.</th>
              <th style={{ padding: cellPad, color: '#888' }}>3.</th>
              <th style={{ padding: cellPad, color: '#fff', borderLeft: leftBorder }}>Sety</th>
              <th style={{ padding: cellPad, color: '#ffeb3b' }}>Hry</th>
              <th style={{ padding: cellPad, color: '#00ff88' }}>Míče</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: trBtmBorder }}>
              <td style={{ textAlign: 'left', padding: cellPad, fontWeight: 'bold', color: '#fff', position: 'relative' }}>
                {score.server === 1 ? '🎾 ' : <span style={{visibility: 'hidden'}}>🎾 </span>}
                {score.player1_name || "Hráč 1"}
                {score.server === 1 && score.first_fault && <span style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', width: faultSize, height: faultSize, background: '#dc3545', borderRadius: '50%', boxShadow: '0 0 10px #dc3545' }} title="1. Chyba"></span>}
              </td>
              <td style={{ padding: cellPad }}>{score.completed_sets[0]?.player1_games ?? '-'}</td>
              <td style={{ padding: cellPad }}>{score.completed_sets[1]?.player1_games ?? '-'}</td>
              <td style={{ padding: cellPad }}>{score.completed_sets[2]?.player1_games ?? '-'}</td>
              <td style={{ padding: cellPad, fontWeight: 'bold', borderLeft: leftBorder }}>{score.sets_won?.player1 || 0}</td>
              <td style={{ padding: cellPad, fontWeight: 'bold', color: '#ffeb3b' }}>{score.current_set?.player1_games || 0}</td>
              <td style={{ padding: cellPad, fontWeight: 'bold', color: '#00ff88', background: 'rgba(0,255,136,0.1)', borderRadius: '10px' }}>{score.current_game.player1_points}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left', padding: cellPad, fontWeight: 'bold', color: '#fff', position: 'relative' }}>
                {score.server === 2 ? '🎾 ' : <span style={{visibility: 'hidden'}}>🎾 </span>}
                {score.player2_name || "Hráč 2"}
                {score.server === 2 && score.first_fault && <span style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', width: faultSize, height: faultSize, background: '#dc3545', borderRadius: '50%', boxShadow: '0 0 10px #dc3545' }} title="1. Chyba"></span>}
              </td>
              <td style={{ padding: cellPad }}>{score.completed_sets[0]?.player2_games ?? '-'}</td>
              <td style={{ padding: cellPad }}>{score.completed_sets[1]?.player2_games ?? '-'}</td>
              <td style={{ padding: cellPad }}>{score.completed_sets[2]?.player2_games ?? '-'}</td>
              <td style={{ padding: cellPad, fontWeight: 'bold', borderLeft: leftBorder }}>{score.sets_won?.player2 || 0}</td>
              <td style={{ padding: cellPad, fontWeight: 'bold', color: '#ffeb3b' }}>{score.current_set?.player2_games || 0}</td>
              <td style={{ padding: cellPad, fontWeight: 'bold', color: '#00ff88', background: 'rgba(0,255,136,0.1)', borderRadius: '10px' }}>{score.current_game.player2_points}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Bezpečné hodnoty karet pro různé obrazovky
  const nameFontSize = isKiosk ? 'clamp(20px, 3.5vh, 40px)' : 'clamp(16px, 3vh, 35px)';
  const scoreFontSize = isKiosk ? 'clamp(40px, 12vh, 140px)' : 'clamp(60px, 18vh, 200px)'; // Divák má velké míčky
  const paddingDivak = isKiosk ? 'clamp(10px, 2vh, 30px)' : 'clamp(5px, 1vh, 15px)';

  // flex-basis nastaven z 200px na 120px pro mobilního diváka: zaručuje, že karty nespadnou pod sebe a nevytvoří scroll
  const flexBasisDivak = isKiosk ? '200px' : '120px';

  const Hrac1_Divak = (
    <div key="h1_d" style={{ flex: `1 1 ${flexBasisDivak}`, background: '#111', padding: paddingDivak, borderRadius: '15px', border: score.server === 1 ? 'clamp(3px, 0.5vw, 6px) solid #00ff88' : 'clamp(3px, 0.5vw, 6px) solid transparent', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
      <h2 style={{ fontSize: nameFontSize, margin: '0 0 min(2vh, 10px) 0', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{score.player1_name || "Hráč 1"}</h2>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <span style={{ fontSize: scoreFontSize, fontWeight: 'bold', color: score.is_tiebreak ? '#ff4444' : '#00ff88', lineHeight: 0.85 }}>{score.current_game.player1_points}</span>
      </div>
    </div>
  );

  const Hrac2_Divak = (
    <div key="h2_d" style={{ flex: `1 1 ${flexBasisDivak}`, background: '#111', padding: paddingDivak, borderRadius: '15px', border: score.server === 2 ? 'clamp(3px, 0.5vw, 6px) solid #00ff88' : 'clamp(3px, 0.5vw, 6px) solid transparent', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
      <h2 style={{ fontSize: nameFontSize, margin: '0 0 min(2vh, 10px) 0', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{score.player2_name || "Hráč 2"}</h2>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <span style={{ fontSize: scoreFontSize, fontWeight: 'bold', color: score.is_tiebreak ? '#ff4444' : '#00ff88', lineHeight: 0.85 }}>{score.current_game.player2_points}</span>
      </div>
    </div>
  );

  const kartyDivak = [Hrac1_Divak, Hrac2_Divak];

  const Hrac1_Rozhodci = (
    <div key="h1_r" style={{ flex: '1 1 150px', background: score.server === 1 ? '#e2f0d9' : '#fff', color: '#000', border: score.server === 1 ? 'clamp(3px, 0.5vw, 6px) solid #28a745' : 'clamp(3px, 0.5vw, 6px) solid #ddd', padding: 'clamp(8px, 1.5vh, 15px)', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box' }}>
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
      
      <div style={{ display: 'flex', gap: '8px', marginTop: 'clamp(4px, 1vh, 10px)', flexShrink: 0 }}>
        <button onClick={() => !bodovaniZakazano && pridatBod(1)} disabled={bodovaniZakazano} style={{ flex: 4, padding: 'clamp(10px, 2.5vh, 30px) 10px', fontSize: 'clamp(24px, 5vh, 50px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '900', boxShadow: bodovaniZakazano ? 'none' : '0 4px 10px rgba(0,123,255,0.4)', opacity: bodovaniZakazano ? 0.5 : 1 }}>+ BOD</button>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {score.server === 1 && (
            <button onClick={() => !bodovaniZakazano && pridatChybuPodani()} disabled={bodovaniZakazano} style={{ flex: 1, minWidth: '70px', padding: '5px', fontSize: 'clamp(11px, 1.6vh, 14px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: score.first_fault ? '#dc3545' : '#fd7e14', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: bodovaniZakazano ? 0.5 : 1, boxShadow: bodovaniZakazano ? 'none' : `0 4px 10px ${score.first_fault ? 'rgba(220,53,69,0.4)' : 'rgba(253,126,20,0.4)'}` }} title="Chyba podání">
              <span style={{ fontSize: 'clamp(16px, 2.5vh, 22px)' }}>{score.first_fault ? '❌' : '⚠️'}</span>
              <span style={{ marginTop: '-2px', lineHeight: '1.1' }}>{score.first_fault ? 'DVOJCHYBA' : '1. CHYBA'}</span>
            </button>
          )}

          <button onClick={() => !bodovaniZakazano && pridatBod(1, true)} disabled={bodovaniZakazano} style={{ flex: 1, minWidth: '70px', padding: '5px', fontSize: 'clamp(11px, 1.6vh, 14px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: bodovaniZakazano ? 0.5 : 1, boxShadow: bodovaniZakazano ? 'none' : '0 4px 10px rgba(23,162,184,0.4)' }} title="Přidat bod a spustit Jestřábí oko">
            <span style={{ fontSize: 'clamp(16px, 2.5vh, 22px)' }}>🦅</span>
            <span style={{ marginTop: '-2px' }}>OUT</span>
          </button>
        </div>
      </div>
      
      <button onClick={() => !bodovaniZakazano && kontumovatZapas(1)} disabled={bodovaniZakazano} style={{ padding: 'clamp(6px, 1vh, 12px)', fontSize: 'clamp(12px, 1.8vh, 16px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', width: '100%', fontWeight: 'bold', opacity: bodovaniZakazano ? 0.5 : 1, marginTop: 'clamp(4px, 1vh, 8px)', flexShrink: 0 }}>🚩 Výhra kontumačně</button>
    </div>
  );

  const Hrac2_Rozhodci = (
    <div key="h2_r" style={{ flex: '1 1 150px', background: score.server === 2 ? '#e2f0d9' : '#fff', color: '#000', border: score.server === 2 ? 'clamp(3px, 0.5vw, 6px) solid #28a745' : 'clamp(3px, 0.5vw, 6px) solid #ddd', padding: 'clamp(8px, 1.5vh, 15px)', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box' }}>
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
      
      <div style={{ display: 'flex', gap: '8px', marginTop: 'clamp(4px, 1vh, 10px)', flexShrink: 0 }}>
        <button onClick={() => !bodovaniZakazano && pridatBod(2)} disabled={bodovaniZakazano} style={{ flex: 4, padding: 'clamp(10px, 2.5vh, 30px) 10px', fontSize: 'clamp(24px, 5vh, 50px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '900', boxShadow: bodovaniZakazano ? 'none' : '0 4px 10px rgba(40,167,69,0.4)', opacity: bodovaniZakazano ? 0.5 : 1 }}>+ BOD</button>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {score.server === 2 && (
            <button onClick={() => !bodovaniZakazano && pridatChybuPodani()} disabled={bodovaniZakazano} style={{ flex: 1, minWidth: '70px', padding: '5px', fontSize: 'clamp(11px, 1.6vh, 14px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: score.first_fault ? '#dc3545' : '#fd7e14', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: bodovaniZakazano ? 0.5 : 1, boxShadow: bodovaniZakazano ? 'none' : `0 4px 10px ${score.first_fault ? 'rgba(220,53,69,0.4)' : 'rgba(253,126,20,0.4)'}` }} title="Chyba podání">
              <span style={{ fontSize: 'clamp(16px, 2.5vh, 22px)' }}>{score.first_fault ? '❌' : '⚠️'}</span>
              <span style={{ marginTop: '-2px', lineHeight: '1.1' }}>{score.first_fault ? 'DVOJCHYBA' : '1. CHYBA'}</span>
            </button>
          )}

          <button onClick={() => !bodovaniZakazano && pridatBod(2, true)} disabled={bodovaniZakazano} style={{ flex: 1, minWidth: '70px', padding: '5px', fontSize: 'clamp(11px, 1.6vh, 14px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: bodovaniZakazano ? 0.5 : 1, boxShadow: bodovaniZakazano ? 'none' : '0 4px 10px rgba(23,162,184,0.4)' }} title="Přidat bod a spustit Jestřábí oko">
            <span style={{ fontSize: 'clamp(16px, 2.5vh, 22px)' }}>🦅</span>
            <span style={{ marginTop: '-2px' }}>OUT</span>
          </button>
        </div>
      </div>
      
      <button onClick={() => !bodovaniZakazano && kontumovatZapas(2)} disabled={bodovaniZakazano} style={{ padding: 'clamp(6px, 1vh, 12px)', fontSize: 'clamp(12px, 1.8vh, 16px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', width: '100%', fontWeight: 'bold', opacity: bodovaniZakazano ? 0.5 : 1, marginTop: 'clamp(4px, 1vh, 8px)', flexShrink: 0 }}>🚩 Výhra kontumačně</button>
    </div>
  );

  const kartyRozhodci = zobrazitProhozene ? [Hrac2_Rozhodci, Hrac1_Rozhodci] : [Hrac1_Rozhodci, Hrac2_Rozhodci];

  const containerMaxWidth = isKiosk ? '1800px' : (isDivak ? '1600px' : '1200px');

  return (
    <>
      <style>{`
        .print-only { display: none; }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; color: black !important; background: white !important; position: absolute; top: 0; left: 0; width: 100%; padding: 20px; }
          body { background: white !important; margin: 0; padding: 0; }
        }
      `}</style>

      {showHawkEye && <HawkEyeAnimation onClose={() => setShowHawkEye(false)} />}

      <div className="print-only" style={{ fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ textAlign: 'center', borderBottom: '3px solid #000', paddingBottom: '15px', textTransform: 'uppercase' }}>🎾 Orel Tenis Cup Lichnov</h1>
        <h2 style={{ textAlign: 'center', margin: '20px 0 40px 0', fontSize: '28px' }}>OFICIÁLNÍ ZÁPIS O UTKÁNÍ</h2>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', fontSize: '20px' }}>
          <div><strong>Fáze turnaje:</strong> {aktualniZapas?.round ? 'Playoff (Vyřazovací část)' : 'Zápas ve skupině'}</div>
          <div><strong>Datum:</strong> {new Date().toLocaleString('cs-CZ')}</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '22px' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th style={{ border: '2px solid #000', padding: '15px', textAlign: 'left', width: '40%' }}>Hráč</th>
              <th style={{ border: '2px solid #000', padding: '15px' }}>1. Set</th>
              <th style={{ border: '2px solid #000', padding: '15px' }}>2. Set</th>
              <th style={{ border: '2px solid #000', padding: '15px' }}>3. Set</th>
              <th style={{ border: '2px solid #000', padding: '15px' }}>Sety Celkem</th>
            </tr>
          </thead>
          <tbody style={{ textAlign: 'center' }}>
            <tr>
              <td style={{ border: '2px solid #000', padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>{score.player1_name || 'Hráč 1'}</td>
              <td style={{ border: '2px solid #000', padding: '15px' }}>{score.completed_sets[0]?.player1_games ?? '-'}</td>
              <td style={{ border: '2px solid #000', padding: '15px' }}>{score.completed_sets[1]?.player1_games ?? '-'}</td>
              <td style={{ border: '2px solid #000', padding: '15px' }}>{score.completed_sets[2]?.player1_games ?? '-'}</td>
              <td style={{ border: '2px solid #000', padding: '15px', fontWeight: 'bold', fontSize: '26px' }}>{score.sets_won?.player1 || 0}</td>
            </tr>
            <tr>
              <td style={{ border: '2px solid #000', padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>{score.player2_name || 'Hráč 2'}</td>
              <td style={{ border: '2px solid #000', padding: '15px' }}>{score.completed_sets[0]?.player2_games ?? '-'}</td>
              <td style={{ border: '2px solid #000', padding: '15px' }}>{score.completed_sets[1]?.player2_games ?? '-'}</td>
              <td style={{ border: '2px solid #000', padding: '15px' }}>{score.completed_sets[2]?.player2_games ?? '-'}</td>
              <td style={{ border: '2px solid #000', padding: '15px', fontWeight: 'bold', fontSize: '26px' }}>{score.sets_won?.player2 || 0}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginBottom: '30px', fontSize: '20px', textAlign: 'left' }}>
          <h3 style={{ borderBottom: '2px solid #000', paddingBottom: '5px', marginBottom: '15px' }}>Vývoj skóre (průběh setů)</h3>
          <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#555', marginTop: '-10px', marginBottom: '15px' }}>* V závorce je uveden bodový stav, při kterém vítěz danou hru (gem) ukončil.</p>
          
          {score.game_log && score.game_log.map((log, idx) => {
            const isCurrentSet = (idx === (score.completed_sets?.length || 0));
            const isPlayingThisSet = isCurrentSet && !dosahlKonce && (score.current_set.player1_games > 0 || score.current_set.player2_games > 0 || score.current_game.player1_points !== "0" || score.current_game.player2_points !== "0");
            
            if ((!log || log.length === 0) && !isPlayingThisSet) return null;

            let playingString = "";
            if (isPlayingThisSet) {
               const pointsStr = score.is_tiebreak ? `TB ${score.current_game.player1_points}:${score.current_game.player2_points}` : `${score.current_game.player1_points}:${score.current_game.player2_points}`;
               const delimiter = (log && log.length > 0) ? ' ➔ ' : '';
               playingString = `${delimiter}rozehráno (${score.current_set.player1_games}:${score.current_set.player2_games}, míče ${pointsStr})`;
            }

            return (
              <div key={idx} style={{ marginBottom: '10px' }}>
                <strong>{idx + 1}. Set:</strong> {(log || []).join(' ➔ ')}{playingString}
              </div>
            );
          })}

          {(!score.game_log || score.game_log.every(l => !l || l.length === 0)) && score.current_set?.player1_games === 0 && score.current_set?.player2_games === 0 && score.current_game?.player1_points === "0" && score.current_game?.player2_points === "0" && (
             <div style={{ marginBottom: '10px' }}>Zápas právě začal (0:0)</div>
          )}
        </div>

        {score.is_default && (
          <div style={{ textAlign: 'center', marginBottom: '30px', color: '#d9534f', fontWeight: 'bold', fontSize: '22px' }}>
            Zápas byl ukončen skrečí / kontumací.<br/>(Viník pro tabulku: {score.fault_player || 'Neurčen / Jednostranná kontumace'})
          </div>
        )}

        <div style={{ textAlign: 'center', margin: '40px 0', fontSize: '28px', padding: '20px', border: '3px solid #000' }}>
          <strong>Vítěz utkání: </strong> 
          <span style={{ padding: '0 20px', textTransform: 'uppercase' }}>{vitezName || 'Zatím nedohráno'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px', fontSize: '20px' }}>
          <div style={{ textAlign: 'center', width: '400px' }}>
            <div style={{ borderBottom: '2px solid #000', marginBottom: '10px', height: '40px' }}></div>
            <strong>Podpis: Hlavní rozhodčí</strong>
          </div>
        </div>
      </div>

      <div className="no-print" style={{ background: isDivak ? '#000' : '#f4f7f6', color: isDivak ? 'white' : '#000', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 'clamp(5px, 1vw, 15px)', boxSizing: 'border-box', zIndex: 50 }}>
        
        {ukazatKonecnyOverlay && !isDivak && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ background: '#fff', padding: '40px', borderRadius: '20px', textAlign: 'center', maxWidth: '700px', width: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
              <h1 style={{ fontSize: '45px', margin: '0 0 20px 0', color: '#28a745' }}>🏆 Konec zápasu!</h1>
              <h2 style={{ fontSize: '35px', margin: '0 0 40px 0', color: '#333' }}>Vítěz: <br/>{vitezName}</h2>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={krokZpet} style={{ flex: '1 1 auto', padding: '15px 20px', fontSize: '18px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>↩ Vzít bod zpět</button>
                <button onClick={() => setSkrytOverlay(true)} style={{ flex: '1 1 auto', padding: '15px 20px', fontSize: '18px', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>✏️ Skrýt a upravit</button>
                <button onClick={tiskDoPDF} style={{ flex: '1 1 auto', padding: '15px 20px', fontSize: '18px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>📄 Uložit Zápis (PDF)</button>
                <button onClick={ukoncitZapas} style={{ flex: '1 1 auto', padding: '15px 20px', fontSize: '18px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Potvrdit a uložit</button>
              </div>
            </div>
          </div>
        )}

        {!isKiosk && (
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(4px, 1vh, 10px)', flexWrap: 'wrap', gap: '5px' }}>
            <button onClick={zpetDoMenu} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', zIndex: 10 }}>← Zpět</button>
            
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', zIndex: 10 }}>
              {!isDivak && (
                <button onClick={tiskDoPDF} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                  📄 Uložit Zápis (PDF)
                </button>
              )}

              <button onClick={toggleFullscreen} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: isFullscreen ? '#ffc107' : '#17a2b8', color: isFullscreen ? '#000' : 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
                {isFullscreen ? '↙ Zrušit Fullscreen' : '↗ Fullscreen'}
              </button>
              
              {!isDivak && (
                <button onClick={() => setManualniStrany(!manualniStrany)} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#6f42c1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
                  ↔ Prohodit strany
                </button>
              )}

              {!isDivak && !isZapasLocked && (
                <button onClick={() => !bodovaniZakazano && oboustrannaKontumace()} disabled={bodovaniZakazano} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#343a40', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', opacity: bodovaniZakazano ? 0.5 : 1 }}>
                  ❌ Oboustranná kontumace
                </button>
              )}

              {!isDivak && isZapasLocked ? (
                <button onClick={znovuOtevritZapas} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>🔓 Odemknout</button>
              ) : (!isDivak && (
                <>
                  <button onClick={krokZpet} disabled={history.length === 0} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: history.length === 0 ? 'not-allowed' : 'pointer', background: history.length === 0 ? '#ccc' : '#e0a800', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>↩ Krok zpět</button>
                  <button onClick={rucniPrepnutiPodani} disabled={bodovaniZakazano} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: bodovaniZakazano ? 'not-allowed' : 'pointer', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', opacity: bodovaniZakazano ? 0.5 : 1 }}>🔄 Změnit podání</button>
                  {aktualniZapas?.status === 'planned' && <button onClick={spustitLive} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>🔴 Spustit LIVE</button>}
                  {aktualniZapas?.status === 'live' && <button onClick={ukoncitZapas} style={{ padding: 'clamp(6px, 1.5vh, 10px) clamp(10px, 2vw, 20px)', fontSize: 'clamp(12px, 2vh, 16px)', cursor: 'pointer', background: '#218838', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>✅ Ukončit</button>}
                </>
              ))}
            </div>
          </div>
        )}

        {!isDivak && !isKiosk && (
          <div style={{ flexShrink: 0, background: '#222', color: '#00ff88', padding: 'min(1vh, 8px)', borderRadius: '8px', fontSize: 'clamp(12px, 2.5vh, 18px)', fontWeight: 'bold', marginBottom: 'clamp(4px, 1vh, 10px)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', width: '100%', maxWidth: '900px', margin: '0 auto clamp(4px, 1vh, 10px) auto' }}>
            🎤 Hlášení: <span style={{ color: '#fff' }}>"{navodProRozhodciho}"</span>
          </div>
        )}

        <div style={{ flexShrink: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 'clamp(16px, 3vh, 32px)', fontWeight: 'bold', fontFamily: 'monospace', background: '#333', color: '#ffeb3b', padding: '4px 12px', borderRadius: '8px', marginBottom: 'clamp(2px, 1vh, 10px)' }}>
            ⏱ {elapsedTime}
          </div>
          {dosahlKonce && isDivak && <h2 style={{ color: '#28a745', fontSize: 'clamp(18px, 3vh, 30px)', margin: '0 0 5px 0' }}>🏆 VÍTĚZ: {vitezName} 🏆</h2>}
          {score.is_tiebreak && !dosahlKonce && <h2 style={{ color: '#ff4444', fontSize: 'clamp(14px, 2vh, 22px)', margin: '0 0 5px 0' }}>🔥 TIE-BREAK 🔥</h2>}
          {!dosahlKonce && !score.is_tiebreak && isDivak && <h1 style={{ color: '#aaa', margin: '0 0 5px 0', fontSize: 'clamp(16px, 2.5vh, 26px)' }}>{aktualniZapas?.status === 'live' ? '🔴 ŽIVĚ' : 'ZÁPAS'}</h1>}
        </div>
        
        <ScoreboardTable />
        
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '15px', width: '100%', maxWidth: containerMaxWidth, margin: '0 auto', minHeight: 0, alignItems: 'stretch', alignContent: 'stretch', justifyContent: 'center' }}>
          {isDivak ? kartyDivak : kartyRozhodci}
        </div>
      </div>
    </>
  );
};