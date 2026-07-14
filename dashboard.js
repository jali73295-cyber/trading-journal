/* ============================================================
   TradeLog Pro — dashboard.js
   Headline KPIs, equity curve and recent trades.
   ============================================================ */
(function () {
  'use strict';
  const TJ = window.TJ;
  const M = TJ.metrics, fmt = TJ.fmt, esc = TJ.esc;

  function pfLabel(pf) {
    if (pf === Infinity) return 'No losing trades';
    if (pf >= 2) return 'Excellent';
    if (pf >= 1.5) return 'Strong';
    if (pf >= 1) return 'Profitable';
    return pf > 0 ? 'Below breakeven' : 'No data yet';
  }

  function render() {
    const root = document.getElementById('dashRoot');
    const trades = TJ.store.list();

    if (!trades.length) {
      root.innerHTML = `
        <section class="card" style="--i:0"><div class="empty">
          <div class="empty-ico">${TJ.icon('layout')}</div>
          <h3>Welcome to your trading desk</h3>
          <p>Once you log trades, this dashboard tracks your win rate, R-multiples, streaks and equity curve — all stored privately on this device.</p>
          <div class="row">
            <a class="btn btn-primary" href="trade.html">${TJ.icon('plus')} Log first trade</a>
            <button class="btn" id="dashDemo">Load demo data</button>
          </div>
        </div></section>`;
      document.getElementById('dashDemo').addEventListener('click', () => {
        TJ.store.seedDemo();
        TJ.ui.toast('Demo data loaded');
        setTimeout(() => location.reload(), 450);
      });
      return;
    }

    const s = M.summary(trades);
    const monthName = new Date().toLocaleDateString(undefined, { month: 'long' });
    document.getElementById('dashSub').textContent =
      `${s.total} trades · ${fmt.pct(s.winRate)} win rate · ${fmt.r(s.totalR)} total`;

    const cards = [
      { icon: 'layers', lab: 'Total Trades', val: s.total, sub: s.open ? `${s.open} still open` : 'All time' },
      { icon: 'up', tone: 'win', lab: 'Wins (TP)', val: s.wins, sub: s.best ? `Best ${fmt.r(M.rOf(s.best))} · ${esc(s.best.pair || '')}` : '—' },
      { icon: 'down', tone: 'loss', lab: 'Losses (SL)', val: s.losses, sub: s.worst && M.rOf(s.worst) < 0 ? `Worst ${fmt.r(M.rOf(s.worst))} · ${esc(s.worst.pair || '')}` : '—' },
      { icon: 'target', tone: 'be', lab: 'BE / RF', val: s.be + s.rf, sub: `${s.be} breakeven · ${s.rf} risk-free` },
      { icon: 'trophy', lab: 'Win Rate', val: fmt.pct(s.winRate), sub: `${s.wins}W / ${s.losses}L (BE excluded)`, ring: s.winRate },
      { icon: 'scale', lab: 'Average RR', val: fmt.n(s.avgRR) + 'R', sub: `Planned avg ${fmt.n(s.avgRRPlanned)}R`, cls: TJ.rClass(s.avgRR) },
      { icon: 'activity', lab: 'Profit Factor', val: s.profitFactor === Infinity ? '∞' : fmt.n(s.profitFactor), sub: pfLabel(s.profitFactor) },
      { icon: 'flame', tone: 'win', lab: 'Winning Streak', val: s.streakW, sub: 'Current run' },
      { icon: 'flame', tone: 'loss', lab: 'Losing Streak', val: s.streakL, sub: 'Current run' },
      { icon: 'chart', lab: 'Total R', val: fmt.r(s.totalR), cls: TJ.rClass(s.totalR), sub: `P/L ${fmt.money(s.totalPnl)}` },
      { icon: 'calendar', lab: 'Monthly R', val: fmt.r(s.monthR), cls: TJ.rClass(s.monthR), sub: `${monthName} · ${s.monthCount} trades` }
    ];

    const recent = trades.slice(0, 6);
    root.innerHTML = `
      <section class="stat-grid">
        ${cards.map((c, i) => `
          <div class="card stat" style="--i:${i}">
            <div class="stat-top">
              <span class="stat-ico${c.tone ? ' tone-' + c.tone : ''}">${TJ.icon(c.icon)}</span>
              ${c.ring !== undefined ? `<span class="ring" style="--p:${Math.round(c.ring)}"><span>${Math.round(c.ring)}%</span></span>` : ''}
            </div>
            <div>
              <div class="stat-val ${c.cls || ''}">${c.val}</div>
              <div class="stat-lab">${c.lab}</div>
              <div class="stat-sub">${c.sub || ''}</div>
            </div>
          </div>`).join('')}
      </section>

      <section class="grid2">
        <div class="card chart-card" style="--i:3">
          <div class="card-h"><h3>${TJ.icon('chart')}Equity Curve</h3><span class="spacer"></span>
            <div class="seg" id="eqSeg"><button data-v="usd">$</button><button data-v="r">R</button></div></div>
          <div class="chart-wrap tall">${trades.length > 1 ? '<canvas id="dashEquity"></canvas>' : '<div class="mini-empty">Log a couple of trades to draw your curve.</div>'}</div>
        </div>
        <div class="card" style="--i:4">
          <div class="card-h"><h3>${TJ.icon('clock')}Recent Trades</h3><span class="spacer"></span>
            <a class="btn btn-ghost btn-sm" href="index.html">View all ${TJ.icon('chev-r')}</a></div>
          <div>
            ${recent.map(t => {
              const r = M.rOf(t);
              return `<a class="recent-row" href="trade.html?id=${t.id}">
                <span class="rp mono">${esc(t.pair || '—')}</span>
                ${TJ.dirBadge(t.direction)}
                <span class="rd">${fmt.date(t.date)}</span>
                <span class="spacer"></span>
                ${TJ.resultBadge(t.result)}
                <span class="rr ${TJ.rClass(r)}" style="min-width:56px;text-align:right">${t.result ? fmt.r(r) : '—'}</span>
              </a>`;
            }).join('')}
          </div>
        </div>
      </section>`;

    if (trades.length > 1 && window.Chart) {
      let mode = trades.some(t => M.pnlOf(t)) ? 'usd' : 'r';
      const seg = document.getElementById('eqSeg');
      const sync = () => seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.v === mode));
      seg.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        mode = b.dataset.v; sync(); drawEquity(trades, mode);
      });
      sync();
      drawEquity(trades, mode);
    }
  }

  let eqChart = null;
  function drawEquity(trades, mode) {
    TJ.charts.themeChart();
    const c = TJ.charts.colors();
    const eq = M.equity(trades);
    const usd = mode === 'usd';
    if (eqChart) eqChart.destroy();
    eqChart = new Chart(document.getElementById('dashEquity'), {
      type: 'line',
      data: {
        labels: eq.labels,
        datasets: [{
          label: usd ? 'Equity (P/L)' : 'Cumulative R',
          data: usd ? eq.pnls : eq.rs,
          borderColor: c.accent,
          backgroundColor: ctx => TJ.charts.grad(ctx.chart, c.accent),
          borderWidth: 2.4, fill: true, tension: 0.35,
          pointRadius: eq.rs.length > 40 ? 0 : 3,
          pointBackgroundColor: c.accent2, pointBorderColor: 'transparent',
          pointHoverRadius: 5
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: items => {
                const t = eq.trades[items[0].dataIndex];
                return `${t.pair || ''} ${items[0].label} · ${fmt.date(t.date)}`;
              },
              label: item => usd
                ? ` Equity ${fmt.money(item.parsed.y)}   (${fmt.r(eq.rs[item.dataIndex])})`
                : ` Equity ${fmt.r(item.parsed.y)}   (P/L ${fmt.money(eq.pnls[item.dataIndex])})`
            }
          }
        },
        scales: {
          x: { ticks: { maxTicksLimit: 10 }, grid: { display: false } },
          y: { ticks: { callback: v => usd ? fmt.money(v) : v + 'R' } }
        }
      }
    });
  }

  function wireAI() {
    const b = document.getElementById('aiReviewBtn');
    if (!b || !TJ.ai) return;
    b.insertAdjacentHTML('afterbegin', TJ.icon('flame'));
    b.addEventListener('click', () => TJ.ai.openSummary());
  }

  function boot() { render(); wireAI(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
