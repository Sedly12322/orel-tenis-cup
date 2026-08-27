/**
 * Import dat z webu orellichnov.cz
 * Stáhne HTML, parsuje tabulky a vrátí strukturovaná data.
 */

const WEB_URL = '/api/vysledky';

/**
 * Stáhne HTML pro danou soutěž (60 = dvouhra, 61 = čtyřhra)
 * @param {number} v1 - 60 = dvouhra, 61 = čtyřhra
 * @param {number|null} year - ročník (null = aktuální)
 */
async function stahniHtml(v1, year = null) {
  let body = `v1=${v1}&v2=&v3=`;
  
  if (year) {
    body = `v1=${v1}&v2=&v3=&year=${year}&show_archive_submit=`;
  }
  
  const response = await fetch(WEB_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: body,
    credentials: 'include', // Důležité pro cookies!
  });
  
  if (!response.ok) {
    throw new Error(`HTTP chyba: ${response.status}`);
  }
  
  return await response.text();
}

/**
 * Vyčistí text z HTML buněk
 */
function vymazHtml(text) {
  return String(text)
    .replace(/&nbsp;/g, ' ')
    .replace(/<BR\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Normalizuje jméno páru (pro čtyřhru)
 */
function normalizujPar(raw) {
  const jmena = String(raw)
    .split(/\s*\n\s*|\s*\/\s*/)
    .map(j => j.replace(/^[\s]+|[\s]+$/g, ''))
    .filter(Boolean);
  return jmena.join(' / ');
}

/**
 * Získá text z buňky HTML, zachovává <BR> jako \n
 */
function getTextFromCell(cell) {
  if (!cell) return '';
  let html = cell.innerHTML;
  html = html.replace(/&nbsp;/g, ' ').replace(/<BR\s*\/?>/gi, '\n');
  html = html.replace(/<[^>]*>/g, '');
  html = html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return html.trim();
}

/**
 * Parsuje tabulku výsledků z HTML
 */
function parsujTabuldoc(html) {
  const parser = new DOMParser();
  // Převedeme na malá písmena kvůli case-sensitive selectorům
  // (web vrací <TABLE> místo <table>)
  const lowerHtml = html.replace(/<(\/?)(TABLE|TR|TD|TH|TBODY|THEAD|TFOOT)/gi, function(match, slash, tag) {
    return '<' + slash + tag.toLowerCase();
  });
  const doc = parser.parseFromString(lowerHtml, 'text/html');
  const tables = doc.querySelectorAll('table.vysledky');
  
  const vysledky = {
    skupinaA: [],
    skupinaB: [],
    finalek: [],
    ctyrhra: []
  };
  
  tables.forEach((table) => {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 3) return;
    
    // Najdi hlavičku s názvem skupiny - h3 před tabulkou
    let nazevSkupiny = '';
    let prev = table.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'H3') {
        nazevSkupiny = prev.textContent.trim();
        break;
      }
      prev = prev.previousElementSibling;
    }
    
    // Hráči z hlavičky tabulky
    const playerRow = rows[1];
    const playerCells = playerRow.querySelectorAll('td');
    const hraci = [];
    for (let i = 0; i < playerCells.length; i++) {
      const text = getTextFromCell(playerCells[i]);
      if (text && !text.match(/^\d+$/)) {
        hraci.push(text);
      }
    }
    
    // Parsuj zápasy (jen horní trojúhelník - ne dvojité zápasy)
    const zapasy = [];
    for (let i = 2; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length < 3) continue;
      
      const hrac1 = normalizujPar(getTextFromCell(cells[1]));
      if (!hrac1 || hrac1 === 'XX') continue;
      
      const hrac1Index = i - 2;
      
      for (let j = 2; j < cells.length - 3; j++) {
        const hrac2Index = j - 2;
        if (hrac2Index >= hrac1Index) continue; // Horní trojúhelník
        
        const skore = getTextFromCell(cells[j]);
        if (skore && skore !== 'XX' && (j - 2) < hraci.length) {
          const hrac2 = normalizujPar(hraci[j - 2]);
          zapasy.push({
            player1: hrac1,
            player2: hrac2,
            score: skore
          });
        }
      }
    }
    
    if (nazevSkupiny.includes('Finále')) {
      vysledky.finalek = zapasy;
    } else if (nazevSkupiny.includes('Skupina A')) {
      vysledky.skupinaA = zapasy;
    } else if (nazevSkupiny.includes('Skupina B')) {
      vysledky.skupinaB = zapasy;
    } else if (nazevSkupiny.includes('Čtyřhra') || nazevSkupiny.toLowerCase().includes('čtyřhra')) {
      vysledky.ctyrhra = zapasy;
    } else {
      // Neznámá skupina - přidat do A
      vysledky.skupinaA = [...vysledky.skupinaA, ...zapasy];
    }
  });
  
  return vysledky;
}

