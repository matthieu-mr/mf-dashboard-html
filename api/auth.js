/**
 * ====================================================================
 *  API — Authentification Google (OAuth / Google Identity Services)
 * ====================================================================
 *
 *  Flow utilisé : Google Identity Services (GIS) côté front
 *    1. login.html charge https://accounts.google.com/gsi/client
 *    2. L'utilisateur clique sur "Se connecter avec Google"
 *    3. Google renvoie un ID token (JWT signé par Google)
 *    4. Le front POST ce token à /api/auth/google
 *    5. On vérifie le token (signature + audience + expiration)
 *    6. On vérifie que l'email finit par @medias-france.fr
 *    7. On dépose un cookie HttpOnly signé HMAC (30 jours)
 *
 *  Routes exposées :
 *    POST /api/auth/google   → body { credential: "<id_token>" } → set cookie
 *    POST /api/auth/logout   → efface le cookie
 *    GET  /api/auth/me       → renvoie { email, name, picture } si connecté
 *
 *  Helper exporté :
 *    getSessionFromRequest(req) → { email, name, picture } | null
 *    (utilisé par server.js pour protéger les autres routes)
 *
 *  Config attendue dans 00-perso/oauth-config.json :
 *    {
 *      "clientId":      "xxx.apps.googleusercontent.com",
 *      "sessionSecret": "une chaîne aléatoire >= 32 caractères",
 *      "allowedDomain": "medias-france.fr",
 *      "extraAllowedEmails": []   // optionnel
 *    }
 * ====================================================================
 */

import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import oauthConfig from '../00-perso/oauth-config.json' with { type: 'json' };

// ─────────────────────────────────────────────────────────────────────
//  Configuration
// ─────────────────────────────────────────────────────────────────────

// Tolère plusieurs formats :
//   1) { "clientId": "xxx.apps.googleusercontent.com", ... }            ← format "maison"
//   2) { "client_id": "xxx.apps.googleusercontent.com", ... }           ← snake_case
//   3) { "web":       { "client_id": "xxx...", "client_secret": ... } } ← JSON brut Google (Web app)
//   4) { "installed": { "client_id": "xxx...", "client_secret": ... } } ← JSON brut Google (Desktop)
function _pickClientId(cfg) {
  if (cfg.clientId)         return cfg.clientId;
  if (cfg.client_id)        return cfg.client_id;
  if (cfg.web?.client_id)        return cfg.web.client_id;
  if (cfg.installed?.client_id)  return cfg.installed.client_id;
  return '';
}

const CLIENT_ID      = _pickClientId(oauthConfig);
const SESSION_SECRET = oauthConfig.sessionSecret || oauthConfig.session_secret || '';
const ALLOWED_DOMAIN = (oauthConfig.allowedDomain || oauthConfig.allowed_domain || 'medias-france.fr').toLowerCase();
const EXTRA_EMAILS   = (oauthConfig.extraAllowedEmails || oauthConfig.extra_allowed_emails || []).map(e => e.toLowerCase());

const COOKIE_NAME    = 'mf_session';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 jours (en secondes)

if (!CLIENT_ID || CLIENT_ID.startsWith('REMPLACE_MOI')) {
  console.warn('[Auth] ⚠️  oauth-config.json : clientId manquant ou placeholder.');
  console.warn('       Le login Google ne fonctionnera pas tant que tu ne l\'auras pas renseigné.');
}
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.warn('[Auth] ⚠️  oauth-config.json : sessionSecret trop court (>= 32 caractères requis).');
}

const oauthClient = new OAuth2Client(CLIENT_ID);

// ─────────────────────────────────────────────────────────────────────
//  Helpers HTTP
// ─────────────────────────────────────────────────────────────────────

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data',  c   => { buf += c; if (buf.length > 1e6) req.destroy(); });
    req.on('end',   ()  => {
      if (!buf) return resolve({});
      try   { resolve(JSON.parse(buf)); }
      catch (e) { reject(new Error('Body JSON invalide')); }
    });
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(v.join('='));
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
//  Session : signed cookie (HMAC-SHA256)
//  Format : base64url(payloadJSON) + "." + base64url(hmac)
// ─────────────────────────────────────────────────────────────────────

