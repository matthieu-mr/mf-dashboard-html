import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { handleBigQueryRoute } from './api/bigquery.js';
import { handleSellsyRoute }   from './api/sellsy.js';
import { handleChatRoute }     from './api/chat.js';
import { handleAuthRoute, getSessionFromRequest } from './api/auth.js';

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

// ─────────────────────────────────────────────────────────────────────
//  Authentification
// ─────────────────────────────────────────────────────────────────────
//
//  Toutes les routes sont protégées SAUF :
//   - les routes /api/auth/*       (sinon impossible de se connecter)
//   - /login.html                  (la page de login elle-même)
//   - /style.css                   (utilisée par /login.html)
//   - /favicon.ico
//
//  Pour les requêtes API → 401 JSON.
//  Pour les requêtes HTML → redirection 302 vers /login.html.
//
const PUBLIC_PATHS = new Set([
  '/login.html',
  '/style.css',
  '/favicon.ico',
]);

function isPublicPath(urlPath) {
  if (PUBLIC_PATHS.has(urlPath)) return true;
  if (urlPath.startsWith('/api/auth/')) return true;
  return false;
}

function requireAuth(req, res, urlPath) {
  const session = getSessionFromRequest(req);
  if (session) return session;

  // Pas de session → on refuse
  if (urlPath.startsWith('/api/')) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Non authentifié.' }));
  } else {
    res.writeHead(302, { Location: '/login.html' });
    res.end();
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];

  try {
    // ── Routes publiques (login, config OAuth, assets de la page de login)
    if (urlPath.startsWith('/api/auth/')) {
      return handleAuthRoute(req, res);
    }

    if (isPublicPath(urlPath)) {
      // Sert le fichier statique sans contrôle de session
      return serveStatic(urlPath, res);
    }

    // ── À partir d'ici, authentification requise
    if (!requireAuth(req, res, urlPath)) return;

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

    // Fichiers statiques protégés (dashboard.html, code.js, config.js, etc.)
    const target = urlPath === '/' ? '/dashboard.html' : urlPath;
    return serveStatic(target, res);

  } catch (err) {
    console.error('[ERREUR]', err);

    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

function serveStatic(target, res) {
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
}

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('Serveur demarre sur http://localhost:' + PORT + '/');
  console.log('Login    : http://localhost:' + PORT + '/login.html');
  console.log('Filtres  : http://localhost:' + PORT + '/api/filters');
  console.log('Dashboard: http://localhost:' + PORT + '/api/dashboard');
  console.log('Chat IA  : POST http://localhost:' + PORT + '/api/chat');
  console.log('Sellsy   : http://localhost:' + PORT + '/api/sellsy');
  console.log('');
});
