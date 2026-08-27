const https = require('https');
const { URL } = require('url');

function fetchWithTls(targetUrl, postBody) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postBody),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
        'Origin': 'https://orellichnov.cz',
        'Referer': 'https://orellichnov.cz/otcl/vysledky/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      rejectUnauthorized: false,
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    
    req.on('error', (err) => reject(err));
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(postBody);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'object' && body !== null) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(body)) {
        params.append(key, value);
      }
      body = params.toString();
    }
    if (!body || body === 'undefined' || body === 'null') {
      body = 'v1=60&v2=&v3=';
    }

    console.log('[API] Request body:', body);

    const result = await fetchWithTls('https://orellichnov.cz/otcl/vysledky/', body);
    console.log('[API] Response status:', result.status, 'Length:', result.body.length);

    // Check if response contains table
    const hasTable = result.body.includes('class="vysledky"');
    console.log('[API] Has table:', hasTable);
    
    if (!hasTable) {
      console.warn('[API] No table in response, first 500 chars:', result.body.substring(0, 500));
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(result.body);
  } catch (err) {
    console.error('[API] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
