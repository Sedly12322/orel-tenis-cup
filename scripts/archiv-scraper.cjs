// archiv-scraper.cjs - Stáhne a parsuje archivní data z orellichnov.cz
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROKY = [2025, 2024, 2023];

// Skript běží z kořene repo i z podadresáře scripts/
const REPO_ROOT = process.cwd().endsWith('scripts') ? process.cwd().replace('/scripts', '') : process.cwd();

function parseHTML(html) {
  const tables = [];
  const parser = new (require('jsdom').JSDOM)(html);
  const doc = parser.window.document;
  
  const tablesEl = doc.querySelectorAll('table.vysledky');
  tablesEl.forEach((table, _idx) => {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 3) return;
    
    const header = rows[0].querySelector('td')?.textContent?.trim() || '';
    const players = [];
    
    // Hráči z hlavičky
    const playerCells = rows[1].querySelectorAll('td');
    for (let i = 0; i < playerCells.length; i++) {
      const text = playerCells[i].textContent.trim();
      if (text && !text.match(/^\d+$/)) {
        players.push(text);
      }
    }
    
    // Zápasy
    const matches = [];
    for (let i = 2; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length < 3) continue;
      
      const player1 = cells[1].textContent.trim();
      if (!player1 || player1 === 'XX') continue;
      
      for (let j = 2; j < cells.length - 3; j++) {
        const score = cells[j].textContent.trim();
        if (score && score !== 'XX') {
          const player2 = players[j - 2];
          if (player2) {
            matches.push({ player1, player2, score });
          }
        }
      }
    }
    
    tables.push({ header, players, matches });
  });
  
  return tables;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ignoreHTTPSErrors: true,
  });
  
  const allData = {};
  
  for (const rok of ROKY) {
    console.log(`\n=== Ročník ${rok} ===`);
    const page = await context.newPage();
    
    try {
      await page.goto('https://orellichnov.cz/otcl/vysledky/', { waitUntil: 'networkidle' });
      await page.selectOption('select[name="year"]', String(rok));
      await page.click('input[name="show_archive_submit"]');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Dvouhra
      await page.$eval('a:has-text("Dvouhra muži")', el => el.click());
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const htmlDvouhra = await page.content();
      
      // Čtyřhra
      await page.goto('https://orellichnov.cz/otcl/vysledky/', { waitUntil: 'networkidle' });
      await page.selectOption('select[name="year"]', String(rok));
      await page.click('input[name="show_archive_submit"]');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.$eval('a:has-text("Čtyřhra")', el => el.click());
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const htmlCtyrhra = await page.content();
      
      // Parse
      const dvouhraTables = parseHTML(htmlDvouhra);
      const ctyrhraTables = parseHTML(htmlCtyrhra);
      
      allData[rok] = { dvouhra: dvouhraTables, ctyrhra: ctyrhraTables };
      
      console.log(`✅ Dvouhra: ${dvouhraTables.reduce((acc, t) => acc + t.matches.length, 0)} zápasů`);
      console.log(`✅ Čtyřhra: ${ctyrhraTables.reduce((acc, t) => acc + t.matches.length, 0)} zápasů`);
      
    } catch (err) {
      console.error(`❌ Chyba: ${err.message}`);
    }
    
    await page.close();
  }
  
  // Ulož do JSON
  fs.writeFileSync(path.join(REPO_ROOT, 'archiv-data.json'), JSON.stringify(allData, null, 2), 'utf8');
  console.log('\n✅ Data uložena do archiv-data.json');
  
  await browser.close();
}

main().catch(console.error);
