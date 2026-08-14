// --- DEFINICE SKUPIN ---
export const HRACI_SKUPINA_A = ["František Paľo", "Libor Stanislav", "Jan Matúš", "Vladimír Vašut", "Radek Petr", "Pavel Hazuka, ml.", "Dominik Sedlář", "Sidney Rek", "Vladislav Rek"];
export const HRACI_SKUPINA_B = ["Petr Osterezy", "Zdeněk Liška", "Jaromír Darivčák", "Přemysl Kahánek", "Tomáš Sedlář", "Jan Hrančík", "Lukáš Rafael Osterezy", "Jaroslav Jurek"];

export const zkraceneJmeno = (jmeno) => {
  if (!jmeno) return "";
  const casti = jmeno.split(' ');
  if (casti.length === 1) return jmeno;
  return casti[0].charAt(0) + '. ' + casti.slice(1).join(' ');
}

// --- FUNKCE PRO VÝPOČET HLÁŠENÍ DO MIKROFONU ---
export const generujHlaseni = (stav, minulyStav) => {
  if (!stav) return "";
  const p1 = stav.player1_name || "Hráč 1";
  const p2 = stav.player2_name || "Hráč 2";
  const b1 = stav.current_game.player1_points;
  const b2 = stav.current_game.player2_points;
  const podava = stav.server === 1 ? p1 : p2;
  
  let praveVyhralGem = null;
  let praveVyhralSet = null;
  
  if (minulyStav) {
    if (stav.current_set.player1_games > minulyStav.current_set.player1_games) praveVyhralGem = p1;
    else if (stav.current_set.player2_games > minulyStav.current_set.player2_games) praveVyhralGem = p2;
    
    if (stav.sets_won.player1 > minulyStav.sets_won.player1) { praveVyhralSet = p1; praveVyhralGem = p1; }
    else if (stav.sets_won.player2 > minulyStav.sets_won.player2) { praveVyhralSet = p2; praveVyhralGem = p2; }
  }

  if (praveVyhralSet) return `Hra a sada ${praveVyhralSet}. Podává ${podava}.`;
  if (praveVyhralGem) return `Hra ${praveVyhralGem}. Stav ${stav.current_set.player1_games}:${stav.current_set.player2_games}. Podává ${podava}.`;

  if (b1 === "0" && b2 === "0") {
    if (stav.current_set.player1_games === 0 && stav.current_set.player2_games === 0 && stav.completed_sets.length === 0) return `Zahájení zápasu. Podává ${podava}.`;
    return `Podává ${podava}.`;
  }

  if (stav.is_tiebreak) {
    const tbServer = stav.server === 1 ? b1 : b2;
    const tbPrijima = stav.server === 1 ? b2 : b1;
    return `Tie-break. ${tbServer} : ${tbPrijima} (Podává ${podava})`;
  }

  if (b1 === "40" && b2 === "40") return "Shoda!";
  if (b1 === "AD") return `Výhoda ${p1}`;
  if (b2 === "AD") return `Výhoda ${p2}`;

  const slovnik = { "0": "nula", "15": "patnáct", "30": "třicet", "40": "čtyřicet" };
  const sBod = stav.server === 1 ? b1 : b2;
  const pBod = stav.server === 1 ? b2 : b1;
  return `${slovnik[sBod] || sBod} : ${slovnik[pBod] || pBod}`;
}

// --- SPOLEČNÁ FUNKCE PRO VÝPOČET POŘADÍ ---
export const vypocitejTabulku = (matches, hraciList) => {
  let staty = {}
  hraciList.forEach(h => staty[h] = { jmeno: h, z: 0, v: 0, p: 0, setsW: 0, setsL: 0, gamesW: 0, gamesL: 0, body: 0, poradi: null })

  matches.forEach(m => {
    if (m.status !== 'finished' || !m.match_state) return
    const p1 = m.player1_name; const p2 = m.player2_name;
    if (staty[p1] && staty[p2]) {
      staty[p1].z++; staty[p2].z++;
      const s1 = m.match_state.sets_won?.player1 || 0; const s2 = m.match_state.sets_won?.player2 || 0;
      staty[p1].setsW += s1; staty[p1].setsL += s2;
      staty[p2].setsW += s2; staty[p2].setsL += s1;
      
      // ZDE JE OPRAVA: Počítání výher a proher
      if (s1 > s2) { 
        staty[p1].v++; staty[p2].p++;
        if (s2 === 0) { staty[p1].body += 4; staty[p2].body += 1; } else { staty[p1].body += 3; staty[p2].body += 2; }
      } else if (s2 > s1) { 
        staty[p2].v++; staty[p1].p++;
        if (s1 === 0) { staty[p2].body += 4; staty[p1].body += 1; } else { staty[p2].body += 3; staty[p1].body += 2; }
      }

      m.match_state.completed_sets?.forEach(set => {
        staty[p1].gamesW += set.player1_games || 0; staty[p1].gamesL += set.player2_games || 0;
        staty[p2].gamesW += set.player2_games || 0; staty[p2].gamesL += set.player1_games || 0;
      })
    }
  })

  const serazeni = Object.values(staty).filter(s => s.z > 0).sort((a, b) => {
    if (b.body !== a.body) return b.body - a.body;
    const setDiff = (b.setsW - b.setsL) - (a.setsW - a.setsL);
    if (setDiff !== 0) return setDiff;
    return (b.gamesW - b.gamesL) - (a.gamesW - a.gamesL);
  })
  
  serazeni.forEach((s, idx) => { staty[s.jmeno].poradi = idx + 1; });
  return { staty, serazeni };
}