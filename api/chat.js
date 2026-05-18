/**
 * ====================================================================
 *  API — Chat IA (Conversational Analytics / Gemini Data Analytics)
 * ====================================================================
 *  Interroge un agent BigQuery via l'API
 *  geminidataanalytics.googleapis.com (v1beta).
 *
 *  Route : POST /api/chat
 *  Body  : { "question": "..." }
 *  Réponse :
 *    {
 *      "text":   "réponse en langage naturel",
 *      "sql":    "SELECT ...",   // SQL généré (peut être vide)
 *      "table":  { schema: { fields: [...] }, rows: [...] }, // ou null
 *      "raw":    [...]   // messages bruts, pour debug
 *    }
 *
 *  Pré-requis IAM : le compte de service doit avoir le rôle
 *    roles/geminidataanalytics.dataAgentUser
 *  (ou un rôle équivalent qui inclut la permission
 *   geminidataanalytics.dataAgents.use).
 * ====================================================================
 */

import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import credentialFile from '../00-perso/credentials.json' with { type: 'json' };

// ─────────────────────────────────────────────────────────────────────
//  Configuration
// ─────────────────────────────────────────────────────────────────────

const PROJECT_ID = 'alert-autumn-310513';
const LOCATION   = 'global';
const AGENT_ID   = 'agent_bb2f1086-2b07-49d0-9a9a-030ad437ba96';

const API_HOST  = 'https://geminidataanalytics.googleapis.com';
const API_VER   = 'v1beta';

// ─────────────────────────────────────────────────────────────────────
//  Auth — un seul client Google partagé
// ─────────────────────────────────────────────────────────────────────

const googleAuth = new GoogleAuth({
  credentials: credentialFile,
  scopes:      ['https://www.googleapis.com/auth/cloud-platform'],
});

async function getAccessToken() {
  const client = await googleAuth.getClient();
  const t      = await client.getAccessToken();
  return t.token;
}

// ─────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type':                'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data',  c   => { buf += c; });
    req.on('end',   ()  => {
      if (!buf) return resolve({});
      try   { resolve(JSON.parse(buf)); }
      catch (e) { reject(new Error('Body JSON invalide : ' + e.message)); }
    });
    req.on('error', reject);
  });
}

/**
 * Parse la réponse de l'API Conversational Analytics.
 * Plusieurs formats possibles selon le mode (SSE / NDJSON / tableau JSON).
 */
function parseAgentResponse(rawText) {
  if (!rawText) return [];

  // Cas 1 — tableau JSON ou objet unique
  try {
    const j = JSON.parse(rawText);
    return Array.isArray(j) ? j : [j];
  } catch (_) { /* fall through */ }

  // Cas 2 — NDJSON ou SSE (lignes "data: {...}")
  const messages = [];
  for (const rawLine of rawText.split('\n')) {
    let line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('data:')) line = line.slice(5).trim();
    if (line === '[DONE]') continue;
    try   { messages.push(JSON.parse(line)); }
    catch (_) { /* ligne incomplète, on ignore */ }
  }
  return messages;
}

/**
 * Heuristique : identifie un bloc de "raisonnement" verbeux de l'agent
 * (à masquer par défaut côté frontend).
 */
