/**
 * ============================================================
 *  CONFIG.JS
 *  Configuration globale du dashboard (chargée AVANT code.js).
 *  Modifiable sans toucher au code applicatif.
 * ============================================================
 */

'use strict';

/* ── Petits helpers de date ─────────────────────────────── */
function _fmtDate(d) {
  // YYYY-MM-DD
  return d.toISOString().split('T')[0];
}
function _today() {
  return _fmtDate(new Date());
}
function _daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return _fmtDate(d);
}

/* ── Configuration ──────────────────────────────────────── */
const CONFIG = {

  /**
   * Base URL de l'API.
   * "" → on tape la même origine que la page (http://localhost:8080).
   * Mettre une URL absolue si le frontend est hébergé ailleurs.
   */
  apiBase: '',

  /**
   * Identifiant du projet Google Cloud, utilisé pour générer les liens
   * "Ouvrir dans BigQuery" depuis le chat IA.
   */
  bigQueryProject: 'alert-autumn-310513',

  /**
   * Filtres par défaut au chargement de la page.
   * Doivent matcher les valeurs des <select> du HTML.
   */
  defaultFilter: {
    startDate:  _daysAgo(90),   // 3 derniers mois (cohérent avec le <select> "Période")
    endDate:    _today(),
    commercial: '',
    medias:     '',
    statut:     '',
  },

  /**
   * Définition des cartes KPI.
   *   key     : clé renvoyée par /api/dashboard  (kpi1, kpi2, kpi3)
   *   label   : libellé affiché
   *   icon    : nom Material Icons
   *   format  : "currency" | "decimal" | "number"
   *   suffix  : texte ajouté après la valeur
   */
  kpis: [
    {
      key:    'kpi1',
      label:  'CA validé (HT)',
      icon:   'euro_symbol',
      format: 'currency',
      suffix: ' €',
    },
    {
      key:    'kpi2',
      label:  'Devis validés',
      icon:   'check_circle',
      format: 'number',
      suffix: '',
    },
    {
      key:    'kpi3',
      label:  'Remise moyenne',
      icon:   'percent',
      format: 'decimal',
      suffix: ' %',
    },
  ],
};