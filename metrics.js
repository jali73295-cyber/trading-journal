/* ============================================================
   TradeLog Pro — metrics.js
   Pure functions over the trade schema. No DOM. Everything the
   dashboard, statistics page and future AI analysis need.
   Conventions:
   · rrAchieved is a SIGNED R-multiple (+2.5 win, -1 loss, 0 BE)
   · win rate = wins / (wins + losses); breakeven shown separately
   ============================================================ */
(function () {
  'use strict';
  const TJ = (window.TJ = window.TJ || {});

  const num = v => (v === null || v === undefined || v === '' || isNaN(+v)) ? null : +v;

  /** Signed R for a trade, derived when rrAchieved is missing. */
  function rOf(t) {
    const r = num(t.rrAchieved);
    if (r !== null) return r;
    if (t.result === 'win') { const p = num(t.rrPlanned); return p === null ? 1 : p; }
    if (t.result === 'loss') return -1;
    return 0;
  }
  const pnlOf = t => num(t.pnl) === null ? 0 : num(t.pnl);
  const mKey = d => (d || '').slice(0, 7);
  const yKey = d => (d || '').slice(0, 4);

  /** Headline summary used by the dashboard cards. */
  function summary(ts) {
    const total = ts.length;
    let wins = 0, losses = 0, be = 0, open = 0;
    let grossWin = 0, grossLoss = 0, totalR = 0, totalPnl = 0;
    let rrPlannedSum = 0, rrPlannedN = 0, rSum = 0, rN = 0;
    ts.forEach(t => {
      if (t.result === 'win') wins++;
      else if (t.result === 'loss') losses++;
      else if (t.result === 'breakeven') be++;
      else open++;
      const r = rOf(t);
      totalR += r;
      if (t.result) { rSum += r; rN++; }
      if (r > 0) grossWin += r; else if (r < 0) grossLoss += -r;
      totalPnl += pnlOf(t);
      const p = num(t.rrPlanned);
      if (p !== null) { rrPlannedSum += p; rrPlannedN++; }
    });
    const winRate = (wins + losses) ? (wins / (wins + losses)) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
    const nowKey = mKey(new Date().toISOString());
    const monthTrades = ts.filter(t => mKey(t.date) === nowKey);
    const monthR = monthTrades.reduce((s, t) => s + rOf(t), 0);
    // Current streaks — walk from the newest trade; breakeven/open ends both.
    const desc = ts.slice().sort((a, b) =>
      ((b.date || '') + (b.time || '')).localeCompare((a.date || '') + (a.time || '')) || (b.number - a.number));
    let streakW = 0, streakL = 0;
    for (const t of desc) {
      if (!t.result || t.result === 'breakeven') break;
      if (t.result === 'win') { if (streakL) break; streakW++; }
      else { if (streakW) break; streakL++; }
    }
    let best = null, worst = null;
    ts.forEach(t => {
      const r = rOf(t);
      if (!best || r > rOf(best)) best = t;
      if (!worst || r < rOf(worst)) worst = t;
    });
    return {
      total, wins, losses, be, open, winRate,
      avgRR: rN ? rSum / rN : 0,
      avgRRPlanned: rrPlannedN ? rrPlannedSum / rrPlannedN : 0,
      profitFactor, totalR, totalPnl, monthR,
      monthCount: monthTrades.length,
      expectancy: total ? totalR / total : 0,
      streakW, streakL, best, worst
    };
  }

  /** Group by an arbitrary key fn → sorted rows with per-group stats. */
  function groupBy(ts, keyFn, sortByKey) {
    const map = new Map();
    ts.forEach(t => {
      const k = keyFn(t);
      if (k === null || k === undefined || k === '') return;
      if (!map.has(k)) map.set(k, { key: k, count: 0, wins: 0, losses: 0, be: 0, r: 0, pnl: 0 });
      const g = map.get(k);
      g.count++;
      if (t.result === 'win') g.wins++;
      else if (t.result === 'loss') g.losses++;
      else if (t.result === 'breakeven') g.be++;
      g.r += rOf(t);
      g.pnl += pnlOf(t);
    });
    const rows = [...map.values()];
    rows.forEach(g => { g.winRate = (g.wins + g.losses) ? g.wins / (g.wins + g.losses) * 100 : 0; });
    if (sortByKey) rows.sort((a, b) => String(a.key).localeCompare(String(b.key)));
    else rows.sort((a, b) => b.r - a.r);
    return rows;
  }
  const byMonth = ts => groupBy(ts, t => mKey(t.date), true);
  const byYear = ts => groupBy(ts, t => yKey(t.date), true);
  const byField = (ts, field) => groupBy(ts, t => t[field]);

  /** Cumulative equity in R and account currency, oldest → newest. */
  function equity(ts) {
    const asc = ts.slice().sort((a, b) =>
      ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')) || (a.number - b.number));
    let r = 0, pnl = 0;
    const labels = [], rs = [], pnls = [];
    asc.forEach(t => {
      r += rOf(t); pnl += pnlOf(t);
      labels.push('#' + (t.number || '?'));
      rs.push(+r.toFixed(2)); pnls.push(+pnl.toFixed(2));
    });
    return { labels, rs, pnls, trades: asc };
  }

  /** R-multiple distribution histogram. */
  function histogramR(ts) {
    const edges = [-Infinity, -2, -1, 0, 1, 2, 3, 5, Infinity];
    const labels = ['< -2R', '-2 to -1R', '-1 to 0R', '0 to 1R', '1 to 2R', '2 to 3R', '3 to 5R', '5R+'];
    const counts = new Array(labels.length).fill(0);
    ts.forEach(t => {
      if (!t.result) return;
      const r = rOf(t);
      for (let i = 0; i < labels.length; i++) {
        if (r > edges[i] && r <= edges[i + 1]) { counts[i]++; return; }
      }
      counts[labels.length - 1]++;
    });
    return { labels, counts };
  }

  /** Mistake frequency, most common first. */
  function mistakeFreq(ts) {
    const map = new Map();
    ts.forEach(t => (t.mistakes || []).forEach(m => map.set(m, (map.get(m) || 0) + 1)));
    return [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  }

  /** Stats keyed on the pre-trade emotion. */
  function emotionStats(ts) {
    return groupBy(ts, t => t.emotionBefore).map(g => ({ ...g, avgR: g.count ? g.r / g.count : 0 }));
  }

  /** Per-checklist-item: adherence and win rate when checked vs missed. */
  function checklistStats(ts, items) {
    return (items || []).map(item => {
      let tracked = 0, checked = 0, cw = 0, cl = 0, uw = 0, ul = 0;
      ts.forEach(t => {
        const c = t.checklist || {};
        if (!(item.id in c)) return;
        tracked++;
        const isWin = t.result === 'win', isLoss = t.result === 'loss';
        if (c[item.id]) { checked++; if (isWin) cw++; if (isLoss) cl++; }
        else { if (isWin) uw++; if (isLoss) ul++; }
      });
      return {
        id: item.id, label: item.label, tracked, checked,
        adherence: tracked ? checked / tracked * 100 : 0,
        winRateChecked: (cw + cl) ? cw / (cw + cl) * 100 : null,
        winRateUnchecked: (uw + ul) ? uw / (uw + ul) * 100 : null
      };
    });
  }

  TJ.metrics = { num, rOf, pnlOf, mKey, yKey, summary, groupBy, byMonth, byYear, byField, equity, histogramR, mistakeFreq, emotionStats, checklistStats };
})();