function isThinkingText(t) {
  return /^(My Thought Process|My initial|Analyzing|Retrieved context|Retrieving|Finalizing|Generating|Processing|Loading|Searching|Alright,|So,|Let'?s|Looking at|Considering|Now,|Internal)/i.test(t)
      || (t.length > 400 && /thought process|let'?s|my (initial )?thought|raisonnement/i.test(t));
}

/**
 * Détecte un message composé uniquement de questions (= suggestions
 * de questions de suivi), même collées entre elles sans espace.
 */
function isAllFollowups(t) {
  if (!t.endsWith('?')) return false;
  // Tout ce qui n'est pas une phrase question — s'il reste de la prose,
  // ce n'est PAS un bloc de follow-ups.
  const leftover = t.replace(/[^?]+\?/g, '').trim();
  return leftover === '';
}

function splitFollowups(t) {
  // Coupe sur "? " ou "?" suivi d'une majuscule (ou accent)
  return t
    .split(/\?(?=\s*[A-ZÀ-Üa-zà-ü])/g)
    .map(s => s.trim())
    .map((s, i, arr) => (i < arr.length - 1 || !s.endsWith('?')) ? (s.endsWith('?') ? s : s + '?') : s)
    .filter(s => s.length > 5);
}

/**
 * Agrège les messages renvoyés par l'agent pour produire une réponse
 * structurée prête à être rendue :
 *   - thinking  : raisonnement verbeux (à masquer par défaut)
 *   - text      : réponse finale en langage naturel (markdown supporté)
 *   - followups : suggestions de questions de suivi
 *   - sql       : requête générée
 *   - table     : résultats { schema:{fields}, rows }
 */
function summarizeMessages(messages) {
  const thinkingBlocks = [];
  const answerBlocks   = [];
  const followups      = [];

  let sql         = '';
  let tableRows   = null;
  let tableSchema = { fields: [] };

  for (const m of messages) {
    const sysm = m.systemMessage || m.message || m;

    // ── Texte ───────────────────────────────────────────
    let textContent = '';
    if (sysm.text && Array.isArray(sysm.text.parts)) {
      textContent = sysm.text.parts.join('');
    } else if (typeof sysm.text === 'string') {
      textContent = sysm.text;
    }
    const t = (textContent || '').trim();

    if (t) {
      if (isThinkingText(t)) {
        thinkingBlocks.push(t);
      } else if (isAllFollowups(t)) {
        followups.push(...splitFollowups(t));
      } else {
        answerBlocks.push(t);
      }
    }

    // ── SQL + résultats ─────────────────────────────────
    if (sysm.data) {
      if (sysm.data.generatedSql) sql = sysm.data.generatedSql;
      if (sysm.data.result) {
        const r = sysm.data.result;
        const rows = Array.isArray(r.data) ? r.data
                   : Array.isArray(r.rows) ? r.rows
                   : null;
        if (rows && rows.length) tableRows = rows;
        if (r.schema && Array.isArray(r.schema.fields)) tableSchema = r.schema;
      }
      if (Array.isArray(sysm.data.rows) && sysm.data.rows.length) {
        tableRows = sysm.data.rows;
      }
    }

    if (sysm.schema && Array.isArray(sysm.schema.fields)
        && !(tableSchema.fields && tableSchema.fields.length)) {
      tableSchema = sysm.schema;
    }
  }

  return {
    thinking:  thinkingBlocks.join('\n\n').trim(),
    text:      answerBlocks.join('\n\n').trim(),
    followups,
    sql,
    table:     tableRows ? { schema: tableSchema, rows: tableRows } : null,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  Route handler — POST /api/chat
// ─────────────────────────────────────────────────────────────────────

export async function handleChatRoute(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'POST attendu' });
  }

  try {
    const { question } = await readJsonBody(req);

    if (!question || typeof question !== 'string' || !question.trim()) {
      return sendJson(res, 400, { error: 'Paramètre "question" manquant.' });
    }

    const token = await getAccessToken();

    const url = `${API_HOST}/${API_VER}/projects/${PROJECT_ID}/locations/${LOCATION}:chat`;

    const body = {
      parent:   `projects/${PROJECT_ID}/locations/${LOCATION}`,
      messages: [
        { userMessage: { text: question.trim() } },
      ],
      dataAgentContext: {
        dataAgent: `projects/${PROJECT_ID}/locations/${LOCATION}/dataAgents/${AGENT_ID}`,
      },
    };

    const apiRes = await axios({
      method: 'POST',
      url,
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      data:              body,
      // L'API peut renvoyer NDJSON ou un tableau — on récupère le brut.
      transformResponse: [d => d],
      responseType:      'text',
      timeout:           60000,
      validateStatus:    () => true,
    });

    if (apiRes.status >= 400) {
      console.error('[Chat] HTTP', apiRes.status, apiRes.data);
      return sendJson(res, apiRes.status, {
        error:  `Erreur API (${apiRes.status})`,
        detail: apiRes.data,
      });
    }

    const messages = parseAgentResponse(apiRes.data);
    const summary  = summarizeMessages(messages);

    return sendJson(res, 200, {
      ...summary,
      raw: messages,
    });

  } catch (err) {
    console.error('[Chat] Erreur :', err.message, err.response?.data || '');
    return sendJson(res, 500, {
      error:  err.message,
      detail: err.response?.data || null,
    });
  }
}
