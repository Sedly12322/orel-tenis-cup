const https = require('https');
const { URL } = require('url');

function fetchUrl(targetUrl, postBody) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postBody),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://orellichnov.cz/otcl/archiv/',
      },
      rejectUnauthorized: false,
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    
    req.on('error', (err) => reject(err));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(postBody);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
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
    if (!body) body = '';

    console.log('[API Archiv] Fetching from orellichnov.cz...');
    const result = await fetchUrl('https://orellichnov.cz/otcl/archiv/', body);
    console.log('[API Archiv] Response status:', result.status, 'Length:', result.body.length);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(result.status).send(result.body);
  } catch (err) {
    console.error('[API Archiv] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
