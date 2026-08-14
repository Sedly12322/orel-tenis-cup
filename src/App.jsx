import { useState, useEffect } from 'react'
import { supabase } from './supabase'

import { HRACI_SKUPINA_A, HRACI_SKUPINA_B } from './utils/gameLogic'
import { ZapasCard, BracketMatchCard, KrizovaTabulkaComponent, SkupinaTable } from './components/SharedComponents'
import { MatchView } from './components/MatchView'

const isDivak = window.location.search.includes('divak=1')

function App() {
  const [view, setView] = useState('menu') 
  const [activeMatchId, setActiveMatchId] = useState(null)
  const [zapasList, setZapasList] = useState([])
  const [hraciList, setHraciList] = useState([])
  const [score, setScore] = useState(null)
  const [history, setHistory] = useState([])
  const [novyHracJmeno, setNovyHracJmeno] = useState('')
  const [typTabulky, setTypTabulky] = useState('krizova')
  const [importText, setImportText] = useState('')
  
  // NOVÝ STAV PRO TV REŽIM
  const [tvMode, setTvMode] = useState(false)

  // ... useEffecty a logické funkce (pridatBod atd.) zůstávají nezměněné
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

  const zkopirovatSkript = () => { /* zachováno */ }
  const spustitAktualizaci = async () => { /* zachováno */ }
  const generovatPavouka = async () => { /* zachováno */ }
  const smazatPlayoff = async () => { /* zachováno */ }


  // === MENU IMPORT/HRÁČI/PAVOUK (Stejné) ===
  if (view === 'import') {
    return (
      <div style={{ textAlign: 'center', fontFamily: 'sans-serif', padding: '50px', background: '#f4f7f6', color: '#333', minHeight: '100vh' }}>
        <button onClick={() => setView('menu')} style={{ padding: '15px 25px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontSize: '18px' }}>← Zpět do Menu</button>
        <h1>📥 Aktualizace výsledků z orellichnov.cz</h1>
      </div>
    )
  }
  if (view === 'players') {
    return (
      <div style={{ textAlign: 'center', fontFamily: 'sans-serif', padding: '50px', background: isDivak ? '#111' : '#f4f7f6', color: isDivak ? 'white' : '#333', minHeight: '100vh' }}>
        <button onClick={() => setView('menu')} style={{ padding: '15px 25px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontSize: '18px' }}>← Zpět do Menu</button>
        <h1>👥 Seznam hráčů</h1>
      </div>
    )
  }
  if (view === 'bracket') {
    const ctvrtfinale = zapasList.filter(z => z.round === 4).sort((a,b) => a.id - b.id)
    const semifinale = zapasList.filter(z => z.round === 2).sort((a,b) => a.id - b.id)
    const finale = zapasList.filter(z => z.round === 1)

    return (
      <div style={{ fontFamily: 'sans-serif', padding: '20px', background: isDivak ? '#111' : '#f4f7f6', color: isDivak ? 'white' : '#333', minHeight: '100vh' }}>
        <button onClick={() => setView('menu')} style={{ padding: '10px 15px', background: '#444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>← Zpět</button>
        <h1 style={{ textAlign: 'center', fontSize: '30px' }}>🏆 Turnajový pavouk</h1>
        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '30px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: '400px' }}><h3 style={{ textAlign: 'center', color: '#888' }}>Čtvrtfinále</h3>{ctvrtfinale.map(z => <BracketMatchCard key={z.id} zapas={z} otevritZapas={otevritZapas} />)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: '400px' }}><h3 style={{ textAlign: 'center', color: '#888' }}>Semifinále</h3>{semifinale.map(z => <BracketMatchCard key={z.id} zapas={z} otevritZapas={otevritZapas} />)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: '400px' }}><h3 style={{ textAlign: 'center', color: '#ffc107' }}>Finále</h3>{finale.map(z => <BracketMatchCard key={z.id} zapas={z} otevritZapas={otevritZapas} />)}</div>
        </div>
      </div>
    )
  }

  // === EXTERNÍ ZÁPASOVÁ KOMPONENTA ===
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
        tvMode={tvMode} /* PŘEDÁVÁME TV MODE */
      />
    )
  }

  // === HLAVNÍ MENU ===
  if (view === 'menu') {
    const liveZapasy = zapasList.filter(z => z.status === 'live')
    const odehraneZapasy = zapasList.filter(z => z.status === 'finished')

    const zapasyA = odehraneZapasy.filter(z => HRACI_SKUPINA_A.includes(z.player1_name) && HRACI_SKUPINA_A.includes(z.player2_name))
    const zapasyB = odehraneZapasy.filter(z => HRACI_SKUPINA_B.includes(z.player1_name) && HRACI_SKUPINA_B.includes(z.player2_name))
    const zapasyOstatni = odehraneZapasy.filter(z => !zapasyA.includes(z) && !zapasyB.includes(z) && z.round === null)

    return (
      <div style={{ fontFamily: 'sans-serif', background: isDivak ? '#111' : '#f4f7f6', color: isDivak ? 'white' : '#333', minHeight: '100vh', paddingBottom: '80px' }}>
        
        {/* HLAVIČKA S TLAČÍTKEM NA PŘEPNUTÍ TV REŽIMU */}
        <div style={{ background: isDivak ? '#222' : '#fff', padding: '15px 20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <h1 style={{ margin: 0, fontSize: isDivak ? (tvMode ? '40px' : '22px') : '36px' }}>🎾 Orel Tenis Cup</h1>
          
          {isDivak ? (
            <button onClick={() => setTvMode(!tvMode)} style={{ background: tvMode ? '#dc3545' : '#007bff', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
              {tvMode ? '📱 Přepnout na mobilní režim' : '📺 Přepnout na režim TV'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button onClick={() => setView('import')} style={{ padding: '10px 15px', fontSize: '16px', cursor: 'pointer', background: '#ffc107', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>📥 Aktualizovat</button>
              <button onClick={() => setView('bracket')} style={{ padding: '10px 15px', fontSize: '16px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>🏆 Pavouk</button>
              <button onClick={() => setView('players')} style={{ padding: '10px 15px', fontSize: '16px', cursor: 'pointer', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>👥 Hráči</button>
            </div>
          )}
        </div>

        <div style={{ maxWidth: tvMode ? '1600px' : '1400px', margin: '0 auto', padding: '20px 15px' }}>
          {!isDivak && (
            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
              <button onClick={vytvoritNovyZapas} style={{ padding: '15px 40px', fontSize: '20px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '50px', boxShadow: '0 6px 20px rgba(40,167,69,0.4)', fontWeight: 'bold' }}>➕ Nový zápas</button>
            </div>
          )}

          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ borderBottom: isDivak ? '2px solid #333' : '2px solid #ddd', paddingBottom: '10px', color: '#dc3545', fontSize: tvMode ? '40px' : '24px' }}>🔴 Právě se hraje</h2>
            {liveZapasy.length === 0 ? <p style={{ color: '#888', fontSize: '18px' }}>Aktuálně se nehraje žádný zápas.</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${tvMode ? '500px' : '280px'}, 1fr))`, gap: '20px', marginTop: '20px' }}>
                {liveZapasy.map(z => <ZapasCard key={z.id} zapas={z} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <button onClick={() => setTypTabulky('klasicka')} style={{ padding: '10px 20px', fontSize: '16px', background: typTabulky === 'klasicka' ? '#007bff' : (isDivak ? '#444' : '#ddd'), color: typTabulky === 'klasicka' ? 'white' : (isDivak ? '#ccc' : '#333'), border: 'none', borderRadius: '10px 0 0 10px', cursor: 'pointer', fontWeight: 'bold' }}>Klasická tabulka</button>
            <button onClick={() => setTypTabulky('krizova')} style={{ padding: '10px 20px', fontSize: '16px', background: typTabulky === 'krizova' ? '#007bff' : (isDivak ? '#444' : '#ddd'), color: typTabulky === 'krizova' ? 'white' : (isDivak ? '#ccc' : '#333'), border: 'none', borderRadius: '0 10px 10px 0', cursor: 'pointer', fontWeight: 'bold' }}>Křížová tabulka</button>
          </div>

          {typTabulky === 'klasicka' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', marginBottom: '40px' }}>
              <div style={{ flex: '1 1 100%' }}><SkupinaTable matches={zapasyA} hraciList={HRACI_SKUPINA_A} nazev="Skupina A" /></div>
              <div style={{ flex: '1 1 100%' }}><SkupinaTable matches={zapasyB} hraciList={HRACI_SKUPINA_B} nazev="Skupina B" /></div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', marginBottom: '40px' }}>
              <KrizovaTabulkaComponent matches={zapasyA} hraciList={HRACI_SKUPINA_A} nazev="Skupina A" />
              <KrizovaTabulkaComponent matches={zapasyB} hraciList={HRACI_SKUPINA_B} nazev="Skupina B" />
            </div>
          )}
          
          {/* Výpisy dohraných zápasů - optimalizováno pro mobily */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ borderBottom: isDivak ? '2px solid #333' : '2px solid #ddd', paddingBottom: '10px', fontSize: tvMode ? '30px' : '20px' }}>✅ Zápasy - Skupina A</h2>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${tvMode ? '400px' : '280px'}, 1fr))`, gap: '20px', marginTop: '20px' }}>
              {zapasyA.map(z => <ZapasCard key={z.id} zapas={z} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
            </div>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ borderBottom: isDivak ? '2px solid #333' : '2px solid #ddd', paddingBottom: '10px', fontSize: tvMode ? '30px' : '20px' }}>✅ Zápasy - Skupina B</h2>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${tvMode ? '400px' : '280px'}, 1fr))`, gap: '20px', marginTop: '20px' }}>
              {zapasyB.map(z => <ZapasCard key={z.id} zapas={z} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '20px' }}>Načítám...</div>
}

export default App