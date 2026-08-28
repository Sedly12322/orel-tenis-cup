// scrape-archive.cjs - Stáhne archivní data z orellichnov.cz
const { chromium } = require('playwright');
const { JSDOM } = require('jsdom');

function normalizujPar(raw) {
  const jmena = String(raw)
    .split(/\s*\n\s*|\s*\/\s*/)
    .map(j => j.replace(/^[\s]+|[\s]+$/g, ''))
    .filter(Boolean);
  return jmena.join(' / ');
}

function getTextFromCell(cell) {
  if (!cell) return '';
  let html = cell.innerHTML || '';
  html = html.replace(/&nbsp;/g, ' ').replace(/<BR\s*\/?>/gi, '\n');
  html = html.replace(/<[^>]*>/g, '');
  html = html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return html.trim();
}

function parsujScore(scoreStr) {
  const sets = [];
  if (!scoreStr || scoreStr.includes('K')) return sets;
  const casti = scoreStr.split(',').map(s => s.trim());
  for (const cast of casti) {
    const match = cast.match(/^(\d+)-(\d+)/);
    if (match) {
      let g1 = parseInt(match[1]);
      let g2 = parseInt(match[2]);
      if (g1 > 9 && ![10,11,12,13,14,15].includes(g1)) g1 = parseInt(match[1].charAt(0));
      if (g2 > 9 && ![10,11,12,13,14,15].includes(g2)) g2 = parseInt(match[2].charAt(0));
      sets.push({ player1_games: g1, player2_games: g2 });
    }
  }
  return sets;
}

function parsujTabulku(table) {
  const rows = table.querySelectorAll('tr');
  if (rows.length < 3) return { zapasy: [], hraciStat: {} };
  
  const hraciMap = new Map();
  for (let i = 2; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll('td');
    if (cells.length >= 2) {
      const idx = parseInt(getTextFromCell(cells[0])) || (i - 1);
      const jmeno = normalizujPar(getTextFromCell(cells[1]));
      if (jmeno && jmeno !== 'XX') {
        hraciMap.set(idx, jmeno);
      }
    }
  }
  const hraci = Array.from(hraciMap.entries()).sort((a, b) => a[0] - b[0]).map(e => e[1]);
  
  const zapasy = [];
  const hraciStat = {};
  
  for (let i = 2; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll('td');
    if (cells.length < 3) continue;
    
    const hrac1 = normalizujPar(getTextFromCell(cells[1]));
    if (!hrac1 || hrac1 === 'XX') continue;
    
    const hrac1Index = i - 2;
    const body = parseInt(getTextFromCell(cells[cells.length - 3])) || 0;
    const poradi = getTextFromCell(cells[cells.length - 1]);
    hraciStat[hrac1] = { body, poradi };
    
    for (let j = 2; j < cells.length - 3; j++) {
      const hrac2Index = j - 2;
      if (hrac2Index >= hrac1Index) continue;
      
      const skore = getTextFromCell(cells[j]);
      if (skore && skore !== 'XX' && (j - 2) < hraci.length) {
        const hrac2 = normalizujPar(hraci[j - 2]);
        const sets = parsujScore(skore);
        const setsWon = { player1: 0, player2: 0 };
        for (const s of sets) {
          if (s.player1_games > s.player2_games) setsWon.player1++;
          else if (s.player2_games > s.player1_games) setsWon.player2++;
        }
        
        zapasy.push({
          player1: hrac1,
          player2: hrac2,
          score: skore,
          sets_won: setsWon,
          completed_sets: sets
        });
      }
    }
  }
  
  return { zapasy, hraciStat };
}

async function stahniArchiv(rok) {
  console.log(`\n=== Stahuji rok ${rok} ===`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ignoreHTTPSErrors: true,
  });
  
  const vysledky = { skupinaA: [], skupinaB: [], finalek: [], ctyrhra: [], hraciStat: {} };
  
  try {
    const page = await context.newPage();
    await page.goto('https://orellichnov.cz/otcl/vysledky/', { waitUntil: 'networkidle' });
    
    // Vyber rok
    await page.selectOption('select[name="year"]', String(rok));
    await page.click('input[name="show_archive_submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Dvouhra
    const dvouhraLink = await page.$('a:has-text("Dvouhra muži")');
    if (dvouhraLink) {
      await dvouhraLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
    }
    
    // Parsuj všechny tabulky
    const tables = await page.$$('table.vysledky');
    for (const table of tables) {
      const html = await table.evaluate(el => el.outerHTML);
      const dom = new JSDOM(`<table>${html}</table>`);
      const tableEl = dom.window.document.querySelector('table');
      
      // Najdi hlavičku - h3 před tabulkou
      let nazevSkupiny = '';
      let prev = await table.evaluateHandle(el => el.previousElementSibling);
      let _prevHtml = await prev.jsonValue().catch(() => null);
      
      // Zkus najít h3 v okolí
      const sectionHtml = await page.evaluate((tableIdx) => {
        const tables = document.querySelectorAll('table.vysledky');
        const table = tables[tableIdx];
        let html = '';
        let el = table;
        while (el.previousElementSibling) {
          el = el.previousElementSibling;
          if (el.tagName === 'H3') {
            html = el.textContent;
            break;
          }
        }
        return html;
      }, tables.indexOf(table));
      
      nazevSkupiny = sectionHtml || '';
      
      const { zapasy, hraciStat: stat } = parsujTabulku(tableEl);
      
      // Přidej do správné skupiny
      if (nazevSkupiny.includes('Finále')) {
        vysledky.finalek.push(...zapasy);
      } else if (nazevSkupiny.includes('skupina A') || nazevSkupiny.includes('Skupina A')) {
        vysledky.skupinaA.push(...zapasy);
      } else if (nazevSkupiny.includes('skupina B') || nazevSkupiny.includes('Skupina B')) {
        vysledky.skupinaB.push(...zapasy);
      } else if (nazevSkupiny.includes('Čtyřhra') || nazevSkupiny.toLowerCase().includes('čtyřhra')) {
        vysledky.ctyrhra.push(...zapasy);
      } else {
        // Pokud nemáme informaci o skupině, zkus podle obsahu
        // (čtyřhra má v name " / " )
        const isCtyrhra = zapasy.some(z => z.player1.includes(' / ') || z.player2.includes(' / '));
        if (isCtyrhra) {
          vysledky.ctyrhra.push(...zapasy);
        }
      }
      
      // Sloučit statistiky
      Object.assign(vysledky.hraciStat, stat);
    }
    
    console.log(`✅ Skupina A: ${vysledky.skupinaA.length} zápasů`);
    console.log(`✅ Skupina B: ${vysledky.skupinaB.length} zápasů`);
    console.log(`✅ Finále: ${vysledky.finalek.length} zápasů`);
    console.log(`✅ Čtyřhra: ${vysledky.ctyrhra.length} zápasů`);
    
  } catch (err) {
    console.error(`❌ Chyba: ${err.message}`);
  }
  
  await browser.close();
  return vysledky;
}

// Spuštění z příkazové řádky
const rok = parseInt(process.argv[2]) || 2025;
stahniArchiv(rok).then(data => {
  console.log('\nData stažena:');
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
