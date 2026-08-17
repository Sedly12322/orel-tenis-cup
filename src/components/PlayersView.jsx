import React from 'react';

export const PlayersView = ({ hraciList, pridatHrace, smazatHrace, novyHracJmeno, setNovyHracJmeno, zpetDoMenu }) => {
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