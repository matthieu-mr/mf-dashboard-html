/**
 * ====================================================================
 *  API — BigQuery
 * ====================================================================
 *  Connexion via compte de service (00-perso/credentials.json).
 *  Expose handleBigQueryRoute pour le serveur HTTP (server.js).
 *
 *  Routes gérées :
 *    GET /api/filters   → options pour les <select> du dashboard
 *    GET /api/dashboard → KPIs, graphiques, tableau (avec filtres)
 *
 *  Table source : alert-autumn-310513.Medias_France.vue_all_devis
 */

import { BigQuery } from '@google-cloud/bigquery';
import credentialFile from '../00-perso/credentials.json' with { type: 'json' };

// ─────────────────────────────────────────────────────────────────────
//  Configuration
// ─────────────────────────────────────────────────────────────────────

const PROJECT_ID    = 'alert-autumn-310513';
const DATASET       = 'Medias_France';
const TABLE_DEVIS   = 'vue_all_devis';
// La "validité" d'un devis est déterminée par la présence d'une
// Date_de_validation_de_devis (= date du CA). Pas besoin de filtrer sur Statut.

const bigqueryClient = new BigQuery({
  projectId:   PROJECT_ID,
  credentials: credentialFile,
});

// ─────────────────────────────────────────────────────────────────────
//  Helpers internes
// ─────────────────────────────────────────────────────────────────────

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(payload));
}

function parseQuery(reqUrl) {
  const out = {};
  new URLSearchParams((reqUrl.split('?')[1] || '')).forEach((v, k) => { out[k] = v; });
  return out;
}

/**
 * Convertit un tableau de lignes (objets JS retournés par le client BQ)
 * au format REST BigQuery { schema, rows } attendu par le frontend.
 *
 * Les types DATE / DATETIME / TIMESTAMP du client BigQuery Node.js sont
 * renvoyés comme des objets { value: '...' }. On les "déballe" ici pour
 * éviter d'afficher "[object Object]" dans le frontend.
 */
function bqValueToString(v) {
  if (v === null || v === undefined) return null;
  // Objets BigQueryDate / BigQueryDatetime / BigQueryTimestamp / BigQueryTime
  if (typeof v === 'object' && v !== null && 'value' in v) {
    return v.value === null || v.value === undefined ? null : String(v.value);
  }
  // Autres objets (STRUCT, RECORD…) → JSON pour rester lisible
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch (_) { return String(v); }
  }
  return String(v);
}

function toBqFormat(rows) {
  if (!rows || rows.length === 0) return { schema: { fields: [] }, rows: [] };
  const fields = Object.keys(rows[0]);
  return {
    schema: { fields: fields.map(name => ({ name })) },
    rows:   rows.map(r => ({
      f: fields.map(k => ({ v: bqValueToString(r[k]) })),
    })),
  };
}

/**
 * Construit la clause WHERE et les paramètres nommés BQ depuis les filtres
 * du dashboard.
 *
 * Mapping des paramètres frontend → colonnes BQ :
 *   startDate / endDate  →  Date_de_validation_de_devis (DATE) — date du CA
 *   commercial           →  Proprietaire (STRING)
 *   medias               →  Liste_Medias (STRING)
 *   statut               →  Statut (STRING)
 *
 * Note : on filtre toujours sur Date_de_validation_de_devis IS NOT NULL
 *        pour ne garder que les devis effectivement validés (= CA).
 */
