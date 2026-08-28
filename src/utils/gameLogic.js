import { normalize, zkraceneJmeno } from './constants.js';

export { zkraceneJmeno };

export const generujHlaseni = (_score, _minulyStav) => {
  if (!_score) return "Čeká se na zahájení zápasu...";
  if (_score.is_tiebreak) {
    return `Tie-break. Stav ${_score.current_game.player1_points}:${_score.current_game.player2_points}. Podává ${_score.server === 1 ? _score.player1_name : _score.player2_name}.`;
  }

  const p1 = _score.current_game.player1_points;
  const p2 = _score.current_game.player2_points;

  if (p1 === "0" && p2 === "0") {
    return `Nový gem. Podává ${_score.server === 1 ? _score.player1_name : _score.player2_name}.`;
  }
  if (p1 === "AD") return `Výhoda ${_score.player1_name}.`;
  if (p2 === "AD") return `Výhoda ${_score.player2_name}.`;
  if (p1 === "40" && p2 === "40") return `Shoda.`;

  return `Stav ${p1}:${p2}. Podává ${_score.server === 1 ? _score.player1_name : _score.player2_name}.`;
}

export const vypocitejTabulku = (matches, hraciList) => {
  let staty = {};

  // Vytvorime mapovani normalizovane jmeno -> puvodni jmeno z hraciList
  const jmenoMap = {};
  hraciList.forEach(h => {
    staty[h] = { jmeno: h, z: 0, v: 0, p: 0, setsW: 0, setsL: 0, gamesW: 0, gamesL: 0, body: 0, zapasy: [] };
    jmenoMap[normalize(h)] = h;
  });

  // Najde puvodni jmeno v hraciList podle normalizovaneho jmena
  const najdiJmeno = (jmeno) => {
    const norm = normalize(jmeno);
    if (jmenoMap[norm]) return jmenoMap[norm];

    // Pokus o shodu podle prijmeni a inicialy
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
      // Najdeme normalizovana jmena v hraciList
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

      // --- LOGIKA BODOVANI OREL TENIS CUP ---
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

      // --- VYPOCITANI GEMU ---
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

      // isHome identifikuje Domacinho hrace (p1) kvuli urcovani viny
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

  // --- RAZENI DO TABULKY ---
  serazeni.sort((a, b) => {
    // 1. Nejvice bodu
    if (b.body !== a.body) return b.body - a.body;

    const tiedPlayers = serazeni.filter(p => p.body === a.body);

    // 2. Shoda 2 hracu -> Vzajemny zapas
    if (tiedPlayers.length === 2) {
      const h2hMatchA = a.zapasy.find(z => z.souper === b.jmeno);
      if (h2hMatchA) {
        if (h2hMatchA.s1 > h2hMatchA.s2) return -1; // A vyhrál
        if (h2hMatchA.s1 < h2hMatchA.s2) return 1;  // B vyhrál

        // --- Reseni kontumace 0:0 se vinikem ---
        if (h2hMatchA.s1 === 0 && h2hMatchA.s2 === 0) {
          if (h2hMatchA.fault === a.jmeno) return 1;
          if (h2hMatchA.fault === b.jmeno) return -1;

          if (h2hMatchA.isDefault) {
            // Podle pravidel: Domaci hrac odpovidal za odehrani. Pri obestranné 0:0 je on vinikem a pada pod soupere.
            if (h2hMatchA.isHome) return 1; // A byl domaci (Player 1), takze klesa v tabulce dolu
            else return -1; // B byl domaci, takze A stoupa nahoru
          }
        }
      }
      const diffA = a.gamesW - a.gamesL;
      const diffB = b.gamesW - b.gamesL;
      return diffB - diffA;
    }

    // 3. Shoda 3 a vice hracu -> Minitabulka
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