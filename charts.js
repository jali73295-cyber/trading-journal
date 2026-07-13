/* ============================================================
   TradeLog Pro — charts.js
   Chart.js theme + color helpers. Loaded only on pages that
   render charts (dashboard, statistics).
   ============================================================ */
(function () {
  'use strict';
  const TJ = (window.TJ = window.TJ || {});

  const cssVar = name =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function hexA(hex, a = 1) {
    let h = (hex || '#7c6cff').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  function mixHex(h1, h2, t) {
    const p = h => {
      let s = h.replace('#', '');
      if (s.length === 3) s = s.split('').map(c => c + c).join('');
      const n = parseInt(s, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const a = p(h1), b = p(h2);
    const m = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return '#' + m.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  function colors() {
    const accent = cssVar('--accent') || '#7c6cff';
    return {
      accent,
      accent2: mixHex(accent, '#37d2e6', 0.5),
      win: '#2dd684', loss: '#ff5c7a', be: '#8b94a9', warn: '#f4b740',
      text: cssVar('--text-2') || '#9ba6bc'
    };
  }
  function themeChart() {
    if (!window.Chart) return;
    const c = colors();
    const d = Chart.defaults;
    d.color = c.text;
    d.font.family = getComputedStyle(document.body).fontFamily;
    d.font.size = 11.5;
    d.borderColor = 'rgba(150, 165, 200, 0.11)';
    d.plugins.legend.labels.usePointStyle = true;
    d.plugins.legend.labels.boxWidth = 8;
    d.plugins.legend.labels.boxHeight = 8;
    Object.assign(d.plugins.tooltip, {
      backgroundColor: 'rgba(11, 16, 30, 0.94)',
      borderColor: 'rgba(150, 165, 200, 0.22)',
      borderWidth: 1, padding: 11, cornerRadius: 11,
      titleFont: { weight: '700' }, displayColors: false
    });
    d.maintainAspectRatio = false;
    d.responsive = true;
  }
  /** Vertical gradient for line fills. */
  function grad(chart, hex, a1 = 0.32, a2 = 0.01) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return hexA(hex, a1);
    const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, hexA(hex, a1));
    g.addColorStop(1, hexA(hex, a2));
    return g;
  }
  const signColors = (vals, a = 0.85) => {
    const c = colors();
    return vals.map(v => hexA(v >= 0 ? c.win : c.loss, a));
  };

  TJ.charts = { cssVar, hexA, mixHex, colors, themeChart, grad, signColors };
})();
