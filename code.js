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
let _chatTables    = {};    // id → { schema, rows } (pour téléchargements depuis le chat)
let _chatTableSeq  = 0;
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
      // Détecte les colonnes monétaires (HT / TTC / Montant) → toujours suffixées "€"
      const isMoneyCol = k => /(_HT|_TTC|Montant|TVA)/i.test(k);
      body.innerHTML = page.map(row =>
        `<tr>${keys.map(k => {
          const raw = row[k];
          let display;
          if (raw === null || raw === undefined || raw === '') {
            display = '';
          } else if (isMoneyCol(k)) {
            const n = parseFloat(raw);
            display = isNaN(n)
              ? String(raw)
              : Math.round(n).toLocaleString('fr-FR') + ' €';
          } else {
            display = String(raw);
          }
          const style = isMoneyCol(k) ? ' style="font-weight:600;color:#1a73e8;"' : '';
          return `<td title="${_esc(display)}"${style}>${_esc(display)}</td>`;
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

  function applyPreset(value) {
    if (!value) return;

    // Format YYYY-MM-DD en heure locale (évite le décalage UTC d'un jour
    // que toISOString() peut introduire selon le fuseau).
    const fmt = d => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const j = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${j}`;
    };

    const today = new Date();
    let start, end;

    if (value === 'week') {
      // Lundi de la semaine courante → aujourd'hui
      const dow = today.getDay();          // 0 = dimanche, 1 = lundi, …
      const offset = (dow === 0 ? 6 : dow - 1);
      start = new Date(today);
      start.setDate(today.getDate() - offset);
      end = today;
    } else if (value === 'month') {
      // 1er du mois courant → aujourd'hui
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end   = today;
    } else if (value === 'lastMonth') {
      // 1er du mois précédent → dernier jour du mois précédent
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end   = new Date(today.getFullYear(), today.getMonth(), 0);
    } else {
      // Valeur numérique → N derniers jours
      const n = parseInt(value, 10);
      if (isNaN(n)) return;
      start = new Date(today);
      start.setDate(today.getDate() - n);
      end = today;
    }

    _filters.startDate = fmt(start);
    _filters.endDate   = fmt(end);

    const se = document.getElementById('filter-start');
    const ee = document.getElementById('filter-end');
    if (se) se.value = _filters.startDate;
    if (ee) ee.value = _filters.endDate;

    _loadDashboard();
  }

  function refreshAll() { _loadDashboard(); }

  /**
   * Bascule entre les vues du dashboard.
   *   - 'overview' : KPIs + tableau de devis (avec barre de filtres)
   *   - 'chat'     : Chat IA plein écran (sans barre de filtres)
   */
  function navigateTo(view, linkEl) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (linkEl) {
      linkEl.classList.add('active');
    } else {
      const match = document.querySelector(`.nav-item[data-view="${view}"]`);
      if (match) match.classList.add('active');
    }

    const overviewSecs = ['section-overview', 'section-table'];
    const chatSec      = 'section-chat';
    const filterBar    = document.getElementById('filter-bar');
    const titleEl      = document.getElementById('page-title');
    const subEl        = document.getElementById('page-subtitle');

    const showOrHide = (id, show) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (show) el.removeAttribute('hidden');
      else      el.setAttribute('hidden', '');
    };

    if (view === 'chat') {
      overviewSecs.forEach(id => showOrHide(id, false));
      showOrHide(chatSec, true);
      if (filterBar) filterBar.style.display = 'none';
      if (titleEl)   titleEl.textContent     = 'Chat IA';
      if (subEl)     subEl.textContent       = 'Agent BigQuery — Conversational Analytics';
      setTimeout(() => {
        const i = document.getElementById('chat-input');
        if (i) i.focus();
      }, 50);
    } else {
      // overview (par défaut)
      overviewSecs.forEach(id => showOrHide(id, true));
      showOrHide(chatSec, false);
      if (filterBar) filterBar.style.display = '';
      if (titleEl)   titleEl.textContent     = 'Dashboard Devis';
      if (subEl)     subEl.textContent       = 'Filtré par date de validation';
    }
  }

  /* ── Chat IA ───────────────────────────────────────────── */

  let _chatBusy = false;

  function chatKeydown(e) {
    // Entrée envoie, Shift+Entrée passe à la ligne
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  }

  async function sendChat() {
    if (_chatBusy) return;
    const input = document.getElementById('chat-input');
    if (!input) return;
    const question = input.value.trim();
    if (!question) return;

    _chatBusy = true;
    const btn = document.getElementById('chat-send');
    if (btn) btn.disabled = true;

    _appendChatMessage('user', question);
    input.value = '';
    _autosizeChatInput(input);

    const thinkingEl = _appendChatMessage('assistant', '', { thinking: true });

    try {
      const base = (CONFIG.apiBase || '').replace(/\/$/, '');
      const res  = await fetch(base + '/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question }),
      });
      const data = await res.json();

      thinkingEl.remove();

      if (!res.ok || data.error) {
        _appendChatMessage('error', data.error || `HTTP ${res.status}`);
      } else {
        _renderAssistantMessage(data);
      }
    } catch (err) {
      thinkingEl.remove();
      _appendChatMessage('error', err.message);
    } finally {
      _chatBusy = false;
      if (btn) btn.disabled = false;
      const i = document.getElementById('chat-input');
      if (i) i.focus();
    }
  }

  function _autosizeChatInput(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  function _scrollChatToBottom() {
    const box = document.getElementById('chat-messages');
    if (box) box.scrollTop = box.scrollHeight;
  }

  function _appendChatMessage(role, text, opts = {}) {
    const box = document.getElementById('chat-messages');
    if (!box) return null;

    // Retirer le placeholder vide à la première interaction
    const empty = box.querySelector('.chat-empty');
    if (empty) empty.remove();

    const wrap = document.createElement('div');
    wrap.className = 'chat-msg chat-msg-' + role;

    if (opts.thinking) {
      wrap.innerHTML = `<div class="chat-bubble"><div class="chat-typing"><span></span><span></span><span></span></div></div>`;
    } else if (role === 'error') {
      wrap.innerHTML = `<div class="chat-bubble chat-bubble-error">
        <span class="material-icons" style="font-size:16px;vertical-align:-3px;">error_outline</span>
        ${_esc(text)}
      </div>`;
    } else {
      wrap.innerHTML = `<div class="chat-bubble">${_esc(text).replace(/\n/g, '<br>')}</div>`;
    }

    box.appendChild(wrap);
    _scrollChatToBottom();
    return wrap;
  }

  /** Rend du texte markdown en HTML (fallback : remplace les \n) */
  function _md(text) {
    if (!text) return '';
    if (window.marked && typeof window.marked.parse === 'function') {
      try {
        return window.marked.parse(text, { breaks: true, gfm: true });
      } catch (_) { /* fallback */ }
    }
    return _esc(text).replace(/\n/g, '<br>');
  }

  function _renderAssistantMessage(data) {
    const box = document.getElementById('chat-messages');
    if (!box) return;

    const wrap = document.createElement('div');
    wrap.className = 'chat-msg chat-msg-assistant';

    const parts = [];

    // ── Réponse principale (markdown) ─────────────────────
    const answer = (data.text || '').trim();
    if (answer) {
      parts.push(`<div class="chat-bubble chat-bubble-md">${_md(answer)}</div>`);
    } else if (!data.thinking && !data.sql && (!data.table || !data.table.rows?.length)) {
      parts.push(`<div class="chat-bubble">(aucune réponse textuelle)</div>`);
    }

    // ── Questions de suivi (chips cliquables) ─────────────
    if (Array.isArray(data.followups) && data.followups.length) {
      const chips = data.followups
        .map(q => `<button class="chat-followup-chip" type="button"
                     onclick="App.askFollowup(this.dataset.q)"
                     data-q="${_esc(q)}">${_esc(q)}</button>`)
        .join('');
      parts.push(`
        <div class="chat-followups">
          <div class="chat-followups-label">Pour aller plus loin</div>
          <div class="chat-followups-chips">${chips}</div>
        </div>`);
    }

    // ── Raisonnement de l'agent (plié par défaut) ─────────
    if (data.thinking) {
      parts.push(`
        <details class="chat-detail">
          <summary>
            <span class="material-icons" style="font-size:14px;vertical-align:-2px;">psychology</span>
            Raisonnement de l'agent
          </summary>
          <div class="chat-thinking">${_md(data.thinking)}</div>
        </details>`);
    }

    // ── SQL généré (plié par défaut) ──────────────────────
    if (data.sql) {
      const bqUrl   = _bigQueryUrl();
      const sqlEsc  = _esc(data.sql);
      parts.push(`
        <details class="chat-detail">
          <summary>
            <span class="material-icons" style="font-size:14px;vertical-align:-2px;">code</span>
            SQL généré
          </summary>
          <div class="chat-detail-toolbar">
            <button class="chat-tool-btn" type="button"
                    data-sql="${sqlEsc}"
                    onclick="App.copySqlFromAttr(this); event.stopPropagation();">
              <span class="material-icons">content_copy</span> Copier
            </button>
            <a class="chat-tool-btn" target="_blank" rel="noopener"
               href="${bqUrl}"
               onclick="App.copySqlFromAttr(this); event.stopPropagation();"
               data-sql="${sqlEsc}"
               title="Copie le SQL puis ouvre BigQuery — colle dans l'éditeur">
              <span class="material-icons">open_in_new</span> Ouvrir BigQuery
            </a>
          </div>
          <pre class="chat-sql"><code>${sqlEsc}</code></pre>
        </details>`);
    }

    // ── Tableau de résultats (plié par défaut) ────────────
    if (data.table && data.table.rows && data.table.rows.length) {
      const fields = (data.table.schema && data.table.schema.fields) || [];
      const head   = fields.length
        ? fields.map(f => `<th>${_esc(f.name || f)}</th>`).join('')
        : Object.keys(data.table.rows[0] || {}).map(k => `<th>${_esc(k)}</th>`).join('');

      const rows = data.table.rows.slice(0, 200).map(r => {
        if (Array.isArray(r)) {
          return `<tr>${r.map(v => `<td>${_esc(_toExportValue(v))}</td>`).join('')}</tr>`;
        }
        if (r && typeof r === 'object') {
          const vals = fields.length
            ? fields.map(f => r[f.name || f])
            : Object.values(r);
          return `<tr>${vals.map(v => `<td>${_esc(_toExportValue(v))}</td>`).join('')}</tr>`;
        }
        return `<tr><td>${_esc(r)}</td></tr>`;
      }).join('');

      const n   = data.table.rows.length;
      const tid = ++_chatTableSeq;
      _chatTables[tid] = data.table;

      parts.push(`
        <details class="chat-detail">
          <summary>
            <span class="material-icons" style="font-size:14px;vertical-align:-2px;">table_chart</span>
            Résultats (${n} ligne${n > 1 ? 's' : ''})
          </summary>
          <div class="chat-detail-toolbar">
            <button class="chat-tool-btn" type="button"
                    onclick="App.downloadChatTable('csv', ${tid}); event.stopPropagation();">
              <span class="material-icons">file_download</span> CSV
            </button>
            <button class="chat-tool-btn" type="button"
                    onclick="App.downloadChatTable('xlsx', ${tid}); event.stopPropagation();">
              <span class="material-icons">file_download</span> Excel
            </button>
          </div>
          <div class="chat-table-wrap">
            <table class="chat-table">
              <thead><tr>${head}</tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </details>`);
    }

    wrap.innerHTML = parts.join('');
    box.appendChild(wrap);
    _scrollChatToBottom();
  }

  /** Pré-remplit l'input avec une question de suivi et l'envoie. */
  function askFollowup(question) {
    const input = document.getElementById('chat-input');
    if (!input) return;
    input.value = question;
    sendChat();
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

  /* ── Téléchargement & presse-papier ─────────────────────── */

  /** Convertit un objet ligne (BQ ou plat) en cellule pour l'export. */
  function _cellFor(row, key, fallbackIndex) {
    if (row === null || row === undefined) return '';
    if (Array.isArray(row))            return row[fallbackIndex];
    if (typeof row === 'object')       return row[key];
    return row;
  }

  /** Normalise la valeur d'une cellule en chaîne prête pour CSV/XLSX. */
  function _toExportValue(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object' && 'value' in v) return v.value ?? '';
    return v;
  }

  /** Construit un CSV (avec BOM pour qu'Excel détecte l'UTF-8). */
  function _buildCSV(headers, rows) {
    const escape = v => {
      const s = String(_toExportValue(v) ?? '');
      return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.map(escape).join(',')];
    rows.forEach((r, i) => {
      lines.push(headers.map((h, idx) => escape(_cellFor(r, h, idx))).join(','));
    });
    return '﻿' + lines.join('\n');
  }

  function _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  }

  function _downloadCSV(headers, rows, filename) {
    const csv = _buildCSV(headers, rows);
    _triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
  }

  function _downloadXLSX(headers, rows, filename, sheetName) {
    if (!window.XLSX) {
      _showError('Bibliothèque XLSX non chargée — utilise CSV à la place.');
      return;
    }
    // Conversion vers tableau d'objets {header: valeur}
    const data = rows.map((r, i) => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = _toExportValue(_cellFor(r, h, idx)); });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (sheetName || 'Données').slice(0, 31));
    XLSX.writeFile(wb, filename);
  }

  function _copyText(text, btn) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
    };
    const flash = () => {
      if (!btn) return;
      const old = btn.innerHTML;
      btn.innerHTML = '<span class="material-icons" style="font-size:14px;vertical-align:-2px;">check</span> Copié';
      btn.disabled = true;
      setTimeout(() => { btn.innerHTML = old; btn.disabled = false; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(flash).catch(() => { fallback(); flash(); });
    } else {
      fallback(); flash();
    }
  }

  /** URL pour ouvrir la console BigQuery du projet (l'utilisateur colle le SQL). */
  function _bigQueryUrl() {
    const project = encodeURIComponent(CONFIG.bigQueryProject || '');
    return `https://console.cloud.google.com/bigquery?project=${project}`;
  }

  // ─── Exposés (utilisés par les boutons HTML générés dynamiquement) ───
  function copySql(sql, btn)             { _copyText(sql, btn); }
  function copySqlFromAttr(el)           { _copyText(el.dataset.sql || '', el); }

  /** Téléchargement depuis le chat — récupère la table sur le bouton via data-table-id. */
  function downloadChatTable(format, tableId) {
    const t = _chatTables[tableId];
    if (!t) return;
    const headers = (t.schema && t.schema.fields ? t.schema.fields.map(f => f.name || f) : [])
                  || Object.keys(t.rows[0] || {});
    const name    = `resultats_chat_${new Date().toISOString().slice(0,10)}`;
    if (format === 'csv')  _downloadCSV(headers, t.rows, name + '.csv');
    else                   _downloadXLSX(headers, t.rows, name + '.xlsx', 'Résultats');
  }

  /** Téléchargement du tableau de devis (vue d'ensemble). */
  function downloadDevis(format) {
    if (!_tableFiltered || !_tableFiltered.length) {
      _showError('Aucune donnée à exporter.');
      return;
    }
    const headers = Object.keys(_tableFiltered[0]);
    const name    = `devis_${new Date().toISOString().slice(0,10)}`;
    if (format === 'csv')  _downloadCSV(headers, _tableFiltered, name + '.csv');
    else                   _downloadXLSX(headers, _tableFiltered, name + '.xlsx', 'Devis');
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

  return {
    init, signIn,
    applyFilters, applyPreset, refreshAll,
    filterTable, nextPage, prevPage,
    navigateTo,
    sendChat, chatKeydown, askFollowup,
    copySql, copySqlFromAttr,
    downloadChatTable, downloadDevis,
  };

})();

// -- Demarrage --
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
