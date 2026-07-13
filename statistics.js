/* ============================================================
   TradeLog Pro — statistics.js
   All analytics charts, driven by the selected period.
   ============================================================ */
(function () {
  'use strict';
  const TJ = window.TJ;
  const M = TJ.metrics, fmt = TJ.fmt;
  const $ = id => document.getElementById(id);
  const charts = {};

  /* ---------- Helpers ---------- */
  function make(id, cfg, plugins) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
    const cv = $(id);
    if (!cv) return;
    if (plugins) cfg.plugins = plugins;
    charts[id] = new Chart(cv, cfg);
  }
  /** Show a "no data" overlay instead of an empty chart. Returns true when empty. */
  function setEmpty(id, empty, msg) {
    const cv = $(id);
    if (!cv) return true;
    const wrap = cv.parentElement;
    let ov = wrap.querySelector('.mini-empty');
    if (empty) {
      if (charts[id]) { charts[id].destroy(); delete charts[id]; }
      cv.classList.add('hidden');
      if (!ov) { ov = document.createElement('div'); ov.className = 'mini-empty'; wrap.appendChild(ov); }
      ov.textContent = msg || 'Not enough data yet for this chart.';
      return true;
    }
    cv.classList.remove('hidden');
    if (ov) ov.remove();
    return false;
  }
  function periodFilter(p) {
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return t => {
      const d = t.date || '';
      if (p === 'year') return d.slice(0, 4) === String(now.getFullYear());
      if (p === 'month') return d.slice(0, 7) === `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
      if (p === '90' || p === '30') {
        const cut = new Date(); cut.setDate(cut.getDate() - (+p));
        return d >= iso(cut);
      }
      return true;
    };
  }
  /** Generic horizontal bar. */
  function hbar(id, rows, valFn, colorsFn, tipFn, tickFmt) {
    if (setEmpty(id, !rows.length)) return;
    make(id, {
      type: 'bar',
      data: {
        labels: rows.map(g => g.key !== undefined ? g.key : g.label),
        datasets: [{
          data: rows.map(g => +(+valFn(g)).toFixed(2)),
          backgroundColor: colorsFn(rows),
          borderRadius: 7, maxBarThickness: 26
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: tipFn } } },
        scales: {
          x: { ticks: { callback: tickFmt || (v => v + 'R') } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  function decorate() {
    const icons = {
      hEquity: 'chart', hWinLoss: 'target', hMonthly: 'calendar', hYearly: 'calendar',
      hAvgRR: 'scale', hPair: 'layers', hSession: 'clock', hStrategy: 'layers',
      hTimeframe: 'clock', hRR: 'chart', hPF: 'activity', hMistakes: 'alert',
      hEmotion: 'smile', hChecklist: 'clipboard'
    };
    Object.entries(icons).forEach(([id, ic]) => {
      const el = $(id);
      if (el) el.innerHTML = TJ.icon(ic) + el.textContent;
    });
  }

  /* ---------- Build everything ---------- */
  function build(period) {
    const ts = TJ.store.list().filter(periodFilter(period));
    const has = ts.length > 0;
    $('statStrip').classList.toggle('hidden', !has);
    $('chartsGrid').classList.toggle('hidden', !has);
    $('statsEmpty').classList.toggle('hidden', has);
    if (!has) return;

    TJ.charts.themeChart();
    const c = TJ.charts.colors();
    const hexA = TJ.charts.hexA;
    const s = M.summary(ts);

    /* Quick stats */
    $('statStrip').innerHTML = [
      [s.total, 'Trades'],
      [fmt.pct(s.winRate), 'Win rate'],
      [fmt.r(s.totalR), 'Total R', TJ.rClass(s.totalR)],
      [s.profitFactor === Infinity ? '∞' : fmt.n(s.profitFactor), 'Profit factor'],
      [fmt.n(s.avgRR) + 'R', 'Avg RR', TJ.rClass(s.avgRR)],
      [fmt.r(s.expectancy), 'Expectancy / trade', TJ.rClass(s.expectancy)]
    ].map(([v, l, cls], i) =>
      `<div class="card qstat" style="--i:${i}"><div class="q-val ${cls || ''}">${v}</div><div class="q-lab">${l}</div></div>`
    ).join('');

    /* 1 · Equity curve */
    const eq = M.equity(ts);
    if (!setEmpty('chEquity', eq.labels.length < 2, 'Log at least two trades to draw the curve.')) {
      make('chEquity', {
        type: 'line',
        data: {
          labels: eq.labels,
          datasets: [{
            label: 'Cumulative R', data: eq.rs,
            borderColor: c.accent,
            backgroundColor: ctx => TJ.charts.grad(ctx.chart, c.accent),
            fill: true, tension: 0.35, borderWidth: 2.4,
            pointRadius: eq.rs.length > 40 ? 0 : 3,
            pointBackgroundColor: c.accent2, pointBorderColor: 'transparent', pointHoverRadius: 5
          }]
        },
        options: {
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: it => {
                  const t = eq.trades[it[0].dataIndex];
                  return `${t.pair || ''} ${it[0].label} · ${fmt.date(t.date)}`;
                },
                label: it => ` Equity ${fmt.r(it.parsed.y)}   (P/L ${fmt.money(eq.pnls[it.dataIndex])})`
              }
            }
          },
          scales: { x: { ticks: { maxTicksLimit: 12 }, grid: { display: false } }, y: { ticks: { callback: v => v + 'R' } } }
        }
      });
    }

    /* 2 · Win vs Loss */
    const closed = s.wins + s.losses + s.be;
    if (!setEmpty('chWinLoss', closed === 0, 'Close a trade to see the outcome mix.')) {
      make('chWinLoss', {
        type: 'doughnut',
        data: {
          labels: ['Wins', 'Losses', 'Breakeven'],
          datasets: [{
            data: [s.wins, s.losses, s.be],
            backgroundColor: [hexA(c.win, 0.85), hexA(c.loss, 0.85), hexA(c.be, 0.55)],
            borderWidth: 2, borderColor: 'rgba(0,0,0,0)', hoverOffset: 6
          }]
        },
        options: { cutout: '68%', plugins: { legend: { position: 'bottom' } } }
      }, [{
        id: 'centerText',
        afterDraw(chart) {
          const meta = chart.getDatasetMeta(0);
          if (!meta.data[0]) return;
          const { x, y } = meta.data[0];
          const ctx = chart.ctx;
          ctx.save();
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = '700 21px "Space Grotesk", sans-serif';
          ctx.fillStyle = getComputedStyle(document.body).color;
          ctx.fillText(fmt.pct(s.winRate), x, y - 9);
          ctx.font = '11px Inter, sans-serif';
          ctx.fillStyle = c.text;
          ctx.fillText('win rate', x, y + 11);
          ctx.restore();
        }
      }]);
    }

    /* 3 · Monthly / 4 · Yearly performance */
    const vbarR = (id, groups, labelFn) => {
      if (setEmpty(id, !groups.length)) return;
      make(id, {
        type: 'bar',
        data: {
          labels: groups.map(labelFn),
          datasets: [{
            data: groups.map(g => +g.r.toFixed(2)),
            backgroundColor: TJ.charts.signColors(groups.map(g => g.r)),
            borderRadius: 7, maxBarThickness: 44
          }]
        },
        options: {
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: it => {
                  const g = groups[it.dataIndex];
                  return [` Net ${fmt.r(g.r)}`, ` ${g.count} trades · ${fmt.pct(g.winRate)} win rate`];
                }
              }
            }
          },
          scales: { y: { ticks: { callback: v => v + 'R' } }, x: { grid: { display: false } } }
        }
      });
    };
    vbarR('chMonthly', M.byMonth(ts), g => fmt.month(g.key));
    vbarR('chYearly', M.byYear(ts), g => g.key);

    /* 5 · Average RR — planned vs achieved by month */
    const rrMap = new Map();
    ts.forEach(t => {
      const k = M.mKey(t.date);
      if (!k) return;
      const o = rrMap.get(k) || { p: 0, pn: 0, a: 0, an: 0 };
      const p = M.num(t.rrPlanned);
      if (p !== null) { o.p += p; o.pn++; }
      if (t.result) { o.a += M.rOf(t); o.an++; }
      rrMap.set(k, o);
    });
    const rrKeys = [...rrMap.keys()].sort();
    if (!setEmpty('chAvgRR', !rrKeys.length)) {
      make('chAvgRR', {
        type: 'line',
        data: {
          labels: rrKeys.map(k => fmt.month(k)),
          datasets: [{
            label: 'Achieved (avg R)',
            data: rrKeys.map(k => { const o = rrMap.get(k); return o.an ? +(o.a / o.an).toFixed(2) : null; }),
            borderColor: c.accent,
            backgroundColor: ctx => TJ.charts.grad(ctx.chart, c.accent, 0.22),
            fill: true, tension: 0.35, borderWidth: 2.2, pointRadius: 3, pointBackgroundColor: c.accent
          }, {
            label: 'Planned (avg RR)',
            data: rrKeys.map(k => { const o = rrMap.get(k); return o.pn ? +(o.p / o.pn).toFixed(2) : null; }),
            borderColor: c.accent2, borderDash: [6, 5], borderWidth: 2, pointRadius: 0, tension: 0.35
          }]
        },
        options: {
          plugins: { legend: { position: 'bottom' } },
          scales: { y: { ticks: { callback: v => v + 'R' } }, x: { grid: { display: false } } }
        }
      });
    }

    /* 6–9 · Pair / Session / Strategy / Timeframe */
    const rTip = rows => it => {
      const g = rows[it.dataIndex];
      return [` Net ${fmt.r(g.r)}`, ` ${g.count} trades · ${fmt.pct(g.winRate)} win rate`];
    };
    const signCols = rows => TJ.charts.signColors(rows.map(g => g.r));
    const pairRows = M.byField(ts, 'pair').slice(0, 10);
    hbar('chPair', pairRows, g => g.r, signCols, rTip(pairRows));
    const sessRows = M.byField(ts, 'session');
    hbar('chSession', sessRows, g => g.r, signCols, rTip(sessRows));
    const stratRows = M.byField(ts, 'setup');
    hbar('chStrategy', stratRows, g => g.r, signCols, rTip(stratRows));
    const tfRows = M.groupBy(ts, t => t.tfEntry || t.tfMain || null);
    hbar('chTimeframe', tfRows, g => g.r, signCols, rTip(tfRows));

    /* 10 · R-multiple distribution */
    const h = M.histogramR(ts);
    const hTotal = h.counts.reduce((a, b) => a + b, 0);
    if (!setEmpty('chRR', hTotal === 0)) {
      make('chRR', {
        type: 'bar',
        data: {
          labels: h.labels,
          datasets: [{
            data: h.counts,
            backgroundColor: h.labels.map((l, i) => hexA(i < 3 ? c.loss : c.win, 0.82)),
            borderRadius: 7, maxBarThickness: 44
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { ticks: { precision: 0 } }, x: { grid: { display: false } } }
        }
      });
    }

    /* 11 · Profit factor by month (display clamped at 5) */
    const pfMap = new Map();
    ts.forEach(t => {
      const k = M.mKey(t.date);
      if (!k) return;
      const o = pfMap.get(k) || { w: 0, l: 0 };
      const r = M.rOf(t);
      if (r > 0) o.w += r; else if (r < 0) o.l += -r;
      pfMap.set(k, o);
    });
    const pfKeys = [...pfMap.keys()].sort();
    const pfVals = pfKeys.map(k => { const o = pfMap.get(k); return o.l > 0 ? o.w / o.l : (o.w > 0 ? Infinity : 0); });
    if (!setEmpty('chPF', !pfKeys.length)) {
      make('chPF', {
        type: 'bar',
        data: {
          labels: pfKeys.map(k => fmt.month(k)),
          datasets: [{
            data: pfVals.map(v => v === Infinity ? 5 : Math.min(v, 5)),
            backgroundColor: pfVals.map(v => hexA(v >= 1 ? c.win : c.loss, 0.85)),
            borderRadius: 7, maxBarThickness: 44
          }]
        },
        options: {
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: it => ' PF ' + (pfVals[it.dataIndex] === Infinity ? '∞ (no losses)' : fmt.n(pfVals[it.dataIndex])) } }
          },
          scales: {
            y: { min: 0, max: 5, ticks: { callback: v => v === 5 ? '5+' : v } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    /* 12 · Mistake frequency */
    const mist = M.mistakeFreq(ts).slice(0, 10);
    hbar('chMistakes', mist, g => g.count,
      rows => rows.map(() => hexA(c.loss, 0.8)),
      it => ` ${mist[it.dataIndex].count}× logged`,
      v => v);

    /* 13 · Emotion analysis */
    const emo = M.emotionStats(ts);
    hbar('chEmotion', emo, g => g.avgR,
      rows => TJ.charts.signColors(rows.map(g => g.avgR)),
      it => {
        const g = emo[it.dataIndex];
        return [` Avg ${fmt.r(g.avgR)} per trade`, ` ${g.count} trades · ${fmt.pct(g.winRate)} win rate`];
      });

    /* 14 · Checklist success rate */
    const cl = M.checklistStats(ts, TJ.store.settings().checklist).filter(x => x.winRateChecked !== null);
    hbar('chChecklist', cl, g => g.winRateChecked,
      rows => rows.map(() => hexA(c.accent, 0.85)),
      it => {
        const g = cl[it.dataIndex];
        const out = [` Win rate when checked: ${fmt.pct(g.winRateChecked)}`, ` Checked in ${fmt.pct(g.adherence)} of trades`];
        if (g.winRateUnchecked !== null) out.push(` When missed: ${fmt.pct(g.winRateUnchecked)}`);
        return out;
      },
      v => v + '%');
  }

  function init() {
    decorate();
    const sel = $('statPeriod');
    sel.addEventListener('change', () => build(sel.value));
    build(sel.value);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
