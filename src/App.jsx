import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// --- IMPORTY NAŠICH ODDĚLENÝCH SOUBORŮ ---
import { HRACI_SKUPINA_A, HRACI_SKUPINA_B, vypocitejTabulku } from './utils/gameLogic'
import { ZapasCard, BracketMatchCard, KrizovaTabulkaComponent, SkupinaTable } from './components/SharedComponents'
import { MatchView } from './components/MatchView'

const isDivak = window.location.search.includes('divak=1')

function App() {
  // === STAVY APLIKACE ===
  const [view, setView] = useState('menu') 
  const [activeMatchId, setActiveMatchId] = useState(null)
  const [zapasList, setZapasList] = useState([])
  const [hraciList, setHraciList] = useState([])
  const [score, setScore] = useState(null)
  const [history, setHistory] = useState([])
  const [novyHracJmeno, setNovyHracJmeno] = useState('')
  const [typTabulky, setTypTabulky] = useState('krizova')
  const [importText, setImportText] = useState('')

  // === NAČÍTÁNÍ DAT (Supabase) ===
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

  // === FUNKCE PRO SPRÁVU ZÁPASŮ ===
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

  // === FUNKCE PRO IMPORT ===
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

  // === FUNKCE PRO PAVOUKA ===
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
  // ROUTING OBRAZOVEK
  // ==========================================

  // --- 1. OBRAZOVKA: IMPORT DAT ---
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

  // --- 2. OBRAZOVKA: SPRÁVA HRÁČŮ ---
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

  // --- 3. OBRAZOVKA: PAVOUK ---
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
            {ctvrtfinale.map(z => <BracketMatchCard key={z.id} zapas={z} otevritZapas={otevritZapas} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: '600px' }}>
            <h3 style={{ textAlign: 'center', color: '#888', fontSize: '24px' }}>Semifinále</h3>
            {semifinale.map(z => <BracketMatchCard key={z.id} zapas={z} otevritZapas={otevritZapas} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: '600px' }}>
            <h3 style={{ textAlign: 'center', color: '#ffc107', fontSize: '28px' }}>Finále</h3>
            {finale.map(z => <BracketMatchCard key={z.id} zapas={z} otevritZapas={otevritZapas} />)}
          </div>
        </div>
      </div>
    )
  }

  // --- 4. OBRAZOVKA: POČÍTADLO ZÁPASU (PŘESUNUTO DO EXTERNÍ KOMPONENTY) ---
  if (view === 'match' && score) {
    return (
      <MatchView
        score={score}
        activeMatchId={activeMatchId}
        zapasList={zapasList}
        hraciList={hraciList}
        history={history}
        zpetDoMenu={zpetDoMenu}
        krokZpet={krokZpet}
        rucniPrepnutiPodani={rucniPrepnutiPodani}
        spustitLive={spustitLive}
        ukoncitZapas={ukoncitZapas}
        pridatBod={pridatBod}
        zmenitJmenoHrace={zmenitJmenoHrace}
      />
    )
  }

  // --- 5. OBRAZOVKA: HLAVNÍ MENU ---
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
                {liveZapasy.map(z => <ZapasCard key={z.id} zapas={z} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
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
              {zapasyA.map(z => <ZapasCard key={z.id} zapas={z} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
            </div>
          </div>

          <div style={{ marginBottom: '50px' }}>
            <h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '15px', fontSize: '30px' }}>✅ Zápasy - Skupina B</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '30px', marginTop: '30px' }}>
              {zapasyB.map(z => <ZapasCard key={z.id} zapas={z} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
            </div>
          </div>

          {zapasyOstatni.length > 0 && (
            <div>
              <h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '15px', fontSize: '30px' }}>🏆 Zápasy - Ostatní (Playoff)</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '30px', marginTop: '30px' }}>
                {zapasyOstatni.map(z => <ZapasCard key={z.id} zapas={z} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '30px' }}>Načítám turnaj...</div>
}

export default App