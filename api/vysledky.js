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

    const response = await fetch('https://orellichnov.cz/otcl/vysledky/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://orellichnov.cz/otcl/vysledky/',
      },
      body: body,
    });

    const html = await response.text();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(response.status).send(html);
  } catch (err) {
    console.error('[API] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
