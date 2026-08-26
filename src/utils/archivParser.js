// Parsuje archivní HTML z orellichnov.cz
function parsujTabulkuHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table.vysledky');
  
  const vysledky = { skupinaA: [], skupinaB: [], ctyrhra: [] };
  
  tables.forEach((table) => {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 3) return;
    
    // Najdi hlavičku s názvem skupiny
    const headerEl = table.closest('article')?.querySelector('h3');
    const nazevSkupiny = headerEl ? headerEl.textContent.trim() : '';
    
    // Hráči z hlavičky tabulky
    const playerRow = rows[1];
    const playerCells = playerRow.querySelectorAll('td');
    const hraci = [];
    for (let i = 0; i < playerCells.length; i++) {
      const text = getTextFromCell(playerCells[i]);
      if (text && !text.match(/^\d+$/)) hraci.push(text);
    }
    
    // Parsuj zápasy
    const zapasy = [];
    for (let i = 2; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length < 3) continue;
      
      const hrac1 = normalizujPar(getTextFromCell(cells[1]));
      if (!hrac1 || hrac1 === 'XX') continue;
      
      for (let j = 2; j < cells.length - 3; j++) {
        const skore = getTextFromCell(cells[j]);
        if (skore && skore !== 'XX' && (j - 2) < hraci.length) {
          const hrac2 = normalizujPar(hraci[j - 2]);
          zapasy.push({ player1: hrac1, player2: hrac2, score: skore });
        }
      }
    }
    
    // Přiřaď do skupiny
    if (nazevSkupiny.includes('skupina A')) {
      vysledky.skupinaA = zapasy;
    } else if (nazevSkupiny.includes('skupina B')) {
      vysledky.skupinaB = zapasy;
    } else if (nazevSkupiny.includes('Finále')) {
      vysledky.skupinaA = [...vysledky.skupinaA, ...zapasy];
    } else {
      vysledky.skupinaA = [...vysledky.skupinaA, ...zapasy];
    }
  });
  
  return vysledky;
}

// Spočítat body ze skóre
function spocitajBody(scoreStr) {
  if (!scoreStr || scoreStr.includes('K')) return 0;
  const sets = scoreStr.split(',').map(s => s.trim());
  let body = 0;
  for (const set of sets) {
    const match = set.match(/^(\d+)-(\d+)/);
    if (match) {
      const g1 = parseInt(match[1]);
      const g2 = parseInt(match[2]);
      if (g1 > g2) body += 3;
      else if (g1 === g2) body += 1;
    }
  }
  return body;
}

// Vytvořit tabulku pro archiv
function vytvoritTabulku(matches) {
  const hraci = new Set();
  matches.forEach(z => {
    hraci.add(z.player1);
    hraci.add(z.player2);
  });
  
  const staty = {};
  hraci.forEach(h => {
    staty[h] = { jmeno: h, z: 0, v: 0, p: 0, setyW: 0, setyL: 0, body: 0 };
  });
  
  matches.forEach(z => {
    const s1 = spocitajBody(z.score);
    // Určit výhru/prohru
    const sets = z.score.split(',').map(s => s.trim());
    let vyhraneSety1 = 0, vyhraneSety2 = 0;
    for (const set of sets) {
      const match = set.match(/^(\d+)-(\d+)/);
      if (match) {
        if (parseInt(match[1]) > parseInt(match[2])) vyhraneSety1++;
        else if (parseInt(match[2]) > parseInt(match[1])) vyhraneSety2++;
      }
    }
    
    if (staty[z.player1]) {
      staty[z.player1].z++;
      staty[z.player1].setyW += vyhraneSety1;
      staty[z.player1].setyL += vyhraneSety2;
      staty[z.player1].body += s1;
      if (vyhraneSety1 > vyhraneSety2) staty[z.player1].v++;
      else staty[z.player1].p++;
    }
    if (staty[z.player2]) {
      staty[z.player2].z++;
      staty[z.player2].setyW += vyhraneSety2;
      staty[z.player2].setyL += vyhraneSety1;
      staty[z.player2].body += (3 - s1);
      if (vyhraneSety2 > vyhraneSety1) staty[z.player2].v++;
      else staty[z.player2].p++;
    }
  });
  
  return Object.values(staty).sort((a, b) => b.body - a.body || b.v - a.v);
}
