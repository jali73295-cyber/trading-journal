/* ============================================================
   TradeLog Pro — journal.js
   The Journal page: search & filters, sortable/paginated trade
   table, row actions, and the monthly P&L calendar.
   ============================================================ */
(function () {
  'use strict';
  const TJ = window.TJ;
  const M = TJ.metrics, fmt = TJ.fmt, esc = TJ.esc;
  const $ = id => document.getElementById(id);
  const PAGE = 25;

  const state = {
    f: { q: '', pair: '', dir: '', session: '', strategy: '', tf: '', level: '', result: '', tag: '', month: '', year: '', from: '', to: '' },
    sort: { key: 'date', dir: -1 },
    page: 1,
    view: 'table',
    cal: new Date()
  };

  /* ---------- Static icon fills ---------- */
  function decorate() {
    $('filterTitle').innerHTML = TJ.icon('filter') + 'Filters';
    $('tableTitle').innerHTML = TJ.icon('table') + 'All trades';
    $('toggleFilters').innerHTML = TJ.icon('chev-d');
    $('exportFiltered').innerHTML = TJ.icon('download') + 'Export CSV';
    $('calPrev').innerHTML = TJ.icon('chev-l');
    $('calNext').innerHTML = TJ.icon('chev-r');
    $('emptyIco').innerHTML = TJ.icon('book');
    const seg = $('viewSeg');
    seg.querySelector('[data-view="table"]').innerHTML = TJ.icon('table') + '<span>Table</span>';
    seg.querySelector('[data-view="calendar"]').innerHTML = TJ.icon('calendar') + '<span>Calendar</span>';
  }

  /* ---------- Filter options ---------- */
  const distinct = (rows, fn) => [...new Set(rows.map(fn).filter(Boolean))];
  function fillSelect(el, options, emptyLabel = 'All') {
    const cur = el.value;
    el.innerHTML = `<option value="">${emptyLabel}</option>` +
      options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
    if (options.includes(cur)) el.value = cur;
  }
  function buildFilters() {
    const s = TJ.store.settings();
    const rows = TJ.store.list();
    fillSelect($('fPair'), [...new Set([...s.pairs, ...distinct(rows, t => t.pair)])]);
    fillSelect($('fSession'), [...new Set([...s.sessions, ...distinct(rows, t => t.session)])]);
    fillSelect($('fStrategy'), [...new Set([...s.strategies, ...distinct(rows, t => t.setup)])]);
    fillSelect($('fTf'), [...new Set([...s.timeframes,
      ...distinct(rows, t => t.tfEntry), ...distinct(rows, t => t.tfMain), ...distinct(rows, t => t.tfHigher)])]);
    fillSelect($('fLevel'), [...new Set([...s.levels, ...distinct(rows, t => t.level)])]);
    fillSelect($('fTag'), [...new Set([...s.tags, ...rows.flatMap(t => t.tags || [])])]);
    fillSelect($('fYear'), distinct(rows, t => (t.date || '').slice(0, 4)).sort().reverse());
  }

  /* ---------- Filtering & sorting ---------- */
  function filtered() {
    const f = state.f;
    return TJ.store.list().filter(t => {
      if (f.pair && t.pair !== f.pair) return false;
      if (f.dir && t.direction !== f.dir) return false;
      if (f.session && t.session !== f.session) return false;
      if (f.strategy && t.setup !== f.strategy) return false;
      if (f.tf && ![t.tfEntry, t.tfMain, t.tfHigher].includes(f.tf)) return false;
      if (f.level && t.level !== f.level) return false;
      if (f.result) {
        if (f.result === 'open') { if (t.result) return false; }
        else if (t.result !== f.result) return false;
      }
      if (f.tag && !(t.tags || []).includes(f.tag)) return false;
      if (f.month && (t.date || '').slice(0, 7) !== f.month) return false;
      if (f.year && (t.date || '').slice(0, 4) !== f.year) return false;
      if (f.from && (t.date || '') < f.from) return false;
      if (f.to && (t.date || '') > f.to) return false;
      if (f.q) {
        const hay = [t.pair, t.setup, t.level, t.session, t.structure, t.notes, t.lesson,
          t.emotionBefore, t.emotionAfter, (t.tags || []).join(' '), (t.mistakes || []).join(' '),
          '#' + t.number].join(' ').toLowerCase();
        if (!hay.includes(f.q.toLowerCase())) return false;
      }
      return true;
    });
  }
  function sorted(rows) {
    const { key, dir } = state.sort;
    const val = t =>
      key === 'number' ? (t.number || 0) :
      key === 'date' ? (t.date || '') + 'T' + (t.time || '') :
      key === 'pair' ? (t.pair || '') :
      key === 'result' ? (t.result || 'zz') :
      key === 'rr' ? M.rOf(t) : 0;
    return rows.slice().sort((a, b) => {
      const va = val(a), vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }
  function activeFilterCount() {
    return Object.values(state.f).filter(v => v !== '').length;
  }

  /* ---------- Table ---------- */
  function rowHtml(t) {
    const r = M.rOf(t);
    const tf = [t.tfHigher || t.tfMain, t.tfEntry].filter(Boolean).join(' → ') || t.tfMain || '—';
    return `<tr data-id="${t.id}">
      <td class="num muted">#${t.number || '—'}</td>
      <td>${fmt.date(t.date)} <span class="muted" style="font-size:.78em">${esc(t.time || '')}</span></td>
      <td><b class="mono">${esc(t.pair || '—')}</b></td>
      <td>${TJ.dirBadge(t.direction)}</td>
      <td class="muted">${esc(tf)}</td>
      <td class="muted">${esc(t.session || '—')}</td>
      <td class="muted">${esc(t.setup || '—')}</td>
      <td>${TJ.resultBadge(t.result)}</td>
      <td class="num"><span class="rr ${TJ.rClass(r)}">${t.result ? fmt.r(r) : '—'}</span></td>
      <td><div class="row-btns">
        <button class="rb" data-act="view" title="View">${TJ.icon('eye')}</button>
        <button class="rb" data-act="edit" title="Edit">${TJ.icon('pencil')}</button>
        <button class="rb" data-act="dup" title="Duplicate">${TJ.icon('copy')}</button>
        <button class="rb danger" data-act="del" title="Delete">${TJ.icon('trash')}</button>
      </div></td>
    </tr>`;
  }

  function renderTable() {
    const rows = sorted(filtered());
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * PAGE;
    const slice = rows.slice(start, start + PAGE);

    $('tbody').innerHTML = slice.length
      ? slice.map(rowHtml).join('')
      : `<tr><td colspan="10"><div class="empty" style="padding:34px">
           <p class="muted">No trades match these filters.</p></div></td></tr>`;
    $('countText').textContent = `${rows.length} trade${rows.length === 1 ? '' : 's'}`;

    const totalR = rows.reduce((s, t) => s + M.rOf(t), 0);
    $('journalSub').innerHTML = rows.length
      ? `${rows.length} trades · net <span class="rr ${TJ.rClass(totalR)}">${fmt.r(totalR)}</span>`
      : 'Every trade, searchable.';

    $('pager').innerHTML = `
      <span>Showing ${rows.length ? start + 1 : 0}–${start + slice.length} of ${rows.length}</span>
      <div class="pg-btns">
        <button class="btn btn-ghost btn-sm" id="pgPrev" ${state.page <= 1 ? 'disabled' : ''}>${TJ.icon('chev-l')} Prev</button>
        <span class="count-badge">${state.page} / ${pages}</span>
        <button class="btn btn-ghost btn-sm" id="pgNext" ${state.page >= pages ? 'disabled' : ''}>Next ${TJ.icon('chev-r')}</button>
      </div>`;
    $('pgPrev').addEventListener('click', () => { state.page--; renderTable(); });
    $('pgNext').addEventListener('click', () => { state.page++; renderTable(); });

    const n = activeFilterCount();
    $('activeFilters').textContent = `${n} active`;
    $('activeFilters').classList.toggle('hidden', n === 0);

    document.querySelectorAll('th.sortable').forEach(th => {
      th.classList.remove('asc', 'desc');
      if (th.dataset.sort === state.sort.key) th.classList.add(state.sort.dir === 1 ? 'asc' : 'desc');
    });
  }

  async function deleteTrade(id) {
    const t = TJ.store.byId(id);
    if (!t) return;
    const ok = await TJ.ui.confirm({
      title: `Delete trade #${t.number}?`,
      message: `${t.pair || 'This trade'} and all of its screenshots will be removed permanently.`,
      confirmText: 'Delete', danger: true
    });
    if (!ok) return;
    try { await TJ.images.deleteForTrade(id); } catch (e) { /* idb may be unavailable */ }
    TJ.store.remove(id);
    TJ.ui.toast('Trade deleted');
    TJ.updateUsage();
    refresh();
  }

  function onTableClick(e) {
    const btn = e.target.closest('[data-act]');
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    const id = tr.dataset.id;
    if (!btn) { location.href = 'trade.html?id=' + id; return; }
    const act = btn.dataset.act;
    if (act === 'view') location.href = 'trade.html?id=' + id;
    if (act === 'edit') location.href = 'trade.html?edit=' + id;
    if (act === 'dup') location.href = 'trade.html?duplicate=' + id;
    if (act === 'del') deleteTrade(id);
  }

  /* ---------- Calendar ---------- */
  function renderCal() {
    const d = state.cal, y = d.getFullYear(), m = d.getMonth();
    $('calTitle').textContent = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const rows = filtered();
    const byDay = {};
    rows.forEach(t => { if (t.date) (byDay[t.date] = byDay[t.date] || []).push(t); });

    const pad = n => String(n).padStart(2, '0');
    const todayStr = (() => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; })();
    const first = new Date(y, m, 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first
    const daysIn = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const cells = Math.ceil((lead + daysIn) / 7) * 7;

    let html = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      .map(w => `<div class="cal-dow">${w}</div>`).join('');
    let monthR = 0, monthN = 0;

    for (let i = 0; i < cells; i++) {
      const dayNum = i - lead + 1;
      let cy = y, cm = m, cd = dayNum, dim = false;
      if (dayNum < 1) { dim = true; cm = m - 1; cd = prevDays + dayNum; }
      else if (dayNum > daysIn) { dim = true; cm = m + 1; cd = dayNum - daysIn; }
      const dt = new Date(cy, cm, cd);
      const key = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
      const dayTrades = byDay[key] || [];
      const r = dayTrades.reduce((s, t) => s + M.rOf(t), 0);
      if (!dim && dayTrades.length) { monthR += r; monthN += dayTrades.length; }
      const cls = ['cal-cell',
        dim ? 'dim' : '',
        key === todayStr ? 'today' : '',
        dayTrades.length ? 'has ' + (r > 0 ? 'pday' : r < 0 ? 'nday' : '') : ''
      ].filter(Boolean).join(' ');
      html += `<div class="${cls}" ${dayTrades.length ? `data-day="${key}"` : ''}>
        <span class="cal-day">${dt.getDate()}</span>
        ${dayTrades.length ? `<span class="cal-r ${TJ.rClass(r)}">${fmt.r(r)}</span>
        <span class="cal-n">${dayTrades.length} trade${dayTrades.length === 1 ? '' : 's'}</span>` : ''}
      </div>`;
    }
    $('calGrid').innerHTML = html;
    $('calSummary').textContent = monthN ? `${monthN} trades · ${fmt.r(monthR)}` : 'No trades this month';
    $('calGrid').querySelectorAll('[data-day]').forEach(c =>
      c.addEventListener('click', () => dayModal(c.dataset.day, byDay[c.dataset.day] || [])));
  }

  function dayModal(day, trades) {
    const r = trades.reduce((s, t) => s + M.rOf(t), 0);
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="note">${TJ.icon('calendar')} ${trades.length} trade${trades.length === 1 ? '' : 's'} ·
        net <span class="rr ${TJ.rClass(r)}">&nbsp;${fmt.r(r)}</span></div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">
        ${trades.map(t => {
          const tr = M.rOf(t);
          return `<a class="recent-row" style="border:1px solid var(--border);border-radius:12px" href="trade.html?id=${t.id}">
            <span class="rp mono">${esc(t.pair || '—')}</span>
            ${TJ.dirBadge(t.direction)} ${TJ.resultBadge(t.result)}
            <span class="spacer"></span>
            <span class="rr ${TJ.rClass(tr)}">${t.result ? fmt.r(tr) : '—'}</span>
          </a>`;
        }).join('')}
      </div>`;
    TJ.ui.modal({ title: fmt.dateFull(day), body, wide: trades.length > 3 });
  }

  /* ---------- View toggle & wiring ---------- */
  function setView(v) {
    state.view = v;
    $('viewSeg').querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    $('tableView').classList.toggle('hidden', v !== 'table');
    $('calView').classList.toggle('hidden', v !== 'calendar');
    refresh();
  }

  function refresh() {
    const has = TJ.store.list().length > 0;
    $('emptyState').classList.toggle('hidden', has);
    $('filterCard').classList.toggle('hidden', !has);
    $('tableView').classList.toggle('hidden', !has || state.view !== 'table');
    $('calView').classList.toggle('hidden', !has || state.view !== 'calendar');
    if (!has) return;
    if (state.view === 'table') renderTable(); else renderCal();
  }

  function wire() {
    const bind = (id, key, debounced) => {
      const el = $(id);
      const fn = () => { state.f[key] = el.value.trim(); state.page = 1; refresh(); };
      el.addEventListener(debounced ? 'input' : 'change', debounced ? TJ.debounce(fn, 200) : fn);
    };
    bind('fKeyword', 'q', true);
    bind('fPair', 'pair'); bind('fDir', 'dir'); bind('fSession', 'session');
    bind('fStrategy', 'strategy'); bind('fTf', 'tf'); bind('fLevel', 'level');
    bind('fResult', 'result'); bind('fTag', 'tag'); bind('fMonth', 'month');
    bind('fYear', 'year'); bind('fFrom', 'from'); bind('fTo', 'to');

    $('clearFilters').addEventListener('click', () => {
      Object.keys(state.f).forEach(k => state.f[k] = '');
      ['fKeyword', 'fPair', 'fDir', 'fSession', 'fStrategy', 'fTf', 'fLevel', 'fResult', 'fTag', 'fMonth', 'fYear', 'fFrom', 'fTo']
        .forEach(id => $(id).value = '');
      state.page = 1; refresh();
    });
    $('toggleFilters').addEventListener('click', () => {
      const g = $('filterGrid');
      g.classList.toggle('hidden');
      $('toggleFilters').style.transform = g.classList.contains('hidden') ? 'rotate(-90deg)' : '';
    });
    $('exportFiltered').addEventListener('click', () => {
      const rows = sorted(filtered());
      if (!rows.length) return TJ.ui.toast('Nothing to export', 'info');
      TJ.download(`tradelog-trades-${new Date().toISOString().slice(0, 10)}.csv`, TJ.store.toCSV(rows), 'text/csv');
      TJ.ui.toast(`Exported ${rows.length} trades to CSV`);
    });
    document.querySelectorAll('th.sortable').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.sort;
      if (state.sort.key === k) state.sort.dir *= -1;
      else state.sort = { key: k, dir: k === 'date' || k === 'number' || k === 'rr' ? -1 : 1 };
      renderTable();
    }));
    $('tradesTable').addEventListener('click', onTableClick);
    $('viewSeg').querySelectorAll('button').forEach(b =>
      b.addEventListener('click', () => setView(b.dataset.view)));
    $('calPrev').addEventListener('click', () => { state.cal.setMonth(state.cal.getMonth() - 1); renderCal(); });
    $('calNext').addEventListener('click', () => { state.cal.setMonth(state.cal.getMonth() + 1); renderCal(); });
    $('calToday').addEventListener('click', () => { state.cal = new Date(); renderCal(); });
    $('loadDemo').addEventListener('click', () => {
      TJ.store.seedDemo();
      TJ.ui.toast('Demo data loaded');
      setTimeout(() => location.reload(), 450);
    });
  }

  function init() {
    decorate();
    buildFilters();
    wire();
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
