const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROKY = [2025, 2024];

// Skript běží z kořene repo i z podadresáře scripts/
const REPO_ROOT = process.cwd().endsWith('scripts') ? process.cwd().replace('/scripts', '') : process.cwd();

async function stahniArchiv(rok) {
  console.log(`\n=== Stahuji rok ${rok} ===`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  
  try {
    // Navigace na stránku
    await page.goto('https://orellichnov.cz/otcl/vysledky/', { waitUntil: 'networkidle' });
    
    // Vyber rok z dropdownu a odešli formulář
    await page.selectOption('select[name="year"]', String(rok));
    await page.click('input[name="show_archive_submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Zkus kliknout na "Čtyřhra"
    const ctyrhraLink = await page.$('a:has-text("Čtyřhra")');
    if (ctyrhraLink) {
      await ctyrhraLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    // Získej HTML
    const html = await page.content();
    const filename = `archiv-${rok}-ctyrhra.html`;
    fs.writeFileSync(path.join(REPO_ROOT, filename), html, 'utf8');
    console.log(`✅ Čtyřhra: ${filename}`);
    
    // Zpět a kliknout na "Dvouhra muži"
    await page.goto('https://orellichnov.cz/otcl/vysledky/', { waitUntil: 'networkidle' });
    await page.selectOption('select[name="year"]', String(rok));
    await page.click('input[name="show_archive_submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const dvouhraLink = await page.$('a:has-text("Dvouhra muži")');
    if (dvouhraLink) {
      await dvouhraLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    const html2 = await page.content();
    const filename2 = `archiv-${rok}-dvouhra.html`;
    fs.writeFileSync(path.join(REPO_ROOT, filename2), html2, 'utf8');
    console.log(`✅ Dvouhra: ${filename2}`);
    
  } catch (err) {
    console.error(`❌ Chyba: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🏓 Archiv Orel Tenis Cup');
  
  for (const rok of ROKY) {
    await stahniArchiv(rok);
  }
  
  console.log('\n✅ Hotovo!');
}

main().catch(e => { console.error(e); process.exit(1); });
