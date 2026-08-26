import { vypocitejTabulku } from './gameLogic';

export const generovatPavouka = async (zapasList, HRACI_SKUPINA_A, HRACI_SKUPINA_B, supabase) => {
  const odehraneZapasy = zapasList.filter(z => z.status === 'finished');
  const zapasyA = odehraneZapasy.filter(z => HRACI_SKUPINA_A.includes(z.player1_name) && HRACI_SKUPINA_A.includes(z.player2_name));
  const zapasyB = odehraneZapasy.filter(z => HRACI_SKUPINA_B.includes(z.player1_name) && HRACI_SKUPINA_B.includes(z.player2_name));

  const { serazeni: tabA } = vypocitejTabulku(zapasyA, HRACI_SKUPINA_A);
  const { serazeni: tabB } = vypocitejTabulku(zapasyB, HRACI_SKUPINA_B);

  if (tabA.length < 4 || tabB.length < 4) {
    alert("Ve skupinách ještě nemáme dostatek dohraných zápasů. Z každé skupiny potřebujeme minimálně 4 umístěné hráče.");
    return;
  }

  const vychoziStav = (p1, p2, code) => ({
    player1_name: p1, player2_name: p2, server: 1,
    sets_won: { player1: 0, player2: 0 }, completed_sets: [],
    current_set: { player1_games: 0, player2_games: 0 }, current_game: { player1_points: "0", player2_points: "0" },
    is_tiebreak: false, game_log: [[], [], []], _history: [],
    match_code: code // NOVÉ: Průkaz totožnosti zápasu!
  });

  const existujiciPlayoff = zapasList.filter(z => [1,2,4].includes(z.round));
  if (existujiciPlayoff.length > 0) {
    if (!window.confirm("Zápasy Playoff už existují. Opravdu chcete starého pavouka smazat a vygenerovat ho úplně znovu?")) return;
    for (let z of existujiciPlayoff) await supabase.from('matches').delete().eq('id', z.id);
  }

  const vsechnyPlayoffZapasy = [
    { player1_name: tabA[0].jmeno, player2_name: tabB[3].jmeno, status: 'planned', round: 4, match_state: vychoziStav(tabA[0].jmeno, tabB[3].jmeno, 'QF1') },
    { player1_name: tabB[1].jmeno, player2_name: tabA[2].jmeno, status: 'planned', round: 4, match_state: vychoziStav(tabB[1].jmeno, tabA[2].jmeno, 'QF2') },
    { player1_name: tabA[1].jmeno, player2_name: tabB[2].jmeno, status: 'planned', round: 4, match_state: vychoziStav(tabA[1].jmeno, tabB[2].jmeno, 'QF3') },
    { player1_name: tabB[0].jmeno, player2_name: tabA[3].jmeno, status: 'planned', round: 4, match_state: vychoziStav(tabB[0].jmeno, tabA[3].jmeno, 'QF4') },
    { player1_name: "Vítěz QF1", player2_name: "Vítěz QF2", status: 'planned', round: 2, match_state: vychoziStav("Vítěz QF1", "Vítěz QF2", 'SF1') },
    { player1_name: "Vítěz QF3", player2_name: "Vítěz QF4", status: 'planned', round: 2, match_state: vychoziStav("Vítěz QF3", "Vítěz QF4", 'SF2') },
    { player1_name: "Vítěz SF1", player2_name: "Vítěz SF2", status: 'planned', round: 1, match_state: vychoziStav("Vítěz SF1", "Vítěz SF2", 'F1') }
  ];

  for (const m of vsechnyPlayoffZapasy) await supabase.from('matches').insert([m]);
  alert("Pavouk byl úspěšně vygenerován!");
};

