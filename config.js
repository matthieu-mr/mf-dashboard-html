/**
 * config.js — Dashboard Commercial
 *
 * Ce fichier est gitignore (local uniquement).
 * Copiez config.example.js → config.js pour démarrer.
 */

const CONFIG = {

  // URL de base de l'API (laisser vide = même origine)
  apiBase: '',

  // Projet GCP (pour le lien vers la console BigQuery)
  bigQueryProject: 'alert-autumn-310513',

  // Filtres par défaut à l'ouverture du dashboard
  defaultFilter: {
    startDate:  '',   // ex: '2024-01-01'
    endDate:    '',   // ex: '2024-12-31'
    commercial: '',
    medias:     '',
    statut:     '',
  },

  // KPIs affichés en haut du dashboard
  // key   → correspond à la clé retournée par /api/dashboard
  // label → texte affiché
  // format → 'currency' | 'decimal' | 'number'
  // suffix → unité affichée après la valeur
  // icon  → nom d'icône Material Icons
  kpis: [
    {
      key:    'kpi1',
      label:  'CA validé HT',
      format: 'currency',
      suffix: ' €',
      icon:   'euro',
    },
    {
      key:    'kpi2',
      label:  'Devis validés',
      format: 'number',
      suffix: '',
      icon:   'receipt_long',
    },
    {
      key:    'kpi3',
      label:  'Remise moyenne',
      format: 'decimal',
      suffix: ' %',
      icon:   'percent',
    },
  ],

};
