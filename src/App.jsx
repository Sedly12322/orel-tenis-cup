import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { ZapasCard, BracketMatchCard } from './components/SharedComponents'
import { KrizovaTabulkaComponent, SkupinaTable } from './components/TableComponents'
import { MatchView } from './components/MatchView'
import ImportData from './ImportData'
import { vypocitejTabulku } from './utils/gameLogic'

const HRACI_SKUPINA_A = ["František Paľo", "Libor Stanislav", "Jan Matúš", "Vladimír Vašut", "Radek Petr", "Pavel Hazuka, ml.", "Dominik Sedlář", "Sidney Rek", "Vladislav Rek"]
const HRACI_SKUPINA_B = ["Petr Osterezy", "Zdeněk Liška", "Jaromír Darivčák", "Přemysl Kahánek", "Tomáš Sedlář", "Jan Hrančík", "Lukáš Rafael Osterezy", "Jaroslav Jurek"]

function App() {
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
  const isDivak = !isAdmin;
  const [showLogin, setShowLogin] = useState(false);
  const [heslo, setHeslo] = useState('');

  const [view, setView] = useState('menu');
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [zapasList, setZapasList] = useState([]);
  const [hraciList, setHraciList] = useState([]);
  const [novyHracJmeno, setNovyHracJmeno] = useState('');
  const [typTabulky, setTypTabulky] = useState('krizova');
  
  const [score, setScore] = useState(null);
  const [history, setHistory] = useState([]);
  const [tvMode, setTvMode] = useState(false);

  // --- STAVY PRO VYSKAKOVACÍ OKNO NOVÉHO ZÁPASU ---
  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const [newMatchGroup, setNewMatchGroup] = useState('A');
  const [newMatchP1, setNewMatchP1] = useState('');
  const [newMatchP2, setNewMatchP2] = useState('');

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

  const handleLogin = () => {
    if (heslo === 'orel2026') { 
      localStorage.setItem('isAdmin', 'true');
      setIsAdmin(true); setShowLogin(false); setHeslo('');
    } else { alert('Nesprávné heslo!'); }
  };

  const handleLogout = () => { localStorage.removeItem('isAdmin'); setIsAdmin(false); };

  const pridatHrace = async () => {
    if (!novyHracJmeno.trim()) return
    await supabase.from('players').insert([{ name: novyHracJmeno }])
    setNovyHracJmeno('')
  }
  const smazatHrace = async (id) => { if (window.confirm("Smazat hráče?")) await supabase.from('players').delete().eq('id', id) }
  const smazatZapas = async (id) => { if (window.confirm("Opravdu smazat zápas?")) await supabase.from('matches').delete().eq('id', id) }

  // --- NOVÁ LOGIKA PRO VYTVOŘENÍ ZÁPASU (Otevře modál místo okamžitého vytvoření) ---
  const otevritNovyZapasModal = () => {
    setNewMatchGroup('A');
    setNewMatchP1('');
    setNewMatchP2('');
    setShowNewMatchModal(true);
  }

  const spustitNovyZapas = async () => {
    if (!newMatchP1 || !newMatchP2) {
      alert("Vyberte prosím oba hráče!");
      return;
    }
    const vychoziStav = {
      player1_name: newMatchP1, player2_name: newMatchP2, server: 1,
      sets_won: { player1: 0, player2: 0 }, completed_sets: [],
      current_set: { player1_games: 0, player2_games: 0 }, current_game: { player1_points: "0", player2_points: "0" },
      is_tiebreak: false
    }
    const { data } = await supabase.from('matches').insert([{ player1_name: newMatchP1, player2_name: newMatchP2, status: "planned", round: null, match_state: vychoziStav }]).select()
    if (data && data[0]) { 
      setActiveMatchId(data[0].id); 
      setShowNewMatchModal(false);
      setView('match'); 
    }
  }

  const otevritZapas = (id) => { setActiveMatchId(id); setHistory([]); setView('match') }
  const zpetDoMenu = () => { setActiveMatchId(null); setScore(null); setView('menu') }

  const spustitLive = async () => {
    await supabase.from('matches').update({ status: 'live' }).eq('id', activeMatchId);
    setZapasList(prev => prev.map(z => z.id === activeMatchId ? { ...z, status: 'live' } : z));
  }

  const znovuOtevritZapas = async () => {
    if (window.confirm("Opravdu chcete zápas odemknout pro úpravy? Zápas dočasně zmizí z tabulky, dokud ho znovu neuložíte.")) {
      await supabase.from('matches').update({ status: 'live' }).eq('id', activeMatchId);
      setZapasList(prev => prev.map(z => z.id === activeMatchId ? { ...z, status: 'live' } : z));
    }
  }

  const posunoutVitezeVPlayoff = async () => {
    const { data: vsechnyZapasy } = await supabase.from('matches').select('*');
    if (!vsechnyZapasy) return;

    const qf = vsechnyZapasy.filter(z => z.round === 4).sort((a,b) => a.id - b.id);
    const sf = vsechnyZapasy.filter(z => z.round === 2).sort((a,b) => a.id - b.id);
    const f = vsechnyZapasy.filter(z => z.round === 1);

    const getVitez = (m) => {
      if (!m || m.status !== 'finished' || !m.match_state) return null;
      const s1 = m.match_state.sets_won?.player1 || 0;
      const s2 = m.match_state.sets_won?.player2 || 0;
      if (s1 > s2) return m.player1_name;
      if (s2 > s1) return m.player2_name;
      return null;
    };

    const v1 = getVitez(qf[0]); const v2 = getVitez(qf[1]); const v3 = getVitez(qf[2]); const v4 = getVitez(qf[3]);

    if (sf[0]) {
      let p1 = sf[0].player1_name; let p2 = sf[0].player2_name;
      if (sf[0].player1_name.includes('Vítěz') && v1) p1 = v1;
      if (sf[0].player2_name.includes('Vítěz') && v2) p2 = v2;
      if (sf[0].player1_name !== p1 || sf[0].player2_name !== p2) {
        const newState = { ...sf[0].match_state, player1_name: p1, player2_name: p2 };
        await supabase.from('matches').update({ player1_name: p1, player2_name: p2, match_state: newState }).eq('id', sf[0].id);
      }
    }

    if (sf[1]) {
      let p1 = sf[1].player1_name; let p2 = sf[1].player2_name;
      if (sf[1].player1_name.includes('Vítěz') && v3) p1 = v3;
      if (sf[1].player2_name.includes('Vítěz') && v4) p2 = v4;
      if (sf[1].player1_name !== p1 || sf[1].player2_name !== p2) {
        const newState = { ...sf[1].match_state, player1_name: p1, player2_name: p2 };
        await supabase.from('matches').update({ player1_name: p1, player2_name: p2, match_state: newState }).eq('id', sf[1].id);
      }
    }

    const { data: sfAktualni } = await supabase.from('matches').select('*').eq('round', 2).order('id', { ascending: true });
    const sfList = sfAktualni || sf;
    const sv1 = getVitez(sfList[0]); const sv2 = getVitez(sfList[1]);

    if (f[0]) {
      let p1 = f[0].player1_name; let p2 = f[0].player2_name;
      if (f[0].player1_name.includes('Vítěz') && sv1) p1 = sv1;
      if (f[0].player2_name.includes('Vítěz') && sv2) p2 = sv2;
      if (f[0].player1_name !== p1 || f[0].player2_name !== p2) {
        const newState = { ...f[0].match_state, player1_name: p1, player2_name: p2 };
        await supabase.from('matches').update({ player1_name: p1, player2_name: p2, match_state: newState }).eq('id', f[0].id);
      }
    }
  };

  const ukoncitZapas = async () => {
    await supabase.from('matches').update({ status: 'finished' }).eq('id', activeMatchId);
    await posunoutVitezeVPlayoff();
    zpetDoMenu();
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
    const aktualniZapas = zapasList.find(z => z.id === activeMatchId);
    const isPlayoff = aktualniZapas?.round !== null;

    setHistory(prev => [...prev, JSON.parse(JSON.stringify(score))])
    let st = JSON.parse(JSON.stringify(score))
    let p1 = st.current_game.player1_points; let p2 = st.current_game.player2_points;
    let vyhralGem = false

    if (st.is_tiebreak) {
      let targetScore = 7;
      let b1 = parseInt(p1) || 0; let b2 = parseInt(p2) || 0;
      hrac === 1 ? b1++ : b2++;
      if ((b1 + b2) % 2 !== 0) st.server = st.server === 1 ? 2 : 1;
      
      if ((b1 >= targetScore && b1 - b2 >= 2) || (b2 >= targetScore && b2 - b1 >= 2)) { 
        vyhralGem = true; hrac === 1 ? st.current_set.player1_games++ : st.current_set.player2_games++; 
      } else { 
        st.current_game.player1_points = b1.toString(); st.current_game.player2_points = b2.toString(); 
      }
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
      const isMatchTiebreak = (!isPlayoff && st.sets_won.player1 === 1 && st.sets_won.player2 === 1);
      
      if (isMatchTiebreak) {
        st.completed_sets.push({ player1_games: st.current_set.player1_games, player2_games: st.current_set.player2_games });
        hrac === 1 ? st.sets_won.player1++ : st.sets_won.player2++;
        st.current_set = { player1_games: 0, player2_games: 0 };
        st.is_tiebreak = false;
      } else {
        const g1 = st.current_set.player1_games; const g2 = st.current_set.player2_games;
        if ((g1 >= 6 && g1 - g2 >= 2) || (g1 === 7 && g2 === 5) || (g1 === 7 && g2 === 6) || (g2 >= 6 && g2 - g1 >= 2) || (g2 === 7 && g1 === 5) || (g2 === 7 && g1 === 6)) {
          st.completed_sets.push({ player1_games: g1, player2_games: g2 });
          g1 > g2 ? st.sets_won.player1++ : st.sets_won.player2++;
          st.current_set = { player1_games: 0, player2_games: 0 }; 
          
          if (!isPlayoff && st.sets_won.player1 === 1 && st.sets_won.player2 === 1) {
            st.is_tiebreak = true;
          } else {
            st.is_tiebreak = false;
          }
        } else if (g1 === 6 && g2 === 6) {
          st.is_tiebreak = true;
        }
      }
    }
    setScore(st); await supabase.from('matches').update({ match_state: st }).eq('id', activeMatchId)
  }

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
    
    alert("Pavouk byl úspěšně vygenerován!");
  }

  const smazatPlayoff = async () => {
    const playoffZapasy = zapasList.filter(z => [1, 2, 4].includes(z.round));
    if (playoffZapasy.length === 0) return;
    if (window.confirm("Opravdu chcete TRVALE smazat všechny zápasy Playoff (Čtvrtfinále, Semifinále, Finále)?")) {
      for (let z of playoffZapasy) await supabase.from('matches').delete().eq('id', z.id);
      alert("Playoff bylo smazáno.");
    }
  }

  if (view === 'import' && !isDivak) {
    return <ImportData zpetDoMenu={zpetDoMenu} />
  }

  if (view === 'players' && !isDivak) {
    return (
      <div style={{ textAlign: 'center', fontFamily: 'sans-serif', padding: '50px', background: '#f4f7f6', color: '#333', minHeight: '100vh' }}>
        <button onClick={zpetDoMenu} style={{ padding: '15px 25px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontSize: '18px' }}>← Zpět do Menu</button>
        <h1>👥 Seznam hráčů</h1>
        <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <input type="text" placeholder="Jméno hráče" value={novyHracJmeno} onChange={e => setNovyHracJmeno(e.target.value)} style={{ padding: '15px', fontSize: '20px', width: '350px', borderRadius: '8px', border: '2px solid #ccc' }} />
          <button onClick={pridatHrace} style={{ padding: '15px 30px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}>Zapsat hráče</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          {hraciList.map(hrac => (
            <div key={hrac.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '400px', background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #ccc', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold' }}>{hrac.name}</span>
              <button onClick={() => smazatHrace(hrac.id)} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '10px 20px', fontSize: '16px', fontWeight: 'bold' }}>Smazat</button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (view === 'bracket') {
    const ctvrtfinale = zapasList.filter(z => z.round === 4).sort((a,b) => a.id - b.id)
    const semifinale = zapasList.filter(z => z.round === 2).sort((a,b) => a.id - b.id)
    const finale = zapasList.filter(z => z.round === 1)

    return (
      <div style={{ fontFamily: 'sans-serif', padding: '40px', background: isDivak ? '#111' : '#f4f7f6', color: isDivak ? 'white' : '#333', minHeight: '100vh' }}>
        <button onClick={zpetDoMenu} style={{ padding: '15px 25px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontSize: '18px' }}>← Zpět na seznam</button>
        <h1 style={{ textAlign: 'center', fontSize: '40px' }}>🏆 Turnajový pavouk</h1>

        {!isDivak && (
          <div style={{ textAlign: 'center', marginBottom: '40px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <button onClick={generovatPavouka} style={{ padding: '20px 40px', fontSize: '22px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>⚡ Vygenerovat Playoff</button>
            {zapasList.some(z => [1, 2, 4].includes(z.round)) && (
              <button onClick={smazatPlayoff} style={{ padding: '20px 40px', fontSize: '22px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>🗑️ Smazat Playoff</button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', overflowX: 'auto', paddingBottom: '30px', minWidth: '900px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '20px', minHeight: '700px' }}><h3 style={{ textAlign: 'center', color: '#888', fontSize: '24px', margin: '0 0 20px 0' }}>Čtvrtfinále</h3>{ctvrtfinale.map(z => <BracketMatchCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} />)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '40px', minHeight: '700px', padding: '60px 0' }}><h3 style={{ textAlign: 'center', color: '#888', fontSize: '24px', margin: '0 0 20px 0' }}>Semifinále</h3>{semifinale.map(z => <BracketMatchCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} />)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '700px' }}><h3 style={{ textAlign: 'center', color: '#ffc107', fontSize: '28px', margin: '0 0 20px 0' }}>Finále</h3>{finale.map(z => <BracketMatchCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} />)}</div>
        </div>
      </div>
    )
  }

  if (view === 'match' && activeMatchId && score) {
    return (
      <MatchView 
        score={score} activeMatchId={activeMatchId} zapasList={zapasList} hraciList={hraciList} history={history}
        zpetDoMenu={zpetDoMenu} krokZpet={krokZpet} rucniPrepnutiPodani={rucniPrepnutiPodani} spustitLive={spustitLive}
        ukoncitZapas={ukoncitZapas} pridatBod={pridatBod} zmenitJmenoHrace={zmenitJmenoHrace} 
        znovuOtevritZapas={znovuOtevritZapas} tvMode={tvMode} setTvMode={setTvMode} isDivak={isDivak} 
      />
    )
  }

  const liveZapasy = zapasList.filter(z => z.status === 'live')
  const odehraneZapasy = zapasList.filter(z => z.status === 'finished')
  const zapasyA = odehraneZapasy.filter(z => HRACI_SKUPINA_A.includes(z.player1_name) && HRACI_SKUPINA_A.includes(z.player2_name))
  const zapasyB = odehraneZapasy.filter(z => HRACI_SKUPINA_B.includes(z.player1_name) && HRACI_SKUPINA_B.includes(z.player2_name))
  const zapasyOstatni = odehraneZapasy.filter(z => !zapasyA.includes(z) && !zapasyB.includes(z) && z.round === null)

  return (
    <div style={{ fontFamily: 'sans-serif', background: isDivak ? '#111' : '#f4f7f6', color: isDivak ? 'white' : '#333', minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ background: isDivak ? '#222' : '#fff', padding: '25px 40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: '36px', color: isDivak ? '#fff' : '#000' }}>🎾 Orel Tenis Cup Lichnov</h1>
        <div style={{ display: 'flex', gap: '20px', marginTop: '10px', alignItems: 'center' }}>
          {!isDivak && <button onClick={() => setView('import')} style={{ padding: '15px 25px', fontSize: '20px', cursor: 'pointer', background: '#ffc107', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>📥 Import dat</button>}
          <button onClick={() => setView('bracket')} style={{ padding: '15px 25px', fontSize: '20px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>🏆 Pavouk</button>
          {!isDivak && <button onClick={() => setView('players')} style={{ padding: '15px 25px', fontSize: '20px', cursor: 'pointer', background: '#6c757d', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>👥 Hráči</button>}
          {isDivak ? <button onClick={() => setShowLogin(true)} style={{ padding: '15px 25px', fontSize: '20px', cursor: 'pointer', background: '#444', color: 'white', border: '1px solid #666', borderRadius: '10px', fontWeight: 'bold' }}>🔒 Rozhodčí</button> : <button onClick={handleLogout} style={{ padding: '15px 25px', fontSize: '20px', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>Odhlásit se</button>}
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '50px 20px' }}>
        {!isDivak && <div style={{ marginBottom: '50px', textAlign: 'center' }}><button onClick={otevritNovyZapasModal} style={{ padding: '20px 50px', fontSize: '26px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '50px', boxShadow: '0 6px 20px rgba(40,167,69,0.4)', fontWeight: 'bold' }}>➕ Vytvořit nový zápas</button></div>}
        
        <div style={{ marginBottom: '60px' }}>
          <h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '15px', color: '#dc3545', fontSize: '32px' }}>🔴 Právě se hraje (LIVE)</h2>
          {liveZapasy.length === 0 ? <p style={{ color: '#888', fontSize: '22px' }}>Aktuálně se nehraje žádný zápas.</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '30px', marginTop: '30px' }}>{liveZapasy.map(z => <ZapasCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}</div>}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
          <button onClick={() => setTypTabulky('klasicka')} style={{ padding: '15px 30px', fontSize: '20px', background: typTabulky === 'klasicka' ? '#007bff' : (isDivak ? '#444' : '#ddd'), color: typTabulky === 'klasicka' ? 'white' : (isDivak ? '#ccc' : '#333'), border: 'none', borderRadius: '10px 0 0 10px', cursor: 'pointer', fontWeight: 'bold' }}>Klasická tabulka</button>
          <button onClick={() => setTypTabulky('krizova')} style={{ padding: '15px 30px', fontSize: '20px', background: typTabulky === 'krizova' ? '#007bff' : (isDivak ? '#444' : '#ddd'), color: typTabulky === 'krizova' ? 'white' : (isDivak ? '#ccc' : '#333'), border: 'none', borderRadius: '0 10px 10px 0', cursor: 'pointer', fontWeight: 'bold' }}>Křížová tabulka</button>
        </div>
        
        {typTabulky === 'klasicka' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', marginBottom: '60px' }}><div style={{ flex: '1 1 600px' }}><SkupinaTable matches={zapasyA} hraciList={HRACI_SKUPINA_A} nazev="Skupina A" isDivak={isDivak} /></div><div style={{ flex: '1 1 600px' }}><SkupinaTable matches={zapasyB} hraciList={HRACI_SKUPINA_B} nazev="Skupina B" isDivak={isDivak} /></div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '50px', marginBottom: '60px' }}><KrizovaTabulkaComponent matches={zapasyA} hraciList={HRACI_SKUPINA_A} nazev="Skupina A" isDivak={isDivak} /><KrizovaTabulkaComponent matches={zapasyB} hraciList={HRACI_SKUPINA_B} nazev="Skupina B" isDivak={isDivak} /></div>
        )}
        
        <div style={{ marginBottom: '50px' }}><h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '15px', fontSize: '30px', color: isDivak ? '#fff' : '#000' }}>✅ Zápasy - Skupina A</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '30px', marginTop: '30px' }}>{zapasyA.map(z => <ZapasCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}</div></div>
        <div style={{ marginBottom: '50px' }}><h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '15px', fontSize: '30px', color: isDivak ? '#fff' : '#000' }}>✅ Zápasy - Skupina B</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '30px', marginTop: '30px' }}>{zapasyB.map(z => <ZapasCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}</div></div>
        
        {zapasyOstatni.length > 0 && <div><h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '15px', fontSize: '30px', color: isDivak ? '#fff' : '#000' }}>🏆 Zápasy - Ostatní (Playoff)</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '30px', marginTop: '30px' }}>{zapasyOstatni.map(z => <ZapasCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}</div></div>}
      </div>

      {/* MODAL PRO VÝBĚR HRÁČŮ PŘED ZÁPASEM */}
      {showNewMatchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: '40px', borderRadius: '15px', textAlign: 'left', maxWidth: '500px', width: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h2 style={{ marginTop: 0, color: '#333', textAlign: 'center', marginBottom: '30px' }}>🎾 Nový zápas ve skupině</h2>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '18px' }}>Vyberte skupinu:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setNewMatchGroup('A'); setNewMatchP1(''); setNewMatchP2(''); }} style={{ flex: 1, padding: '12px', background: newMatchGroup === 'A' ? '#007bff' : '#e9ecef', color: newMatchGroup === 'A' ? '#fff' : '#333', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Skupina A</button>
                <button onClick={() => { setNewMatchGroup('B'); setNewMatchP1(''); setNewMatchP2(''); }} style={{ flex: 1, padding: '12px', background: newMatchGroup === 'B' ? '#007bff' : '#e9ecef', color: newMatchGroup === 'B' ? '#fff' : '#333', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Skupina B</button>
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
               <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '18px' }}>Hráč 1:</label>
               <select value={newMatchP1} onChange={e => { setNewMatchP1(e.target.value); setNewMatchP2(''); }} style={{ width: '100%', padding: '15px', fontSize: '18px', borderRadius: '8px', border: '2px solid #ccc' }}>
                  <option value="">-- Vyberte prvního hráče --</option>
                  {(newMatchGroup === 'A' ? HRACI_SKUPINA_A : HRACI_SKUPINA_B).map(h => <option key={h} value={h}>{h}</option>)}
               </select>
            </div>

            <div style={{ marginBottom: '40px' }}>
               <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '18px' }}>Hráč 2 (Soupeř):</label>
               <select value={newMatchP2} onChange={e => setNewMatchP2(e.target.value)} style={{ width: '100%', padding: '15px', fontSize: '18px', borderRadius: '8px', border: '2px solid #ccc', background: !newMatchP1 ? '#f4f4f4' : '#fff' }} disabled={!newMatchP1}>
                  <option value="">{newMatchP1 ? '-- Vyberte soupeře --' : 'Nejprve vyberte Hráče 1'}</option>
                  {/* Vyfiltrujeme hráče 1 a všechny, se kterými už Hráč 1 hrál */}
                  {newMatchP1 && (newMatchGroup === 'A' ? HRACI_SKUPINA_A : HRACI_SKUPINA_B)
                    .filter(h => h !== newMatchP1)
                    .filter(h => !zapasList.some(z => (z.player1_name === newMatchP1 && z.player2_name === h) || (z.player1_name === h && z.player2_name === newMatchP1)))
                    .map(h => <option key={h} value={h}>{h}</option>)}
               </select>
               {newMatchP1 && <p style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>* V seznamu se zobrazují pouze hráči, se kterými <strong>{newMatchP1}</strong> ještě nehrál.</p>}
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={() => setShowNewMatchModal(false)} style={{ flex: 1, padding: '15px', fontSize: '18px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Zrušit</button>
              <button onClick={spustitNovyZapas} disabled={!newMatchP1 || !newMatchP2} style={{ flex: 1, padding: '15px', fontSize: '18px', background: (!newMatchP1 || !newMatchP2) ? '#80c891' : '#28a745', color: '#fff', border: 'none', borderRadius: '8px', cursor: (!newMatchP1 || !newMatchP2) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Vytvořit zápas</button>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {showLogin && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: '40px', borderRadius: '15px', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>Ověření rozhodčího</h2>
            <input type="password" placeholder="Zadejte heslo..." value={heslo} onChange={e => setHeslo(e.target.value)} style={{ width: '100%', padding: '15px', fontSize: '18px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowLogin(false)} style={{ flex: 1, padding: '15px', fontSize: '18px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Zrušit</button>
              <button onClick={handleLogin} style={{ flex: 1, padding: '15px', fontSize: '18px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Přihlásit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App