export const generovatCtyrhraPlayoff = async (zapasList, CTYRHRA_TYMY, supabase) => {
  const odehraneZapasy = zapasList.filter(z => z.status === 'finished');
  const zapasyCtyrhra = odehraneZapasy.filter(z => CTYRHRA_TYMY.includes(z.player1_name) && CTYRHRA_TYMY.includes(z.player2_name));

  const { serazeni: tab } = vypocitejTabulku(zapasyCtyrhra, CTYRHRA_TYMY);

  if (tab.length < 4) {
    alert("Pro vygenerování playoff čtyřhry potřebujeme minimálně 4 umístěné páry v tabulce.");
    return;
  }

  const vychoziStav = (p1, p2, code) => ({
    player1_name: p1, player2_name: p2, server: 1,
    sets_won: { player1: 0, player2: 0 }, completed_sets: [],
    current_set: { player1_games: 0, player2_games: 0 }, current_game: { player1_points: "0", player2_points: "0" },
    is_tiebreak: false, game_log: [[], [], []], _history: [],
    match_code: code
  });

  // Playoff čtyřhry má vlastní kola (101 = finále, 102 = semifinále), aby se nepomíchalo s dvouhrou (1, 2, 4)
  const existujiciPlayoff = zapasList.filter(z => [101, 102].includes(z.round));
  if (existujiciPlayoff.length > 0) {
    if (!window.confirm("Playoff čtyřhry už existuje. Opravdu chcete starý pavouk smazat a vygenerovat ho úplně znovu?")) return;
    for (let z of existujiciPlayoff) await supabase.from('matches').delete().eq('id', z.id);
  }

  const playoffZapasy = [
    { player1_name: tab[0].jmeno, player2_name: tab[3].jmeno, status: 'planned', round: 102, match_state: vychoziStav(tab[0].jmeno, tab[3].jmeno, 'CSF1') },
    { player1_name: tab[1].jmeno, player2_name: tab[2].jmeno, status: 'planned', round: 102, match_state: vychoziStav(tab[1].jmeno, tab[2].jmeno, 'CSF2') },
    { player1_name: "Vítěz CSF1", player2_name: "Vítěz CSF2", status: 'planned', round: 101, match_state: vychoziStav("Vítěz CSF1", "Vítěz CSF2", 'CF1') }
  ];

  for (const m of playoffZapasy) await supabase.from('matches').insert([m]);
  alert("Pavouk čtyřhry byl úspěšně vygenerován!");
};

export const smazatCtyrhraPlayoff = async (zapasList, supabase) => {
  const playoffZapasy = zapasList.filter(z => [101, 102].includes(z.round));
  if (playoffZapasy.length === 0) return;
  if (window.confirm("Opravdu chcete TRVALE smazat všechny zápasy Playoff čtyřhry (Semifinále, Finále)?")) {
    for (let z of playoffZapasy) await supabase.from('matches').delete().eq('id', z.id);
    alert("Playoff čtyřhry bylo smazáno.");
  }
};

export const posunoutVitezeVCtyrhre = async (supabase) => {
  const { data: vsechnyZapasy } = await supabase.from('matches').select('*');
  if (!vsechnyZapasy) return;

  const getVitez = (m) => {
    if (!m || m.status !== 'finished' || !m.match_state) return null;
    const s1 = m.match_state.sets_won?.player1 || 0;
    const s2 = m.match_state.sets_won?.player2 || 0;
    if (s1 > s2) return m.player1_name;
    if (s2 > s1) return m.player2_name;
    return null;
  };

  const csf1 = vsechnyZapasy.find(z => z.match_state?.match_code === 'CSF1');
  const csf2 = vsechnyZapasy.find(z => z.match_state?.match_code === 'CSF2');
  const cf1 = vsechnyZapasy.find(z => z.match_state?.match_code === 'CF1');

  if (!csf1 && !csf2) return;

  const posunDoZapasu = async (cilovyZapas, predchoziZapas1, predchoziZapas2) => {
    if (!cilovyZapas) return;
    const v1 = getVitez(predchoziZapas1);
    const v2 = getVitez(predchoziZapas2);
    let p1 = cilovyZapas.player1_name; let p2 = cilovyZapas.player2_name;

    if (cilovyZapas.player1_name.includes('Vítěz') && v1) p1 = v1;
    if (cilovyZapas.player2_name.includes('Vítěz') && v2) p2 = v2;

    if (cilovyZapas.player1_name !== p1 || cilovyZapas.player2_name !== p2) {
      const newState = { ...cilovyZapas.match_state, player1_name: p1, player2_name: p2 };
      await supabase.from('matches').update({ player1_name: p1, player2_name: p2, match_state: newState }).eq('id', cilovyZapas.id);
    }
  };

  await posunDoZapasu(cf1, csf1, csf2);
};

