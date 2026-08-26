export const zkraceneJmeno = (jmeno) => {
  if (!jmeno) return "";
  const casti = jmeno.split(' ');
  return casti.length === 1 ? jmeno : casti[0].charAt(0) + '. ' + casti.slice(1).join(' ');
}

export const generujHlaseni = (score, minulyStav) => {
  if (!score) return "Čeká se na zahájení zápasu...";
  if (score.is_tiebreak) {
    return `Tie-break. Stav ${score.current_game.player1_points}:${score.current_game.player2_points}. Podává ${score.server === 1 ? score.player1_name : score.player2_name}.`;
  }
  
  const p1 = score.current_game.player1_points;
  const p2 = score.current_game.player2_points;
  
  if (p1 === "0" && p2 === "0") {
    return `Nový gem. Podává ${score.server === 1 ? score.player1_name : score.player2_name}.`;
  }
  if (p1 === "AD") return `Výhoda ${score.player1_name}.`;
  if (p2 === "AD") return `Výhoda ${score.player2_name}.`;
  if (p1 === "40" && p2 === "40") return `Shoda.`;
  
  return `Stav ${p1}:${p2}. Podává ${score.server === 1 ? score.player1_name : score.player2_name}.`;
}

export const vypocitejTabulku = (matches, hraciList) => {
  let staty = {};
  
  // Normalizace jmen pro porovnání
  const normalize = (s) => s.toLowerCase()
    .replace(/[áàâäã]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
    .replace(/[óòôöõ]/g, 'o').replace(/[úùûü]/g, 'u').replace(/[řŕ]/g, 'r')
    .replace(/[šś]/g, 's').replace(/[čć]/g, 'c').replace(/[žź]/g, 'z')
    .replace(/[ď]/g, 'd').replace(/[ť]/g, 't').replace(/[ň]/g, 'n')
    .replace(/[ľ]/g, 'l').replace(/[ą]/g, 'a').replace(/[ę]/g, 'e')
    .replace(/[ů]/g, 'u').replace(/[yý]/g, 'y').replace(/[ł]/g, 'l')
    .replace(/[^a-z0-9\s\/]/g, '').replace(/\s+/g, ' ').trim();
  
  // Vytvoříme mapování normalizované jméno → původní jméno z hraciList
  const jmenoMap = {};
  hraciList.forEach(h => {
    staty[h] = { jmeno: h, z: 0, v: 0, p: 0, setsW: 0, setsL: 0, gamesW: 0, gamesL: 0, body: 0, zapasy: [] };
    jmenoMap[normalize(h)] = h;
  });

  // Najde původní jméno v hraciList podle normalizovaného jména
  const najdiJmeno = (jmeno) => {
    const norm = normalize(jmeno);
    if (jmenoMap[norm]) return jmenoMap[norm];
    
    // Pokus o shodu podle příjmení a iniciály
    for (const h of hraciList) {
      const castiJmeno = norm.split('/').map(s => s.trim());
      const castiPar = normalize(h).split('/').map(s => s.trim());
      
      if (castiJmeno.length === castiPar.length) {
        let shodne = true;
        for (let i = 0; i < castiJmeno.length; i++) {
          const slovaJmeno = castiJmeno[i].split(' ').filter(Boolean);
          const slovaPar = castiPar[i].split(' ').filter(Boolean);
          
          if (slovaJmeno.length === 0 || slovaPar.length === 0) continue;
          
          const prijmeniJmeno = slovaJmeno[slovaJmeno.length - 1];
          const prijmeniPar = slovaPar[slovaPar.length - 1];
          const inicialaJmeno = slovaJmeno[0].charAt(0);
          const inicialaPar = slovaPar[0].charAt(0);
          
          if (prijmeniJmeno !== prijmeniPar || inicialaJmeno !== inicialaPar) {
            shodne = false;
            break;
          }
        }
        if (shodne) return h;
      }
    }
    return jmeno; // Fallback
  };

  matches.forEach(m => {
    if (m.status === 'finished' && m.match_state) {
      // Najdeme normalizovaná jména v hraciList
      const p1 = najdiJmeno(m.player1_name);
      const p2 = najdiJmeno(m.player2_name);
      if (!staty[p1] || !staty[p2]) return;

      const s1 = m.match_state.sets_won.player1 || 0;
      const s2 = m.match_state.sets_won.player2 || 0;
      const isDefault = m.match_state.is_default === true; 
      const faultPlayer = m.match_state.fault_player || null;

      staty[p1].z += 1;
      staty[p2].z += 1;
      staty[p1].setsW += s1;
      staty[p1].setsL += s2;
      staty[p2].setsW += s2;
      staty[p2].setsL += s1;

      if (s1 > s2) {
        staty[p1].v += 1;
        staty[p2].p += 1;
      } else if (s2 > s1) {
        staty[p2].v += 1;
        staty[p1].p += 1;
      }

      // --- LOGIKA BODOVÁNÍ OREL TENIS CUP ---
      if (s1 === 2 && s2 === 0) {
        staty[p1].body += 4;
        staty[p2].body += isDefault ? 0 : 1; 
      } else if (s2 === 2 && s1 === 0) {
        staty[p2].body += 4;
        staty[p1].body += isDefault ? 0 : 1;
      } else if (s1 === 2 && s2 === 1) { 
        staty[p1].body += 3;
        staty[p2].body += 2;
      } else if (s2 === 2 && s1 === 1) {
        staty[p2].body += 3;
        staty[p1].body += 2;
      }

      // --- POČÍTÁNÍ GAMŮ ---
      let g1 = 0; let g2 = 0;
      if (m.match_state.completed_sets) {
        m.match_state.completed_sets.forEach((set, idx) => {
          if (idx < 2) { 
            staty[p1].gamesW += set.player1_games;
            staty[p1].gamesL += set.player2_games;
            staty[p2].gamesW += set.player2_games;
            staty[p2].gamesL += set.player1_games;
            
            g1 += set.player1_games;
            g2 += set.player2_games;
          }
        });
      }

      // isHome identifikuje Domácího hráče (p1) kvůli určení viny
      staty[p1].zapasy.push({ souper: p2, s1, s2, g1, g2, isDefault, fault: faultPlayer, isHome: true });
      staty[p2].zapasy.push({ souper: p1, s1: s2, s2: s1, g1: g2, g2: g1, isDefault, fault: faultPlayer, isHome: false });
    }
  });

  let serazeni = Object.values(staty);

  const getMiniTableStats = (playersArr) => {
    let mt = {};
    playersArr.forEach(p => {
      mt[p.jmeno] = { jmeno: p.jmeno, body: 0, gamesW: 0, gamesL: 0 };
    });

    playersArr.forEach(p1 => {
      p1.zapasy.forEach(zapas => {
        if (mt[zapas.souper]) { 
           if (zapas.s1 === 2 && zapas.s2 === 0) mt[p1.jmeno].body += 4;
           else if (zapas.s1 === 2 && zapas.s2 === 1) mt[p1.jmeno].body += 3;
           else if (zapas.s1 === 1 && zapas.s2 === 2) mt[p1.jmeno].body += 2;
           else if (zapas.s1 === 0 && zapas.s2 === 2) mt[p1.jmeno].body += (zapas.isDefault ? 0 : 1);

           mt[p1.jmeno].gamesW += zapas.g1;
           mt[p1.jmeno].gamesL += zapas.g2;
        }
      });
    });
    return mt;
  };

  // --- ŘAZENÍ DO TABULKY ---
  serazeni.sort((a, b) => {
    // 1. Nejvíce bodů
    if (b.body !== a.body) return b.body - a.body;

    const tiedPlayers = serazeni.filter(p => p.body === a.body);

    // 2. Shoda 2 hráčů -> Vzájemný zápas
    if (tiedPlayers.length === 2) {
      const h2hMatchA = a.zapasy.find(z => z.souper === b.jmeno);
      if (h2hMatchA) {
        if (h2hMatchA.s1 > h2hMatchA.s2) return -1; // A vyhrál
        if (h2hMatchA.s1 < h2hMatchA.s2) return 1;  // B vyhrál
        
        // --- Řešení kontumace 0:0 s viníkem ---
        if (h2hMatchA.s1 === 0 && h2hMatchA.s2 === 0) {
          if (h2hMatchA.fault === a.jmeno) return 1;
          if (h2hMatchA.fault === b.jmeno) return -1;
          
          if (h2hMatchA.isDefault) {
             // Podle pravidel: Domácí hráč zodpovídal za odehrání. Při oboustranné 0:0 je on viníkem a padá pod soupeře.
             if (h2hMatchA.isHome) return 1; // A byl domácí (Player 1), takže klesá v tabulce dolů
             else return -1; // B byl domácí, takže A stoupá nahoru
          }
        }
      }
      const diffA = a.gamesW - a.gamesL;
      const diffB = b.gamesW - b.gamesL;
      return diffB - diffA;
    }

    // 3. Shoda 3 a více hráčů -> Minitabulka
    if (tiedPlayers.length > 2) {
      const mtStats = getMiniTableStats(tiedPlayers);
      const mtA = mtStats[a.jmeno];
      const mtB = mtStats[b.jmeno];

      if (mtB.body !== mtA.body) return mtB.body - mtA.body;
      
      const diffA = mtA.gamesW - mtA.gamesL;
      const diffB = mtB.gamesW - mtB.gamesL;
      if (diffB !== diffA) return diffB - diffA;

      const ratioA = mtA.gamesL === 0 ? (mtA.gamesW > 0 ? 999 : 0) : mtA.gamesW / mtA.gamesL;
      const ratioB = mtB.gamesL === 0 ? (mtB.gamesW > 0 ? 999 : 0) : mtB.gamesW / mtB.gamesL;
      return ratioB - ratioA;
    }

    return 0;
  });

  serazeni.forEach((s, idx) => {
    s.poradi = idx + 1;
  });

  return { staty, serazeni };
}