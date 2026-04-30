/**
 * ============================================================
 *  CODE.JS
 *  Interroge l'Apps Script (qui requête BigQuery),
 *  puis rend le dashboard : KPIs, graphiques, tableau.
 * ============================================================
 */

'use strict';

const PAGE_SIZE = 50;

/* ── État global ─────────────────────────────────────────── */
let _charts        = {};
let _tableData     = [];
let _tableFiltered = [];
let _tablePage     = 0;
let _filters = {
  startDate:  CONFIG.defaultFilter.startDate,
  endDate:    CONFIG.defaultFilter.endDate,
  commercial: CONFIG.defaultFilter.commercial,
  medias:     CONFIG.defaultFilter.medias,
  statut:     CONFIG.defaultFilter.statut,
};

/* ════════════════════════════════════════════════════════════
   MODULE App
════════════════════════════════════════════════════════════ */
const App = (() => {

  /* ── Init ──────────────────────────────────────────────── */
  async function init() {
    // Sur la page de login, on n'initialise pas le dashboard : on attend
    // que l'utilisateur clique sur "Se connecter" → signIn() redirige.
    if (!document.getElementById('kpi-grid')) return;

    _setFilterInputs();

    // Charger les options des filtres ET les données en parallèle
    await Promise.all([
      _loadFilterOptions(),
      _loadDashboard(),
    ]);
  }

  function _setFilterInputs() {
    const s = document.getElementById('filter-start');
    const e = document.getElementById('filter-end');
    if (s) s.value = _filters.startDate;
    if (e) e.value = _filters.endDate;
  }

  /* ── Chargement des options de filtres ─────────────────── */
  async function _loadFilterOptions() {
    const data = await _fetch({ action: 'filters' });
    if (!data) return;

    _populateSelect('filter-commercial', data.commerciaux, 'Tous les commerciaux', _filters.commercial);
    _populateSelect('filter-medias',     data.medias,      'Tous les médias',      _filters.medias);
    _populateSelect('filter-statut',     data.statuts,     'Tous les statuts',     _filters.statut);
  }

  /** Remplit un <select> avec les lignes d'une réponse BigQuery */
  function _populateSelect(id, bqResponse, placeholder, currentVal) {
    const sel = document.getElementById(id);
    if (!sel || !bqResponse || !bqResponse.rows) return;

    sel.innerHTML = `<option value="">${placeholder}</option>`;
    bqResponse.rows.forEach(row => {
      const v = row.f[0].v;
      if (!v) return;
      const opt = document.createElement('option');
      opt.value       = v;
      opt.textContent = v;
      if (v === currentVal) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  /* ── Chargement du dashboard complet ───────────────────── */
  async function _loadDashboard() {
    _hideError();
    _setLoading(true);

    const data = await _fetch({
      action:     'dashboard',
      startDate:  _filters.startDate,
      endDate:    _filters.endDate,
      commercial: _filters.commercial,
      medias:     _filters.medias,
      statut:     _filters.statut,
    });

    _setLoading(false);

    if (!data) return;

    _renderKPIs(data);
    _renderBarChart(data.barChart);
    _renderLineChart(data.lineChart);
    _renderTable(data.table);

    const el = document.getElementById('last-refresh');
    if (el) el.textContent = 'Mis à jour : ' + new Date().toLocaleTimeString('fr-FR');
  }

  function _setLoading(on) {
    const btn = document.getElementById('btn-apply');
    if (!btn) return;
    btn.disabled = on;
    btn.innerHTML = on
      ? '<div class="spinner-small"></div> Chargement…'
      : '<span class="material-icons" style="font-size:15px;">search</span> Appliquer';
  }

  /* ── KPIs ──────────────────────────────────────────────── */
  function _renderKPIs(data) {
    const grid = document.getElementById('kpi-grid');
    if (!grid) return;

    const colors = ['--blue', '#34a853', '#f9ab00'];

    grid.innerHTML = CONFIG.kpis.map((cfg, i) => {
      const bq  = data[cfg.key];
      const raw = (bq && bq.rows && bq.rows[0]) ? bq.rows[0].f[0].v : null;
      const val = _fmt(raw, cfg.format, cfg.suffix);

      return `<div class="kpi-card" style="--accent:${colors[i]}">
        <div class="kpi-header">
          <span class="kpi-label">${_esc(cfg.label)}</span>
          <span class="kpi-icon"><span class="material-icons">${_esc(cfg.icon)}</span></span>
        </div>
        <div class="kpi-value">${_esc(val)}</div>
      </div>`;
    }).join('');
  }

  function _fmt(raw, format, suffix) {
    if (raw === null || raw === undefined) return '—';
    const n = parseFloat(raw);
    if (isNaN(n)) return String(raw);
    let out;
    switch (format) {
      case 'currency': out = Math.round(n).toLocaleString('fr-FR'); break;
      case 'decimal':  out = n.toFixed(1); break;
      default:         out = Math.round(n).toLocaleString('fr-FR');
    }
    return out + (suffix || '');
  }

  /* ── Graphiques ────────────────────────────────────────── */
  function _renderBarChart(bq) {
    const { labels, values } = _extractChart(bq, 'label', 'value');
    _drawChart('chart-bar', 'bar', labels, values, 'CA validé (HT)', {
      backgroundColor: 'rgba(26,115,232,0.75)',
      borderColor:     'rgba(26,115,232,1)',
      borderRadius:    5,
      borderSkipped:   false,
    });
  }

  function _renderLineChart(bq) {
    const { labels, values } = _extractChart(bq, 'label', 'value');
    _drawChart('chart-line', 'line', labels, values, 'Nb devis', {
      borderColor:          'rgba(52,168,83,1)',
      backgroundColor:      'rgba(52,168,83,0.08)',
      borderWidth:          2.5,
      pointRadius:          3,
      pointBackgroundColor: 'rgba(52,168,83,1)',
      fill:                 true,
      tension:              0.35,
    });
  }

  function _extractChart(bq, labelCol, valueCol) {
    if (!bq || !bq.schema || !bq.rows) return { labels: [], values: [] };
    const fields = bq.schema.fields.map(f => f.name);
    const li = fields.indexOf(labelCol);
    const vi = fields.indexOf(valueCol);
    if (li < 0 || vi < 0) return { labels: [], values: [] };
    return {
      labels: bq.rows.map(r => r.f[li].v),
      values: bq.rows.map(r => parseFloat(r.f[vi].v) || 0),
    };
  }

  function _drawChart(canvasId, type, labels, values, label, dsOpts) {
    if (_charts[canvasId]) { _charts[canvasId].destroy(); _charts[canvasId] = null; }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (!labels.length) {
      canvas.parentElement.innerHTML =
        `<div class="loading-overlay" style="height:240px;">
          <span class="material-icons" style="font-size:32px;color:#dadce0;">bar_chart</span>
          <span>Aucune donnée pour cette période</span>
        </div>`;
      return;
    }

    _charts[canvasId] = new Chart(canvas.getContext('2d'), {
      type,
      data: { labels, datasets: [{ label, data: values, ...dsOpts }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#202124',
            titleColor: '#fff',
            bodyColor:  '#e8eaed',
            padding: 10,
            cornerRadius: 6,
            callbacks: { label: c => ' ' + Number(c.raw).toLocaleString('fr-FR') },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#5f6368', font: { size: 11 }, maxRotation: 45 } },
          y: { grid: { color: '#f0f0f0' }, ticks: { color: '#5f6368', font: { size: 11 }, callback: v => v.toLocaleString('fr-FR') } },
        },
      },
    });
  }

  /* ── Tableau ───────────────────────────────────────────── */
  function _renderTable(bq) {
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    if (!body) return;

    if (!bq || !bq.schema || !bq.rows || !bq.rows.length) {
      body.innerHTML = `<tr><td colspan="99" class="table-empty">Aucun devis pour ces filtres.</td></tr>`;
      const cnt = document.getElementById('table-count');
      if (cnt) cnt.textContent = '0 devis';
      return;
    }

    const fields = bq.schema.fields.map(f => f.name);
    if (head) head.innerHTML = `<tr>${fields.map(f => `<th>${_esc(f)}</th>`).join('')}</tr>`;

    _tableData     = bq.rows.map(row =>
      Object.fromEntries(fields.map((f, i) => [f, row.f[i] ? row.f[i].v : null]))
    );
    _tableFiltered = [..._tableData];
    _tablePage     = 0;
    _renderPage();
  }

  function _renderPage() {
    const body    = document.getElementById('table-body');
    const cntEl   = document.getElementById('table-count');
    const infoEl  = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    if (!body) return;

    const total = _tableFiltered.length;
    const start = _tablePage * PAGE_SIZE;
    const end   = Math.min(start + PAGE_SIZE, total);
    const page  = _tableFiltered.slice(start, end);

    if (!page.length) {
      body.innerHTML = `<tr><td colspan="99" class="table-empty">Aucun résultat.</td></tr>`;
    } else {
      const keys = Object.keys(page[0]);
      body.innerHTML = page.map(row =>
        `<tr>${keys.map(k => {
          const v = row[k] === null ? '' : String(row[k]);
          // Mise en forme spéciale pour Montant_HT
          const style = k === 'Montant_HT' ? ' style="font-weight:600;color:#1a73e8;"' : '';
          return `<td title="${_esc(v)}"${style}>${_esc(v)}</td>`;
        }).join('')}</tr>`
      ).join('');
    }

    if (cntEl)   cntEl.textContent  = total.toLocaleString('fr-FR') + ' devis';
    if (infoEl)  infoEl.textContent = total > 0 ? `${start + 1}–${end} / ${total.toLocaleString('fr-FR')}` : '';
    if (prevBtn) prevBtn.disabled   = _tablePage === 0;
    if (nextBtn) nextBtn.disabled   = end >= total;
  }

  function filterTable(q) {
    const query = (q || '').toLowerCase().trim();
    _tableFiltered = query
      ? _tableData.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(query)))
      : [..._tableData];
    _tablePage = 0;
    _renderPage();
  }

  function nextPage() {
    if (_tablePage < Math.ceil(_tableFiltered.length / PAGE_SIZE) - 1) { _tablePage++; _renderPage(); }
  }
  function prevPage() {
    if (_tablePage > 0) { _tablePage--; _renderPage(); }
  }

  /* ── Appel à l'API locale (server.js + compte de service) ─ */
  async function _fetch(params) {
    const action = params.action;
    if (!action) { _showError('Action manquante dans la requête.'); return null; }

    // On retire `action` des paramètres : il sert à choisir l'endpoint.
    const qs = Object.entries(params)
      .filter(([k, v]) => k !== 'action' && v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const base = (CONFIG.apiBase || '').replace(/\/$/, '');
    const url  = base + '/api/' + action + (qs ? '?' + qs : '');

    try {
      const res = await fetch(url);
      if (!res.ok) {
        let detail = '';
        try { const j = await res.json(); detail = j.error ? ' — ' + j.error : ''; } catch (_) {}
        _showError(`Erreur HTTP ${res.status}${detail}`);
        return null;
      }
      const data = await res.json();
      if (data.error) { _showError('Erreur BigQuery : ' + data.error); return null; }
      return data;
    } catch (e) {
      _showError('Impossible de joindre le serveur local : ' + e.message);
      return null;
    }
  }

  /* ── Filtres & navigation ──────────────────────────────── */
  function applyFilters() {
    const get = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    const start = get('filter-start');
    const end   = get('filter-end');

    if (!start || !end) { _showError('Veuillez renseigner une date de début et de fin.'); return; }
    if (start > end)    { _showError('La date de début doit être avant la date de fin.'); return; }

    _filters.startDate  = start;
    _filters.endDate    = end;
    _filters.commercial = get('filter-commercial');
    _filters.medias     = get('filter-medias');
    _filters.statut     = get('filter-statut');

    _loadDashboard();
  }

  function applyPreset(days) {
    if (!days) return;
    const n  = parseInt(days, 10);
    const e  = new Date();
    const s  = new Date();
    s.setDate(s.getDate() - n);
    const fmt = d => d.toISOString().split('T')[0];
    _filters.startDate = fmt(s);
    _filters.endDate   = fmt(e);
    const se = document.getElementById('filter-start');
    const ee = document.getElementById('filter-end');
    if (se) se.value = _filters.startDate;
    if (ee) ee.value = _filters.endDate;
    _loadDashboard();
  }

  function refreshAll() { _loadDashboard(); }

  function navigateTo(section, linkEl) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (linkEl) linkEl.classList.add('active');
    const map = { overview: 'section-overview', charts: 'section-charts', table: 'section-table' };
    const target = document.getElementById(map[section]);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── Erreurs ───────────────────────────────────────────── */
  function _showError(msg) {
    const b = document.getElementById('error-banner');
    const m = document.getElementById('error-message');
    if (!b || !m) { console.error('[Dashboard]', msg); return; }
    m.textContent = msg;
    b.classList.remove('hidden');
    setTimeout(() => b.classList.add('hidden'), 10000);
  }
  function _hideError() {
    const b = document.getElementById('error-banner');
    if (b) b.classList.add('hidden');
  }

  /* ── Utilitaires ───────────────────────────────────────── */
  function _esc(s) {
    return String(s ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }


  // -- Login : le bouton "Se connecter" redirige vers le dashboard.
  // L'authentification BigQuery est faite par server.js via le compte
  // de service. Aucune authentification utilisateur n'est requise.
  function signIn() {
    window.location.href = 'dashboard.html';
  }

  return { init, signIn, applyFilters, applyPreset, refreshAll, filterTable, nextPage, prevPage, navigateTo };

})();

// -- Demarrage --
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
