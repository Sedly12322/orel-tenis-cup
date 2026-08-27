// import-archive.cjs - Stáhne archiv a importuje do Supabase
// Použití: node import-archive.cjs [rok]
// Příklad: node import-archive.cjs 2025

const { chromium } = require('playwright');
const { JSDOM } = require('jsdom');

// Načti Supabase klíč ze souboru src/supabase.js
function nactiSupabaseKey() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('src/supabase.js', 'utf8');
    const match = content.match(/supabaseKey\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

const SUPABASE_URL = 'https://ckkmvxfyiwrcqalygfvn.supabase.co';
const SUPABASE_KEY = nactiSupabaseKey();

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_KEY nenalezen. Zkontroluj src/supabase.js');
  process.exit(1);
}

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

async function stahniarchivZWebu(rok) {
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
    
    // Vyber rok a odešli formulář
    await page.selectOption('select[name="year"]', String(rok));
    await page.click('input[name="show_archive_submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Klikni na "Dvouhra muži" - JavaScript odešle formulář
    const dvouhraResult = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        if (link.textContent.includes('Dvouhra muži')) {
          // Submit the form with v1=58
          const form = document.getElementById('F1');
          if (form) {
            form.v1.value = '58';
            form.submit();
            return { success: true, method: 'form_submit' };
          }
          link.click();
          return { success: true, method: 'click' };
        }
      }
      return { success: false };
    });
    
    console.log(`📌 Dvouhra klik: ${JSON.stringify(dvouhraResult)}`);
    
    // Počkej na načtení
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Získej HTML
    const html = await page.content();
    
    // Ulož pro debug
    const fs = require('fs');
    fs.writeFileSync(`archiv-${rok}-dvouhra-playwright.html`, html, 'utf8');
    console.log(`📌 HTML uložen do archiv-${rok}-dvouhra-playwright.html`);
    
    // Parsuj HTML
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const tables = doc.querySelectorAll('table.vysledky');
    console.log(`📌 Tabulek nalezeno: ${tables.length}`);
    
    // Získej h3 tagy pro kontextu
    const h3s = doc.querySelectorAll('h3');
    const h3Texts = Array.from(h3s).map(h => h.textContent.trim());
    console.log(`📌 H3 tagy: ${h3Texts.join(', ')}`);
    
    tables.forEach((table, idx) => {
      // Najdi h3 před tabulkou
      let nazev = '';
      let el = table;
      while (el.previousElementSibling) {
        el = el.previousElementSibling;
        if (el.tagName === 'H3') {
          nazev = el.textContent.trim();
          break;
        }
      }
      
      console.log(`📌 Tabulka ${idx}: ${nazev}`);
      
      const { zapasy, hraciStat: stat } = parsujTabulku(table);
      console.log(`   Hráči: ${Object.keys(stat).length}, Zápasy: ${zapasy.length}`);
      
      if (nazev.includes('Finále') || nazev.includes('finále')) {
        vysledky.finalek.push(...zapasy);
      } else if (nazev.toLowerCase().includes('skupina a')) {
        vysledky.skupinaA.push(...zapasy);
      } else if (nazev.toLowerCase().includes('skupina b')) {
        vysledky.skupinaB.push(...zapasy);
      } else {
        vysledky.skupinaA.push(...zapasy);
      }
      
      Object.assign(vysledky.hraciStat, stat);
    });
    
    console.log(`✅ Skupina A: ${vysledky.skupinaA.length} zápasů`);
    console.log(`✅ Skupina B: ${vysledky.skupinaB.length} zápasů`);
    console.log(`✅ Finále: ${vysledky.finalek.length} zápasů`);
    
    // Čtyřhra
    await page.goto('https://orellichnov.cz/otcl/vysledky/', { waitUntil: 'networkidle' });
    await page.selectOption('select[name="year"]', String(rok));
    await page.click('input[name="show_archive_submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        if (link.textContent.includes('Čtyřhra')) {
          const form = document.getElementById('F1');
          if (form) {
            form.v1.value = '59';
            form.submit();
            return true;
          }
          link.click();
          return true;
        }
      }
      return false;
    });
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const ctyrhraHtml = await page.content();
    const ctyrhraDom = new JSDOM(ctyrhraHtml);
    const ctyrhraDoc = ctyrhraDom.window.document;
    
    const ctyrhraTables = ctyrhraDoc.querySelectorAll('table.vysledky');
    console.log(`\n📌 Čtyřhra - tabulek: ${ctyrhraTables.length}`);
    
    ctyrhraTables.forEach((table, idx) => {
      const { zapasy, hraciStat: stat } = parsujTabulku(table);
      vysledky.ctyrhra.push(...zapasy);
      Object.assign(vysledky.hraciStat, stat);
    });
    
    console.log(`✅ Čtyřhra: ${vysledky.ctyrhra.length} zápasů`);
    
  } catch (err) {
    console.error(`❌ Chyba: ${err.message}`);
  }
  
  await browser.close();
  return vysledky;
}

