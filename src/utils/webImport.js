/**
 * Import dat z webu orellichnov.cz
 * Stáhne HTML, parsuje tabulky a vrátí strukturovaná data.
 */

const WEB_URL = '/api/vysledky';

async function stahniHtml(v1, year = null) {
  let body = `v1=${v1}&v2=&v3=`;
  if (year) body = `v1=${v1}&v2=&v3=&year=${year}&show_archive_submit=`;

  const response = await fetch(WEB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    body,
    credentials: 'include',
  });
  if (!response.ok) throw new Error(`HTTP chyba: ${response.status}`);
  return response.text();
}

function normalizujPar(raw) {
  const jmena = String(raw)
    .split(/\s*\n\s*|\s*\/\s*/)
    .map(j => j.replace(/^\s+|\s+$/g, '').trim())
    .filter(Boolean);
  return jmena.join(' / ');
}

function getTextFromCell(cell) {
  if (!cell) return '';
  let html = cell.innerHTML;
  html = html.replace(/&nbsp;/g, ' ').replace(/<BR\s*\/?>/gi, '\n');
  html = html.replace(/<[^>]*>/g, '');
  html = html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return html.trim();
}

function parsujTabuldoc(html) {
  const parser = new DOMParser();
  const lowerHtml = html.replace(/<(\/?)(TABLE|TR|TD|TH|TBODY|THEAD|TFOOT)/gi,
    (match, slash, tag) => '<' + slash + tag.toLowerCase());
  const doc = parser.parseFromString(lowerHtml, 'text/html');
  const tables = doc.querySelectorAll('table.vysledky');

  const vysledky = { skupinaA: [], skupinaB: [], finalek: [], ctyrhra: [] };

  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 3) return;

    // Najdi řádek s hlavičkou (první řádek s jmény hráčů - obsahuje "/" nebo "\n" po getTextFromCell)
    let headerRowIdx = -1;
    let hraci = [];
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      const foundHraci = [];
      for (let j = 0; j < cells.length; j++) {
        const text = getTextFromCell(cells[j]);
        // Jména párů obsahují "/" nebo "\n" (po převodu <BR> na \n) - ostatní (čísla, "Body"...) přeskočit
        if (text && (text.includes('/') || text.includes('\n'))) {
          foundHraci.push(normalizujPar(text));
        }
      }
      if (foundHraci.length > 0) {
        headerRowIdx = i;
        hraci = foundHraci;
        break;
      }
    }

    if (headerRowIdx === -1 || hraci.length === 0) return;

    // Najdi název skupiny z řádků před hlavičkou
    let nazevSkupiny = '';
    for (let i = headerRowIdx - 1; i >= 0; i--) {
      const cells = rows[i].querySelectorAll('td');
      for (let j = 0; j < cells.length; j++) {
        const text = getTextFromCell(cells[j]);
        if (text && text.length > 0) {
          nazevSkupiny = text;
          break;
        }
      }
      if (nazevSkupiny) break;
    }

    const nazevLower = nazevSkupiny.toLowerCase();
    const isCtyrhra = nazevLower.includes('čtyřhra') || nazevLower.includes('ctyrhra');

    // Zpracuj datové řádky
    const zapasy = [];
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length < 3) continue;

      const idCell = getTextFromCell(cells[0]);
      if (!idCell || !idCell.match(/^\d+$/)) continue;
      const hrac1Index = parseInt(idCell) - 1;

      const hrac1 = normalizujPar(getTextFromCell(cells[1]));
      if (!hrac1 || hrac1 === 'XX') continue;

      // Skóre: buňka 2 = hráč 1 (diagonála), buňka 3 = hráč 2, atd.
      for (let j = 2; j < cells.length; j++) {
        const hrac2Index = j - 2;
        if (hrac2Index >= hraci.length) break;
        if (hrac2Index <= hrac1Index) continue; // Horní trojúhelník

        const skore = getTextFromCell(cells[j]);
        if (skore && skore !== 'XX' && !skore.match(/^\d+$/)) {
          const hrac2 = hraci[hrac2Index];
          if (hrac2 && hrac2 !== 'XX' && hrac2 !== hrac1) {
            zapasy.push({ player1: hrac1, player2: hrac2, score: skore });
          }
        }
      }
    }

    if (isCtyrhra) {
      vysledky.ctyrhra = [...vysledky.ctyrhra, ...zapasy];
    } else if (nazevSkupiny.includes('Finále')) {
      vysledky.finalek = [...vysledky.finalek, ...zapasy];
    } else if (nazevSkupiny.includes('Skupina A')) {
      vysledky.skupinaA = [...vysledky.skupinaA, ...zapasy];
    } else if (nazevSkupiny.includes('Skupina B')) {
      vysledky.skupinaB = [...vysledky.skupinaB, ...zapasy];
    } else {
      vysledky.skupinaA = [...vysledky.skupinaA, ...zapasy];
    }
  });

  return vysledky;
}

