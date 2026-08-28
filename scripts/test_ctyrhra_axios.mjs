import axios from 'axios';

const body = 'v1=61&v2=&v3=';

const opts = {
  method: 'POST',
  url: 'https://orellichnov.cz/otcl/vysledky/',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Length': Buffer.byteLength(body),
  },
  data: body,
  httpsAgent: new (import('https').Agent)({ rejectUnauthorized: false }),
  timeout: 15000,
};

axios(opts)
  .then(({ data: html, status }) => {
    console.log('STATUS:', status);
    console.log('LENGTH:', html.length);

    const h2 = html.match(/<H2[^>]*>([^<]+)<\/H2>/i);
    console.log('H2:', h2 ? h2[1].trim() : '???');

    const h3s = html.match(/<H3[^>]*>([^<]+)<\/H3>/gi);
    console.log('H3s:', h3s ? h3s.map(m => m.replace(/<[^>]+>/g, '').trim()).join(' | ') : 'none');

    const tables = html.match(/<table[^>]*class=["']vysledky["']/gi) || [];
    console.log('Tables count:', tables.length);

    // Table title associations
    const blocks = html.match(/<(?:H2|H3)[^>]*>[^<]+<\/(?:H2|H3)>[\s\S]*?<table[^>]*class=["']vysledky["']/gi) || [];
    console.log('Blocks with title:', blocks.length);
    blocks.forEach((b, i) => {
      const m = b.match(/<(?:H2|H3)[^>]*>([^<]+)<\/(?:H2|H3)>/);
      console.log(`  Block ${i+1} title:`, m ? m[1].trim() : '???');
      const tds = (b.match(/<td[^>]*>/gi) || []).length;
      console.log(`  Block ${i+1} td count:`, tds);
    });

    // Show first part of body after H2
    const idx = html.indexOf('<H2>');
    if (idx >= 0) {
      console.log('--- SNIPPET after H2 (3000 chars) ---');
      console.log(html.substring(idx, Math.min(idx + 3000, html.length)));
    }
  })
  .catch(err => {
    console.error('Request error:', err.message);
    if (err.response) console.error('Status:', err.response.status, err.response.statusText);
    if (err.config) console.error('URL:', err.config.url);
  });