/**
 * Hlavní funkce: stáhne a parsuje data z webu
 */
export async function importujDataZWebu(v1 = null, year = null) {
  try {
    if (v1 === 60) {
      const htmlDvouhra = await stahniHtml(60, year);
      const dataDvouhra = parsujTabuldoc(htmlDvouhra);
      return {
        skupinaA: dataDvouhra.skupinaA,
        skupinaB: dataDvouhra.skupinaB,
        ctyrhra: [],
      };
    } else if (v1 === 61) {
      const htmlCtyrhra = await stahniHtml(61, year);
      const dataCtyrhra = parsujTabuldoc(htmlCtyrhra);
      return {
        skupinaA: [],
        skupinaB: [],
        ctyrhra: dataCtyrhra.ctyrhra,
      };
    } else {
      const htmlDvouhra = await stahniHtml(60, year);
      const dataDvouhra = parsujTabuldoc(htmlDvouhra);
      const htmlCtyrhra = await stahniHtml(61, year);
      const dataCtyrhra = parsujTabuldoc(htmlCtyrhra);
      return {
        skupinaA: dataDvouhra.skupinaA,
        skupinaB: dataDvouhra.skupinaB,
        ctyrhra: dataCtyrhra.ctyrhra,
      };
    }
  } catch (err) {
    console.error('Chyba při importu z webu:', err);
    throw new Error(`Nepodařilo se stáhnout data z webu: ${err.message}`);
  }
}

/**
 * Konvertuje surová data do formátu pro Supabase
 */
export function prevedNaZapasy(data, existingMatches = [], year = null) {
  const noveZapasy = [];
  
  const zpracuj = (zapasy, skupina) => {
    for (const z of zapasy) {
      const existujici = existingMatches.find(e => {
        const samePlayers = 
          (e.player1_name === z.player1 && e.player2_name === z.player2) ||
          (e.player1_name === z.player2 && e.player2_name === z.player1);
        if (!samePlayers) return false;
        
        if (year) {
          return e.match_state?.archive_year === year && e.match_state?.skupina === skupina;
        } else {
          return !e.match_state?.archive_year;
        }
      });
      
      if (!existujici) {
        const completedSets = parsujScore(z.score);
        const setsWon = { player1: 0, player2: 0 };
        for (const s of completedSets) {
          if (s.player1_games > s.player2_games) setsWon.player1++;
          else if (s.player2_games > s.player1_games) setsWon.player2++;
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
            current_game: { player1_points: "0", player2_points: "0" },
            is_tiebreak: false,
            archive_year: year,
            skupina: skupina,
            score_original: z.score
          }
        });
      }
    }
  };
  
  zpracuj(data.skupinaA || [], 'A');
  zpracuj(data.skupinaB || [], 'B');
  zpracuj(data.finalek || [], 'FINALE');
  zpracuj(data.ctyrhra || [], 'CTYRHRA');
  
  // Přidej body a pořadí z webu (pokud existují)
  if (data.hraciStat) {
    for (const z of noveZapasy) {
      const p1 = data.hraciStat[z.player1_name];
      const p2 = data.hraciStat[z.player2_name];
      if (p1) {
        z.match_state.web_body = p1.body;
        z.match_state.web_poradi = p1.poradi;
      }
      if (p2) {
        z.match_state.web_body_p2 = p2.body;
        z.match_state.web_poradi_p2 = p2.poradi;
      }
    }
  }
  
  return noveZapasy;
}

/**
 * Parsuje score ve formátu "6-4, 4-6, 5-7"
 */
function parsujScore(scoreStr) {
  const sets = [];
  if (!scoreStr || scoreStr.includes('K')) return sets;
  
  const casti = scoreStr.split(',').map(s => s.trim());
  
  for (const cast of casti) {
    const match = cast.match(/^(\d+)-(\d+)/);
    if (match) {
      let g1 = parseInt(match[1]);
      let g2 = parseInt(match[2]);
      
      if (g1 > 9 && ![10, 11, 12, 13, 14, 15].includes(g1)) {
        g1 = parseInt(match[1].charAt(0));
      }
      if (g2 > 9 && ![10, 11, 12, 13, 14, 15].includes(g2)) {
        g2 = parseInt(match[2].charAt(0));
      }
      
      sets.push({ player1_games: g1, player2_games: g2 });
    }
  }
  
  return sets;
}
