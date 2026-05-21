/**
 * session.js — Signature et vérification du cookie de session
 *
 * Pas de dépendance externe — utilise le module crypto natif Node.js.
 *
 * Format du cookie :
 *   mf_session = base64url(payload_json) . base64url(hmac_sha256)
 *
 * Le cookie est posé avec :
 *   Domain=.medias-france.fr  → valide sur tous les sous-domaines
 *   HttpOnly + Secure + SameSite=Lax
 */

import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'mf_session';
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 heures en ms

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function sign(payload, secret) {
  const data = b64url(JSON.stringify(payload));
  const sig  = b64url(createHmac('sha256', secret).update(data).digest());
  return `${data}.${sig}`;
}

function verify(token, secret) {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;

    const expected = b64url(createHmac('sha256', secret).update(data).digest());

    // Comparaison en temps constant (anti timing-attack)
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64').toString());
    if (Date.now() > payload.exp) return null; // expiré

    return payload;
  } catch {
    return null;
  }
}

/** Crée le cookie signé et retourne la valeur du header Set-Cookie */
export function createSessionCookie(user, secret, domain) {
  const payload = {
    email:   user.email,
    name:    user.name,
    picture: user.picture,
    exp:     Date.now() + SESSION_TTL,
  };
  const token = sign(payload, secret);

  const parts = [
    `${COOKIE_NAME}=${token}`,
    `Domain=${domain}`,
    `Path=/`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Lax`,
    `Max-Age=${SESSION_TTL / 1000}`,
  ];
  return parts.join('; ');
}

/** Lit et vérifie le cookie depuis les headers de la requête */
export function readSession(req, secret) {
  const raw = req.headers.cookie || '';
  const pair = raw.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE_NAME + '='));
  if (!pair) return null;
  return verify(pair.slice(COOKIE_NAME.length + 1), secret);
}

/** Header Set-Cookie pour supprimer la session */
export function clearSessionCookie(domain) {
  return `${COOKIE_NAME}=; Domain=${domain}; Path=/; HttpOnly; Secure; Max-Age=0`;
}

export { COOKIE_NAME };
