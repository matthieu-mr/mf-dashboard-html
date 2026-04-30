// ============================================================
//  APPS SCRIPT — BigQuery Dashboard Medias France
//  Table : vue_commerciaux_all
// ============================================================
//
//  INSTALLATION (5 min) :
//  1. Va sur https://script.google.com  → "Nouveau projet"
//  2. Colle TOUT ce code (remplace ce qui est dedans)
//  3. Clique sur "Extensions" > "Services" > "BigQuery API" > Ajouter
//  4. Clique sur "Déployer" > "Nouveau déploiement"
//       - Type               : Application Web
//       - Exécuter en tant que : Moi
//       - Qui a accès        : Toute personne ayant un compte Google
//  5. Copie l'URL du déploiement → colle-la dans config.js
//  6. À chaque modification du script : Déployer > Gérer les déploiements
//     > ✏️ > "Nouvelle version" > Déployer
//
// ============================================================

const PROJECT_ID = 'alert-autumn-310513';
const LOCATION   = 'europe-west9';
const TABLE      = '`alert-autumn-310513.Medias_France.vue_commerciaux_all`';

// ── Point d'entrée HTTP ──────────────────────────────────────

function doGet(e) {
  const p          = e.parameter || {};
  const action     = p.action     || 'dashboard';
  const startDate  = p.startDate  || _daysAgo(90);
  const endDate    = p.endDate    || _today();
  const medias     = p.medias     || '';
  const statut     = p.statut     || '';
  const commercial = p.commercial || '';

  let data = {};

  try {
    if (action === 'dashboard') {
      data = _getDashboardData(startDate, endDate, medias, statut, commercial);
    } else if (action === 'filters') {
      data = _getFilterOptions();
    } else {
      data = { error: 'action inconnue : ' + action };
    }
  } catch (err) {
    data = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Données du dashboard ─────────────────────────────────────
// Note : on filtre devis_rn = 1 pour dédoublonner les devis
// (la table est une jointure devis × appels ringover × opportunités)

function _getDashboardData(s, e, medias, statut, commercial) {
  const w = _where(s, e, medias, statut, commercial);
  return {
    kpi1: _query(`
      SELECT COALESCE(SUM(devis_Montant_HT), 0) AS value
      FROM ${TABLE}
      WHERE ${w}`),

    kpi2: _query(`
      SELECT COUNT(DISTINCT devis_Id_devis) AS value
      FROM ${TABLE}
      WHERE ${w}`),

    kpi3: _query(`
      SELECT ROUND(AVG(devis_Pourcentage_total_remise), 1) AS value
      FROM ${TABLE}
      WHERE ${w}`),

    barChart: _query(`
      SELECT FORMAT_DATE('%b %Y', devis_Date_de_validation_de_devis) AS label,
             CAST(MIN(devis_Date_de_validation_de_devis) AS STRING)  AS sort_key,
             SUM(devis_Montant_HT)                                   AS value
      FROM ${TABLE}
      WHERE ${w}
      GROUP BY label
      ORDER BY sort_key`),

    lineChart: _query(`
      SELECT FORMAT_DATE('%b %Y', devis_Date_de_validation_de_devis) AS label,
             CAST(MIN(devis_Date_de_validation_de_devis) AS STRING)  AS sort_key,
             COUNT(DISTINCT devis_Id_devis)                          AS value
      FROM ${TABLE}
      WHERE ${w}
      GROUP BY label
      ORDER BY sort_key`),

    table: _query(`
      SELECT
        devis_Numero                         AS Numero,
        devis_Date_de_validation_de_devis    AS Date_validation,
        devis_client                         AS Client,
        CONCAT(prenom, ' ', nom)             AS Commercial,
        devis_Liste_Medias                   AS Medias,
        devis_type_produit                   AS Produit,
        devis_Montant_HT                     AS Montant_HT,
        devis_Statut                         AS Statut,
        devis_Rebuy                          AS Rebuy,
        devis_Pourcentage_total_remise       AS Remise_pct,
        devis_Date_de_signature              AS Date_signature,
        devis_Restant_facturer               AS Restant_facturer
      FROM ${TABLE}
      WHERE ${w}
      ORDER BY devis_Date_de_validation_de_devis DESC
      LIMIT 1000`),
  };
}

// ── Options des filtres dynamiques ───────────────────────────

function _getFilterOptions() {
  return {
    commerciaux: _query(`
      SELECT DISTINCT CONCAT(prenom, ' ', nom) AS v
      FROM ${TABLE}
      WHERE prenom IS NOT NULL AND nom IS NOT NULL
        AND prenom != '' AND nom != ''
      ORDER BY v`),

    medias: _query(`
      SELECT DISTINCT devis_Liste_Medias AS v
      FROM ${TABLE}
      WHERE devis_Liste_Medias IS NOT NULL AND devis_Liste_Medias != ''
      ORDER BY v`),

    statuts: _query(`
      SELECT DISTINCT devis_Statut AS v
      FROM ${TABLE}
      WHERE devis_Statut IS NOT NULL AND devis_Statut != ''
      ORDER BY v`),
  };
}

// ── Construction de la clause WHERE ─────────────────────────

function _where(startDate, endDate, medias, statut, commercial) {
  let w = `devis_Date_de_validation_de_devis IS NOT NULL
           AND devis_rn = 1
           AND devis_Date_de_validation_de_devis BETWEEN '${startDate}' AND '${endDate}'`;

  if (medias)     w += ` AND devis_Liste_Medias = '${medias.replace(/'/g, "\\'")}'`;
  if (statut)     w += ` AND devis_Statut = '${statut.replace(/'/g, "\\'")}'`;
  if (commercial) w += ` AND CONCAT(prenom, ' ', nom) = '${commercial.replace(/'/g, "\\'")}'`;

  return w;
}

// ── Exécution d'une requête BigQuery ─────────────────────────

function _query(sql) {
  return BigQuery.Jobs.query(PROJECT_ID, {
    query:        sql,
    useLegacySql: false,
    location:     LOCATION,
    timeoutMs:    30000,
  });
}

// ── Utilitaires date ─────────────────────────────────────────

function _today() {
  return Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
}

function _daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return Utilities.formatDate(d, 'Europe/Paris', 'yyyy-MM-dd');
}
