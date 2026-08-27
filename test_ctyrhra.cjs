const https = require('https');
const data = 'v1=61&v2=&v3=';

const options = {
  hostname: 'orellichnov.cz',
  port: 443,
  path: '/otcl/vysledky/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(data),
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('LENGTH:', body.length);
    
    // Extract H2/H3 content
    const h2Match = body.match(/<H2[^>]*>([^<]+)<\/H2>/i);
    if (h2Match) console.log('H2:', h2Match[1].trim());
    
    const h3Matches = body.match(/<H3[^>]*>([^<]+)<\/H3>/gi);
    if (h3Matches) console.log('H3s:', h3Matches.map(m => m.replace(/<[^>]+>/g,'').trim()).join(' | '));
    
    // Count tables
    const tableCount = (body.match(/<table[^>]*class="vysledky"/gi) || []).length;
    console.log('Tables with vysledky class:', tableCount);
    
    // Check if ctyrhra text exists  
    const hasCtyrhra = body.toLowerCase().includes('čtyřhra') || body.toLowerCase().includes('ctyrhra');
    console.log('Has ctyrhra text:', hasCtyrhra);
    
    // Tables details - find table.nadpis or similar
    const tableWithTitle = body.match(/<(H2|H3)[^>]*>([^<]+)<\/\1>[\s\S]*?<table[^>]*class="vysledky"/gi);
    if (tableWithTitle) {
      console.log('Table titles found:', tableWithTitle.length);
      tableWithTitle.forEach(t => {
        const title = t.match(/<(H2|H3)[^>]*>([^<]+)<\//);
        if (title) console.log('  Title:', title[2].trim());
      });
    }
    
    // Show beginning of body (after header)
    console.log('--- SNIPPET (first 2500 after H2) ---');
    const idx = body.indexOf('<H2>');
    if (idx >= 0) console.log(body.substring(idx, idx + 2500));
  });
});

req.on('error', (e) => { console.error('Request error:', e.message); });
req.write(data);
req.end();
req.setTimeout(10000, () => { req.destroy(); console.log('TIMEOUT'); });