function parsujCtyrhrul(html, year) {
  // Pro v1=61 je vždy čtyřhra
  // Pokud HTML neobsahuje tabulku, zkusíme najít čtyřhru v nadpisech
  const parser = new DOMParser();
  const lowerHtml = html.replace(/<(\/?)(TABLE|TR|TD|TH|TBODY|THEAD|TFOOT)/gi,
    (match, slash, tag) => '<' + slash + tag.toLowerCase());
  const doc = parser.parseFromString(lowerHtml, 'text/html');
  
  // Zkusit najít tabulku s čtyřhrou
  const tables = doc.querySelectorAll('table.vysledky');
  
  // Pokud není tabulka, vrátit prázdné pole
  if (tables.length === 0) {
    console.warn('[Parser] Žádná tabulka v HTML pro čtyřhru');
    return [];
  }
  
  return parsujTabuldoc(html, year).ctyrhra;
}

export async function importujDataZWebu(v1 = null, year = null) {
  try {
    if (v1 === 60) {
      const html = await stahniHtml(60, year);
      const data = parsujTabuldoc(html, year);
      return { skupinaA: data.skupinaA, skupinaB: data.skupinaB, ctyrhra: [] };
    } else if (v1 === 61) {
      const html = await stahniHtml(61, year);
      // Pro v1=61 je vždy čtyřhra - parsuj čtyřhru samostatně
      const ctyrhraData = parsujCtyrhrul(html, year);
      return { skupinaA: [], skupinaB: [], ctyrhra: ctyrhraData };
    } else {
      const [html60, html61] = await Promise.all([
        stahniHtml(60, year),
        stahniHtml(61, year),
      ]);
      const data60 = parsujTabuldoc(html60, year);
      const ctyrhraData = parsujCtyrhrul(html61, year);
      return {
        skupinaA: data60.skupinaA,
        skupinaB: data60.skupinaB,
        ctyrhra: ctyrhraData,
      };
    }
  } catch (err) {
    console.error('Chyba při importu z webu:', err);
    throw new Error(`Nepodařilo se stáhnout data z webu: ${err.message}`);
  }
}

export function prevedNaZapasy(data, existingMatches = [], year = null) {
  const noveZapasy = [];

  const zpracuj = (zapasy, skupina) => {
    for (const z of zapasy) {
      const existujici = existingMatches.find(e => {
        const samePlayers =
          (e.player1_name === z.player1 && e.player2_name === z.player2) ||
          (e.player1_name === z.player2 && e.player2_name === z.player1);
        if (!samePlayers) return false;
        // Pro aktuální rok (year=null) kontrolujeme i skupinu
        if (year) return e.match_state?.archive_year === year && e.match_state?.skupina === skupina;
        return !e.match_state?.archive_year && e.match_state?.skupina === skupina;
      });

      if (!existujici) {
        const completedSets = [];
        let setsWon = { player1: 0, player2: 0 };

        if (z.score) {
          const parts = z.score.split(',').map(s => s.trim());
          for (const part of parts) {
            const m = part.match(/^(\d+)-(\d+)/);
            if (m) {
              let g1 = parseInt(m[1]);
              let g2 = parseInt(m[2]);
              if (g1 > 9 && ![10, 11, 12, 13, 14, 15].includes(g1)) {
                g1 = parseInt(m[1].toString()[0]);
              }
              if (g2 > 9 && ![10, 11, 12, 13, 14, 15].includes(g2)) {
                g2 = parseInt(m[2].toString()[0]);
              }
              completedSets.push({ player1_games: g1, player2_games: g2 });
              if (g1 > g2) setsWon.player1++;
              else if (g2 > g1) setsWon.player2++;
            }
          }
        }

        noveZapasy.push({
          player1_name: z.player1,
          player2_name: z.player2,
          status: 'finished',
          round: null,
          match_state: {
            player1_name: z.player1,
            player2_name: z.player2,
            server: 1,
            sets_won: setsWon,
            completed_sets: completedSets,
            current_set: { player1_games: 0, player2_games: 0 },
            current_game: { player1_points: '0', player2_points: '0' },
            is_tiebreak: false,
            archive_year: year,
            skupina,
            score_original: z.score,
          },
        });
      }
    }
  };

  zpracuj(data.skuginaA || [], 'A');
  zpracuj(data.skupinaB || [], 'B');
  zpracuj(data.finalek || [], 'FINALE');
  zpracuj(data.ctyrhra || [], 'CTYRHRA');

  return noveZapasy;
}
