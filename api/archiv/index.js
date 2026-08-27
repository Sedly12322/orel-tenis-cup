// api/archiv/index.js - Serverless funkce pro Vercel archiv
import https from 'https';
import http from 'http';
import { URL } from 'url';

function fetchUrl(targetUrl, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://orellichnov.cz/otcl/archiv/',
      },
      rejectUnauthorized: false, // Pro self-signed certifikáty
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    
    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'object' && body !== null) {
      body = new URLSearchParams(body).toString();
    }
    if (!body) body = '';

    const result = await fetchUrl('https://orellichnov.cz/otcl/archiv/', body);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(result.status).send(result.body);
  } catch (err) {
    console.error('[API Archiv] Error:', err.message, err.code);
    res.status(500).json({ 
      error: err.message,
      code: err.code,
    });
  }
}
