import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { MatchView } from './components/MatchView'
import ImportData from './ImportData'
import { useMatchActions } from './hooks/useMatchActions'
import { DashboardView } from './components/DashboardView'
import { BracketView } from './components/BracketView'
import { PlayersView } from './components/PlayersView'
import { NewMatchModal } from './components/NewMatchModal'

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

  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const [newMatchGroup, setNewMatchGroup] = useState('A');
  const [newMatchP1, setNewMatchP1] = useState('');
  const [newMatchP2, setNewMatchP2] = useState('');

  useEffect(() => {
    const handleHashChange = () => { if (window.location.hash === '#tv') setView('tv_kiosk'); };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
    if ((view === 'match' || view === 'tv_kiosk') && activeMatchId) {
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

  useEffect(() => {
    if (view === 'tv_kiosk') {
      const liveMatch = zapasList.find(z => z.status === 'live');
      if (liveMatch && activeMatchId !== liveMatch.id) { setActiveMatchId(liveMatch.id); } 
      else if (!liveMatch && activeMatchId !== null) { setActiveMatchId(null); setScore(null); }
    }
  }, [view, zapasList, activeMatchId]);

  const handleLogin = () => {
    if (heslo === 'orel2026') { localStorage.setItem('isAdmin', 'true'); setIsAdmin(true); setShowLogin(false); setHeslo(''); } 
    else { alert('Nesprávné heslo!'); }
  };
  const handleLogout = () => { localStorage.removeItem('isAdmin'); setIsAdmin(false); };

  const pridatHrace = async () => {
    if (!novyHracJmeno.trim()) return
    await supabase.from('players').insert([{ name: novyHracJmeno }])
    setNovyHracJmeno('')
  }
  const smazatHrace = async (id) => { if (window.confirm("Smazat hráče?")) await supabase.from('players').delete().eq('id', id) }
  const smazatZapas = async (id) => { if (window.confirm("Opravdu smazat zápas?")) await supabase.from('matches').delete().eq('id', id) }

  const otevritZapas = (id) => { setActiveMatchId(id); setView('match') }
  const zpetDoMenu = () => { setActiveMatchId(null); setScore(null); setView('menu'); window.location.hash = ''; }

  const spustitNovyZapas = async () => {
    if (!newMatchP1 || !newMatchP2) { alert("Vyberte prosím oba hráče!"); return; }
    
    const vychoziStav = {
      player1_name: newMatchP1, player2_name: newMatchP2, server: 1,
      sets_won: { player1: 0, player2: 0 }, completed_sets: [],
      current_set: { player1_games: 0, player2_games: 0 }, current_game: { player1_points: "0", player2_points: "0" },
      is_tiebreak: false, game_log: [[], [], []], _history: [], hawk_eye_timestamp: null,
      first_fault: false, start_time: null, end_time: null
    }
    const { data } = await supabase.from('matches').insert([{ player1_name: newMatchP1, player2_name: newMatchP2, status: "planned", round: null, match_state: vychoziStav }]).select()
    if (data && data[0]) { setActiveMatchId(data[0].id); setShowNewMatchModal(false); setView('match'); }
  }

  const matchActions = useMatchActions(score, setScore, activeMatchId, zapasList, setZapasList, zpetDoMenu, supabase);

  if (view === 'import' && !isDivak) return <ImportData zpetDoMenu={zpetDoMenu} />
  if (view === 'players' && !isDivak) return <PlayersView hraciList={hraciList} pridatHrace={pridatHrace} smazatHrace={smazatHrace} novyHracJmeno={novyHracJmeno} setNovyHracJmeno={setNovyHracJmeno} zpetDoMenu={zpetDoMenu} />
  if (view === 'bracket') return <BracketView zapasList={zapasList} isDivak={isDivak} zpetDoMenu={zpetDoMenu} otevritZapas={otevritZapas} />

  if (view === 'match' && activeMatchId && score) {
    return <MatchView score={score} activeMatchId={activeMatchId} zapasList={zapasList} hraciList={hraciList} history={score._history || []} isDivak={isDivak} zpetDoMenu={zpetDoMenu} {...matchActions} />
  }

  // --- REŽIM TV KIOSKU ---
  if (view === 'tv_kiosk') {
    if (activeMatchId && score) {
      return (
        <>
          {/* Zákaz myši pro probíhající zápas */}
          <style>{`* { cursor: none !important; }`}</style>
          <MatchView score={score} activeMatchId={activeMatchId} zapasList={zapasList} hraciList={hraciList} history={score._history || []} isDivak={true} isKiosk={true} zpetDoMenu={zpetDoMenu} {...matchActions} />
        </>
      )
    }
    return (
      <div style={{ background: '#000', color: 'white', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
        {/* Zákaz myši pro čekací obrazovku */}
        <style>{`
          * { cursor: none !important; }
          @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
        `}</style>
        
        {/* Tlačítko Zpět funguje i naslepo pro případ záchrany */}
        <button onClick={zpetDoMenu} style={{ position: 'absolute', top: '20px', left: '20px', padding: '10px 20px', background: '#222', color: '#555', border: 'none', borderRadius: '8px', opacity: 0.5 }}>← Menu</button>
        <h1 style={{ fontSize: 'clamp(40px, 8vw, 80px)', color: '#28a745', margin: '0 0 20px 0', textTransform: 'uppercase' }}>🎾 Orel Tenis Cup Lichnov</h1>
        <div style={{ width: '100%', maxWidth: '800px', height: '4px', background: '#333', marginBottom: '40px' }}></div>
        <h2 style={{ fontSize: 'clamp(20px, 4vw, 40px)', color: '#aaa', fontWeight: 'normal' }}>Aktuálně neprobíhá žádný zápas</h2>
        <div style={{ marginTop: '60px' }}><div style={{ animation: 'pulse 2s infinite', color: '#555', fontSize: '24px' }}>Čekání na spuštění zápasu...</div></div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'sans-serif', background: isDivak ? '#111' : '#f4f7f6', color: isDivak ? 'white' : '#333', minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ background: isDivak ? '#222' : '#fff', padding: '15px 20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vw, 36px)', color: isDivak ? '#fff' : '#000' }}>🎾 Orel Tenis Cup</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => { setView('tv_kiosk'); window.location.hash = 'tv'; }} style={{ padding: '10px 15px', fontSize: 'clamp(14px, 2vw, 18px)', cursor: 'pointer', background: '#6f42c1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>📺 TV Kiosk</button>
          {!isDivak && <button onClick={() => setView('import')} style={{ padding: '10px 15px', fontSize: 'clamp(14px, 2vw, 18px)', cursor: 'pointer', background: '#ffc107', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>📥 Import</button>}
          <button onClick={() => setView('bracket')} style={{ padding: '10px 15px', fontSize: 'clamp(14px, 2vw, 18px)', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>🏆 Pavouk</button>
          {!isDivak && <button onClick={() => setView('players')} style={{ padding: '10px 15px', fontSize: 'clamp(14px, 2vw, 18px)', cursor: 'pointer', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>👥 Hráči</button>}
          {isDivak ? <button onClick={() => setShowLogin(true)} style={{ padding: '10px 15px', fontSize: 'clamp(14px, 2vw, 18px)', cursor: 'pointer', background: '#444', color: 'white', border: '1px solid #666', borderRadius: '8px', fontWeight: 'bold' }}>🔒 Rozhodčí</button> : <button onClick={handleLogout} style={{ padding: '10px 15px', fontSize: 'clamp(14px, 2vw, 18px)', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Odhlásit</button>}
        </div>
      </div>

      <DashboardView zapasList={zapasList} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} otevritNovyZapasModal={() => {setNewMatchGroup('A'); setNewMatchP1(''); setNewMatchP2(''); setShowNewMatchModal(true);}} typTabulky={typTabulky} setTypTabulky={setTypTabulky} />
      
      <NewMatchModal showNewMatchModal={showNewMatchModal} setShowNewMatchModal={setShowNewMatchModal} newMatchGroup={newMatchGroup} setNewMatchGroup={setNewMatchGroup} newMatchP1={newMatchP1} setNewMatchP1={setNewMatchP1} newMatchP2={newMatchP2} setNewMatchP2={setNewMatchP2} zapasList={zapasList} spustitNovyZapas={spustitNovyZapas} />

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