export const smazatPlayoff = async (zapasList, supabase) => {
  const playoffZapasy = zapasList.filter(z => [1, 2, 4].includes(z.round));
  if (playoffZapasy.length === 0) return;
  if (window.confirm("Opravdu chcete TRVALE smazat všechny zápasy Playoff (Čtvrtfinále, Semifinále, Finále)?")) {
    for (let z of playoffZapasy) await supabase.from('matches').delete().eq('id', z.id);
    alert("Playoff bylo smazáno.");
  }
};

export const posunoutVitezeVPlayoff = async (supabase) => {
  const { data: vsechnyZapasy } = await supabase.from('matches').select('*');
  if (!vsechnyZapasy) return;

  const getVitez = (m) => {
    if (!m || m.status !== 'finished' || !m.match_state) return null;
    const s1 = m.match_state.sets_won?.player1 || 0;
    const s2 = m.match_state.sets_won?.player2 || 0;
    if (s1 > s2) return m.player1_name;
    if (s2 > s1) return m.player2_name;
    return null;
  };

  // Nyní naprosto bezpečně přes match_code
  const qf1 = vsechnyZapasy.find(z => z.match_state?.match_code === 'QF1');
  const qf2 = vsechnyZapasy.find(z => z.match_state?.match_code === 'QF2');
  const qf3 = vsechnyZapasy.find(z => z.match_state?.match_code === 'QF3');
  const qf4 = vsechnyZapasy.find(z => z.match_state?.match_code === 'QF4');
  const sf1 = vsechnyZapasy.find(z => z.match_state?.match_code === 'SF1');
  const sf2 = vsechnyZapasy.find(z => z.match_state?.match_code === 'SF2');
  const f1 = vsechnyZapasy.find(z => z.match_state?.match_code === 'F1');

  if (!qf1) return; // Zpětná kompatibilita (necháme být, pokud není nový pavouk vytvořen)

  const posunDoZapasu = async (cilovyZapas, predchoziZapas1, predchoziZapas2) => {
    if (!cilovyZapas) return;
    const v1 = getVitez(predchoziZapas1);
    const v2 = getVitez(predchoziZapas2);
    let p1 = cilovyZapas.player1_name; let p2 = cilovyZapas.player2_name;
    
    if (cilovyZapas.player1_name.includes('Vítěz') && v1) p1 = v1;
    if (cilovyZapas.player2_name.includes('Vítěz') && v2) p2 = v2;
    
    if (cilovyZapas.player1_name !== p1 || cilovyZapas.player2_name !== p2) {
      const newState = { ...cilovyZapas.match_state, player1_name: p1, player2_name: p2 };
      await supabase.from('matches').update({ player1_name: p1, player2_name: p2, match_state: newState }).eq('id', cilovyZapas.id);
    }
  };

  await posunDoZapasu(sf1, qf1, qf2);
  await posunDoZapasu(sf2, qf3, qf4);

  const { data: sfAktualni } = await supabase.from('matches').select('*').eq('round', 2);
  const curSf1 = sfAktualni?.find(z => z.match_state?.match_code === 'SF1') || sf1;
  const curSf2 = sfAktualni?.find(z => z.match_state?.match_code === 'SF2') || sf2;
  
  await posunDoZapasu(f1, curSf1, curSf2);
};