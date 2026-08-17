import React from 'react';
import { ZapasCard } from './SharedComponents';
import { KrizovaTabulkaComponent, SkupinaTable } from './TableComponents';
import { HRACI_SKUPINA_A, HRACI_SKUPINA_B } from '../utils/constants';

export const DashboardView = ({
  zapasList, isDivak, otevritZapas, smazatZapas, 
  otevritNovyZapasModal, typTabulky, setTypTabulky
}) => {
  const liveZapasy = zapasList.filter(z => z.status === 'live');
  const neZiveZapasy = zapasList.filter(z => z.status !== 'live');
  const zapasyA = neZiveZapasy.filter(z => HRACI_SKUPINA_A.includes(z.player1_name) && HRACI_SKUPINA_A.includes(z.player2_name));
  const zapasyB = neZiveZapasy.filter(z => HRACI_SKUPINA_B.includes(z.player1_name) && HRACI_SKUPINA_B.includes(z.player2_name));
  const zapasyOstatni = neZiveZapasy.filter(z => !zapasyA.includes(z) && !zapasyB.includes(z) && z.round === null);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(20px, 4vw, 50px) clamp(10px, 2vw, 20px)' }}>
      {!isDivak && (
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <button onClick={otevritNovyZapasModal} style={{ padding: '15px 30px', fontSize: 'clamp(18px, 3vw, 26px)', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '50px', boxShadow: '0 6px 20px rgba(40,167,69,0.4)', fontWeight: 'bold' }}>
            ➕ Vytvořit nový zápas
          </button>
        </div>
      )}
      
      <div style={{ marginBottom: '60px' }}>
        <h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '10px', color: '#dc3545', fontSize: 'clamp(22px, 4vw, 32px)' }}>🔴 Právě se hraje (LIVE)</h2>
        {liveZapasy.length === 0 ? (
          <p style={{ color: '#888', fontSize: 'clamp(16px, 3vw, 22px)' }}>Aktuálně se nehraje žádný zápas.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '20px', marginTop: '20px' }}>
            {liveZapasy.map(z => <ZapasCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', flexWrap: 'wrap' }}>
        <button onClick={() => setTypTabulky('klasicka')} style={{ padding: '10px 20px', fontSize: 'clamp(16px, 3vw, 20px)', background: typTabulky === 'klasicka' ? '#007bff' : (isDivak ? '#444' : '#ddd'), color: typTabulky === 'klasicka' ? 'white' : (isDivak ? '#ccc' : '#333'), border: 'none', borderRadius: '8px 0 0 8px', cursor: 'pointer', fontWeight: 'bold' }}>Klasická tabulka</button>
        <button onClick={() => setTypTabulky('krizova')} style={{ padding: '10px 20px', fontSize: 'clamp(16px, 3vw, 20px)', background: typTabulky === 'krizova' ? '#007bff' : (isDivak ? '#444' : '#ddd'), color: typTabulky === 'krizova' ? 'white' : (isDivak ? '#ccc' : '#333'), border: 'none', borderRadius: '0 8px 8px 0', cursor: 'pointer', fontWeight: 'bold' }}>Křížová tabulka</button>
      </div>
      
      {typTabulky === 'klasicka' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', marginBottom: '60px' }}>
          <div style={{ flex: '1 1 min(100%, 600px)', overflowX: 'auto' }}><SkupinaTable matches={zapasyA} hraciList={HRACI_SKUPINA_A} nazev="Skupina A" isDivak={isDivak} /></div>
          <div style={{ flex: '1 1 min(100%, 600px)', overflowX: 'auto' }}><SkupinaTable matches={zapasyB} hraciList={HRACI_SKUPINA_B} nazev="Skupina B" isDivak={isDivak} /></div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '50px', marginBottom: '60px' }}>
          <KrizovaTabulkaComponent matches={zapasyA} hraciList={HRACI_SKUPINA_A} nazev="Skupina A" isDivak={isDivak} />
          <KrizovaTabulkaComponent matches={zapasyB} hraciList={HRACI_SKUPINA_B} nazev="Skupina B" isDivak={isDivak} />
        </div>
      )}
      
      <div style={{ marginBottom: '50px' }}>
        <h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '10px', fontSize: 'clamp(22px, 4vw, 30px)', color: isDivak ? '#fff' : '#000' }}>✅ Zápasy - Skupina A</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '20px', marginTop: '20px' }}>
          {zapasyA.map(z => <ZapasCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
        </div>
      </div>
      <div style={{ marginBottom: '50px' }}>
        <h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '10px', fontSize: 'clamp(22px, 4vw, 30px)', color: isDivak ? '#fff' : '#000' }}>✅ Zápasy - Skupina B</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '20px', marginTop: '20px' }}>
          {zapasyB.map(z => <ZapasCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
        </div>
      </div>
      
      {zapasyOstatni.length > 0 && (
        <div>
          <h2 style={{ borderBottom: isDivak ? '3px solid #333' : '3px solid #ddd', paddingBottom: '10px', fontSize: 'clamp(22px, 4vw, 30px)', color: isDivak ? '#fff' : '#000' }}>🏆 Zápasy - Ostatní (Playoff)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '20px', marginTop: '20px' }}>
            {zapasyOstatni.map(z => <ZapasCard key={z.id} zapas={z} isDivak={isDivak} otevritZapas={otevritZapas} smazatZapas={smazatZapas} />)}
          </div>
        </div>
      )}
    </div>
  )
}