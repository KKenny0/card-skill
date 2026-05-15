const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8421;
const SELECTION_FILE = '/tmp/wjy_mockup_selection.json';

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /select — receive user's design selection
  if (req.method === 'POST' && req.url === '/select') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(SELECTION_FILE, JSON.stringify(data, null, 2));
        console.log(`[wjy-mockup] Selected: ${data.name} (${data.design})`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, design: data.design }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // GET / — serve picker HTML (path via query param)
  if (req.method === 'GET' && req.url.startsWith('/?html=')) {
    const htmlPath = decodeURIComponent(req.url.split('html=')[1]);
    try {
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e) {
      res.writeHead(404);
      res.end('Picker HTML not found: ' + htmlPath);
    }
    return;
  }

  // GET /status — check if server is running
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[wjy-mockup] Picker server running on http://localhost:${PORT}`);
});
