// Renders a dashboard spec: header, filters, KPIs, data checks, AI/SQL ask panel,
// chart grid and source footer. All queries run in the in-browser engine.
import { h, icon, toast, modal, debounce, downloadBlob } from './components.js';
import { echarts, theme, colorAssigner, lineOption, barOption, columnOption, groupedBarOption, scatterOption, sparkline } from './charts.js';
import { query, queryWithColumns } from '../lib/db.js';
import { chartSQL, kpiSQL, periodsSQL, dimValuesSQL, measureById, wrapAskSQL } from '../lib/query.js';
import { trendTitle, splitTitle, rankTitle, scatterTitle } from '../lib/insights.js';
import { fmt, fmtPeriod, pctChange, plural } from '../lib/format.js';
import { runChecks } from '../lib/checks.js';
import { guardSelect } from '../lib/sqlguard.js';
import { getAI, askSQL, explainResult } from '../lib/llm.js';
import { toCSV } from '../lib/parse.js';
import { BRAND } from '../config.js';

export async function renderDashboard(root, ctx) {
  const { spec, profile } = ctx;
  const state = { dimValues: ctx.initial?.filters?.dimValues || [], from: ctx.initial?.filters?.from || null, to: ctx.initial?.filters?.to || null };
  const instances = new Map();
  const cards = new Map();
  let renderToken = 0;
  const cur = spec.currency;

  // ---------- header ----------
  const src = ctx.sourceInfo;
  const badge = (cls, ic, ...text) => h('span', { class: `badge ${cls}` }, ic ? icon(ic, 13) : null, ...text);
  const badges = h('div', { class: 'badges' },
    src.kind === 'live' ? badge('badge-live', null, h('span', { class: 'pulse' }), 'Live · ' + src.provider) : null,
    src.kind === 'sample' ? badge('badge-sample', 'info', 'Sample data') : null,
    src.kind === 'file' ? badge('badge-private', 'lock', 'Your file · stays on this device') : null,
    src.kind === 'link' ? badge('badge-live', 'link', 'From a link') : null,
    src.kind === 'paste' ? badge('badge-private', 'table', 'Pasted table') : null,
  );
  const titleEl = h('h1', { class: 'dash-title', spellcheck: 'false' }, spec.title);
  const editTitle = h('button', { class: 'icon-btn no-export', 'aria-label': 'Rename dashboard', title: 'Rename' }, icon('edit', 16));
  editTitle.onclick = () => {
    titleEl.contentEditable = 'true'; titleEl.focus();
    document.getSelection().selectAllChildren(titleEl);
  };
  titleEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); } });
  titleEl.addEventListener('blur', () => {
    titleEl.contentEditable = 'false';
    const t = titleEl.textContent.trim().slice(0, 120);
    if (t) { spec.title = t; document.title = `${t} · ${BRAND.product}`; ctx.onChange?.(); } else titleEl.textContent = spec.title;
  });
  const metaLine = h('p', { class: 'dash-meta' });
  const actions = h('div', { class: 'dash-actions no-export no-print' },
    ctx.onEditSource ? h('button', { class: 'btn btn-ghost', onclick: ctx.onEditSource }, icon('edit', 16), 'Edit data') : null,
    h('button', { class: 'btn btn-ghost', onclick: () => ctx.onShare?.() }, icon('share', 16), 'Share'),
    h('button', { class: 'btn btn-ghost', onclick: exportPNG }, icon('download', 16), 'PNG'),
    h('button', { class: 'btn btn-ghost', onclick: () => window.print() }, icon('print', 16), 'PDF'),
  );
  const head = h('section', { class: 'dash-head' },
    h('div', { class: 'dash-head-main' }, badges, h('div', { class: 'title-row' }, titleEl, editTitle), metaLine),
    actions);

  const banner = src.kind === 'sample' ? h('div', { class: 'banner no-print' },
    icon('info', 18),
    h('div', {}, h('b', {}, 'This is sample data. '), `It shows what ${/^[aeiou]/i.test(src.sample.name) ? 'an' : 'a'} ${src.sample.name.toLowerCase()} dashboard looks like. Upload your own export to see your real numbers.`,
      src.sample.export ? h('div', { class: 'banner-sub' }, 'How to export: ', src.sample.export) : null),
    h('button', { class: 'btn btn-primary', onclick: () => ctx.onUpload?.() }, icon('upload', 16), 'Use my real data')) : null;

  const plan = ctx.planChip ? h('div', { class: 'plan-chip no-print' }, icon('spark', 15), h('span', {}, ctx.planChip),
    ctx.onEditSource ? h('button', { class: 'link-btn', onclick: ctx.onEditSource }, 'Change') : null) : null;

  // ---------- filters ----------
  const filterBar = h('div', { class: 'filter-bar no-print', role: 'toolbar', 'aria-label': 'Filters' });
  const activeChips = h('div', { class: 'active-chips' });
  let periods = [];
  let dimOptions = [];
  if (spec.time) periods = (await query(periodsSQL(spec))).map((r) => r.p).filter((p) => p != null);
  if (spec.dim) dimOptions = await query(dimValuesSQL(spec));
  buildFilters();

  // ---------- KPIs, checks, ask, grid ----------
  const kpiRow = h('section', { class: 'kpis', 'aria-label': 'Key metrics' });
  const checksEl = h('section', { class: 'checks', 'aria-label': 'Data checks' });
  const grid = h('section', { class: 'grid', 'aria-label': 'Charts' });
  const hiddenBar = h('div', { class: 'hidden-bar no-print no-export' });
  const askPanel = buildAskPanel();
  const footer = buildFooter();
  const exportArea = h('div', { class: 'dash-export' }, head, plan, banner, filterBar, activeChips, kpiRow, checksEl, askPanel, grid, hiddenBar, footer);

  root.replaceChildren(
    h('div', { class: 'dash' },
      h('div', { class: 'dash-top no-print no-export' },
        h('button', { class: 'btn btn-ghost btn-sm', onclick: ctx.onHome }, icon('back', 16), 'New dashboard')),
      exportArea));
  document.title = `${spec.title} · ${BRAND.product}`;
  updateMeta();

  runChecks(spec, profile).then(renderChecks).catch((e) => console.warn(e));

  const ro = new ResizeObserver(debounce(() => instances.forEach((i) => i.resize()), 80));
  ro.observe(grid);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onTheme = () => refresh();
  mq.addEventListener?.('change', onTheme);
  window.addEventListener('themechange', onTheme);

  await refresh();
  return {
    destroy() { ro.disconnect(); mq.removeEventListener?.('change', onTheme); window.removeEventListener('themechange', onTheme); instances.forEach((i) => i.dispose()); },
    getState: () => ({ ...state }),
  };

  // ======================================================================
  function updateMeta() {
    const parts = [plural(spec.n, 'row')];
    if (spec.time && periods.length) parts.push(`${fmtPeriod(periods[0], spec.time.grain)} – ${fmtPeriod(periods[periods.length - 1], spec.time.grain)}`);
    if (src.detail) parts.push(src.detail);
    if (src.updated) parts.push(`updated ${src.updated}`);
    metaLine.replaceChildren(parts.join(' · '), ctx.buildMs ? h('span', { class: 'built-in' }, `⚡ built in ${(ctx.buildMs / 1000).toFixed(1)}s`) : '');
  }

  function buildFilters() {
    filterBar.replaceChildren();
    if (spec.dim && dimOptions.length > 1) {
      const label = spec.dim;
      const summary = h('summary', { class: 'filter-btn' }, icon('filter', 15), h('span', { class: 'filter-label' }), icon('chevron', 14));
      const search = h('input', { type: 'search', placeholder: `Search ${label.toLowerCase()}…`, class: 'input input-sm', 'aria-label': `Search ${label}` });
      const list = h('div', { class: 'check-list' });
      const renderList = () => {
        const term = search.value.trim().toLowerCase();
        list.replaceChildren(...dimOptions.filter((o) => !term || o.v.toLowerCase().includes(term)).slice(0, 200).map((o) => {
          const cb = h('input', { type: 'checkbox', checked: state.dimValues.includes(o.v) });
          cb.onchange = () => { toggleDim(o.v, cb.checked); };
          return h('label', { class: 'check-item' }, cb, h('span', {}, o.v), h('span', { class: 'muted' }, o.n.toLocaleString('en-US')));
        }));
      };
      search.oninput = renderList;
      const details = h('details', { class: 'filter-pop' }, summary, h('div', { class: 'pop' }, search, list,
        h('div', { class: 'pop-foot' }, h('button', { class: 'link-btn', onclick: () => { state.dimValues = []; afterFilter(); } }, 'Clear'))));
      details.addEventListener('toggle', () => { if (details.open) { renderList(); setTimeout(() => search.focus(), 10); } });
      document.addEventListener('click', (e) => { if (details.open && !details.contains(e.target)) details.open = false; });
      filterBar.append(details);
      filterBar._dimLabel = summary.querySelector('.filter-label');
    }
    if (spec.time && periods.length > 1) {
      const mk = (which) => {
        const sel = h('select', { class: 'select', 'aria-label': which === 'from' ? 'From' : 'To' },
          periods.map((p) => h('option', { value: p, selected: (state[which] || (which === 'from' ? periods[0] : periods[periods.length - 1])) === p }, fmtPeriod(p, spec.time.grain))));
        sel.onchange = () => {
          state[which] = sel.value === (which === 'from' ? periods[0] : periods[periods.length - 1]) ? null : sel.value;
          if (state.from && state.to && state.from > state.to) { const t = state.from; state.from = state.to; state.to = t; buildFilters(); }
          afterFilter();
        };
        return sel;
      };
      const presets = spec.time.kind === 'year' ? [['10y', 10], ['20y', 20]] : spec.time.grain === 'month' ? [['6M', 6], ['12M', 12]] : spec.time.grain === 'quarter' ? [['4Q', 4], ['8Q', 8]] : [];
      filterBar.append(h('div', { class: 'range' }, mk('from'), h('span', { class: 'muted' }, 'to'), mk('to'),
        presets.filter(([, k]) => periods.length > k).map(([lab, k]) => h('button', { class: `chip-btn ${state.from === periods[periods.length - k] && !state.to ? 'on' : ''}`, onclick: () => { state.from = periods[periods.length - k]; state.to = null; buildFilters(); afterFilter(); } }, lab)),
        h('button', { class: `chip-btn ${!state.from && !state.to ? 'on' : ''}`, onclick: () => { state.from = state.to = null; buildFilters(); afterFilter(); } }, 'All')));
    }
    updateFilterLabels();
  }

  function updateFilterLabels() {
    if (filterBar._dimLabel) filterBar._dimLabel.textContent = state.dimValues.length ? `${spec.dim}: ${state.dimValues.length === 1 ? state.dimValues[0] : state.dimValues.length + ' selected'}` : `All ${pluralWord(spec.dim)}`;
    activeChips.replaceChildren(...state.dimValues.map((v) => h('button', { class: 'chip', onclick: () => toggleDim(v, false), 'aria-label': `Remove filter ${v}` }, v, icon('x', 12))));
  }

  function toggleDim(v, on) {
    state.dimValues = on ? [...new Set([...state.dimValues, v])] : state.dimValues.filter((x) => x !== v);
    afterFilter();
  }
  function afterFilter() { updateFilterLabels(); refresh(); ctx.onChange?.(); }

  // ---------- refresh ----------
  async function refresh() {
    const token = ++renderToken;
    const t = theme();
    const assign = colorAssigner(spec.colorOrder, t);
    await Promise.all([renderKPIs(token, t), renderCharts(token, t, assign)]);
  }

  async function renderKPIs(token, t) {
    if (!spec.kpis.length) { kpiRow.replaceChildren(); return; }
    const k = kpiSQL(spec, state);
    try {
      const series = k.sql ? await query(k.sql) : [];
      const totals = k.totals ? (await query(k.totals))[0] : null;
      if (token !== renderToken) return;
      const tiles = k.measures.map((m, i) => {
        const key = `k${i}`;
        const vals = series.map((r) => r[key]);
        let value, delta = null, deltaLabel = '', context = '';
        if (k.mode === 'panel') {
          const valid = series.filter((r) => r[key] != null);
          const first = valid[0], last = valid[valid.length - 1];
          value = last?.[key];
          context = `${k.focus}${last ? `, ${fmtPeriod(last.period, spec.time.grain)}` : ''}`;
          if (first && last && first !== last) {
            delta = m.format === 'percent' ? last[key] - first[key] : pctChange(last[key], first[key]);
            deltaLabel = `since ${fmtPeriod(first.period, spec.time.grain)}`;
          }
        } else {
          const valid = series.filter((r) => r[key] != null);
          const last = valid[valid.length - 1], prev = valid[valid.length - 2];
          if (m.additive && !m.stock) { value = totals?.[key]; context = spec.time ? 'Total for selected period' : 'Total'; }
          else { value = spec.time ? last?.[key] : totals?.[key]; context = spec.time && last ? (m.stock ? `As of ${fmtPeriod(last.period, spec.time.grain)}` : `${fmtPeriod(last.period, spec.time.grain)}`) : 'Overall'; }
          if (last && prev) {
            delta = m.format === 'percent' ? last[key] - prev[key] : pctChange(last[key], prev[key]);
            deltaLabel = `${fmtPeriod(last.period, spec.time.grain, true)} vs ${fmtPeriod(prev.period, spec.time.grain, true)}`;
          }
          if (!m.additive && !spec.time) context = 'Overall';
        }
        const good = /cost|churn|return|unemployment|inflation|mortality|poverty|debt|emission|co₂|gini/i.test(m.label) ? delta < 0 : delta > 0;
        const deltaEl = delta != null && Number.isFinite(delta)
          ? h('span', { class: `delta ${Math.abs(delta) < 0.05 ? 'flat' : good ? 'up' : 'down'}`, title: deltaLabel },
            Math.abs(delta) < 0.05 ? '→ ' : delta > 0 ? '▲ ' : '▼ ',
            m.format === 'percent' ? `${Math.abs(delta).toFixed(1)} pts` : `${Math.abs(delta) >= 100 ? Math.round(Math.abs(delta)) : Math.abs(delta).toFixed(1)}%`,
            h('span', { class: 'delta-label' }, ` ${deltaLabel}`))
          : h('span', { class: 'delta flat' }, ' ');
        const tile = h('div', { class: 'kpi' },
          h('div', { class: 'kpi-label' }, m.label),
          h('div', { class: 'kpi-value' }, fmt(value, m.format, cur)),
          h('div', { class: 'kpi-foot' }, deltaEl),
          h('div', { class: 'kpi-context' }, context));
        if (vals.filter((v) => v != null).length > 2) tile.insertAdjacentHTML('beforeend', sparkline(vals, i === 0 ? t.single : t.muted));
        return tile;
      });
      kpiRow.replaceChildren(...tiles);
    } catch (e) {
      console.error(e);
      kpiRow.replaceChildren(h('div', { class: 'card-error' }, 'Could not compute KPIs: ', e.message));
    }
  }

  function renderChecks(list) {
    const order = { serious: 0, warning: 1, info: 2, good: 3 };
    list.sort((a, b) => order[a.level] - order[b.level]);
    const ic = { serious: 'alert', warning: 'alert', info: 'info', good: 'check' };
    const worst = list[0].level;
    const summary = worst === 'good' ? 'Data checks passed' : `${list.filter((c) => c.level !== 'good').length} data note${list.length === 1 ? '' : 's'} to read before trusting these charts`;
    checksEl.replaceChildren(h('details', { class: `checks-box level-${worst}`, open: worst === 'serious' },
      h('summary', {}, icon(ic[worst], 16), h('span', {}, summary), icon('chevron', 14)),
      h('ul', {}, list.map((c) => h('li', { class: `level-${c.level}` }, icon(ic[c.level], 15), h('div', {}, h('b', {}, c.title), ' — ', c.text))))));
  }

  // ---------- charts ----------
  function allCharts() {
    const ai = spec.asks.map((a, i) => ({ id: `ask-${i}`, kind: 'ai', ...a, wide: a.chart?.type === 'table' || a.chart?.type === 'line' }));
    return [...ai, ...spec.charts].filter((c) => !spec.hidden.includes(c.id));
  }

  async function renderCharts(token, t, assign) {
    const list = allCharts();
    // Keep DOM order stable; create or reuse cards.
    const wanted = new Set(list.map((c) => c.id));
    for (const [id, card] of cards) if (!wanted.has(id)) { instances.get(id)?.dispose(); instances.delete(id); card.el.remove(); cards.delete(id); }
    list.forEach((c, i) => {
      let card = cards.get(c.id);
      if (!card) { card = makeCard(c); cards.set(c.id, card); }
      if (grid.children[i] !== card.el) grid.insertBefore(card.el, grid.children[i] || null);
    });
    // A lone half-width card before a wide card (or at the end) spans the row.
    let run = 0;
    list.forEach((c, i) => {
      const el = cards.get(c.id).el;
      el.classList.remove('card-fill');
      if (c.wide) { run = 0; return; }
      run++;
      const next = list[i + 1];
      if ((!next || next.wide) && run % 2 === 1) el.classList.add('card-fill');
    });
    renderHiddenBar();
    await Promise.all(list.map((c) => renderChart(c, cards.get(c.id), token, t, assign)));
  }

  function makeCard(c) {
    const title = h('h3', { class: 'card-title' }, '…');
    const sub = h('p', { class: 'card-sub' });
    const body = h('div', { class: 'card-body' }, h('div', { class: 'skeleton' }));
    const sqlBox = h('pre', { class: 'sql', hidden: true });
    const tableBox = h('div', { class: 'table-wrap', hidden: true });
    const explain = h('p', { class: 'explain', hidden: true });
    const card = { el: null, title, sub, body, sqlBox, tableBox, explain, rows: [], columns: [] };
    const toggle = (box, btn) => { box.hidden = !box.hidden; btn.classList.toggle('on', !box.hidden); if (!box.hidden && box === tableBox) fillTable(card); };
    const sqlBtn = h('button', { class: 'icon-btn', title: 'Show SQL', 'aria-label': 'Show SQL' }, icon('code', 16));
    const tblBtn = h('button', { class: 'icon-btn', title: 'Show data table', 'aria-label': 'Show data table' }, icon('table', 16));
    sqlBtn.onclick = () => toggle(sqlBox, sqlBtn);
    tblBtn.onclick = () => toggle(tableBox, tblBtn);
    const csvBtn = h('button', { class: 'icon-btn', title: 'Download CSV', 'aria-label': 'Download CSV', onclick: () => downloadBlob(new Blob([toCSV(card.columns, card.rows)], { type: 'text/csv' }), `${slug(title.textContent)}.csv`) }, icon('download', 16));
    const hideBtn = h('button', { class: 'icon-btn', title: c.kind === 'ai' ? 'Remove' : 'Hide chart', 'aria-label': 'Hide chart', onclick: () => hideChart(c) }, icon(c.kind === 'ai' ? 'x' : 'hide', 16));
    card.el = h('article', { class: `card ${c.wide ? 'card-wide' : ''} ${c.kind === 'ai' ? 'card-ai' : ''}` },
      h('header', { class: 'card-head' },
        h('div', { class: 'card-titles' }, c.kind === 'ai' ? h('div', { class: 'ai-q' }, icon('spark', 13), c.question || 'SQL query') : null, title, sub),
        h('div', { class: 'card-tools no-export no-print' }, sqlBtn, tblBtn, csvBtn, hideBtn)),
      body, explain, sqlBox, tableBox);
    return card;
  }

  function hideChart(c) {
    if (c.kind === 'ai') {
      const i = Number(c.id.split('-')[1]);
      spec.asks.splice(i, 1);
      // ids shift; rebuild AI cards
      for (const [id, card] of cards) if (id.startsWith('ask-')) { instances.get(id)?.dispose(); instances.delete(id); card.el.remove(); cards.delete(id); }
    } else spec.hidden.push(c.id);
    ctx.onChange?.();
    refresh();
  }

  function renderHiddenBar() {
    const hidden = spec.charts.filter((c) => spec.hidden.includes(c.id));
    hiddenBar.replaceChildren(...(hidden.length ? [h('button', { class: 'link-btn', onclick: () => { spec.hidden = []; ctx.onChange?.(); refresh(); } }, icon('eye', 15), `Show ${plural(hidden.length, 'hidden chart')}`)] : []));
  }

  function setChart(id, card, option, onClick) {
    let inst = instances.get(id);
    if (!card.body.querySelector('.chart')) {
      inst?.dispose();
      card.body.replaceChildren(h('div', { class: 'chart', role: 'img', 'aria-label': card.title.textContent }));
      inst = echarts.init(card.body.firstChild, null, { renderer: 'svg' });
      instances.set(id, inst);
    }
    inst.setOption(option, true);
    inst.off('click');
    if (onClick) inst.on('click', onClick);
    card.body.firstChild.setAttribute('aria-label', card.title.textContent);
  }

  function setNonChart(id, card, node) {
    instances.get(id)?.dispose(); instances.delete(id);
    card.body.replaceChildren(node);
  }

  async function renderChart(c, card, token, t, assign) {
    let sql;
    try {
      sql = chartSQL(spec, c, state);
      if (c.kind === 'ai') sql = wrapAskSQL(guardSelect(c.sql), spec, state);
      const { rows, columns } = await queryWithColumns(sql);
      if (token !== renderToken) return;
      card.rows = rows; card.columns = columns;
      card.sqlBox.textContent = sql;
      if (!card.tableBox.hidden) fillTable(card);
      if (!rows.length) { card.title.textContent = card.title.textContent === '…' ? 'No data' : card.title.textContent; card.sub.textContent = ''; setNonChart(c.id, card, h('div', { class: 'empty' }, 'No data for the current filters.')); return; }
      const g = spec.time?.grain;
      const onPick = (name) => { if (spec.dim && name && dimOptions.some((o) => o.v === name)) toggleDim(name, !state.dimValues.includes(name)); };
      switch (c.kind) {
        case 'trend': {
          const m = measureById(spec, c.measure);
          card.title.textContent = trendTitle(m, rows, g, cur);
          card.sub.textContent = `${m.label} by ${grainName(g)}${m.additive || m.stock || m.derived ? '' : ', average'}`;
          setChart(c.id, card, lineOption({ periods: rows.map((r) => r.period), series: [{ name: m.label, data: rows.map((r) => r.value) }], grain: g, format: m.format, currency: cur, area: true, colors: [t.single] }));
          break;
        }
        case 'trendSplit': {
          const m = measureById(spec, c.measure);
          const periodsAll = [...new Set(rows.map((r) => r.period))].sort();
          const names = [...new Set(rows.map((r) => r.series))].sort((a, b) => idxOf(spec.colorOrder, a) - idxOf(spec.colorOrder, b));
          const lookup = new Map(rows.map((r) => [`${r.series}|${r.period}`, r.value]));
          card.title.textContent = splitTitle(m, rows, g, cur);
          card.sub.textContent = `${m.label} by ${grainName(g)} and ${c.dim.toLowerCase()}${names.length >= (c.top || 6) ? ` · top ${names.length}` : ''}`;
          setChart(c.id, card, lineOption({ periods: periodsAll, series: names.map((n) => ({ name: n, data: periodsAll.map((p) => lookup.get(`${n}|${p}`) ?? null) })), grain: g, format: m.format, currency: cur, colors: assign(names) }), (p) => onPick(p.seriesName));
          break;
        }
        case 'rank': {
          const m = measureById(spec, c.measure);
          card.title.textContent = rankTitle(m, rows, c.dim, cur);
          const periodsSeen = [...new Set(rows.map((r) => r.period).filter(Boolean))];
          card.sub.textContent = `${m.label} by ${c.dim.toLowerCase()}${c.latest && periodsSeen.length ? ` · latest (${periodsSeen.length === 1 ? fmtPeriod(periodsSeen[0], g) : 'most recent available'})` : ''}${rows.length >= 10 ? ' · top 10' : ''}`;
          const colorsByLabel = c.dim === spec.dim && spec.panel ? assign(rows.map((r) => r.label)) : null;
          setChart(c.id, card, barOption({ labels: rows.map((r) => r.label), values: rows.map((r) => r.value), format: m.format, currency: cur, color: t.single, colorsByLabel }), (p) => { if (c.dim === spec.dim) onPick(p.name); });
          setHeight(card, Math.max(180, rows.length * 34 + 30));
          break;
        }
        case 'scatter': {
          const mx = measureById(spec, c.mx), my = measureById(spec, c.my);
          const pts = rows.map((r) => ({ label: r.label, x: r.x, y: r.y, period: r.period })).filter((p) => p.x != null && p.y != null);
          card.title.textContent = scatterTitle(mx, my, pts);
          card.sub.textContent = `Each dot is a ${c.dim.toLowerCase()}${c.latest ? ', latest available year' : ''}`;
          const colors = spec.panel ? assign(pts.map((p) => p.label)) : pts.map(() => t.single);
          setChart(c.id, card, scatterOption({ points: pts, mx, my, currency: cur, colors, xLabel: mx.label, yLabel: my.label }), (p) => onPick(p.data.label));
          break;
        }
        case 'histogram': {
          const m = measureById(spec, c.measure);
          card.title.textContent = `Distribution of ${m.label}`;
          card.sub.textContent = 'Number of rows in each range';
          setChart(c.id, card, columnOption({ labels: rows.map((r) => fmt(r.start, m.format, cur)), values: rows.map((r) => r.value), format: 'integer', color: t.single }));
          break;
        }
        case 'table': {
          card.title.textContent = `${c.dim} breakdown`;
          card.sub.textContent = c.latest ? 'Latest available value for each' : 'Totals and averages for the current filters';
          setNonChart(c.id, card, dataTable(columns, rows, (col) => spec.measures.find((m) => m.label === col)));
          break;
        }
        case 'ai':
          renderAsk(c, card, rows, columns, t);
          break;
      }
    } catch (e) {
      if (token !== renderToken) return;
      console.error(e, sql);
      card.title.textContent = c.kind === 'ai' ? (c.title || 'Query') : 'Chart unavailable';
      card.sub.textContent = '';
      card.sqlBox.textContent = sql || '';
      setNonChart(c.id, card, h('div', { class: 'card-error' }, icon('alert', 16), e.message));
    }
  }

  function setHeight(card, px) {
    const el = card.body.querySelector('.chart');
    if (el && el.style.height !== `${px}px`) { el.style.height = `${px}px`; instances.forEach((i) => i.getDom() === el && i.resize()); }
  }

  function renderAsk(c, card, rows, columns, t) {
    card.title.textContent = c.title || 'Answer';
    card.sub.textContent = '';
    card.explain.hidden = !c.explanation;
    card.explain.textContent = c.explanation || '';
    const ch = c.chart || {};
    const numCols = columns.filter((col) => rows.some((r) => typeof r[col] === 'number'));
    const format = c.format || 'number';
    const has = (col) => col && columns.includes(col);
    let type = ch.type;
    let ys = (Array.isArray(ch.y) ? ch.y : [ch.y]).filter(has);
    if (!ys.length) ys = numCols.filter((col) => col !== ch.x).slice(0, 1);
    if (type === 'number' || (rows.length === 1 && numCols.length === 1 && type !== 'table')) {
      const col = ys[0] || numCols[0];
      return setNonChart(c.id, card, h('div', { class: 'big-number' }, h('div', { class: 'big-value' }, fmt(rows[0][col], format, cur)), h('div', { class: 'big-label' }, col)));
    }
    if (type === 'table' || !ys.length || !has(ch.x) && type !== 'scatter') return setNonChart(c.id, card, dataTable(columns, rows));
    if (type === 'scatter') {
      const xCol = has(ch.x) ? ch.x : numCols[0], yCol = ys.find((y) => y !== xCol) || numCols[1];
      const lab = has(ch.label) ? ch.label : columns.find((col) => !numCols.includes(col));
      const pts = rows.map((r) => ({ label: lab ? r[lab] : '', x: r[xCol], y: r[yCol] })).filter((p) => p.x != null && p.y != null);
      return setChart(c.id, card, scatterOption({ points: pts, mx: { format }, my: { format }, currency: cur, colors: pts.map(() => t.single), xLabel: xCol, yLabel: yCol }));
    }
    const xs = [...new Set(rows.map((r) => r[ch.x]))];
    let series;
    if (has(ch.series)) {
      const tot = new Map();
      rows.forEach((r) => tot.set(r[ch.series], (tot.get(r[ch.series]) || 0) + Math.abs(r[ys[0]] || 0)));
      const names = [...tot.keys()].sort((a, b) => tot.get(b) - tot.get(a)).slice(0, 8).map(String);
      const lk = new Map(rows.map((r) => [`${r[ch.series]}|${r[ch.x]}`, r[ys[0]]]));
      series = names.map((n) => ({ name: n, data: xs.map((x) => lk.get(`${n}|${x}`) ?? null) }));
    } else {
      series = ys.slice(0, 4).map((y) => ({ name: y, data: rows.map((r) => r[y]) }));
    }
    const names = series.map((s) => s.name);
    const colors = series.length === 1 ? [t.single] : (spec.dim && has(ch.series) ? colorAssigner(spec.colorOrder, t)(names) : t.series.slice(0, names.length));
    const isTime = xs.every((x) => /^\d{4}(-\d{2})?(-\d{2})?$|^\d{4}-Q\d$/.test(String(x)));
    const grainGuess = xs.some((x) => /^\d{4}-\d{2}-\d{2}$/.test(String(x))) ? 'day' : xs.some((x) => /^\d{4}-\d{2}$/.test(String(x))) ? 'month' : xs.some((x) => /-Q\d$/.test(String(x))) ? 'quarter' : 'year';
    if (type === 'line' || (isTime && type !== 'bar')) {
      return setChart(c.id, card, lineOption({ periods: xs.map(String), series, grain: isTime ? grainGuess : null, format, currency: cur, area: series.length === 1, colors }));
    }
    if (series.length === 1 && !isTime) {
      const lim = rows.slice(0, 25);
      setChart(c.id, card, barOption({ labels: lim.map((r) => String(r[ch.x])), values: lim.map((r) => r[ys[0]]), format, currency: cur, color: t.single, highlightIndex: 0 }));
      return setHeight(card, Math.max(180, lim.length * 34 + 30));
    }
    if (series.length === 1) return setChart(c.id, card, columnOption({ labels: xs.map(String), values: series[0].data, format, currency: cur, color: t.single, xLabelFormatter: (v) => fmtPeriod(v, grainGuess, true) }));
    return setChart(c.id, card, groupedBarOption({ labels: xs.map(String), series, format, currency: cur, colors }));
  }

  function fillTable(card) {
    card.tableBox.replaceChildren(dataTable(card.columns, card.rows.slice(0, 200)));
  }

  function dataTable(columns, rows, measureFor = () => null) {
    const numeric = columns.map((col) => rows.some((r) => typeof r[col] === 'number'));
    return h('div', { class: 'table-scroll' }, h('table', { class: 'data-table' },
      h('thead', {}, h('tr', {}, columns.map((col, i) => h('th', { class: numeric[i] ? 'num' : '' }, col)))),
      h('tbody', {}, rows.slice(0, 200).map((r) => h('tr', {}, columns.map((col, i) => {
        const m = measureFor(col);
        const v = r[col];
        return h('td', { class: numeric[i] ? 'num' : '' }, numeric[i] && v != null ? (m ? fmt(v, m.format, cur) : typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString('en-US') : v.toLocaleString('en-US', { maximumFractionDigits: 2 })) : v) : v ?? '–');
      }))))));
  }

  // ---------- ask panel ----------
  function buildAskPanel() {
    const ai = getAI();
    const input = h('input', { class: 'input ask-input', type: 'text', placeholder: suggestions()[0] ? `e.g. ${suggestions()[0]}` : 'Ask a question about this data', 'aria-label': 'Ask a question about this data' });
    const status = h('div', { class: 'ask-status', 'aria-live': 'polite' });
    const go = h('button', { class: 'btn btn-primary' }, icon('spark', 16), 'Ask');
    const sqlInput = h('textarea', { class: 'input sql-input', rows: 4, spellcheck: 'false', 'aria-label': 'SQL query' }, `SELECT *\nFROM data\nLIMIT 100`);
    const runSql = h('button', { class: 'btn btn-primary' }, icon('code', 16), 'Run SQL');
    const tabs = h('div', { class: 'tabs', role: 'tablist' });
    const askPane = h('div', { class: 'pane' },
      h('form', { class: 'ask-row', onsubmit: (e) => { e.preventDefault(); ask(input.value); } }, input, go),
      h('div', { class: 'suggestions' }, suggestions().map((s) => h('button', { type: 'button', class: 'chip-btn', onclick: () => { input.value = s; ask(s); } }, s))),
      !ai ? h('p', { class: 'hint' }, icon('lock', 13), ' Asking in plain English uses your own AI key (stored only in this browser). ', h('button', { class: 'link-btn', onclick: () => ctx.onSettings?.() }, 'Add a key'), ' — or use the SQL tab, which needs no key.') : null);
    const sqlPane = h('div', { class: 'pane', hidden: true },
      h('form', { class: 'sql-row', onsubmit: (e) => { e.preventDefault(); runUserSQL(sqlInput.value); } }, sqlInput, h('div', { class: 'sql-side' }, runSql, h('p', { class: 'hint' }, 'Table name: ', h('code', {}, 'data'), '. Read-only, runs in your browser.'))));
    const tabBtn = (label, pane, other, ic) => {
      const b = h('button', { class: 'tab', role: 'tab', type: 'button' }, icon(ic, 15), label);
      b.onclick = () => { pane.hidden = false; other.hidden = true; [...tabs.children].forEach((x) => x.classList.toggle('on', x === b)); };
      return b;
    };
    const t1 = tabBtn('Ask in plain English', askPane, sqlPane, 'spark');
    const t2 = tabBtn('Write SQL', sqlPane, askPane, 'code');
    t1.classList.add('on');
    tabs.append(t1, t2);
    sqlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runUserSQL(sqlInput.value); } });

    async function ask(question) {
      question = String(question || '').trim();
      if (!question) return input.focus();
      if (!getAI()) { ctx.onSettings?.(); return; }
      go.disabled = true;
      const step = (s) => { status.replaceChildren(h('span', { class: 'spinner' }), s); };
      try {
        step('Writing the SQL…');
        const sample = (await query('SELECT * FROM main.data USING SAMPLE 5 ROWS')).map(trimRow);
        let plan = await askSQL({ question, spec, profile, sample });
        let rows;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            step(attempt ? 'Fixing the SQL…' : 'Running it on your data…');
            const safe = guardSelect(plan.sql);
            rows = await query(wrapAskSQL(safe, spec, state));
            plan.sql = safe;
            break;
          } catch (e) {
            if (attempt) throw e;
            plan = await askSQL({ question, spec, profile, sample, error: e.message, previous: plan.sql });
          }
        }
        step('Explaining the result…');
        let explanation = '';
        try { explanation = await explainResult({ question, title: plan.title, rows }); } catch (e) { console.warn(e); }
        spec.asks.unshift({ question, title: plan.title, sql: plan.sql, chart: plan.chart, format: plan.format, explanation });
        for (const [id, card] of cards) if (id.startsWith('ask-')) { instances.get(id)?.dispose(); instances.delete(id); card.el.remove(); cards.delete(id); }
        status.replaceChildren();
        input.value = '';
        ctx.onChange?.();
        await refresh();
        grid.firstChild?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        console.error(e);
        status.replaceChildren(h('span', { class: 'error-text' }, icon('alert', 14), ' ', e.message));
      } finally { go.disabled = false; }
    }

    async function runUserSQL(sql) {
      runSql.disabled = true;
      try {
        const safe = guardSelect(sql);
        await query(wrapAskSQL(safe, spec, state)); // validate before adding a card
        spec.asks.unshift({ question: '', title: 'SQL result', sql: safe, chart: { type: 'table' }, explanation: '' });
        for (const [id, card] of cards) if (id.startsWith('ask-')) { instances.get(id)?.dispose(); instances.delete(id); card.el.remove(); cards.delete(id); }
        ctx.onChange?.();
        await refresh();
        grid.firstChild?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        toast(e.message, 'error');
      } finally { runSql.disabled = false; }
    }

    return h('section', { class: 'ask no-print no-export', 'aria-label': 'Ask your data' }, tabs, askPane, sqlPane, status);
  }

  function suggestions() {
    if (ctx.questions?.length) return ctx.questions;
    const m0 = spec.measures[0], m1 = spec.measures[1];
    const out = [];
    if (spec.dim) out.push(`Which ${spec.dim.toLowerCase()} has the highest ${m0.label.toLowerCase()}?`);
    if (spec.time) out.push(`How has ${m0.label.toLowerCase()} changed over time?`);
    if (spec.dim && m1) out.push(`Compare ${m0.label.toLowerCase()} and ${m1.label.toLowerCase()} by ${spec.dim.toLowerCase()}`);
    if (!out.length) out.push('Summarise this data');
    return out.slice(0, 3);
  }

  // ---------- footer & export ----------
  function buildFooter() {
    const by = BRAND.authorUrl ? h('a', { href: BRAND.authorUrl, target: '_blank', rel: 'noopener' }, BRAND.author) : h('b', {}, BRAND.author);
    return h('footer', { class: 'dash-foot' },
      h('div', { class: 'foot-src' }, h('b', {}, 'Source: '), src.sourceText,
        src.url ? [' · ', h('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer' }, 'original')] : null,
        h('br'), h('span', { class: 'muted' }, 'Computed in the browser with DuckDB. Every chart shows its SQL.')),
      h('div', { class: 'made-by' }, 'Made by ', by, ' with ', h('span', { class: 'brand-word' }, BRAND.product)));
  }

  async function exportPNG() {
    toast('Preparing image…');
    try {
      const { toPng } = await import('html-to-image');
      const bg = getComputedStyle(document.body).backgroundColor;
      const opts = { backgroundColor: bg, pixelRatio: 2, filter: (n) => !(n.classList && (n.classList.contains('no-export'))) };
      let url;
      try { url = await toPng(exportArea, opts); } catch { url = await toPng(exportArea, { ...opts, skipFonts: true }); }
      const a = h('a', { href: url, download: `${slug(spec.title)}.png` });
      document.body.append(a); a.click(); a.remove();
    } catch (e) {
      console.error(e);
      toast('Could not create the image. Try PDF instead.', 'error');
    }
  }
}

const idxOf = (arr, v) => { const i = arr.indexOf(v); return i < 0 ? 999 : i; };
const grainName = (g) => ({ day: 'day', week: 'week', month: 'month', quarter: 'quarter', year: 'year' }[g] || 'period');
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'dashboard';
function pluralWord(w) {
  const s = String(w).toLowerCase();
  if (/(s|x|ch|sh)$/.test(s)) return s + 'es';
  if (/[^aeiou]y$/.test(s)) return s.slice(0, -1) + 'ies';
  return s + 's';
}
function trimRow(r) {
  const o = {};
  for (const [k, v] of Object.entries(r)) o[k] = typeof v === 'string' && v.length > 80 ? v.slice(0, 80) + '…' : v;
  return o;
}
