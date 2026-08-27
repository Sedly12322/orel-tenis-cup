// api/vysledky.js - Serverless funkce pro Vercel
export const runtime = 'nodejs';
export const preferredRegion = 'iad1';

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
    if (!body || body === 'undefined' || body === 'null') {
      body = 'v1=60&v2=&v3=';
    }

    console.log('[API] Request body:', body);
    console.log('[API] NODE_ENV:', process.env.NODE_ENV);
    console.log('[API] Runtime:', process.version);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('https://orellichnov.cz/otcl/vysledky/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://orellichnov.cz/otcl/vysledky/',
      },
      body: body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    console.log('[API] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error response:', errorText.substring(0, 500));
      return res.status(response.status).json({ 
        error: `HTTP ${response.status}`, 
        details: errorText.substring(0, 200) 
      });
    }

    const html = await response.text();
    console.log('[API] HTML length:', html.length);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(html);
  } catch (err) {
    console.error('[API] Exception:', err.message);
    console.error('[API] Stack:', err.stack?.split('\n').slice(0, 5).join('\n'));
    res.status(500).json({
      error: err.message,
      name: err.name,
      stack: err.stack?.split('\n').slice(0, 3).join('\n')
    });
  }
}
