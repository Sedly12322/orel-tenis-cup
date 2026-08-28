import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from './supabase'
import { MatchView } from './components/MatchView'
import ImportData from './ImportData'
import { useMatchActions } from './hooks/useMatchActions'
import { DashboardView } from './components/DashboardView'
import { BracketView } from './components/BracketView'
import { PlayersView } from './components/PlayersView'
import { NewMatchModal } from './components/NewMatchModal'
import { ErrorBoundary } from './components/ErrorBoundary'

// Context pro sdílená data mezi routami
export const AppContext = createContext(null)

export function useAppContext() {
  return useContext(AppContext)
}

// Header komponenta
function AppHeader({ isAdmin, onLogin, onLogout, onNavigate }) {
  const [showLogin, setShowLogin] = useState(false)
  const [heslo, setHeslo] = useState('')

  const handleLogin = () => {
    if (heslo === 'orel2026') {
      localStorage.setItem('isAdmin', 'true')
      onLogin()
      setShowLogin(false)
      setHeslo('')
    } else {
      alert('Nesprávné heslo!')
    }
  }

  return (
    <>
      <div style={{ background: isAdmin ? '#f4f7f6' : '#222', padding: '15px 20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vw, 36px)', color: isAdmin ? '#000' : '#fff', cursor: 'pointer' }} onClick={() => onNavigate('/')}>🎾 Orel Tenis Cup</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => onNavigate('/tv')} style={{ padding: '10px 15px', fontSize: 'clamp(14px, 2vw, 18px)', cursor: 'pointer', background: '#6f42c1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>📺 TV Kiosk</button>
          {isAdmin && <button onClick={() => onNavigate('/import')} style={{ padding: '10px 15px', fontSize: 'clamp(14px, 2vw, 18px)', cursor: 'pointer', background: '#ffc107', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>📥 Import</button>}
          <button onClick={() => onNavigate('/bracket')} style={{ padding: '10px 15px', fontSize: 'clamp(14px, 2vw, 18px)', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>🏆 Pavouk</button>
          {isAdmin && <button onClick={() => onNavigate('/players')} style={{ padding: '10px 15px', fontSize: 'clamp(14px, 2vw, 18px)', cursor: 'pointer', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>👥 Hráči</button>}
          {isAdmin ? (
            <button onClick={onLogout} style={{ padding: '10px 15px', fontSize: 'clamp(14px, 2vw, 18px)', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Odhlásit</button>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ padding: '10px 15px', fontSize: 'clamp(14px, 2vw, 18px)', cursor: 'pointer', background: '#444', color: 'white', border: '1px solid #666', borderRadius: '8px', fontWeight: 'bold' }}>🔒 Rozhodčí</button>
          )}
        </div>
      </div>

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
    </>
  )
}

// Dashboard wrapper
function DashboardPage() {
  const ctx = useAppContext()
  const navigate = useNavigate()
  
  return (
    <DashboardView 
      zapasList={ctx.zapasList} 
      isDivak={!ctx.isAdmin} 
      otevritZapas={(id) => navigate(`/match/${id}`)} 
      smazatZapas={ctx.smazatZapas}
      otevritNovyZapasModal={() => ctx.setShowNewMatchModal(true)} 
      typTabulky={ctx.typTabulky} 
      setTypTabulky={ctx.setTypTabulky}
      tvMessage={ctx.tvMessage}
      tvMessageInput={ctx.tvMessageInput} 
      setTvMessageInput={ctx.setTvMessageInput} 
      ulozitTvZpravu={ctx.ulozitTvZpravu}
      supabase={supabase}
      onDataChange={ctx.nactiZapasy}
    />
  )
}

// Match page wrapper
function MatchPage() {
  const { id } = useParams()
  const ctx = useAppContext()
  const navigate = useNavigate()
  const [score, setScore] = useState(null)

  useEffect(() => {
    if (id) {
      const nactiSkore = async () => {
        const { data } = await supabase.from('matches').select('*').eq('id', id).single()
        if (data && data.match_state) setScore(data.match_state)
      }
      nactiSkore()

      const matchKanal = supabase.channel(`match-kanal-${id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${id}` },
          (payload) => {
            setScore(payload.new.match_state)
            ctx.setZapasList(prev => prev.map(z => Number(z.id) === Number(id) ? payload.new : z))
          }
        ).subscribe()

      return () => { supabase.removeChannel(matchKanal) }
    }
  }, [id, ctx.setZapasList])

  const matchActions = useMatchActions(score, setScore, id, ctx.zapasList, ctx.setZapasList, () => navigate('/'), supabase)

  if (!score) return null

  return (
    <MatchView 
      score={score} 
      activeMatchId={id} 
      zapasList={ctx.zapasList} 
      hraciList={ctx.hraciList} 
      history={score._history || []} 
      isDivak={!ctx.isAdmin} 
      zpetDoMenu={() => navigate('/')} 
      {...matchActions} 
    />
  )
}

// Bracket page
function BracketPage() {
  const ctx = useAppContext()
  const navigate = useNavigate()
  return <BracketView zapasList={ctx.zapasList} isDivak={!ctx.isAdmin} zpetDoMenu={() => navigate('/')} otevritZapas={(id) => navigate(`/match/${id}`)} />
}

// Players page
function PlayersPage() {
  const ctx = useAppContext()
  const navigate = useNavigate()
  return (
    <PlayersView 
      hraciList={ctx.hraciList} 
      pridatHrace={ctx.pridatHrace} 
      smazatHrace={ctx.smazatHrace} 
      novyHracJmeno={ctx.novyHracJmeno} 
      setNovyHracJmeno={ctx.setNovyHracJmeno} 
      zpetDoMenu={() => navigate('/')} 
    />
  )
}

// Import page
function ImportPage() {
  const ctx = useAppContext()
  const navigate = useNavigate()
  return <ImportData zpetDoMenu={() => navigate('/')} onDataChange={ctx.nactiZapasy} />
}

// TV Kiosk page
function TVKioskPage() {
  const ctx = useAppContext()
  const navigate = useNavigate()
  const [score, setScore] = useState(null)
  const [activeMatchId, setActiveMatchId] = useState(null)

  useEffect(() => {
    const liveMatch = ctx.zapasList.find(z => z.status === 'live')
    if (liveMatch && activeMatchId !== liveMatch.id) {
      setActiveMatchId(liveMatch.id)
    } else if (!liveMatch && activeMatchId !== null) {
      setActiveMatchId(null)
      setScore(null)
    }
  }, [ctx.zapasList, activeMatchId])

  useEffect(() => {
    if (activeMatchId) {
      const nactiSkore = async () => {
        const { data } = await supabase.from('matches').select('*').eq('id', activeMatchId).single()
        if (data && data.match_state) setScore(data.match_state)
      }
      nactiSkore()

      const matchKanal = supabase.channel(`tv-kanal-${activeMatchId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${activeMatchId}` },
          (payload) => setScore(payload.new.match_state)
        ).subscribe()

      return () => { supabase.removeChannel(matchKanal) }
    }
  }, [activeMatchId])

  // Hook musí být volán vždy (ne podmíněně)
  const matchActions = useMatchActions(score, setScore, activeMatchId, ctx.zapasList, ctx.setZapasList, () => navigate('/'), supabase)

  if (activeMatchId && score) {
    return (
      <>
        <style>{`* { cursor: none !important; }`}</style>
        <MatchView score={score} activeMatchId={activeMatchId} zapasList={ctx.zapasList} hraciList={ctx.hraciList} history={score._history || []} isDivak={true} isKiosk={true} zpetDoMenu={() => navigate('/')} {...matchActions} />
      </>
    )
  }

  return (
    <div style={{ background: '#000', color: 'white', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
      <style>{`
        * { cursor: none !important; }
        @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
      `}</style>
      
      <button onClick={() => navigate('/')} style={{ position: 'absolute', top: '20px', left: '20px', padding: '10px 20px', background: '#222', color: '#555', border: 'none', borderRadius: '8px', opacity: 0.5 }}>← Menu</button>
      <h1 style={{ fontSize: 'clamp(40px, 8vw, 80px)', color: '#28a745', margin: '0 0 20px 0', textTransform: 'uppercase' }}>🎾 Orel Tenis Cup Lichnov</h1>
      <div style={{ width: '100%', maxWidth: '800px', height: '4px', background: '#333', marginBottom: '40px' }}></div>
      
      {ctx.tvMessage ? (
        <div style={{ background: 'rgba(255, 235, 59, 0.1)', border: '2px solid #ffeb3b', padding: '30px 50px', borderRadius: '15px', maxWidth: '1000px', boxShadow: '0 0 30px rgba(255, 235, 59, 0.2)' }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 50px)', color: '#ffeb3b', margin: 0, fontWeight: 'normal', lineHeight: '1.4' }}>{ctx.tvMessage}</h2>
        </div>
      ) : (
        <h2 style={{ fontSize: 'clamp(20px, 4vw, 40px)', color: '#aaa', fontWeight: 'normal' }}>Aktuálně neprobíhá žádný zápas</h2>
      )}

      <div style={{ marginTop: '60px' }}><div style={{ animation: 'pulse 2s infinite', color: '#555', fontSize: '24px' }}>Čekání na spuštění zápasu...</div></div>
    </div>
  )
}

// Main App component
function App() {
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true')
  const navigate = useNavigate()
  
  const [zapasList, setZapasList] = useState([])
  const [hraciList, setHraciList] = useState([])
  const [novyHracJmeno, setNovyHracJmeno] = useState('')
  const [typTabulky, setTypTabulky] = useState('krizova')
  const [showNewMatchModal, setShowNewMatchModal] = useState(false)
  const [newMatchGroup, setNewMatchGroup] = useState('A')
  const [newMatchP1, setNewMatchP1] = useState('')
  const [newMatchP2, setNewMatchP2] = useState('')
  const [tvMessage, setTvMessage] = useState('')
  const [tvMessageInput, setTvMessageInput] = useState('')

  const nactiZapasy = useCallback(async () => {
    const { data } = await supabase.from('matches').select('*').order('created_at', { ascending: false })
    if (data) {
      const msgMatch = data.find(z => z.status === 'tv_message')
      if (msgMatch && msgMatch.match_state?.text) {
        setTvMessage(msgMatch.match_state.text)
        setTvMessageInput(prev => prev === '' ? msgMatch.match_state.text : prev)
      } else {
        setTvMessage('')
      }
      setZapasList(data.filter(z => z.status !== 'tv_message'))
    }
  }, [])

  useEffect(() => {
    const nactiHrace = async () => {
      const { data } = await supabase.from('players').select('*').order('name', { ascending: true })
      if (data) setHraciList(data)
    }

    nactiZapasy()
    nactiHrace()

    const dbKanal = supabase.channel('spolecny-kanal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => nactiZapasy())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => nactiHrace())
      .subscribe()

    return () => { supabase.removeChannel(dbKanal) }
  }, [nactiZapasy])

  const pridatHrace = async () => {
    if (!novyHracJmeno.trim()) return
    await supabase.from('players').insert([{ name: novyHracJmeno }])
    setNovyHracJmeno('')
  }

  const smazatHrace = async (id) => {
    if (window.confirm("Smazat hráče?")) await supabase.from('players').delete().eq('id', id)
  }

  const smazatZapas = async (id) => {
    if (window.confirm("Opravdu smazat zápas?")) await supabase.from('matches').delete().eq('id', id)
  }

  const spustitNovyZapas = async () => {
    if (!newMatchP1 || !newMatchP2) { alert("Vyberte prosím oba hráče!"); return }
    
    const vychoziStav = {
      player1_name: newMatchP1, player2_name: newMatchP2, server: 1,
      sets_won: { player1: 0, player2: 0 }, completed_sets: [],
      current_set: { player1_games: 0, player2_games: 0 }, current_game: { player1_points: "0", player2_points: "0" },
      is_tiebreak: false, game_log: [[], [], []], _history: [], hawk_eye_timestamp: null,
      first_fault: false, start_time: null, end_time: null
    }
    const { data } = await supabase.from('matches').insert([{ player1_name: newMatchP1, player2_name: newMatchP2, status: "planned", round: null, match_state: vychoziStav }]).select()
    if (data && data[0]) {
      setShowNewMatchModal(false)
      navigate(`/match/${data[0].id}`)
    }
  }

  const ulozitTvZpravu = async () => {
    const { data } = await supabase.from('matches').select('id').eq('status', 'tv_message')
    if (data && data.length > 0) {
      await supabase.from('matches').update({ match_state: { text: tvMessageInput } }).eq('id', data[0].id)
    } else {
      await supabase.from('matches').insert([{ player1_name: 'TV', player2_name: 'MESSAGE', status: 'tv_message', round: null, match_state: { text: tvMessageInput } }])
    }
    alert("Oznámení pro diváky a TV Kiosek bylo uloženo!")
  }

  const handleLogout = () => {
    localStorage.removeItem('isAdmin')
    setIsAdmin(false)
  }

  const contextValue = {
    zapasList, hraciList, nactiZapasy, smazatZapas, pridatHrace, smazatHrace,
    novyHracJmeno, setNovyHracJmeno, tvMessage, tvMessageInput, setTvMessageInput,
    ulozitTvZpravu, typTabulky, setTypTabulky, showNewMatchModal, setShowNewMatchModal,
    newMatchGroup, setNewMatchGroup, newMatchP1, setNewMatchP1, newMatchP2, setNewMatchP2,
    spustitNovyZapas, isAdmin
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div style={{ fontFamily: 'sans-serif', background: isAdmin ? '#f4f7f6' : '#111', color: isAdmin ? '#333' : 'white', minHeight: '100vh', paddingBottom: '80px' }}>
        <AppHeader 
          isAdmin={isAdmin} 
          onLogin={() => setIsAdmin(true)} 
          onLogout={handleLogout}
          onNavigate={(path) => navigate(path)}
        />

        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/match/:id" element={<MatchPage />} />
          <Route path="/bracket" element={<BracketPage />} />
          <Route path="/players" element={isAdmin ? <PlayersPage /> : <Navigate to="/" />} />
          <Route path="/import" element={isAdmin ? <ImportPage /> : <Navigate to="/" />} />
          <Route path="/tv" element={<TVKioskPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        <NewMatchModal 
          showNewMatchModal={showNewMatchModal} 
          setShowNewMatchModal={setShowNewMatchModal} 
          newMatchGroup={newMatchGroup} 
          setNewMatchGroup={setNewMatchGroup} 
          newMatchP1={newMatchP1} 
          setNewMatchP1={setNewMatchP1} 
          newMatchP2={newMatchP2} 
          setNewMatchP2={setNewMatchP2} 
          zapasList={zapasList} 
          spustitNovyZapas={spustitNovyZapas} 
        />
      </div>
    </AppContext.Provider>
  )
}

// Root component with Router
export default function AppRoot() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  )
}