async function ulozDoDB(zapasy, rok, skupina, hraciStat) {
  if (zapasy.length === 0) return 0;
  
  // Smaž stará data
  const deleteUrl = `${SUPABASE_URL}/rest/v1/matches?match_state.archive_year=eq.${rok}&match_state.skupina=eq.${skupina}`;
  await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  
  // Připrav záznamy
  const records = zapasy.map(z => {
    const stat1 = hraciStat[z.player1];
    const stat2 = hraciStat[z.player2];
    
    return {
      player1_name: z.player1,
      player2_name: z.player2,
      status: 'finished',
      round: null,
      match_state: {
        player1_name: z.player1,
        player2_name: z.player2,
        server: 1,
        sets_won: z.sets_won,
        completed_sets: z.completed_sets,
        current_set: { player1_games: 0, player2_games: 0 },
        current_game: { player1_points: "0", player2_points: "0" },
        is_tiebreak: false,
        archive_year: rok,
        skupina: skupina,
        score_original: z.score,
        web_body: stat1?.body ?? null,
        web_poradi: stat1?.poradi ?? null,
        web_body_p2: stat2?.body ?? null,
        web_poradi_p2: stat2?.poradi ?? null
      }
    };
  });
  
  // Vlož po dávkách
  let inserted = 0;
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/matches`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(batch)
    });
    
    if (response.ok) {
      inserted += batch.length;
    } else {
      const errText = await response.text();
      console.error(`❌ Chyba DB: ${response.status} ${errText}`);
    }
  }
  
  return inserted;
}

async function main() {
  const rokArg = process.argv[2];
  const rok = rokArg ? parseInt(rokArg) : 2025;
  
  if (isNaN(rok)) {
    console.error('❌ Neplatný rok. Použití: node import-archive.cjs [rok]');
    console.error('   Příklad: node import-archive.cjs 2024');
    process.exit(1);
  }
  
  console.log('🏓 Orel Tenis Cup - Automatizovaný import archivu');
  console.log('==================================================');
  console.log(`📅 Ročník: ${rok}`);
  
  // Stáhni data
  const data = await stahniarchivZWebu(rok);
  
  // Ulož do DB
  console.log('\n=== Ukládám do databáze ===');
  
  if (data.skupinaA.length > 0) {
    const n = await ulozDoDB(data.skupinaA, rok, 'A', data.hraciStat);
    console.log(`✅ Skupina A: uloženo ${n} zápasů`);
  }
  if (data.skupinaB.length > 0) {
    const n = await ulozDoDB(data.skupinaB, rok, 'B', data.hraciStat);
    console.log(`✅ Skupina B: uloženo ${n} zápasů`);
  }
  if (data.finalek.length > 0) {
    const n = await ulozDoDB(data.finalek, rok, 'FINALE', data.hraciStat);
    console.log(`✅ Finále: uloženo ${n} zápasů`);
  }
  if (data.ctyrhra.length > 0) {
    const n = await ulozDoDB(data.ctyrhra, rok, 'CTYRHRA', data.hraciStat);
    console.log(`✅ Čtyřhra: uloženo ${n} zápasů`);
  }
  
  console.log('\n🎉 Hotovo!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatální chyba:', err.message);
  process.exit(1);
});