function b64urlEncode(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

function signSession(payload) {
  const body = b64urlEncode(JSON.stringify(payload));
  const sig  = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest();
  return body + '.' + b64urlEncode(sig);
}

function verifySession(token) {
  if (!token || typeof token !== 'string') return null;
  const idx = token.indexOf('.');
  if (idx < 0) return null;

  const body = token.slice(0, idx);
  const sig  = token.slice(idx + 1);

  const expected = b64urlEncode(
    crypto.createHmac('sha256', SESSION_SECRET).update(body).digest()
  );

  // Comparaison à temps constant
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try { payload = JSON.parse(b64urlDecode(body).toString('utf8')); }
  catch (_) { return null; }

  if (!payload.exp || Date.now() / 1000 > payload.exp) return null;

  return payload;
}

function setSessionCookie(res, payload) {
  const token = signSession(payload);
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE}`,
    // Pas de "Secure" → fonctionne aussi en http://localhost.
    // À activer (Secure) si déployé derrière HTTPS.
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// ─────────────────────────────────────────────────────────────────────
//  API publique : récupérer la session depuis une requête
// ─────────────────────────────────────────────────────────────────────

export function getSessionFromRequest(req) {
  const cookies = parseCookies(req);
  return verifySession(cookies[COOKIE_NAME]);
}

// ─────────────────────────────────────────────────────────────────────
//  Vérification du domaine autorisé
// ─────────────────────────────────────────────────────────────────────

function isAllowed(emailRaw, hdRaw) {
  const email = (emailRaw || '').toLowerCase();
  const hd    = (hdRaw    || '').toLowerCase();

  if (!email) return false;

  // Liste blanche d'emails externes (prestataires, freelances…)
  if (EXTRA_EMAILS.includes(email)) return true;

  // Le claim "hd" (hosted domain) n'est présent que pour les comptes
  // Google Workspace — c'est la garantie la plus forte. On vérifie
  // AUSSI le suffixe email en ceinture-bretelles (un Workspace bien
  // configuré renvoie toujours hd === domaine principal).
  if (hd === ALLOWED_DOMAIN) return true;
  if (email.endsWith('@' + ALLOWED_DOMAIN)) return true;

  return false;
}

// ─────────────────────────────────────────────────────────────────────
//  Route handlers
// ─────────────────────────────────────────────────────────────────────

async function handleGoogleLogin(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'POST attendu' });
  }
  if (!CLIENT_ID || CLIENT_ID.startsWith('REMPLACE_MOI')) {
    return sendJson(res, 500, {
      error: 'OAuth non configuré côté serveur (clientId manquant dans 00-perso/oauth-config.json).',
    });
  }

  try {
    const { credential } = await readJsonBody(req);
    if (!credential) {
      return sendJson(res, 400, { error: 'Paramètre "credential" manquant.' });
    }

    // Vérifie la signature, l'audience (= notre client ID), l'expiration
    const ticket = await oauthClient.verifyIdToken({
      idToken:  credential,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload() || {};
    const { email, email_verified, hd, name, picture, sub } = payload;

    if (!email_verified) {
      return sendJson(res, 403, { error: 'Email Google non vérifié.' });
    }
    if (!isAllowed(email, hd)) {
      console.warn('[Auth] Refus de connexion :', email, '(hd=' + (hd || '∅') + ')');
      return sendJson(res, 403, {
        error: `Accès réservé aux comptes @${ALLOWED_DOMAIN}.`,
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const session = {
      sub,
      email,
      name:    name    || email,
      picture: picture || null,
      iat:     now,
      exp:     now + COOKIE_MAX_AGE,
    };

    setSessionCookie(res, session);
    return sendJson(res, 200, {
      email:   session.email,
      name:    session.name,
      picture: session.picture,
    });

  } catch (err) {
    console.error('[Auth] Erreur de vérification du token :', err.message);
    return sendJson(res, 401, { error: 'Token Google invalide.' });
  }
}

function handleLogout(req, res) {
  clearSessionCookie(res);
  return sendJson(res, 200, { ok: true });
}

function handleMe(req, res) {
  const session = getSessionFromRequest(req);
  if (!session) return sendJson(res, 401, { error: 'Non connecté.' });
  return sendJson(res, 200, {
    email:   session.email,
    name:    session.name,
    picture: session.picture,
  });
}

// ─────────────────────────────────────────────────────────────────────
//  Routeur (appelé par server.js)
// ─────────────────────────────────────────────────────────────────────

function handleConfig(req, res) {
  // Expose UNIQUEMENT les infos publiques (jamais le sessionSecret)
  return sendJson(res, 200, getPublicAuthConfig());
}

export async function handleAuthRoute(req, res) {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/api/auth/config') return handleConfig(req, res);
  if (urlPath === '/api/auth/google') return handleGoogleLogin(req, res);
  if (urlPath === '/api/auth/logout') return handleLogout(req, res);
  if (urlPath === '/api/auth/me')     return handleMe(req, res);

  return sendJson(res, 404, { error: 'Route auth inconnue.' });
}

// ─────────────────────────────────────────────────────────────────────
//  Expose la config publique au front (clientId uniquement)
//  → utilisée par login.html pour initialiser le bouton GIS
// ─────────────────────────────────────────────────────────────────────

export function getPublicAuthConfig() {
  return {
    clientId:      CLIENT_ID || '',
    allowedDomain: ALLOWED_DOMAIN,
  };
}
