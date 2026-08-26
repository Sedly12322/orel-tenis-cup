import { posunoutVitezeVPlayoff, posunoutVitezeVCtyrhre } from '../utils/playoffLogic';

export const useMatchActions = (score, setScore, activeMatchId, zapasList, setZapasList, zpetDoMenu, supabase) => {

  const spustitLive = async () => {
    let st = JSON.parse(JSON.stringify(score));
    if (!st.start_time) st.start_time = Date.now(); // Zapnutí stopek
    setScore(st);
    await supabase.from('matches').update({ status: 'live', match_state: st }).eq('id', activeMatchId);
    setZapasList(prev => prev.map(z => z.id === activeMatchId ? { ...z, status: 'live', match_state: st } : z));
  }

  const znovuOtevritZapas = async () => {
    if (window.confirm("Opravdu chcete zápas odemknout pro úpravy? Zápas dočasně zmizí z tabulky, dokud ho znovu neuložíte.")) {
      let st = JSON.parse(JSON.stringify(score));
      st.end_time = null; // Pokud ho znovu otevřeme, stopky zase běží
      setScore(st);
      await supabase.from('matches').update({ status: 'live', match_state: st }).eq('id', activeMatchId);
      setZapasList(prev => prev.map(z => z.id === activeMatchId ? { ...z, status: 'live', match_state: st } : z));
    }
  }

  const ukoncitZapas = async () => {
    let st = JSON.parse(JSON.stringify(score));
    if (!st.end_time) st.end_time = Date.now(); // Vypnutí stopek na konci
    setScore(st);
    await supabase.from('matches').update({ status: 'finished', match_state: st }).eq('id', activeMatchId);
    await posunoutVitezeVPlayoff(supabase);
    await posunoutVitezeVCtyrhre(supabase);
    zpetDoMenu();
  }

  const kontumovatZapas = async (vitezId) => {
    const vitezJmeno = vitezId === 1 ? score.player1_name : score.player2_name;
    if (window.confirm(`Opravdu chcete zápas SKREČOVAT ve prospěch hráče: ${vitezJmeno}?`)) {
      let st = JSON.parse(JSON.stringify(score));
      st._history = [...(score._history || []), { ...score, _history: undefined }].slice(-50);
      st.sets_won = vitezId === 1 ? { player1: 2, player2: 0 } : { player1: 0, player2: 2 };
      st.completed_sets = vitezId === 1
        ? [{ player1_games: 6, player2_games: 0 }, { player1_games: 6, player2_games: 0 }]
        : [{ player1_games: 0, player2_games: 6 }, { player1_games: 0, player2_games: 6 }];
      st.current_set = { player1_games: 0, player2_games: 0 };
      st.current_game = { player1_points: "0", player2_points: "0" };
      st.is_tiebreak = false; st.is_default = true;
      st.first_fault = false;
      if (!st.end_time) st.end_time = Date.now();
      st.game_log = [["KONTUMACE 6:0"], ["KONTUMACE 6:0"], []];
      setScore(st);
      await supabase.from('matches').update({ match_state: st, status: 'finished' }).eq('id', activeMatchId);
      await posunoutVitezeVPlayoff(supabase);
    await posunoutVitezeVCtyrhre(supabase);
      zpetDoMenu();
    }
  }

  const oboustrannaKontumace = async () => {
    const odpoved = window.prompt(`❌ Oboustranná kontumace (0:0, 0:0)\nKdo nese vinu za neodehrání?\n1 = ${score.player1_name}\n2 = ${score.player2_name}`, "");
    if (odpoved !== null) {
      let st = JSON.parse(JSON.stringify(score));
      st._history = [...(score._history || []), { ...score, _history: undefined }].slice(-50);
      st.sets_won = { player1: 0, player2: 0 };
      st.completed_sets = [{ player1_games: 0, player2_games: 0 }, { player1_games: 0, player2_games: 0 }];
      st.current_set = { player1_games: 0, player2_games: 0 };
      st.current_game = { player1_points: "0", player2_points: "0" };
      st.is_tiebreak = false; st.is_default = true;
      st.first_fault = false;
      if (!st.end_time) st.end_time = Date.now();
      st.fault_player = odpoved.trim() === "1" ? score.player1_name : (odpoved.trim() === "2" ? score.player2_name : null);
      st.game_log = [["OBOUSTRANNÁ KONTUMACE 0:0"], ["OBOUSTRANNÁ KONTUMACE 0:0"], []];
      setScore(st);
      await supabase.from('matches').update({ match_state: st, status: 'finished' }).eq('id', activeMatchId);
      await posunoutVitezeVPlayoff(supabase);
    await posunoutVitezeVCtyrhre(supabase);
      zpetDoMenu();
    }
  }

  const krokZpet = async () => {
    const currHistory = score._history || [];
    if (currHistory.length === 0) return;
    const st = { ...currHistory[currHistory.length - 1], _history: currHistory.slice(0, -1) };
    setScore(st);
    await supabase.from('matches').update({ match_state: st }).eq('id', activeMatchId);
  }

  const zmenitJmenoHrace = async (hracKlic, noveJmeno) => {
    const novyStav = { ...score, [hracKlic]: noveJmeno };
    setScore(novyStav);
    await supabase.from('matches').update({ match_state: novyStav, [hracKlic]: noveJmeno }).eq('id', activeMatchId);
  }

  const rucniPrepnutiPodani = async () => {
    const novyStav = { ...score, server: score.server === 1 ? 2 : 1, first_fault: false, _history: [...(score._history || []), { ...score, _history: undefined }].slice(-50) };
    setScore(novyStav);
    await supabase.from('matches').update({ match_state: novyStav }).eq('id', activeMatchId);
  }

  // Tlačítko pro CHYBU PODÁNÍ a DVOJCHYBU
  const pridatChybuPodani = async () => {
    if (!score.first_fault) {
      let st = JSON.parse(JSON.stringify(score));
      st._history = [...(score._history || []), { ...score, _history: undefined }].slice(-50);
      st.first_fault = true; // Hráč udělal 1. chybu
      setScore(st);
      await supabase.from('matches').update({ match_state: st }).eq('id', activeMatchId);
    } else {
      // Dvojchyba -> Bod získá přijímající hráč
      const prijimajiciHrac = score.server === 1 ? 2 : 1;
      pridatBod(prijimajiciHrac);
    }
  }

  const pridatBod = async (hrac, isHawkEye = false) => {
    const isPlayoff = zapasList.find(z => z.id === activeMatchId)?.round !== null;
    let st = JSON.parse(JSON.stringify(score));
    st._history = [...(score._history || []), { ...score, _history: undefined }].slice(-50);
    if (isHawkEye) st.hawk_eye_timestamp = Date.now();

    // PŘI KAŽDÉM ÚSPĚŠNÉM BODU SE ZRUŠÍ PŘÍPADNÁ 1. CHYBA
    st.first_fault = false;

    let p1 = st.current_game.player1_points; let p2 = st.current_game.player2_points;
    let vyhralGem = false; let matchTbPoints = null; let tbScore = null;
    const isMatchTiebreak = (!isPlayoff && st.sets_won.player1 === 1 && st.sets_won.player2 === 1);

    if (st.is_tiebreak) {
      let b1 = parseInt(p1) || 0; let b2 = parseInt(p2) || 0;
      hrac === 1 ? b1++ : b2++;
      if ((b1 + b2) % 2 !== 0) st.server = st.server === 1 ? 2 : 1;
      if ((b1 >= 7 && b1 - b2 >= 2) || (b2 >= 7 && b2 - b1 >= 2)) { 
        vyhralGem = true; tbScore = `${b1}:${b2}`;
        if (isMatchTiebreak) matchTbPoints = { p1: b1, p2: b2 };
        else hrac === 1 ? st.current_set.player1_games++ : st.current_set.player2_games++; 
      } else { st.current_game.player1_points = b1.toString(); st.current_game.player2_points = b2.toString(); }
    } else {
      let v = hrac === 1 ? p1 : p2; let p = hrac === 1 ? p2 : p1;
      if (v === "0") v = "15"; else if (v === "15") v = "30"; else if (v === "30") v = "40";
      else if (v === "40") { if (p === "40") v = "AD"; else if (p === "AD") p = "40"; else vyhralGem = true; } 
      else if (v === "AD") vyhralGem = true;
      if (hrac === 1) { st.current_game.player1_points = v; st.current_game.player2_points = p; } else { st.current_game.player2_points = v; st.current_game.player1_points = p; }
      if (vyhralGem) { hrac === 1 ? st.current_set.player1_games++ : st.current_set.player2_games++; st.server = st.server === 1 ? 2 : 1; }
    }

    if (vyhralGem) {
      if (!st.game_log) st.game_log = [[], [], []];
      const curSetIdx = st.completed_sets.length;
      if (!st.game_log[curSetIdx]) st.game_log[curSetIdx] = [];

      if (isMatchTiebreak) st.game_log[curSetIdx].push(`Tie-break (${matchTbPoints.p1}:${matchTbPoints.p2})`);
      else if (tbScore) st.game_log[curSetIdx].push(`${st.current_set.player1_games}:${st.current_set.player2_games} (TB ${tbScore})`);
      else st.game_log[curSetIdx].push(`${st.current_set.player1_games}:${st.current_set.player2_games} (${st.current_game.player1_points}:${st.current_game.player2_points})`);

      st.current_game.player1_points = "0"; st.current_game.player2_points = "0";
      
      if (isMatchTiebreak) {
        st.completed_sets.push({ player1_games: matchTbPoints.p1, player2_games: matchTbPoints.p2 });
        hrac === 1 ? st.sets_won.player1++ : st.sets_won.player2++;
        st.current_set = { player1_games: 0, player2_games: 0 }; st.is_tiebreak = false;
      } else {
        const g1 = st.current_set.player1_games; const g2 = st.current_set.player2_games;
        if ((g1 >= 6 && g1 - g2 >= 2) || (g1 === 7 && g2 === 5) || (g1 === 7 && g2 === 6) || (g2 >= 6 && g2 - g1 >= 2) || (g2 === 7 && g1 === 5) || (g2 === 7 && g1 === 6)) {
          st.completed_sets.push({ player1_games: g1, player2_games: g2 });
          g1 > g2 ? st.sets_won.player1++ : st.sets_won.player2++;
          st.current_set = { player1_games: 0, player2_games: 0 }; 
          st.is_tiebreak = (!isPlayoff && st.sets_won.player1 === 1 && st.sets_won.player2 === 1);
        } else if (g1 === 6 && g2 === 6) st.is_tiebreak = true;
      }
    }
    setScore(st); await supabase.from('matches').update({ match_state: st }).eq('id', activeMatchId)
  }

  return { spustitLive, znovuOtevritZapas, ukoncitZapas, kontumovatZapas, oboustrannaKontumace, krokZpet, zmenitJmenoHrace, rucniPrepnutiPodani, pridatBod, pridatChybuPodani };
}