/* ============================================================
   TradeLog Pro — gallery.js
   Every screenshot from every trade, filterable and zoomable.
   ============================================================ */
(function () {
  'use strict';
  const TJ = window.TJ;
  const M = TJ.metrics, fmt = TJ.fmt, esc = TJ.esc;
  const $ = id => document.getElementById(id);

  const SLOT_LABEL = { entry: 'Entry', exit: 'Exit', markup: 'Chart Markup', before: 'Before Trade', after: 'After Trade' };
  const SLOT_ORDER = ['entry', 'exit', 'markup', 'before', 'after'];

  let items = []; // { rec, trade, label, src }
  const f = { pair: '', result: '', strategy: '', type: '', month: '' };

  async function load() {
    let recs = [];
    try { recs = await TJ.images.all(); } catch (e) { /* IndexedDB unavailable */ }
    const tmap = new Map(TJ.store.list().map(t => [t.id, t]));
    items = recs.map(rec => {
      const trade = tmap.get(rec.tradeId);
      if (!trade || !rec.blob) return null;
      return { rec, trade, label: SLOT_LABEL[rec.slot] || rec.slot, src: URL.createObjectURL(rec.blob) };
    }).filter(Boolean);
    items.sort((a, b) => {
      const k = t => (t.date || '') + 'T' + (t.time || '');
      const c = k(b.trade).localeCompare(k(a.trade));
      if (c) return c;
      return SLOT_ORDER.indexOf(a.rec.slot) - SLOT_ORDER.indexOf(b.rec.slot);
    });
  }

  function fillSelect(el, options) {
    el.innerHTML = '<option value="">All</option>' +
      options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
  }
  function buildFilters() {
    fillSelect($('gPair'), [...new Set(items.map(i => i.trade.pair).filter(Boolean))].sort());
    fillSelect($('gStrategy'), [...new Set(items.map(i => i.trade.setup).filter(Boolean))].sort());
    fillSelect($('gType'), SLOT_ORDER.filter(sl => items.some(i => i.rec.slot === sl)).map(sl => SLOT_LABEL[sl]));
  }

  function filtered() {
    return items.filter(i => {
      if (f.pair && i.trade.pair !== f.pair) return false;
      if (f.result && i.trade.result !== f.result) return false;
      if (f.strategy && i.trade.setup !== f.strategy) return false;
      if (f.type && i.label !== f.type) return false;
      if (f.month && (i.trade.date || '').slice(0, 7) !== f.month) return false;
      return true;
    });
  }

  function render() {
    const grid = $('galGrid');
    const filterCard = $('galFilterTitle').closest('.card');
    const hasAny = items.length > 0;
    $('galEmpty').classList.toggle('hidden', hasAny);
    filterCard.classList.toggle('hidden', !hasAny);
    grid.classList.toggle('hidden', !hasAny);
    $('galSub').textContent = hasAny
      ? `${items.length} screenshots across ${new Set(items.map(i => i.trade.id)).size} trades`
      : 'Your chart library.';
    if (!hasAny) return;

    const rows = filtered();
    $('galCount').textContent = `${rows.length} image${rows.length === 1 ? '' : 's'}`;
    grid.innerHTML = rows.length ? rows.map((i, idx) => {
      const r = M.rOf(i.trade);
      return `<figure class="gal-item" data-idx="${idx}" style="--i:${Math.min(idx, 18)}">
        <img class="gal-img" loading="lazy" src="${i.src}" alt="${esc(i.trade.pair || '')} ${esc(i.label)}">
        <figcaption class="gal-meta">
          <div class="gal-top"><span class="mono">${esc(i.trade.pair || '—')}</span>${TJ.resultBadge(i.trade.result)}</div>
          <div class="gal-sub">
            <span>${esc(i.label)}</span><span>·</span><span>${fmt.date(i.trade.date)}</span>
            ${i.trade.setup ? `<span>·</span><span>${esc(i.trade.setup)}</span>` : ''}
            <span class="spacer"></span>
            <span class="rr ${TJ.rClass(r)}">${i.trade.result ? fmt.r(r) : ''}</span>
          </div>
        </figcaption>
      </figure>`;
    }).join('')
      : `<div class="card" style="grid-column:1/-1"><div class="empty" style="padding:38px">
          <p class="muted">No screenshots match these filters.</p></div></div>`;

    grid.querySelectorAll('.gal-item').forEach(el => el.addEventListener('click', () => {
      const rowsNow = filtered();
      TJ.ui.lightbox(rowsNow.map(i => ({
        src: i.src,
        title: `${i.trade.pair || ''} — ${i.label}`,
        caption: `${fmt.dateFull(i.trade.date)}${i.trade.setup ? ' · ' + i.trade.setup : ''}${i.trade.result ? ' · ' + i.trade.result : ''}`,
        link: 'trade.html?id=' + i.trade.id
      })), +el.dataset.idx);
    }));
  }

  function wire() {
    const bind = (id, key) => $(id).addEventListener('change', () => { f[key] = $(id).value; render(); });
    bind('gPair', 'pair'); bind('gResult', 'result'); bind('gStrategy', 'strategy');
    bind('gType', 'type'); bind('gMonth', 'month');
    $('galClear').addEventListener('click', () => {
      Object.keys(f).forEach(k => f[k] = '');
      ['gPair', 'gResult', 'gStrategy', 'gType', 'gMonth'].forEach(id => $(id).value = '');
      render();
    });
  }

  async function init() {
    $('galFilterTitle').innerHTML = TJ.icon('filter') + 'Filter screenshots';
    $('galEmptyIco').innerHTML = TJ.icon('image');
    await load();
    buildFilters();
    wire();
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
