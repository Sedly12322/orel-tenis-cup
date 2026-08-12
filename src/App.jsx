import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// --- DEFINICE SKUPIN ---
const HRACI_SKUPINA_A = ["František Paľo", "Libor Stanislav", "Jan Matúš", "Vladimír Vašut", "Radek Petr", "Pavel Hazuka, ml.", "Dominik Sedlář", "Sidney Rek", "Vladislav Rek"]
const HRACI_SKUPINA_B = ["Petr Osterezy", "Zdeněk Liška", "Jaromír Darivčák", "Přemysl Kahánek", "Tomáš Sedlář", "Jan Hrančík", "Lukáš Rafael Osterezy", "Jaroslav Jurek"]

const zkraceneJmeno = (jmeno) => {
  if (!jmeno) return "";
  const casti = jmeno.split(' ');
  if (casti.length === 1) return jmeno;
  return casti[0].charAt(0) + '. ' + casti.slice(1).join(' ');
}

// --- FUNKCE PRO VÝPOČET HLÁŠENÍ DO MIKROFONU ---
const generujHlaseni = (stav, minulyStav) => {
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
const vypocitejTabulku = (matches, hraciList) => {
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
      
      if (s1 > s2) { 
        if (s2 === 0) { staty[p1].body += 4; staty[p2].body += 1; } else { staty[p1].body += 3; staty[p2].body += 2; }
      } else if (s2 > s1) { 
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

function App() {
  const isDivak = window.location.search.includes('divak=1')
  const [view, setView] = useState('menu') 
  const [activeMatchId, setActiveMatchId] = useState(null)
  
  const [zapasList, setZapasList] = useState([])
  const [hraciList, setHraciList] = useState([])
  
  const [score, setScore] = useState(null)
  const [history, setHistory] = useState([])
  const [novyHracJmeno, setNovyHracJmeno] = useState('')
  
  const [typTabulky, setTypTabulky] = useState('krizova')
  const [importText, setImportText] = useState('')

  useEffect(() => {
    const nactiZapasy = async () => {
      const { data } = await supabase.from('matches').select('*').order('created_at', { ascending: false })
      if (data) setZapasList(data)
    }
    const nactiHrace = async () => {
      const { data } = await supabase.from('players').select('*').order('name', { ascending: true })
      if (data) setHraciList(data)
    }

    nactiZapasy(); nactiHrace();

    const dbKanal = supabase.channel('spolecny-kanal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => nactiZapasy())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => nactiHrace())
      .subscribe()

    return () => { supabase.removeChannel(dbKanal) }
  }, [])

  useEffect(() => {
    if (view === 'match' && activeMatchId) {
      const nactiSkore = async () => {
        const { data } = await supabase.from('matches').select('*').eq('id', activeMatchId).single()
        if (data && data.match_state) setScore(data.match_state)
      }
      nactiSkore()

      const matchKanal = supabase.channel('match-kanal')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${activeMatchId}` },
          (payload) => setScore(payload.new.match_state)
        ).subscribe()

      return () => { supabase.removeChannel(matchKanal) }
    }
  }, [view, activeMatchId])

  // ==========================================
  // AKCE ZÁPASŮ
  // ==========================================
  const pridatHrace = async () => {
    if (!novyHracJmeno.trim()) return
    await supabase.from('players').insert([{ name: novyHracJmeno }])
    setNovyHracJmeno('')
  }
  const smazatHrace = async (id) => { if (window.confirm("Smazat?")) await supabase.from('players').delete().eq('id', id) }
  const smazatZapas = async (id) => { if (window.confirm("Smazat zápas?")) await supabase.from('matches').delete().eq('id', id) }

  const vytvoritNovyZapas = async () => {
    const vychoziStav = {
      player1_name: "Hráč 1", player2_name: "Hráč 2", server: 1,
      sets_won: { player1: 0, player2: 0 }, completed_sets: [],
      current_set: { player1_games: 0, player2_games: 0 }, current_game: { player1_points: "0", player2_points: "0" },
      is_tiebreak: false
    }
    const { data } = await supabase.from('matches').insert([{ player1_name: "Hráč 1", player2_name: "Hráč 2", status: "live", match_state: vychoziStav }]).select()
    if (data && data[0]) otevritZapas(data[0].id)
  }

  const otevritZapas = (id) => { setActiveMatchId(id); setHistory([]); setView('match') }
  const zpetDoMenu = () => { setActiveMatchId(null); setScore(null); setView('menu') }

  const spustitLive = async () => {
    await supabase.from('matches').update({ status: 'live' }).eq('id', activeMatchId);
    setZapasList(prev => prev.map(z => z.id === activeMatchId ? { ...z, status: 'live' } : z));
  }

  const ukoncitZapas = async () => {
    if (window.confirm("Ukončit zápas a přesunout ho do odehraných?")) {
      await supabase.from('matches').update({ status: 'finished' }).eq('id', activeMatchId)
      zpetDoMenu()
    }
  }

  const krokZpet = async () => {
    if (history.length === 0) return
    const minulyStav = history[history.length - 1]
    setHistory(prev => prev.slice(0, -1))
    setScore(minulyStav)
    await supabase.from('matches').update({ match_state: minulyStav }).eq('id', activeMatchId)
  }

  const zmenitJmenoHrace = async (hracKlic, noveJmeno) => {
    const novyStav = { ...score, [hracKlic]: noveJmeno }
    setScore(novyStav)
    await supabase.from('matches').update({ match_state: novyStav, [hracKlic]: noveJmeno }).eq('id', activeMatchId)
  }

  const rucniPrepnutiPodani = async () => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(score))])
    const novyStav = { ...score, server: score.server === 1 ? 2 : 1 }
    setScore(novyStav)
    await supabase.from('matches').update({ match_state: novyStav }).eq('id', activeMatchId)
  }

  const pridatBod = async (hrac) => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(score))])
    let st = JSON.parse(JSON.stringify(score))
    let p1 = st.current_game.player1_points; let p2 = st.current_game.player2_points;
    let vyhralGem = false

    if (st.is_tiebreak) {
      let b1 = parseInt(p1) || 0; let b2 = parseInt(p2) || 0;
      hrac === 1 ? b1++ : b2++;
      if ((b1 + b2) % 2 !== 0) st.server = st.server === 1 ? 2 : 1;
      if ((b1 >= 7 && b1 - b2 >= 2) || (b2 >= 7 && b2 - b1 >= 2)) { vyhralGem = true; hrac === 1 ? st.current_set.player1_games++ : st.current_set.player2_games++; } 
      else { st.current_game.player1_points = b1.toString(); st.current_game.player2_points = b2.toString(); }
    } else {
      let v = hrac === 1 ? p1 : p2; let p = hrac === 1 ? p2 : p1;
      if (v === "0") v = "15"; else if (v === "15") v = "30"; else if (v === "30") v = "40";
      else if (v === "40") { if (p === "40") v = "AD"; else if (p === "AD") p = "40"; else vyhralGem = true; } 
      else if (v === "AD") vyhralGem = true;
      if (hrac === 1) { st.current_game.player1_points = v; st.current_game.player2_points = p; } else { st.current_game.player2_points = v; st.current_game.player1_points = p; }
      if (vyhralGem) { hrac === 1 ? st.current_set.player1_games++ : st.current_set.player2_games++; st.server = st.server === 1 ? 2 : 1; }
    }

    if (vyhralGem) {
      st.current_game.player1_points = "0"; st.current_game.player2_points = "0";
      const g1 = st.current_set.player1_games; const g2 = st.current_set.player2_games;
      if ((g1 >= 6 && g1 - g2 >= 2) || (g1 === 7 && g2 === 5) || (g1 === 7 && g2 === 6) || (g2 >= 6 && g2 - g1 >= 2) || (g2 === 7 && g1 === 5) || (g2 === 7 && g1 === 6)) {
        st.completed_sets.push({ player1_games: g1, player2_games: g2 });
        g1 > g2 ? st.sets_won.player1++ : st.sets_won.player2++;
        st.current_set = { player1_games: 0, player2_games: 0 }; st.is_tiebreak = false;
      } else if (g1 === 6 && g2 === 6) st.is_tiebreak = true;
    }
    setScore(st); await supabase.from('matches').update({ match_state: st }).eq('id', activeMatchId)
  }

  // ==========================================
  // LOGIKA CHYTRÉ AKTUALIZACE Z WEBU
  // ==========================================
  const zkopirovatSkript = () => {
    navigator.clipboard.writeText(`(function() { const tabulky = document.querySelectorAll('table'); let vsechnaData = []; if (tabulky.length > 0) { tabulky.forEach((tabulka) => { const radky = tabulka.querySelectorAll('tr'); radky.forEach((radek) => { const bunky = radek.querySelectorAll('td, th'); const textyBunek = Array.from(bunky).map(bunka => bunka.innerText.trim()); if (textyBunek.length > 0 && textyBunek.some(text => text !== "")) { vsechnaData.push(textyBunek); } }); }); } const vysledekJSON = JSON.stringify(vsechnaData, null, 2); const textarea = document.createElement('textarea'); textarea.value = vysledekJSON; document.body.appendChild(textarea); textarea.select(); document.execCommand('copy'); document.body.removeChild(textarea); alert('Data zkopírována! Běžte zpět do aplikace a dejte Ctrl+V.'); })();`);
    alert('Skript zkopírován! Běžte na web, zmáčkněte F12, vložte do Konzole (Ctrl+V) a dejte Enter.');
  }

  const spustitAktualizaci = async () => {
    try {
      const rawData = JSON.parse(importText);
      let groupA = [], groupB = [], currentGroup = 0;
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (row[0] && row[0].includes('Skupina A')) { currentGroup = 1; continue; }
        if (row[0] && row[0].includes('Skupina B')) { currentGroup = 2; continue; }
        if (row.length < 5 || !parseInt(row[0])) continue;
        if (currentGroup === 1) groupA.push(row);
        if (currentGroup === 2) groupB.push(row);
      }
      const zpracujSkupinu = (skupina) => {
        const matchInserts = [];
        for (let i = 0; i < skupina.length; i++) {
          const p1Name = skupina[i][1];
          for (let j = i + 1; j < skupina.length; j++) {
            const scoreStr = skupina[i][j + 2];
            if (scoreStr && scoreStr.trim() !== "") {
              const p2Name = skupina[j][1];
              const sets = scoreStr.split(',').map(s => s.trim());
              const completed_sets = []; let p1Won = 0; let p2Won = 0;
              sets.forEach(set => {
                let g1 = 0, g2 = 0; const m = set.match(/^(\d+)-(\d+)/);
                if (m) {
                  g1 = parseInt(m[1]); g2 = parseInt(m[2]);
                  if (g1 > 9 && ![10, 11, 12, 13, 14, 15].includes(g1)) g1 = parseInt(m[1].charAt(0));
                  if (g2 > 9 && ![10, 11, 12, 13, 14, 15].includes(g2)) g2 = parseInt(m[2].charAt(0));
                  completed_sets.push({ player1_games: g1, player2_games: g2 });
                  if (g1 > g2) p1Won++; else if (g2 > g1) p2Won++;
                }
              });
              matchInserts.push({
                player1_name: p1Name, player2_name: p2Name, status: 'finished', round: null,
                match_state: { player1_name: p1Name, player2_name: p2Name, server: 1, sets_won: { player1: p1Won, player2: p2Won }, completed_sets: completed_sets, current_set: { player1_games: 0, player2_games: 0 }, current_game: { player1_points: "0", player2_points: "0" }, is_tiebreak: false }
              });
            }
          }
        }
        return matchInserts;
      };
      const noveZapasy = [...zpracujSkupinu(groupA), ...zpracujSkupinu(groupB)];
      const { data: existujici } = await supabase.from('matches').select('*');
      let updatovano = 0; let pridano = 0;
      for (const novy of noveZapasy) {
        const matchExistuje = existujici.find(e => (e.player1_name === novy.player1_name && e.player2_name === novy.player2_name) || (e.player1_name === novy.player2_name && e.player2_name === novy.player1_name));
        if (matchExistuje) {
          await supabase.from('matches').update({ player1_name: novy.player1_name, player2_name: novy.player2_name, status: 'finished', match_state: novy.match_state }).eq('id', matchExistuje.id);
          updatovano++;
        } else { await supabase.from('matches').insert([novy]); pridano++; }
      }
      alert(`Úspěšná synchronizace!\nNově přidáno: ${pridano}\nAktualizováno: ${updatovano}`);
      setImportText(''); setView('menu');
    } catch (err) { alert("Něco se pokazilo. Zkopírovali jste data správně? Detaily: " + err.message); }
  }

  // ==========================================
  // GENERÁTOR A MAZÁNÍ PAVOUKA
  // ==========================================
  const generovatPavouka = async () => {
    const odehraneZapasy = zapasList.filter(z => z.status === 'finished')
    const zapasyA = odehraneZapasy.filter(z => HRACI_SKUPINA_A.includes(z.player1_name) && HRACI_SKUPINA_A.includes(z.player2_name))
    const zapasyB = odehraneZapasy.filter(z => HRACI_SKUPINA_B.includes(z.player1_name) && HRACI_SKUPINA_B.includes(z.player2_name))

    const { serazeni: tabA } = vypocitejTabulku(zapasyA, HRACI_SKUPINA_A)
    const { serazeni: tabB } = vypocitejTabulku(zapasyB, HRACI_SKUPINA_B)

    if (tabA.length < 4 || tabB.length < 4) {
      alert("Ve skupinách ještě nemáme dostatek dohraných zápasů. Z každé skupiny potřebujeme minimálně 4 umístěné hráče.");
      return;
    }

    const vychoziStav = (p1, p2) => ({
      player1_name: p1, player2_name: p2, server: 1,
      sets_won: { player1: 0, player2: 0 }, completed_sets: [],
      current_set: { player1_games: 0, player2_games: 0 }, current_game: { player1_points: "0", player2_points: "0" },
      is_tiebreak: false
    })

    const qfMatches = [
      { player1_name: tabA[0].jmeno, player2_name: tabB[3].jmeno, status: 'planned', round: 4, match_state: vychoziStav(tabA[0].jmeno, tabB[3].jmeno) },
      { player1_name: tabB[1].jmeno, player2_name: tabA[2].jmeno, status: 'planned', round: 4, match_state: vychoziStav(tabB[1].jmeno, tabA[2].jmeno) },
      { player1_name: tabA[1].jmeno, player2_name: tabB[2].jmeno, status: 'planned', round: 4, match_state: vychoziStav(tabA[1].jmeno, tabB[2].jmeno) },
      { player1_name: tabB[0].jmeno, player2_name: tabA[3].jmeno, status: 'planned', round: 4, match_state: vychoziStav(tabB[0].jmeno, tabA[3].jmeno) }
    ];

    const sfMatches = [
      { player1_name: "Vítěz QF1", player2_name: "Vítěz QF2", status: 'planned', round: 2, match_state: vychoziStav("Vítěz QF1", "Vítěz QF2") },
      { player1_name: "Vítěz QF3", player2_name: "Vítěz QF4", status: 'planned', round: 2, match_state: vychoziStav("Vítěz QF3", "Vítěz QF4") }
    ];

    const fMatch = [
      { player1_name: "Vítěz SF1", player2_name: "Vítěz SF2", status: 'planned', round: 1, match_state: vychoziStav("Vítěz SF1", "Vítěz SF2") }
    ];

    const existujiciPlayoff = zapasList.filter(z => [1,2,4].includes(z.round));
    if (existujiciPlayoff.length > 0) {
      if (!window.confirm("Zápasy Playoff už existují. Opravdu chcete starého pavouka smazat a vygenerovat ho úplně znovu?")) return;
      for (let z of existujiciPlayoff) await supabase.from('matches').delete().eq('id', z.id);
    }

    const vsechnyPlayoffZapasy = [...qfMatches, ...sfMatches, ...fMatch];
    for (const m of vsechnyPlayoffZapasy) await supabase.from('matches').insert([m]);
    
    alert("Pavouk byl úspěšně vygenerován! Můžete v něm zápasy rovnou otevírat.");
  }

  const smazatPlayoff = async () => {
    const playoffZapasy = zapasList.filter(z => [1, 2, 4].includes(z.round));
    if (playoffZapasy.length === 0) {
      alert("Není vygenerován žádný pavouk k odstranění.");
      return;
    }
    if (window.confirm("Opravdu chcete TRVALE smazat všechny zápasy Playoff (Čtvrtfinále, Semifinále, Finále)?")) {
      for (let z of playoffZapasy) {
        await supabase.from('matches').delete().eq('id', z.id);
      }
      alert("Playoff bylo smazáno.");
    }
  }

  // ==========================================
  // KOMPONENTY PRO VYKRESLENÍ
  // ==========================================
  const RenderSety = () => (
    <div style={{ display: 'flex', gap: '15px', fontSize: '30px', fontWeight: 'bold' }}>
      {score?.completed_sets?.map((set, i) => (
        <div key={i} style={{ background: 'rgba(0,0,0,0.1)', padding: '10px 20px', borderRadius: '8px' }}>{set.player1_games}:{set.player2_games}</div>
      ))}
    </div>
  )

  const ZapasCard = ({ zapas }) => (
    <div style={{ background: isDivak ? '#333' : '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', border: isDivak ? '1px solid #444' : '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: zapas.status === 'live' ? '#dc3545' : (isDivak ? '#444' : '#e9ecef'), color: zapas.status === 'live' ? 'white' : (isDivak ? '#aaa' : '#555'), padding: '10px 15px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{zapas.status === 'live' ? '🔴 LIVE' : 'Konečný výsledek'}</span>
        {!isDivak && <button onClick={(e) => { e.stopPropagation(); smazatZapas(zapas.id); }} style={{ background: 'transparent', border: 'none', color: zapas.status === 'live' ? '#fff' : '#dc3545', cursor: 'pointer', fontSize: '18px' }}>🗑️</button>}
      </div>
      <div onClick={() => otevritZapas(zapas.id)} style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{zapas.player1_name || 'Hráč 1'}</span><span style={{ color: '#007bff', background: isDivak ? '#222' : '#f0f0f0', padding: '5px 12px', borderRadius: '5px' }}>{zapas.match_state?.sets_won?.player1 || 0}</span>
        </div>
        <div style={{ width: '100%', height: '1px', background: isDivak ? '#555' : '#eee' }}></div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{zapas.player2_name || 'Hráč 2'}</span><span style={{ color: '#007bff', background: isDivak ? '#222' : '#f0f0f0', padding: '5px 12px', borderRadius: '5px' }}>{zapas.match_state?.sets_won?.player2 || 0}</span>
        </div>
      </div>
    </div>
  )

  const BracketMatchCard = ({ zapas }) => {
    let stBg = isDivak ? '#333' : '#fff';
    let stCol = isDivak ? '#fff' : '#000';
    if (zapas.status === 'live') { stBg = '#dc3545'; stCol = '#fff'; }
    else if (zapas.status === 'finished') { stBg = isDivak ? '#222' : '#e9ecef'; stCol = '#888'; }

    return (
      <div onClick={() => otevritZapas(zapas.id)} style={{ background: stBg, border: '1px solid #aaa', padding: '10px', borderRadius: '8px', marginBottom: '15px', cursor: 'pointer', width: '200px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #555', paddingBottom: '5px', marginBottom: '5px', color: stCol }}>
          {zapas.player1_name || 'Hráč 1'}
          {zapas.status === 'finished' && <span style={{float: 'right'}}>{zapas.match_state?.sets_won?.player1}</span>}
        </div>
        <div style={{ fontWeight: 'bold', color: stCol }}>
          {zapas.player2_name || 'Hráč 2'}
          {zapas.status === 'finished' && <span style={{float: 'right'}}>{zapas.match_state?.sets_won?.player2}</span>}
        </div>
        {zapas.status === 'live' && <div style={{ color: '#fff', fontSize: '12px', marginTop: '5px', fontWeight: 'bold', textAlign: 'center' }}>🔴 LIVE</div>}
      </div>
    )
  }

  // --- KŘÍŽOVÁ TABULKA COMPONENT ---
  const KrizovaTabulkaComponent = ({ matches, hraciList, nazev }) => {
    const { staty } = vypocitejTabulku(matches, hraciList);
    
    const getScoreText = (radkovyHrac, sloupcovyHrac) => {
      const match = matches.find(m => m.status === 'finished' && ((m.player1_name === radkovyHrac && m.player2_name === sloupcovyHrac) || (m.player1_name === sloupcovyHrac && m.player2_name === radkovyHrac)));
      if (!match || !match.match_state || !match.match_state.completed_sets) return "";
      return match.match_state.completed_sets.map(set => {
        if (match.player1_name === radkovyHrac) return `${set.player1_games}-${set.player2_games}`;
        else return `${set.player2_games}-${set.player1_games}`;
      }).join(', ');
    }

    return (
      <div style={{ overflowX: 'auto', background: isDivak ? '#333' : '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'center', fontSize: '15px' }}>
          <thead>
            <tr style={{ background: isDivak ? '#444' : '#e9ecef', color: isDivak ? '#fff' : '#000' }}>
              <th style={{ padding: '12px', border: '1px solid #ccc', textAlign: 'left', minWidth: '180px' }}>Dvouhra muži<br/>{nazev}</th>
              {hraciList.map((_, i) => <th key={i} style={{ padding: '12px', border: '1px solid #ccc', width: '60px' }}>{i + 1}</th>)}
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>Body</th>
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>Skóre</th>
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>Pořadí</th>
            </tr>
            <tr style={{ background: isDivak ? '#555' : '#f8f9fa', color: isDivak ? '#ccc' : '#555', fontSize: '13px' }}>
              <th style={{ border: '1px solid #ccc' }}></th>
              {hraciList.map((h, i) => <th key={i} style={{ padding: '5px', border: '1px solid #ccc', whiteSpace: 'nowrap' }}>{zkraceneJmeno(h)}</th>)}
              <th style={{ border: '1px solid #ccc' }}></th><th style={{ border: '1px solid #ccc' }}></th><th style={{ border: '1px solid #ccc' }}></th>
            </tr>
          </thead>
          <tbody>
            {hraciList.map((hrac, rIdx) => {
              const s = staty[hrac];
              return (
                <tr key={hrac} style={{ background: isDivak ? '#2c2c2c' : '#fff' }}>
                  <td style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', border: '1px solid #ccc', whiteSpace: 'nowrap' }}><span style={{ marginRight: '15px', color: '#888' }}>{rIdx + 1}</span> {hrac}</td>
                  {hraciList.map((colHrac, cIdx) => {
                    if (rIdx === cIdx) return <td key={cIdx} style={{ background: isDivak ? '#555' : '#ddd', border: '1px solid #ccc' }}></td>
                    return <td key={cIdx} style={{ padding: '12px', border: '1px solid #ccc', whiteSpace: 'nowrap', color: isDivak ? '#ddd' : '#444' }}>{getScoreText(hrac, colHrac)}</td>
                  })}
                  <td style={{ padding: '12px', fontWeight: 'bold', border: '1px solid #ccc', color: '#007bff' }}>{s.body}</td>
                  <td style={{ padding: '12px', border: '1px solid #ccc' }}>{s.gamesW}:{s.gamesL}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold', border: '1px solid #ccc', background: s.poradi === 1 ? '#ffd700' : s.poradi === 2 ? '#e3e4e5' : s.poradi === 3 ? '#cd7f32' : 'transparent', color: (s.poradi <= 3 && !isDivak) ? '#000' : 'inherit' }}>{s.poradi}.</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // --- KLASICKÁ TABULKA COMPONENT ---
  const SkupinaTable = ({ matches, hraciList, nazev }) => {
    const { serazeni: vysledky } = vypocitejTabulku(matches, hraciList);
    if (vysledky.length === 0) return null;

    return (
      <div style={{ overflowX: 'auto', background: isDivak ? '#333' : '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', color: isDivak ? '#ffeb3b' : '#000' }}>📊 {nazev}</h2>
        <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'center', fontSize: '18px' }}>
          <thead>
            <tr style={{ background: isDivak ? '#444' : '#e9ecef', color: isDivak ? '#fff' : '#000' }}>
              <th style={{ padding: '12px' }}>#</th><th style={{ padding: '12px', textAlign: 'left' }}>Hráč</th><th style={{ padding: '12px' }}>Z</th><th style={{ padding: '12px' }}>V</th><th style={{ padding: '12px' }}>P</th><th style={{ padding: '12px' }}>Sety</th><th style={{ padding: '12px' }}>Gemy</th><th style={{ padding: '12px', fontSize: '22px' }}>Body</th>
            </tr>
          </thead>
          <tbody>
            {vysledky.map((s, idx) => (
              <tr key={s.jmeno} style={{ borderBottom: '1px solid #ddd', background: idx === 0 ? (isDivak ? '#3a503a' : '#e2f0d9') : 'transparent' }}>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{idx + 1}.</td><td style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>{s.jmeno}</td><td style={{ padding: '12px' }}>{s.z}</td><td style={{ padding: '12px', color: '#28a745', fontWeight: 'bold' }}>{s.v}</td><td style={{ padding: '12px', color: '#dc3545' }}>{s.p}</td><td style={{ padding: '12px' }}>{s.setsW}:{s.setsL}</td><td style={{ padding: '12px' }}>{s.gamesW}:{s.gamesL}</td><td style={{ padding: '12px', fontWeight: 'bold', fontSize: '22px', color: '#007bff' }}>{s.body}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // --- OBRAZOVKA: IMPORT Z WEBU ---
  if (view === 'import') {
    return (
      <div style={{ textAlign: 'center', fontFamily: 'sans-serif', padding: '50px', background: '#f4f7f6', color: '#333', minHeight: '100vh' }}>
        <button onClick={() => setView('menu')} style={{ padding: '15px 25px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontSize: '18px' }}>← Zpět do Menu</button>
        <h1>📥 Aktualizace výsledků z orellichnov.cz</h1>
        <div style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <button onClick={zkopirovatSkript} style={{ padding: '15px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', marginBottom: '30px', width: '100%' }}>📋 1. Zkopírovat skript pro F12</button>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} style={{ width: '100%', height: '150px', padding: '15px', fontSize: '16px', fontFamily: 'monospace', border: '2px solid #ccc', borderRadius: '8px', marginBottom: '20px' }} placeholder="[ ... sem vložte zkopírovaná data ... ]" />
          <button onClick={spustitAktualizaci} style={{ padding: '20px 30px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontSize: '22px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>🔄 2. Zapsat výsledky</button>
        </div>
      </div>
    )
  }

  // --- OBRAZOVKA: SPRÁVA HRÁČŮ ---
  if (view === 'players') {
    return (
      <div style={{ textAlign: 'center', fontFamily: 'sans-serif', padding: '50px', background: isDivak ? '#111' : '#f4f7f6', color: isDivak ? 'white' : '#333', minHeight: '100vh' }}>
        <button onClick={() => setView('menu')} style={{ padding: '15px 25px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontSize: '18px' }}>← Zpět do Menu</button>
        <h1>👥 Seznam hráčů</h1>
        {!isDivak && (
          <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
            <input type="text" placeholder="Jméno hráče" value={novyHracJmeno} onChange={e => setNovyHracJmeno(e.target.value)} style={{ padding: '15px', fontSize: '20px', width: '350px', borderRadius: '8px', border: '2px solid #ccc' }} />
            <button onClick={pridatHrace} style={{ padding: '15px 30px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}>Zapsat hráče</button>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          {hraciList.length === 0 && <p>Zatím nejsou zapsáni žádní hráči.</p>}
          {hraciList.map(hrac => (
            <div key={hrac.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '400px', background: isDivak ? '#333' : '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #ccc', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold' }}>{hrac.name}</span>
              {!isDivak && <button onClick={() => smazatHrace(hrac.id)} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '10px 20px', fontSize: '16px', fontWeight: 'bold' }}>Smazat</button>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // --- OBRAZOVKA 1: PAVOUK ---
  if (view === 'bracket') {
    const ctvrtfinale = zapasList.filter(z => z.round === 4).sort((a,b) => a.id - b.id)
    const semifinale = zapasList.filter(z => z.round === 2).sort((a,b) => a.id - b.id)
    const finale = zapasList.filter(z => z.round === 1)

    return (
      <div style={{ fontFamily: 'sans-serif', padding: '40px', background: isDivak ? '#111' : '#f4f7f6', color: isDivak ? 'white' : '#333', minHeight: '100vh' }}>
        <button onClick={() => setView('menu')} style={{ padding: '15px 25px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontSize: '18px' }}>← Zpět na seznam</button>
        <h1 style={{ textAlign: 'center', fontSize: '40px' }}>🏆 Turnajový pavouk</h1>

        {!isDivak && (
          <div style={{ textAlign: 'center', marginBottom: '40px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <button onClick={generovatPavouka} style={{ padding: '20px 40px', fontSize: '22px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
              ⚡ Vygenerovat Playoff
            </button>
            {zapasList.some(z => [1, 2, 4].includes(z.round)) && (
              <button onClick={smazatPlayoff} style={{ padding: '20px 40px', fontSize: '22px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                🗑️ Smazat Playoff
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', overflowX: 'auto', paddingBottom: '30px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: '600px' }}>
            <h3 style={{ textAlign: 'center', color: '#888', fontSize: '24px' }}>Čtvrtfinále</h3>
            {ctvrtfinale.map(z => <BracketMatchCard key={z.id} zapas={z} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: '600px' }}>
            <h3 style={{ textAlign: 'center', color: '#888', fontSize: '24px' }}>Semifinále</h3>
            {semifinale.map(z => <BracketMatchCard key={z.id} zapas={z} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: '600px' }}>
            <h3 style={{ textAlign: 'center', color: '#ffc107', fontSize: '28px' }}>Finále</h3>
            {finale.map(z => <BracketMatchCard key={z.id} zapas={z} />)}
          </div>
        </div>
      </div>
    )
  }

  // --- OBRAZOVKA 2: HLAVNÍ MENU ---
  if (view === 'menu') {
    const liveZapasy = zapasList.filter(z => z.status === 'live')
    const odehraneZapasy = zapasList.filter(z => z.status === 'finished')

    const zapasyA = odehraneZapasy.filter(z => HRACI_SKUPINA_A.includes(z.player1_name) && HRACI_SKUPINA_A.includes(z.player2_name))
    const zapasyB = odehraneZapasy.filter(z => HRACI_SKUPINA_B.includes(z.player1_name) && HRACI_SKUPINA_B.includes(z.player2_name))
    const zapasyOstatni = odehraneZapasy.filter(z => !zapasyA.includes(z) && !zapasyB.includes(z) && z.round === null)

    return (
      <div style={{ fontFamily: 'sans-serif', background: isDivak ? '#111' : '#f4f7f6', color: isDivak ? 'white' : '#333', minHeight: '100vh', paddingBottom: '80px' }}>
        <div style={{ background: isDivak ? '#222' : '#fff', padding: '25px 40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <h1 style={{ margin: 0, fontSize: '36px' }}>🎾 Orel Tenis Cup Lichnov</h1>
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
            {!isDivak && <button onClick={() => setView('import')} style={{ padding: '15px 25px', fontSize: '20px', cursor: 'pointer', background: '#ffc107', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>📥 Aktualizovat z webu</button>}
            <button onClick={() => setView('bracket')} style={{ padding: '15px 25px', fontSize: '20px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>🏆 Pavouk</button>
            <button onClick={() => setView('players')} style={{ padding: '15px 25px', fontSize: '20px', cursor: 'pointer', background: '#6c757d', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>👥 Hráči</button>
          </div>
        </div>

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '50px 20px' }}>
          {!isDivak && (
            <div style={{ marginBottom: '50px', textAlign: 'center' }}>
              <button onClick={vytvoritNovyZapas} style={{ padding: '20px 50px', fontSize: '26px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '50px', boxShadow: '0 6px 20px rgba(40,167,69,0.4)', fontWeight: 'bold' }}>➕ Vytvořit nový zápas</button>
            </div>
          )}

          <div style={{ marginBottom: '60px' }}>
            <h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '15px', color: '#dc3545', fontSize: '32px' }}>🔴 Právě se hraje (LIVE)</h2>
            {liveZapasy.length === 0 ? <p style={{ color: '#888', fontSize: '22px' }}>Aktuálně se nehraje žádný zápas.</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '30px', marginTop: '30px' }}>
                {liveZapasy.map(z => <ZapasCard key={z.id} zapas={z} />)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
            <button onClick={() => setTypTabulky('klasicka')} style={{ padding: '15px 30px', fontSize: '20px', background: typTabulky === 'klasicka' ? '#007bff' : (isDivak ? '#444' : '#ddd'), color: typTabulky === 'klasicka' ? 'white' : (isDivak ? '#ccc' : '#333'), border: 'none', borderRadius: '10px 0 0 10px', cursor: 'pointer', fontWeight: 'bold' }}>Klasická tabulka</button>
            <button onClick={() => setTypTabulky('krizova')} style={{ padding: '15px 30px', fontSize: '20px', background: typTabulky === 'krizova' ? '#007bff' : (isDivak ? '#444' : '#ddd'), color: typTabulky === 'krizova' ? 'white' : (isDivak ? '#ccc' : '#333'), border: 'none', borderRadius: '0 10px 10px 0', cursor: 'pointer', fontWeight: 'bold' }}>Křížová tabulka</button>
          </div>

          {typTabulky === 'klasicka' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', marginBottom: '60px' }}>
              <div style={{ flex: '1 1 600px' }}><SkupinaTable matches={zapasyA} hraciList={HRACI_SKUPINA_A} nazev="Skupina A" /></div>
              <div style={{ flex: '1 1 600px' }}><SkupinaTable matches={zapasyB} hraciList={HRACI_SKUPINA_B} nazev="Skupina B" /></div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '50px', marginBottom: '60px' }}>
              <KrizovaTabulkaComponent matches={zapasyA} hraciList={HRACI_SKUPINA_A} nazev="Skupina A" />
              <KrizovaTabulkaComponent matches={zapasyB} hraciList={HRACI_SKUPINA_B} nazev="Skupina B" />
            </div>
          )}

          <div style={{ marginBottom: '50px' }}>
            <h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '15px', fontSize: '30px' }}>✅ Zápasy - Skupina A</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '30px', marginTop: '30px' }}>
              {zapasyA.map(z => <ZapasCard key={z.id} zapas={z} />)}
            </div>
          </div>

          <div style={{ marginBottom: '50px' }}>
            <h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '15px', fontSize: '30px' }}>✅ Zápasy - Skupina B</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '30px', marginTop: '30px' }}>
              {zapasyB.map(z => <ZapasCard key={z.id} zapas={z} />)}
            </div>
          </div>

          {zapasyOstatni.length > 0 && (
            <div>
              <h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '15px', fontSize: '30px' }}>🏆 Zápasy - Ostatní (Playoff)</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '30px', marginTop: '30px' }}>
                {zapasyOstatni.map(z => <ZapasCard key={z.id} zapas={z} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- OBRAZOVKA 3: DETAIL ZÁPASU (Počítadlo pro tablet) ---
  if (view === 'match' && score) {
    const aktualniZapas = zapasList.find(z => z.id === activeMatchId);
    const zamknoutJmena = (aktualniZapas?.round !== null && aktualniZapas?.status !== 'planned') || (aktualniZapas?.status === 'finished');
    
    const minulyStav = history.length > 0 ? history[history.length - 1] : null;
    const navodProRozhodciho = generujHlaseni(score, minulyStav);

    if (isDivak) {
      return (
        <div style={{ textAlign: 'center', fontFamily: 'sans-serif', background: '#111', color: 'white', minHeight: '100vh', paddingTop: '40px' }}>
          <button onClick={zpetDoMenu} style={{ position: 'absolute', top: '30px', left: '30px', padding: '15px 25px', fontSize: '20px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>← Zpět na turnaj</button>
          <h1 style={{ color: '#ffeb3b', margin: 0, fontSize: '50px' }}>{aktualniZapas?.status === 'live' ? '🔴 ŽIVĚ' : 'ZÁPAS'}</h1>
          {score.is_tiebreak && <h2 style={{ color: '#ff4444', fontSize: '40px' }}>TIE-BREAK</h2>}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', color: '#aaa' }}><RenderSety /></div>
          
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

        {/* NÁPOVĚDA PRO ROZHODČÍHO (MIKROFON) */}
        <div style={{ background: '#222', color: '#00ff88', padding: '20px', borderRadius: '15px', fontSize: '32px', fontWeight: 'bold', marginBottom: '30px', boxShadow: '0 6px 15px rgba(0,0,0,0.2)', display: 'inline-block', minWidth: '60%' }}>
          🎤 Hlášení: <span style={{ color: '#fff' }}>"{navodProRozhodciho}"</span>
        </div>

        {score.is_tiebreak && <h2 style={{ color: '#dc3545', fontSize: '40px', margin: '0 0 20px 0' }}>🔥 PROBÍHÁ TIE-BREAK 🔥</h2>}
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}><RenderSety /></div>
        
        {/* VELKÉ KARTY HRÁČŮ PRO TABLET */}
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

  return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '30px' }}>Načítám turnaj...</div>
}

export default App