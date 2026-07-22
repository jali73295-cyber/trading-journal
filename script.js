/* ============================================================
   TradeLog Pro — script.js (core bootstrap)
   Icons · appearance engine · sidebar/nav · PWA · shortcuts
   Every module attaches to the shared `window.TJ` namespace so
   the app runs on GitHub Pages AND directly from file://.
   ============================================================ */
(function () {
  'use strict';
  const TJ = (window.TJ = window.TJ || {});
  TJ.VERSION = '1.0.0';

  /* ---------- Icon set (24×24 stroke icons) ---------- */
  const P = {
    logo: '<rect x="3.6" y="9.5" width="4" height="6.5" rx="1.2"/><path d="M5.6 6.5v3M5.6 16v2.8"/><rect x="10" y="5.5" width="4" height="8.5" rx="1.2"/><path d="M12 2.6v2.9M12 14v3.8"/><rect x="16.4" y="8.5" width="4" height="5.5" rx="1.2"/><path d="M18.4 5.6v2.9M18.4 14v3.2"/>',
    layout: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-4"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3"/><path d="M14 2v4M8 10v4M16 18v4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.2-4.2"/>',
    filter: '<path d="M3 4.5h18l-7 8.2v5.8l-4 2.2v-8L3 4.5Z"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10.5h18"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9.5h18M3 15.5h18M12 3v18"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    'chev-l': '<path d="m15 18-6-6 6-6"/>',
    'chev-r': '<path d="m9 18 6-6-6-6"/>',
    'chev-d': '<path d="m6 9 6 6 6-6"/>',
    pencil: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    eye: '<path d="M2 12s3.2-7 10-7 10 7 10 7-3.2 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 8 5-5 5 5"/><path d="M12 3v12"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3.2"/>',
    zoomin: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.2-4.2M11 8v6M8 11h6"/>',
    zoomout: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.2-4.2M8 11h6"/>',
    reset: '<path d="M3 12a9 9 0 1 0 2.7-6.4L3 8"/><path d="M3 3v5h5"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4M12 17h.01"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><path d="M7.5 7.5h.01"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    up: '<path d="M22 7 13.5 15.5l-5-5L2 17"/><path d="M16 7h6v6"/>',
    down: '<path d="M22 17 13.5 8.5l-5 5L2 7"/><path d="M16 17h6v-6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    'arrow-l': '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    layers: '<path d="m12.8 2.2a2 2 0 0 0-1.6 0L2.6 6.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.6 0l8.6-3.9a1 1 0 0 0 0-1.8Z"/><path d="m22 17.6-9.2 4.2a2 2 0 0 1-1.6 0L2 17.6"/><path d="m22 12.6-9.2 4.2a2 2 0 0 1-1.6 0L2 12.6"/>',
    activity: '<path d="M22 12h-2.5a2 2 0 0 0-1.9 1.5l-2.4 8.3a.25.25 0 0 1-.5 0L9.2 2.2a.25.25 0 0 0-.5 0L6.4 10.5A2 2 0 0 1 4.5 12H2"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.6"/><circle cx="17.5" cy="17.5" r="2.6"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22"/><path d="M14 14.7V17c0 .6.5 1 1 1.2 1.1.6 2 2 2 3.8"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    scale: '<path d="M12 3v18"/><path d="M5 7h14"/><path d="m5 7-3 6a3.5 3.5 0 0 0 6 0z"/><path d="m19 7-3 6a3.5 3.5 0 0 0 6 0z"/>',
    dot: '<circle cx="12" cy="12" r="2.5"/>'
  };
  TJ.icon = (name, cls) =>
    `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.dot}</svg>`;

  /* ---------- Appearance engine ---------- */
  TJ.applyAppearance = function (s) {
    s = s || (TJ.store && TJ.store.settings());
    if (!s) return;
    const root = document.documentElement;
    root.dataset.theme = s.theme || 'dark';
    root.dataset.fs = s.fontSize || 'md';
    root.style.setProperty('--accent', s.accent || '#7c6cff');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = s.theme === 'light' ? '#eef1f8' : '#070b14';
  };

  /* ---------- Sidebar / navigation ---------- */
  const NAV = [
    { key: 'dashboard', href: 'dashboard.html', icon: 'layout', label: 'Dashboard' },
    { key: 'journal', href: 'index.html', icon: 'book', label: 'Journal' },
    { key: 'statistics', href: 'statistics.html', icon: 'chart', label: 'Statistics' },
    { key: 'gallery', href: 'gallery.html', icon: 'image', label: 'Gallery' },
    { key: 'settings', href: 'settings.html', icon: 'sliders', label: 'Settings' }
  ];

  function buildSidebar() {
    const el = document.getElementById('sidebar');
    if (!el) return;
    const page = document.body.dataset.page;
    el.className = 'sidebar';
    el.innerHTML = `
      <div class="side-head">
        <a class="brand" href="dashboard.html">
          <span class="brand-mark">${TJ.icon('logo')}</span>
          <span class="brand-text">TradeLog<span class="pro">PRO</span></span>
        </a>
        <button class="icon-btn side-close" aria-label="Close menu">${TJ.icon('x')}</button>
      </div>
      <a class="btn btn-primary side-new" href="trade.html">${TJ.icon('plus')} New Trade</a>
      <nav class="side-nav" aria-label="Main">
        ${NAV.map(n => `<a class="nav-item${n.key === page ? ' active' : ''}" href="${n.href}">${TJ.icon(n.icon, 'nav-ico')}<span>${n.label}</span></a>`).join('')}
      </nav>
      <div class="side-foot">
        <div class="usage">
          <div class="usage-bar"><i id="usageFill"></i></div>
          <span id="usageText">Calculating storage…</span>
        </div>
        <div class="ver"><span>TradeLog Pro</span><span>v${TJ.VERSION}</span></div>
      </div>`;

    let scrim = document.querySelector('.scrim');
    if (!scrim) {
      scrim = document.createElement('div');
      scrim.className = 'scrim';
      document.body.appendChild(scrim);
    }
    const open = () => { el.classList.add('open'); scrim.classList.add('show'); };
    const close = () => { el.classList.remove('open'); scrim.classList.remove('show'); };
    document.querySelectorAll('.menu-toggle').forEach(b => b.addEventListener('click', open));
    el.querySelector('.side-close').addEventListener('click', close);
    scrim.addEventListener('click', close);
    updateUsage();
  }

  async function updateUsage() {
    try {
      const txt = document.getElementById('usageText');
      const fill = document.getElementById('usageFill');
      if (!txt || !TJ.store) return;
      const bytes = TJ.store.usage();
      const kb = bytes / 1024;
      const pct = Math.min(100, (bytes / (5 * 1024 * 1024)) * 100);
      let imgs = 0;
      try { imgs = TJ.images ? await TJ.images.count() : 0; } catch (e) { /* idb unavailable */ }
      txt.textContent = `${kb < 1024 ? kb.toFixed(0) + ' KB' : (kb / 1024).toFixed(1) + ' MB'} data · ${imgs} image${imgs === 1 ? '' : 's'}`;
      if (fill) fill.style.width = Math.max(3, pct).toFixed(1) + '%';
    } catch (e) { /* non-critical */ }
  }
  TJ.updateUsage = updateUsage;

  /* ---------- Keyboard shortcuts ---------- */
  function shortcuts() {
    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N') { location.href = 'trade.html'; }
      if (e.key === '/') {
        const s = document.querySelector('[data-search]');
        if (s) { e.preventDefault(); s.focus(); }
      }
    });
  }

  /* ---------- PWA ---------- */
  function registerSW() {
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
      navigator.serviceWorker.register('service-worker.js').then(reg => {
        // Ask any waiting worker to take over immediately.
        if (reg.waiting) reg.waiting.postMessage('skipWaiting');
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              nw.postMessage('skipWaiting'); // new code is ready → activate it
            }
          });
        });
        // Check for updates whenever the app regains focus.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      }).catch(() => {});

      // When the new worker takes control, reload once so the fresh code runs.
      let _reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (_reloaded) return;
        _reloaded = true;
        location.reload();
      });
    }
  }
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    TJ.installPrompt = e;
    document.dispatchEvent(new CustomEvent('tj:installable'));
  });

  /* ---------- Boot ---------- */
  function boot() {
    TJ.applyAppearance();
    buildSidebar();
    shortcuts();
    registerSW();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
