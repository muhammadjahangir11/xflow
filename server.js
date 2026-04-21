// server.js — tiny static file server for the UAE towers map.
// Usage:  node server.js          (uses port 8069)
//         PORT=8090 node server.js (override port)
// Requires: Node 14+. No npm install needed.

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = Number(process.env.PORT) || 8069;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm':  'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv':  'text/csv; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2'
};

// Pick the first .html file in the folder as the default page for "/"
function pickDefaultHtml(){
  try {
    const htmls = fs.readdirSync(ROOT).filter(f => /\.html?$/i.test(f)).sort();
    return htmls[0] || 'index.html';
  } catch { return 'index.html'; }
}
const DEFAULT_HTML = pickDefaultHtml();

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split('?')[0]); }
  catch { urlPath = req.url; }

  if (urlPath === '/' || urlPath === '') urlPath = '/' + DEFAULT_HTML;

  const filePath = path.normalize(path.join(ROOT, urlPath));

  // Block directory traversal (../ etc.)
  if (!filePath.startsWith(ROOT)){
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()){
      console.log(`${new Date().toLocaleTimeString()}  ${req.method}  ${urlPath}  -> 404 Not Found`);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found: ' + urlPath);
    }

    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type':   mime,
      'Content-Length': stats.size,
      'Cache-Control':  'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.on('error', e => { console.error('Stream error:', e); res.end(); });
    stream.pipe(res);

    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`${new Date().toLocaleTimeString()}  ${req.method}  ${urlPath}  (${sizeKB} KB)`);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE'){
    console.error(`\n  Port ${PORT} is already in use. Try:  PORT=8081 node server.js\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/`;
  console.log('');
  console.log(`  Server running at  ${url}`);
  console.log(`  Serving folder:    ${ROOT}`);
  console.log(`  Default page:      ${DEFAULT_HTML}`);
  console.log(`  Press Ctrl+C to stop.`);
  console.log('');

  // Best-effort browser auto-open. Silent on failure.
  const opener = process.platform === 'darwin' ? 'open'
               : process.platform === 'win32' ? 'start ""'
               : 'xdg-open';
  exec(`${opener} "${url}"`, () => {});
});
