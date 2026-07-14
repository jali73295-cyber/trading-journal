/* ============================================================
   TradeLog Pro — ui.js
   Shared UI toolkit: formatters, safe HTML escaping, toasts,
   modal + confirm dialogs, zoomable lightbox, chip inputs.
   ============================================================ */
(function () {
  'use strict';
  const TJ = (window.TJ = window.TJ || {});

  /* ---------- Escaping & formatting ---------- */
  TJ.esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmt = {
    n(x, d = 2) {
      if (x === null || x === undefined || isNaN(+x)) return '—';
      let s = (+x).toFixed(d);
      if (s.includes('.')) s = s.replace(/\.?0+$/, '');
      return s === '-0' ? '0' : s;
    },
    r(x) {
      if (x === null || x === undefined || isNaN(+x)) return '—';
      const v = +x;
      return (v > 0 ? '+' : '') + fmt.n(v, 2) + 'R';
    },
    money(x, cur) {
      if (x === null || x === undefined || x === '' || isNaN(+x)) return '—';
      cur = cur || (TJ.store ? TJ.store.settings().currency : '$') || '$';
      const v = +x, a = Math.abs(v);
      const body = a >= 1000 ? a.toLocaleString(undefined, { maximumFractionDigits: 0 }) : fmt.n(a, 2);
      return (v < 0 ? '−' : v > 0 ? '+' : '') + cur + body;
    },
    pct(x, d = 1) { return (x === null || isNaN(+x)) ? '—' : fmt.n(+x, d) + '%'; },
    date(d) {
      if (!d) return '—';
      const dt = new Date(d + 'T00:00:00');
      return isNaN(dt) ? d : dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    },
    dateFull(d) {
      if (!d) return '—';
      const dt = new Date(d + 'T00:00:00');
      return isNaN(dt) ? d : dt.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    },
    month(k) {
      if (!k) return '—';
      const [y, m] = k.split('-');
      const dt = new Date(+y, +m - 1, 1);
      return isNaN(dt) ? k : dt.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
  };
  TJ.fmt = fmt;
  TJ.rClass = r => r > 0 ? 'pos' : r < 0 ? 'neg' : 'flat';
  TJ.resultBadge = res => {
    const map = { win: ['b-win', 'TP'], loss: ['b-loss', 'SL'], rf: ['b-rf', 'RF'], breakeven: ['b-be', 'BE'] };
    const [cls, label] = map[res] || ['b-open', 'Open'];
    return `<span class="badge ${cls}"><span class="dot"></span>${label}</span>`;
  };
  TJ.dirBadge = d => `<span class="badge ${d === 'sell' ? 'b-sell' : 'b-buy'}">${d === 'sell' ? '▼ Sell' : '▲ Buy'}</span>`;
  TJ.debounce = (fn, ms = 220) => {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };
  TJ.download = (filename, content, mime = 'application/json') => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const ui = (TJ.ui = TJ.ui || {});

  /* ---------- Toasts ---------- */
  ui.toast = function (msg, type = 'ok', ms = 3200) {
    let root = document.getElementById('toasts');
    if (!root) { root = document.createElement('div'); root.id = 'toasts'; document.body.appendChild(root); }
    const el = document.createElement('div');
    el.className = 'toast t-' + type;
    const icons = { ok: 'check', err: 'alert', info: 'info' };
    el.innerHTML = TJ.icon(icons[type] || 'info') + `<span>${TJ.esc(msg)}</span>`;
    root.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, ms);
  };

  /* ---------- Modal ---------- */
  ui.modal = function ({ title = '', body = '', actions = [], wide = false, onClose } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${TJ.esc(title)}">
        <div class="modal-h"><h3>${TJ.esc(title)}</h3>
          <button class="icon-btn modal-x" aria-label="Close">${TJ.icon('x')}</button></div>
        <div class="modal-b"></div>
        ${actions.length ? '<div class="modal-f"></div>' : ''}
      </div>`;
    const bodyEl = overlay.querySelector('.modal-b');
    if (typeof body === 'string') bodyEl.innerHTML = body; else bodyEl.appendChild(body);
    const close = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      if (onClose) onClose();
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.modal-x').addEventListener('click', close);
    const foot = overlay.querySelector('.modal-f');
    actions.forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.class || 'btn-ghost');
      b.innerHTML = (a.icon ? TJ.icon(a.icon) : '') + TJ.esc(a.label);
      b.addEventListener('click', () => { const keep = a.onClick && a.onClick(close); if (!keep) close(); });
      foot.appendChild(b);
    });
    document.body.appendChild(overlay);
    const first = overlay.querySelector('.modal-f .btn-primary, .modal-f .btn, .modal-x');
    if (first) first.focus();
    return { close, el: overlay };
  };

  /** Promise<boolean> confirm dialog. */
  ui.confirm = function ({ title = 'Are you sure?', message = '', confirmText = 'Confirm', danger = false } = {}) {
    return new Promise(resolve => {
      ui.modal({
        title,
        body: `<p>${TJ.esc(message)}</p>`,
        actions: [
          { label: 'Cancel', onClick: () => resolve(false) },
          { label: confirmText, class: danger ? 'btn-danger' : 'btn-primary', onClick: () => resolve(true) }
        ],
        onClose: () => resolve(false)
      });
    });
  };

  /* ---------- Lightbox (zoom + pan + keyboard) ---------- */
  ui.lightbox = function (items, index = 0) {
    if (!items || !items.length) return;
    let i = Math.max(0, Math.min(index, items.length - 1));
    let scale = 1, tx = 0, ty = 0, dragging = false, sx = 0, sy = 0;

    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = `
      <div class="lb-top">
        <span class="lb-count mono"></span><span class="spacer"></span>
        <span class="lb-title"></span><span class="spacer"></span>
        <a class="icon-btn lb-open hidden" title="Open trade">${TJ.icon('external')}</a>
        <button class="icon-btn lb-close" aria-label="Close">${TJ.icon('x')}</button>
      </div>
      <div class="lb-stage">
        <button class="icon-btn lb-nav prev" aria-label="Previous">${TJ.icon('chev-l')}</button>
        <img class="lb-img" alt="" draggable="false">
        <button class="icon-btn lb-nav next" aria-label="Next">${TJ.icon('chev-r')}</button>
      </div>
      <div class="lb-cap"></div>
      <div class="lb-bar">
        <button class="icon-btn" data-a="out" title="Zoom out">${TJ.icon('zoomout')}</button>
        <button class="icon-btn" data-a="reset" title="Reset (double-click image)">${TJ.icon('reset')}</button>
        <button class="icon-btn" data-a="in" title="Zoom in">${TJ.icon('zoomin')}</button>
      </div>`;
    const img = lb.querySelector('.lb-img');
    const stage = lb.querySelector('.lb-stage');

    const apply = () => { img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };
    const reset = () => { scale = 1; tx = ty = 0; apply(); };
    const show = () => {
      const it = items[i];
      img.src = it.src;
      lb.querySelector('.lb-count').textContent = `${i + 1} / ${items.length}`;
      lb.querySelector('.lb-title').textContent = it.title || '';
      lb.querySelector('.lb-cap').textContent = it.caption || '';
      const openBtn = lb.querySelector('.lb-open');
      if (it.link) { openBtn.classList.remove('hidden'); openBtn.href = it.link; }
      else openBtn.classList.add('hidden');
      lb.querySelector('.prev').style.visibility = items.length > 1 ? 'visible' : 'hidden';
      lb.querySelector('.next').style.visibility = items.length > 1 ? 'visible' : 'hidden';
      reset();
    };
    const nav = d => { i = (i + d + items.length) % items.length; show(); };
    const zoom = f => { scale = Math.min(6, Math.max(1, scale * f)); if (scale === 1) { tx = ty = 0; } apply(); };

    const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') nav(1);
      if (e.key === 'ArrowLeft') nav(-1);
      if (e.key === '+') zoom(1.25);
      if (e.key === '-') zoom(0.8);
    };
    document.addEventListener('keydown', onKey);
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.prev').addEventListener('click', () => nav(-1));
    lb.querySelector('.next').addEventListener('click', () => nav(1));
    lb.querySelector('.lb-bar').addEventListener('click', e => {
      const a = e.target.closest('[data-a]');
      if (!a) return;
      if (a.dataset.a === 'in') zoom(1.3);
      if (a.dataset.a === 'out') zoom(0.75);
      if (a.dataset.a === 'reset') reset();
    });
    stage.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.14 : 0.88); }, { passive: false });
    img.addEventListener('dblclick', () => { scale > 1 ? reset() : (scale = 2.4, apply()); });
    stage.addEventListener('pointerdown', e => {
      if (e.target.closest('.lb-nav')) return;
      dragging = true; sx = e.clientX - tx; sy = e.clientY - ty;
      stage.classList.add('grabbing'); stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', e => {
      if (!dragging || scale <= 1) return;
      tx = e.clientX - sx; ty = e.clientY - sy; apply();
    });
    stage.addEventListener('pointerup', () => { dragging = false; stage.classList.remove('grabbing'); });
    stage.addEventListener('click', e => { if (e.target === stage && scale === 1) close(); });

    document.body.appendChild(lb);
    show();
    return { close };
  };

  /* ---------- Chips input (multi-select + custom values) ---------- */
  ui.chips = function (host, { options = [], value = [], allowAdd = true, placeholder = 'Add…', onChange, onNewOption } = {}) {
    const selected = new Set(value);
    const opts = [...new Set([...options, ...value])];
    function render() {
      host.className = 'chips';
      host.innerHTML = opts.map(o =>
        `<button type="button" class="chip${selected.has(o) ? ' on' : ''}" data-v="${TJ.esc(o)}">${TJ.esc(o)}</button>`
      ).join('') + (allowAdd
        ? `<span class="chip-add"><input type="text" placeholder="${TJ.esc(placeholder)}" aria-label="${TJ.esc(placeholder)}"></span>`
        : '');
      host.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
        const v = c.dataset.v;
        selected.has(v) ? selected.delete(v) : selected.add(v);
        c.classList.toggle('on');
        onChange && onChange([...selected]);
      }));
      const inp = host.querySelector('.chip-add input');
      if (inp) inp.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const v = inp.value.trim();
        if (!v) return;
        if (!opts.includes(v)) { opts.push(v); onNewOption && onNewOption(v); }
        selected.add(v);
        render();
        onChange && onChange([...selected]);
        const ni = host.querySelector('.chip-add input');
        if (ni) ni.focus();
      });
    }
    render();
    return { get: () => [...selected] };
  };
})();