function buildWhere(params) {
  const p          = { ...params };
  const conditions = ['Date_de_validation_de_devis IS NOT NULL'];
  const qp         = {};

  if (p.startDate)  { conditions.push('Date_de_validation_de_devis >= @startDate'); qp.startDate  = p.startDate;  }
  if (p.endDate)    { conditions.push('Date_de_validation_de_devis <= @endDate');   qp.endDate    = p.endDate;    }
  if (p.commercial) { conditions.push('Proprietaire = @commercial');                qp.commercial = p.commercial; }
  if (p.medias)     { conditions.push('produit_nom_produit = @medias');             qp.medias     = p.medias;     }
  if (p.statut)     { conditions.push('Statut = @statut');                          qp.statut     = p.statut;     }

  return {
    where:  `WHERE ${conditions.join(' AND ')}`,
    params: qp,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  Route handler — dashboard
// ─────────────────────────────────────────────────────────────────────

export async function handleBigQueryRoute(req, res) {
  const urlPath = req.url.split('?')[0];
  const params  = parseQuery(req.url);
  const TABLE   = `\`${PROJECT_ID}.${DATASET}.${TABLE_DEVIS}\``;

  try {

    // ── GET /api/filters ───────────────────────────────────────────
    // Options pour les <select> du dashboard
    if (urlPath === '/api/filters') {
      const [com, med, stat] = await Promise.all([
        bigqueryClient.query({
          query: `SELECT DISTINCT Proprietaire AS val FROM ${TABLE}
                  WHERE Proprietaire IS NOT NULL ORDER BY Proprietaire`,
        }),
        bigqueryClient.query({
          query: `SELECT DISTINCT produit_nom_produit AS val FROM ${TABLE}
                  WHERE produit_nom_produit IS NOT NULL ORDER BY produit_nom_produit`,
        }),
        bigqueryClient.query({
          query: `SELECT DISTINCT Statut AS val FROM ${TABLE}
                  WHERE Statut IS NOT NULL ORDER BY Statut`,
        }),
      ]);
      return sendJson(res, 200, {
        commerciaux: toBqFormat(com[0]),
        medias:      toBqFormat(med[0]),
        statuts:     toBqFormat(stat[0]),
      });
    }

    // ── GET /api/dashboard ─────────────────────────────────────────
    // KPIs + graphiques + tableau selon les filtres
    // (toujours basés sur Date_de_validation_de_devis = date du CA)
    if (urlPath === '/api/dashboard') {
      const { where, params: qp } = buildWhere(params);

      const [kpi1, kpi2, kpi3, tbl] = await Promise.all([

        // KPI 1 — CA validé HT
        bigqueryClient.query({
          query:  `SELECT SUM(Montant_HT) AS valeur FROM ${TABLE} ${where}`,
          params: qp,
        }),

        // KPI 2 — Nombre de devis validés
        bigqueryClient.query({
          query:  `SELECT COUNT(*) AS valeur FROM ${TABLE} ${where}`,
          params: qp,
        }),

        // KPI 3 — Remise moyenne sur les devis validés
        bigqueryClient.query({
          query:  `SELECT ROUND(AVG(Pourcentage_total_remise), 1) AS valeur
                   FROM ${TABLE} ${where}`,
          params: qp,
        }),

        // Tableau détaillé (500 lignes max)
        bigqueryClient.query({
          query:  `
            SELECT
              Numero,
              Date_de_validation_de_devis AS Date_validation,
              client,
              Proprietaire         AS Commercial,
              produit_nom_produit  AS Medias,
              Statut,
              Montant_HT,
              Pourcentage_total_remise AS Remise_pct
            FROM ${TABLE} ${where}
            ORDER BY Date_de_validation_de_devis DESC
            LIMIT 500
          `,
          params: qp,
        }),
      ]);

      return sendJson(res, 200, {
        kpi1:  toBqFormat(kpi1[0]),
        kpi2:  toBqFormat(kpi2[0]),
        kpi3:  toBqFormat(kpi3[0]),
        table: toBqFormat(tbl[0]),
      });
    }

    return sendJson(res, 404, { error: 'Route BigQuery inconnue', route: urlPath });

  } catch (err) {
    console.error('[BigQuery] Erreur :', err.message);
    return sendJson(res, 500, { error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Fonctions utilitaires (usage interne / scripts)
// ─────────────────────────────────────────────────────────────────────

let getDataAll = async (datasetId, tableId) => {
  const [rows] = await bigqueryClient.query({ query: `SELECT * FROM \`${datasetId}.${tableId}\`` });
  return rows;
};

let urlGetDataAll = async (dataBaseUrl) => {
  const [rows] = await bigqueryClient.query({ query: `SELECT * FROM \`${dataBaseUrl}\`` });
  return rows;
};

let urlupdateStats_B2M = async (dataBaseUrl, json) => {
  const { date, ad_id, source } = json;
  const [rows] = await bigqueryClient.query({
    query: `SELECT * FROM \`${dataBaseUrl}\` WHERE date = '${date}' AND ad_id = '${ad_id}' AND source = '${source}'`,
  });
  if (rows.length === 0) {
    const [, datasetId, tableId] = dataBaseUrl.split('.');
    await bigqueryClient.dataset(datasetId).table(tableId).insert([json]);
    console.log(`✅ Insertion dans ${dataBaseUrl} — ad_id=${ad_id}, date=${date}`);
    return [json];
  }
  return 'donnée déjà présente';
};

let urlupdate = async (dataBaseUrl, cle, json) => {
  const cleValue = json[cle];
  const cleExpr  = typeof cleValue === 'string' ? `"${cleValue}"` : cleValue;

  const [rows] = await bigqueryClient.query({
    query: `SELECT * FROM \`${dataBaseUrl}\` WHERE \`${cle}\` = ${cleExpr}`,
  });

  const [, datasetId, tableId] = dataBaseUrl.split('.');
  const table = bigqueryClient.dataset(datasetId).table(tableId);

  if (rows.length === 0) {
    await table.insert([json]);
    console.log(`✅ Insertion dans ${dataBaseUrl} — ${cle}=${cleValue}`);
  } else {
    const setFields = Object.entries(json)
      .filter(([key]) => key !== cle)
      .map(([key, value]) => {
        if (value === null || value === undefined || value === '') return `\`${key}\` = NULL`;
        if (typeof value === 'boolean') return `\`${key}\` = ${value ? 'TRUE' : 'FALSE'}`;
        if (typeof value === 'string')  return `\`${key}\` = "${value.replace(/"/g, '\\"')}"`;
        return `\`${key}\` = ${value}`;
      })
      .join(', ');
    await bigqueryClient.query({
      query: `UPDATE \`${dataBaseUrl}\` SET ${setFields} WHERE \`${cle}\` = ${cleExpr}`,
    });
    console.log(`🔁 Mise à jour dans ${dataBaseUrl} — ${cle}=${cleValue}`);
  }
  return [json];
};

let addInfo = async (datasetId, tableId, rows) => {
  const [job] = await bigqueryClient
    .dataset(datasetId)
    .table(tableId)
    .insert(rows, { ignoreUnknownValues: true, skipInvalidRows: true, location: 'EU' });
  console.log(`✅ ${rows.length} ligne(s) insérée(s) dans ${datasetId}.${tableId}`);
  return job;
};

let getCampaignStats = async (datasetId, tableId, id_campagne) => {
  const [rows] = await bigqueryClient.query({
    query:  `SELECT * FROM \`${PROJECT_ID}.${datasetId}.${tableId}\` WHERE id_campagne = @id_campagne`,
    params: { id_campagne },
  });
  return rows.length ? rows : null;
};

let upsertCampaign = async (datasetId, tableId, campaignData) => {
  const { id_campagne } = campaignData;
  const [existing] = await bigqueryClient.query({
    query:  `SELECT * FROM \`${PROJECT_ID}.${datasetId}.${tableId}\` WHERE id_campagne = @id_campagne LIMIT 1`,
    params: { id_campagne },
  });
  if (existing.length) {
    const updateFields = Object.keys(campaignData)
      .filter(key => campaignData[key] !== undefined)
      .map(key => `${key} = @${key}`)
      .join(', ');
    if (!updateFields) { console.log(`⚠️ Rien à mettre à jour pour ${id_campagne}`); return; }
    await bigqueryClient.query({
      query:  `UPDATE \`${PROJECT_ID}.${datasetId}.${tableId}\` SET ${updateFields} WHERE id_campagne = @id_campagne`,
      params: campaignData,
    });
    console.log(`✅ Campagne ${id_campagne} mise à jour`);
  } else {
    await bigqueryClient.dataset(datasetId).table(tableId).insert([campaignData], { ignoreUnknownValues: true });
    console.log(`✅ Nouvelle campagne ${id_campagne} ajoutée`);
  }
};

let getAdInfo = async (dataset, tableId, adId) => {
  const [rows] = await bigqueryClient.query({
    query:  `SELECT * FROM \`${PROJECT_ID}.${dataset}.${tableId}\` WHERE ad_id = @adId`,
    params: { adId },
  });
  return rows;
};

let getOneEntryByID = async (link, cle, id) => {
  const [rows] = await bigqueryClient.query({
    query: `SELECT * FROM \`${link}\` WHERE ${cle} = ${id}`,
  });
  return rows;
};

// ─────────────────────────────────────────────────────────────────────
//  Exports
// ─────────────────────────────────────────────────────────────────────

export {
  getDataAll,
  addInfo,
  getCampaignStats,
  upsertCampaign,
  getAdInfo,
  urlGetDataAll,
  urlupdateStats_B2M,
  getOneEntryByID,
  urlupdate,
};
