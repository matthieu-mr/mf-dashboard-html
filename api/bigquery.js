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
const STATUT_VALIDE = 'Validé'; // valeur exacte du champ Statut pour les devis validés

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
 */
function toBqFormat(rows) {
  if (!rows || rows.length === 0) return { schema: { fields: [] }, rows: [] };
  const fields = Object.keys(rows[0]);
  return {
    schema: { fields: fields.map(name => ({ name })) },
    rows:   rows.map(r => ({
      f: fields.map(k => ({
        v: r[k] !== null && r[k] !== undefined ? String(r[k]) : null,
      })),
    })),
  };
}

/**
 * Construit la clause WHERE et les paramètres nommés BQ depuis les filtres
 * du dashboard. L'objet `overrides` permet de forcer certaines valeurs
 * (ex. { statut: 'Validé' } pour les KPIs).
 *
 * Mapping des paramètres frontend → colonnes BQ :
 *   startDate / endDate  →  Date (DATE)
 *   commercial           →  Proprietaire (STRING)
 *   medias               →  Liste_Medias (STRING)
 *   statut               →  Statut (STRING)
 */
function buildWhere(params, overrides = {}) {
  const p          = { ...params, ...overrides };
  const conditions = [];
  const qp         = {};

  if (p.startDate)  { conditions.push('`Date` >= @startDate');          qp.startDate  = p.startDate;  }
  if (p.endDate)    { conditions.push('`Date` <= @endDate');            qp.endDate    = p.endDate;    }
  if (p.commercial) { conditions.push('Proprietaire = @commercial');    qp.commercial = p.commercial; }
  if (p.medias)     { conditions.push('Liste_Medias = @medias');        qp.medias     = p.medias;     }
  if (p.statut)     { conditions.push('Statut = @statut');              qp.statut     = p.statut;     }

  return {
    where:  conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
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
          query: `SELECT DISTINCT Liste_Medias AS val FROM ${TABLE}
                  WHERE Liste_Medias IS NOT NULL ORDER BY Liste_Medias`,
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
    if (urlPath === '/api/dashboard') {
      // Filtres globaux (graphiques + tableau)
      const { where: whereAll,    params: pAll    } = buildWhere(params);
      // KPI 1 & 2 : statut forcé à STATUT_VALIDE quel que soit le filtre
      const { where: whereValide, params: pValide } = buildWhere(params, { statut: STATUT_VALIDE });

      const [kpi1, kpi2, kpi3, bar, line, tbl] = await Promise.all([

        // KPI 1 — CA validé HT
        bigqueryClient.query({
          query:  `SELECT SUM(Montant_HT) AS valeur FROM ${TABLE} ${whereValide}`,
          params: pValide,
        }),

        // KPI 2 — Nombre de devis validés
        bigqueryClient.query({
          query:  `SELECT COUNT(*) AS valeur FROM ${TABLE} ${whereValide}`,
          params: pValide,
        }),

        // KPI 3 — Remise moyenne sur les devis filtrés
        bigqueryClient.query({
          query:  `SELECT ROUND(AVG(Pourcentage_total_remise), 1) AS valeur
                   FROM ${TABLE} ${whereAll}`,
          params: pAll,
        }),

        // Bar chart — CA HT validé par mois
        bigqueryClient.query({
          query:  `
            SELECT
              FORMAT_DATE('%b %Y', DATE_TRUNC(\`Date\`, MONTH)) AS label,
              SUM(Montant_HT) AS value
            FROM ${TABLE}
            ${buildWhere(params, { statut: STATUT_VALIDE }).where}
            GROUP BY 1
            ORDER BY MIN(\`Date\`)
          `,
          params: buildWhere(params, { statut: STATUT_VALIDE }).params,
        }),

        // Line chart — Nombre de devis (tous statuts) par mois
        bigqueryClient.query({
          query:  `
            SELECT
              FORMAT_DATE('%b %Y', DATE_TRUNC(\`Date\`, MONTH)) AS label,
              COUNT(*) AS value
            FROM ${TABLE} ${whereAll}
            GROUP BY 1
            ORDER BY MIN(\`Date\`)
          `,
          params: pAll,
        }),

        // Tableau détaillé (500 lignes max)
        bigqueryClient.query({
          query:  `
            SELECT
              Numero,
              \`Date\`,
              client,
              Proprietaire  AS Commercial,
              Liste_Medias  AS Medias,
              type_produit  AS Produit,
              Statut,
              Montant_HT,
              Pourcentage_total_remise AS Remise_pct
            FROM ${TABLE} ${whereAll}
            ORDER BY \`Date\` DESC
            LIMIT 500
          `,
          params: pAll,
        }),
      ]);

      return sendJson(res, 200, {
        kpi1:      toBqFormat(kpi1[0]),
        kpi2:      toBqFormat(kpi2[0]),
        kpi3:      toBqFormat(kpi3[0]),
        barChart:  toBqFormat(bar[0]),
        lineChart: toBqFormat(line[0]),
        table:     toBqFormat(tbl[0]),
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
