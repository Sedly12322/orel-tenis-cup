import React, { useMemo } from 'react';
import { vypocitejTabulku } from '../utils/gameLogic'
import { normalize } from '../utils/constants';

const zkraceneJmeno = (jmeno) => {
  if (!jmeno) return "";
  const casti = jmeno.split(' ');
  return casti.length === 1 ? jmeno : casti[0].charAt(0) + '. ' + casti.slice(1).join(' ');
}

export const KrizovaTabulkaComponent = ({ matches, hraciList, nazev, isDivak }) => {
  const { staty } = vypocitejTabulku(matches, hraciList);
  
  const getScoreText = (radkovyHrac, sloupcovyHrac) => {
    const match = matches.find(m => m.status === 'finished' && ((m.player1_name === radkovyHrac && m.player2_name === sloupcovyHrac) || (m.player1_name === sloupcovyHrac && m.player2_name === radkovyHrac)));
    if (!match || !match.match_state || !match.match_state.completed_sets) return "";
    
    let text = match.match_state.completed_sets.map(set => {
      if (match.player1_name === radkovyHrac) return `${set.player1_games}:${set.player2_games}`;
      else return `${set.player2_games}:${set.player1_games}`;
    }).join(', ');

    // Přidání písmene (K) jako označení kontumace, přesně jako ve vašem Excelu
    if (match.match_state.is_default) {
        text += " (K)";
    }
    
    return text;
  }

  return (
    <div style={{ overflowX: 'auto', background: isDivak ? '#222' : '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
      <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'center', fontSize: '15px' }}>
        <thead>
          <tr style={{ background: isDivak ? '#333' : '#e9ecef', color: isDivak ? '#fff' : '#000' }}>
            <th style={{ padding: '12px', border: '1px solid #ccc', textAlign: 'left', minWidth: '180px' }}>Dvouhra muži<br/>{nazev}</th>
            {hraciList.map((_, i) => <th key={i} style={{ padding: '12px', border: '1px solid #ccc', width: '60px' }}>{i + 1}</th>)}
            <th style={{ padding: '12px', border: '1px solid #ccc' }}>Body</th>
            <th style={{ padding: '12px', border: '1px solid #ccc' }}>Skóre</th>
            <th style={{ padding: '12px', border: '1px solid #ccc' }}>Pořadí</th>
          </tr>
          <tr style={{ background: isDivak ? '#444' : '#f8f9fa', color: isDivak ? '#ccc' : '#555', fontSize: '13px' }}>
            <th style={{ border: '1px solid #ccc' }}></th>
            {hraciList.map((h, i) => <th key={i} style={{ padding: '5px', border: '1px solid #ccc', whiteSpace: 'nowrap' }}>{zkraceneJmeno(h)}</th>)}
            <th style={{ border: '1px solid #ccc' }}></th><th style={{ border: '1px solid #ccc' }}></th><th style={{ border: '1px solid #ccc' }}></th>
          </tr>
        </thead>
        <tbody>
          {hraciList.map((hrac, rIdx) => {
            const s = staty[hrac];
            return (
              <tr key={hrac} style={{ background: isDivak ? '#1a1a1a' : '#fff', color: isDivak ? '#fff' : '#000' }}>
                <td style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', border: '1px solid #ccc', whiteSpace: 'nowrap' }}><span style={{ marginRight: '15px', color: '#888' }}>{rIdx + 1}</span> {hrac}</td>
                {hraciList.map((colHrac, cIdx) => {
                  if (rIdx === cIdx) return <td key={cIdx} style={{ background: isDivak ? '#444' : '#ddd', border: '1px solid #ccc' }}></td>
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

export const CtyrhraKrizovaTabulka = ({ matches, tymy, nazev, isDivak }) => {
  const { staty } = vypocitejTabulku(matches, tymy);

  // Rozdeli nazev paru na dva nazvy hracu podle '/' nebo mezery
  const rozdelPar = (nazev) => {
    const norm = normalize(nazev);
    // Nejprve zkus '/' jako oddelovac
    const parts = norm.split('/').map(s => s.trim());
    if (parts.length === 2) return parts;
    // Jinak zkus rozdelit podle mezer (predpokladame "Jmeno Prijmeni Jmeno2 Prijmeni2")
    const words = norm.split(' ').filter(Boolean);
    if (words.length >= 4) {
      return [words.slice(0, Math.floor(words.length / 2)).join(' '), words.slice(Math.floor(words.length / 2)).join(' ')];
    }
    if (words.length >= 2) {
      return [words[0], words.slice(1).join(' ')];
    }
    return [norm];
  };

  // Porovna dva nazvy paru - podporuje ruzne formaty (dlouha/kratka jmena)
  const namesMatch = (a, b) => {
    if (!a || !b) return false;
    if (a === b) return true;
    const na = normalize(a);
    const nb = normalize(b);
    if (na === nb) return true;

    const pa = rozdelPar(na);
    const pb = rozdelPar(nb);
    if (pa.length !== 2 || pb.length !== 2) return false;

    // Pro kazdou stranu paru porovnej prijmeni a inicialy
    for (let i = 0; i < 2; i++) {
      const wa = pa[i].split(' ').filter(Boolean);
      const wb = pb[i].split(' ').filter(Boolean);
      if (wa.length === 0 || wb.length === 0) return false;
      if (wa[wa.length - 1] !== wb[wb.length - 1]) return false;
      if (wa[0]?.[0] !== wb[0]?.[0]) return false;
    }
    return true;
  };

  // Vytvor matici vysledku s normalizovanymi klici pro robustni vyhledavani
  const matchList = matches.filter(m => m.status === 'finished' && m.match_state?.completed_sets);
  const matice = {};
  matchList.forEach(m => {
    const p1 = m.player1_name;
    const p2 = m.player2_name;
    if (!matice[p1]) matice[p1] = {};
    matice[p1][p2] = m;
    if (!matice[p2]) matice[p2] = {};
    matice[p2][p1] = m;
  });

  // Webova data (body/poradi ze stranky) pro archivni ctyrhu
  const webStat = useMemo(() => {
    const map = {};
    matchList.forEach(m => {
      const ms = m.match_state || {};
      if (ms.web_body != null && ms.web_poradi != null) {
        map[m.player1_name] = { body: ms.web_body, poradi: ms.web_poradi };
      }
      if (ms.web_body_p2 != null && ms.web_poradi_p2 != null) {
        map[m.player2_name] = { body: ms.web_body_p2, poradi: ms.web_poradi_p2 };
      }
    });
    return map;
  }, [matchList]);

  // Najdi zapas mezi dvema tymi pomoci presneho nebo fuzzy hledani
  const najdiZapas = (tym1, tym2) => {
    // 1. Presne hledani v matici
    let match = matice[tym1]?.[tym2] || matice[tym2]?.[tym1];
    if (match) return match;

    // 2. Hledani pomoci namesMatch
    match = matchList.find(m => {
      return (namesMatch(m.player1_name, tym1) && namesMatch(m.player2_name, tym2)) ||
             (namesMatch(m.player1_name, tym2) && namesMatch(m.player2_name, tym1));
    });
    if (match) return match;

    // 3. Hledani pomoci normalizovanych klicu
    const n1 = normalize(tym1);
    const n2 = normalize(tym2);
    match = matchList.find(m => {
      const mn1 = normalize(m.player1_name);
      const mn2 = normalize(m.player2_name);
      return (mn1 === n1 && mn2 === n2) || (mn1 === n2 && mn2 === n1);
    });
    return match || null;
  };

  // Najdi webova data (body/poradi) pro tym pomoci presneho nebo fuzzy hledani
  const najdiWebStat = (tym) => {
    if (webStat[tym]) return webStat[tym];
    // Fuzzy hledani pomoci namesMatch
    for (const key of Object.keys(webStat)) {
      if (namesMatch(key, tym)) return webStat[key];
    }
    // Hledani pomoci normalizovaneho klice
    const nt = normalize(tym);
    for (const key of Object.keys(webStat)) {
      if (normalize(key) === nt) return webStat[key];
    }
    return null;
  };

  const getScoreText = (radkovyTym, sloupcovyTym) => {
    const match = najdiZapas(radkovyTym, sloupcovyTym);
    if (!match) return "";

    const text = match.match_state.completed_sets.map(set => {
      if (namesMatch(match.player1_name, radkovyTym)) return `${set.player1_games}-${set.player2_games}`;
      return `${set.player2_games}-${set.player1_games}`;
    }).join(', ');

    let result = text;
    if (match.match_state.is_default) result += " (K)";
    return result;
  };

  const cellStyle = { border: '1px solid #ccc', padding: '5px', fontSize: '13px' };

  // Nezobrazovat prazdnou tabulku, kdyz nejsou zadne zapasy
  const { serazeni: vysledky } = vypocitejTabulku(matches, tymy);
  if (vysledky.length === 0) return null;

  return (
    <div style={{ overflowX: 'auto', background: isDivak ? '#222' : '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
      <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'center', fontSize: '15px' }}>
        <thead>
          <tr style={{ background: isDivak ? '#333' : '#e9ecef', color: isDivak ? '#fff' : '#000' }}>
            <th colSpan={2} style={{ ...cellStyle, padding: '12px', textAlign: 'left' }}>{nazev}</th>
            {tymy.map((_, i) => <th key={i} style={{ ...cellStyle, padding: '8px', width: '60px' }}>{i + 1}</th>)}
            <th rowSpan={2} style={{ ...cellStyle, padding: '12px' }}>Body</th>
            <th rowSpan={2} style={{ ...cellStyle, padding: '12px' }}>Skóre</th>
            <th rowSpan={2} style={{ ...cellStyle, padding: '12px' }}>Pořadí</th>
          </tr>
          <tr style={{ background: isDivak ? '#444' : '#f8f9fa', color: isDivak ? '#ccc' : '#555', fontSize: '13px' }}>
            <th colSpan={2} style={{ border: '1px solid #ccc' }}></th>
            {tymy.map(t => <th key={t} style={{ ...cellStyle, whiteSpace: 'nowrap', fontWeight: 'normal' }}>{t.split(' / ').map(j => zkraceneJmeno(j)).join(' / ')}</th>)}
          </tr>
        </thead>
        <tbody>
          {tymy.map((tym, rIdx) => {
            // Vypocist statistiky pomoci vypocitejTabulku
            const s = staty[tym] || { body: 0, gamesW: 0, gamesL: 0, poradi: rIdx + 1 };
            // Doplnime webova data (body/poradi) kdyz jsou k dispozici (archivni data)
            const ws = najdiWebStat(tym);
            const body = (ws && ws.body != null) ? ws.body : s.body;
            const poradi = (ws && ws.poradi != null) ? ws.poradi : s.poradi;
            const sFinal = { ...s, body, poradi };
            return (
              <tr key={tym}>
                <td style={{ ...cellStyle, background: isDivak ? '#333' : '#f8f9fa', color: isDivak ? '#aaa' : '#888', width: '30px' }}>{rIdx + 1}</td>
                <td style={{ ...cellStyle, padding: '10px 12px', textAlign: 'left', fontWeight: 'bold', whiteSpace: 'nowrap', color: isDivak ? '#fff' : '#000' }}>
                  {tym.split(' / ').map(j => <span key={j} style={{ display: 'block' }}>{j}</span>)}
                </td>
                {tymy.map((colTym, cIdx) => {
                  if (rIdx === cIdx) return <td key={cIdx} style={{ ...cellStyle, background: isDivak ? '#444' : '#ddd' }}></td>;
                  return <td key={cIdx} style={{ ...cellStyle, whiteSpace: 'nowrap', color: isDivak ? '#ddd' : '#444' }}>{getScoreText(tym, colTym)}</td>;
                })}
                <td style={{ ...cellStyle, fontWeight: 'bold', color: '#007bff' }}>{sFinal.body}</td>
                <td style={cellStyle}>{sFinal.gamesW}:{sFinal.gamesL}</td>
                <td style={{ ...cellStyle, fontWeight: 'bold', background: sFinal.poradi === 1 ? '#ffd700' : sFinal.poradi === 2 ? '#e3e4e5' : sFinal.poradi === 3 ? '#cd7f32' : 'transparent' }}>{sFinal.poradi}.</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Klasická tabulka ctyrhry - pary serazene podle bodu
export const CtyrhraSkupinaTable = ({ matches, tymy, nazev, isDivak }) => {
  const { serazeni: vysledky } = vypocitejTabulku(matches, tymy);
  if (vysledky.length === 0) return null;

  return (
    <div style={{ overflowX: 'auto', background: isDivak ? '#222' : '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
      <h2 style={{ margin: '0 0 20px 0', color: isDivak ? '#ffeb3b' : '#000' }}>📊 {nazev}</h2>
      <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'center', fontSize: '18px', color: isDivak ? '#fff' : '#000' }}>
        <thead>
          <tr style={{ background: isDivak ? '#333' : '#e9ecef', color: isDivak ? '#fff' : '#000' }}>
            <th style={{ padding: '12px' }}>#</th><th style={{ padding: '12px', textAlign: 'left' }}>Pár</th><th style={{ padding: '12px' }}>Z</th><th style={{ padding: '12px' }}>V</th><th style={{ padding: '12px' }}>P</th><th style={{ padding: '12px' }}>Sety</th><th style={{ padding: '12px' }}>Hry</th><th style={{ padding: '12px', fontSize: '22px' }}>Body</th>
          </tr>
        </thead>
        <tbody>
          {vysledky.map((s, idx) => (
            <tr key={s.jmeno} style={{ borderBottom: '1px solid #444', background: idx === 0 ? (isDivak ? '#2a402a' : '#e2f0d9') : 'transparent' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>{idx + 1}.</td>
              <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 'bold' }}>
                {s.jmeno.split(' / ').map(j => <span key={j} style={{ display: 'block' }}>{j}</span>)}
              </td>
              <td style={{ padding: '12px' }}>{s.z}</td><td style={{ padding: '12px', color: '#28a745', fontWeight: 'bold' }}>{s.v}</td><td style={{ padding: '12px', color: '#dc3545' }}>{s.p}</td><td style={{ padding: '12px' }}>{s.setsW}:{s.setsL}</td><td style={{ padding: '12px' }}>{s.gamesW}:{s.gamesL}</td><td style={{ padding: '12px', fontWeight: 'bold', fontSize: '22px', color: '#007bff' }}>{s.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const SkupinaTable = ({ matches, hraciList, nazev, isDivak }) => {
  const { serazeni: vysledky } = vypocitejTabulku(matches, hraciList);
  if (vysledky.length === 0) return null;

  return (
    <div style={{ overflowX: 'auto', background: isDivak ? '#222' : '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
      <h2 style={{ margin: '0 0 20px 0', color: isDivak ? '#ffeb3b' : '#000' }}>📊 {nazev}</h2>
      <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'center', fontSize: '18px', color: isDivak ? '#fff' : '#000' }}>
        <thead>
          <tr style={{ background: isDivak ? '#333' : '#e9ecef', color: isDivak ? '#fff' : '#000' }}>
            <th style={{ padding: '12px' }}>#</th><th style={{ padding: '12px', textAlign: 'left' }}>Hráč</th><th style={{ padding: '12px' }}>Z</th><th style={{ padding: '12px' }}>V</th><th style={{ padding: '12px' }}>P</th><th style={{ padding: '12px' }}>Sety</th><th style={{ padding: '12px' }}>Hry</th><th style={{ padding: '12px', fontSize: '22px' }}>Body</th>
          </tr>
        </thead>
        <tbody>
          {vysledky.map((s, idx) => (
            <tr key={s.jmeno} style={{ borderBottom: '1px solid #444', background: idx === 0 ? (isDivak ? '#2a402a' : '#e2f0d9') : 'transparent' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>{idx + 1}.</td><td style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>{s.jmeno}</td><td style={{ padding: '12px' }}>{s.z}</td><td style={{ padding: '12px', color: '#28a745', fontWeight: 'bold' }}>{s.v}</td><td style={{ padding: '12px', color: '#dc3545' }}>{s.p}</td><td style={{ padding: '12px' }}>{s.setsW}:{s.setsL}</td><td style={{ padding: '12px' }}>{s.gamesW}:{s.gamesL}</td><td style={{ padding: '12px', fontWeight: 'bold', fontSize: '22px', color: '#007bff' }}>{s.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}