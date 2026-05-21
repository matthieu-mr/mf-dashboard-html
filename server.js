import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { handleBigQueryRoute } from './api/bigquery.js';
import { handleSellsyRoute }   from './api/sellsy.js';
import { handleChatRoute }     from './api/chat.js';
import { readSession }         from './api/session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PORT           = process.env.PORT || 8080;
const SESSION_SECRET = process.env.SESSION_SECRET;
// En local (pas de SESSION_SECRET), la session est bypassée
const AUTH_ENABLED   = !!SESSION_SECRET;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function safeFilePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);

  if (/00-perso|\.git|node_modules/.test(clean)) return null;

  const fp = path.join(__dirname, clean);

  if (!fp.startsWith(__dirname)) return null;

  return fp;
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];

  try {
    // Health check Cloud Run
    if (urlPath === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok' }));
    }

    // Vérification session (uniquement en production)
    if (AUTH_ENABLED) {
      const user = readSession(req, SESSION_SECRET);
      if (!user) {
        const portalUrl = process.env.PUBLIC_URL || 'https://medias-france.fr';
        res.writeHead(302, { 'Location': portalUrl });
        return res.end();
      }
    }

    // Routes BigQuery (dashboard)
    if (urlPath === '/api/filters' || urlPath === '/api/dashboard') {
      return handleBigQueryRoute(req, res);
    }

    // Route Chat IA (Conversational Analytics API)
    if (urlPath === '/api/chat') {
      return handleChatRoute(req, res);
    }

    // Routes Sellsy
    if (urlPath.startsWith('/api/sellsy')) {
      return handleSellsyRoute(req, res);
    }

    const target = urlPath === '/' ? '/dashboard.html' : urlPath;
    const filePath = safeFilePath(target);

    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403 Acces refuse');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 Fichier non trouve : ' + target);
      }

      const mime = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    });

  } catch (err) {
    console.error('[ERREUR]', err);

    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('Serveur demarre sur http://localhost:' + PORT + '/');
  console.log('Filtres  : http://localhost:' + PORT + '/api/filters');
  console.log('Dashboard: http://localhost:' + PORT + '/api/dashboard');
  console.log('Chat IA  : POST http://localhost:' + PORT + '/api/chat');
  console.log('Sellsy   : http://localhost:' + PORT + '/api/sellsy');
  console.log('');
});