#!/usr/bin/env node
import https from 'https';

const body = 'v1=61&v2=&v3=';

const options = {
  hostname: 'orellichnov.cz',
  port: 443,
  path: '/otcl/vysledky/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(body),
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  rejectUnauthorized: false
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('LENGTH:', data.length);
    
    // H2/H3
    const h2Match = data.match(/<H2[^>]*>([^<]+)<\/H2>/i);
    if (h2Match) console.log('H2:', h2Match[1].trim());
    
    const h3Matches = data.match(/<H3[^>]*>([^<]+)<\/H3>/gi);
    if (h3Matches) console.log('H3s:', h3Matches.map(m => m.replace(/<[^>]+>/g,'').trim()).join(' | '));
    
    const tableCount = (data.match(/<table[^>]*class=["']vysledky["']/gi) || []).length;
    const tables = (data.match(/<table[^>]*class=["']vysledky["']/gi) || []);
    console.log('Tables count:', tables.length);
    
    // Find table titles
    const tableBlocks = data.match(/<(?:H2|H3)[^>]*>[^<]+<\/(?:H2|H3)>[\s\S]*?<table[^>]*class=["']vysledky["']/gi) || [];
    console.log('Table blocks (with title):', tableBlocks.length);
    tableBlocks.forEach((block, i) => {
      const titleMatch = block.match(/<(?:H2|H3)[^>]*>([^<]+)<\/(?:H2|H3)>/);
      console.log(`  Block ${i+1} title:`, titleMatch ? titleMatch[1].trim() : '???');
      const tdCount = (block.match(/<td[^>]*>/gi) || []).length;
      console.log(`  Block ${i+1} td count:`, tdCount);
    });
    
    // Show first 3000 chars after H2
    const h2Idx = data.indexOf('<H2>');
    if (h2Idx >= 0) {
      console.log('--- SNIPPET after H2 ---');
      console.log(data.substring(h2Idx, Math.min(h2Idx + 3000, data.length)));
    }
  });
});

req.on('error', (e) => { console.error('Request error:', e.message); });
req.write(body);
req.end();
req.setTimeout(15000, () => { req.destroy(); console.log('TIMEOUT'); });
