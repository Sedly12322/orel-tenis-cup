// api/vysledky.js - Serverless funkce pro Vercel
export default async function handler(req, res) {
  // Podpora OPTIONS pro CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Získej body jako string
    let body = req.body;
    if (typeof body === 'object' && body !== null) {
      // Pokud je objekt, převeď na URL-encoded string
      body = new URLSearchParams(body).toString();
    }
    if (!body || body === 'undefined' || body === 'null') {
      body = 'v1=60&v2=&v3=';
    }

    console.log('[API] Request body:', body);
    console.log('[API] Fetching from: https://orellichnov.cz/otcl/vysledky/');

    const response = await fetch('https://orellichnov.cz/otcl/vysledky/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://orellichnov.cz/otcl/vysledky/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
      },
      body: body,
      redirect: 'follow',
    });

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
    console.error('[API] Stack:', err.stack);
    res.status(500).json({ 
      error: err.message,
      code: err.code,
      type: err.type,
      stack: err.stack?.split('\n').slice(0, 3).join('\n')
    });
  }
}
