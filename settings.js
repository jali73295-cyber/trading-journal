/* ============================================================
   TradeLog Pro — settings.js
   Appearance, trading preferences, checklist & list editors,
   backup / restore / export / import / reset, about panel.
   ============================================================ */
(function () {
  'use strict';
  const TJ = window.TJ;
  const fmt = TJ.fmt, esc = TJ.esc;
  const $ = id => document.getElementById(id);
  let s = TJ.store.settings();
  const save = () => TJ.store.saveSettings(s);
  const today = () => new Date().toISOString().slice(0, 10);

  /* ---------- Appearance ---------- */
  const PRESETS = ['#7c6cff', '#4f8cff', '#37d2e6', '#2dd684', '#f4b740', '#fb7185'];

  function segInit(id, val, onSet) {
    const seg = $(id);
    const set = (v, silent) => {
      seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.v === v));
      if (!silent) onSet(v);
    };
    seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => set(b.dataset.v)));
    set(val, true);
  }
  function renderAccent() {
    const row = $('accentRow');
    row.innerHTML = PRESETS.map(c =>
      `<button class="swatch${c.toLowerCase() === (s.accent || '').toLowerCase() ? ' on' : ''}"
        data-c="${c}" style="background:${c}" title="${c}" aria-label="Accent ${c}"></button>`).join('') +
      `<input type="color" class="colorpick" id="accentCustom" value="${esc(s.accent || '#7c6cff')}" title="Custom color">`;
    row.querySelectorAll('.swatch').forEach(b => b.addEventListener('click', () => setAccent(b.dataset.c)));
    $('accentCustom').addEventListener('input', e => setAccent(e.target.value));
  }
  function setAccent(c) {
    s.accent = c; save();
    TJ.applyAppearance(s);
    renderAccent();
  }
  function appearance() {
    segInit('themeSeg', s.theme || 'dark', v => { s.theme = v; save(); TJ.applyAppearance(s); });
    segInit('fsSeg', s.fontSize || 'md', v => { s.fontSize = v; save(); TJ.applyAppearance(s); });
    renderAccent();
  }

  /* ---------- Preferences ---------- */
  function prefs() {
    $('setCurrency').value = s.currency || '$';
    $('setCurrency').addEventListener('change', e => {
      s.currency = e.target.value.trim() || '$'; save();
      TJ.ui.toast('Currency symbol updated');
    });
    $('setRisk').value = s.defaultRisk ?? 1;
    $('setRisk').addEventListener('change', e => {
      const v = parseFloat(e.target.value);
      s.defaultRisk = isNaN(v) ? 1 : v; save();
      TJ.ui.toast('Default risk updated');
    });
    $('setBalance').value = s.balance ?? '';
    $('setBalance').addEventListener('change', e => {
      const v = parseFloat(e.target.value);
      s.balance = isNaN(v) || v <= 0 ? null : v; save();
      TJ.ui.toast(s.balance ? 'Account balance saved — P/L will auto-suggest' : 'Account balance cleared');
    });
  }

  /* ---------- Checklist editor ---------- */
  function renderChecklist() {
    const box = $('checklistEditor');
    box.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:9px">
        ${s.checklist.map((item, i) => `
          <div class="cl-editor-row" data-i="${i}">
            <input class="input" value="${esc(item.label)}" aria-label="Checklist item ${i + 1}">
            <button class="icon-btn" data-a="up" title="Move up" ${i === 0 ? 'disabled' : ''}
              style="transform:rotate(180deg)">${TJ.icon('chev-d')}</button>
            <button class="icon-btn" data-a="down" title="Move down" ${i === s.checklist.length - 1 ? 'disabled' : ''}>${TJ.icon('chev-d')}</button>
            <button class="icon-btn" data-a="del" title="Remove">${TJ.icon('trash')}</button>
          </div>`).join('')}
      </div>
      <div class="le-add" style="margin-top:14px">
        <input class="input" id="clNew" placeholder="Add checklist item…">
        <button class="btn" id="clAdd">${TJ.icon('plus')}Add</button>
      </div>`;
    box.querySelectorAll('.cl-editor-row').forEach(row => {
      const i = +row.dataset.i;
      row.querySelector('input').addEventListener('change', e => {
        const v = e.target.value.trim();
        if (v) { s.checklist[i].label = v; save(); TJ.ui.toast('Checklist item renamed'); }
        else renderChecklist();
      });
      row.addEventListener('click', e => {
        const a = e.target.closest('[data-a]');
        if (!a || a.disabled) return;
        if (a.dataset.a === 'up') { [s.checklist[i - 1], s.checklist[i]] = [s.checklist[i], s.checklist[i - 1]]; }
        if (a.dataset.a === 'down') { [s.checklist[i + 1], s.checklist[i]] = [s.checklist[i], s.checklist[i + 1]]; }
        if (a.dataset.a === 'del') { s.checklist.splice(i, 1); }
        save(); renderChecklist();
      });
    });
    const add = () => {
      const v = $('clNew').value.trim();
      if (!v) return;
      s.checklist.push({ id: TJ.store.uid(), label: v });
      save(); renderChecklist();
      $('clNew') && $('clNew').focus();
    };
    $('clAdd').addEventListener('click', add);
    $('clNew').addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  }

  /* ---------- Screenshot slots editor ---------- */
  function renderShotSlots() {
    const box = $('shotSlotsEditor');
    if (!box) return;
    if (!Array.isArray(s.shotSlots) || !s.shotSlots.length) s.shotSlots = [{ id: TJ.store.uid(), label: 'Screenshot' }];
    box.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:9px">
        ${s.shotSlots.map((item, i) => `
          <div class="cl-editor-row" data-i="${i}">
            <input class="input" value="${esc(item.label)}" aria-label="Screenshot slot ${i + 1}">
            <button class="icon-btn" data-a="up" title="Move up" ${i === 0 ? 'disabled' : ''}
              style="transform:rotate(180deg)">${TJ.icon('chev-d')}</button>
            <button class="icon-btn" data-a="down" title="Move down" ${i === s.shotSlots.length - 1 ? 'disabled' : ''}>${TJ.icon('chev-d')}</button>
            <button class="icon-btn" data-a="del" title="Remove" ${s.shotSlots.length === 1 ? 'disabled' : ''}>${TJ.icon('trash')}</button>
          </div>`).join('')}
      </div>
      <div class="le-add" style="margin-top:14px">
        <input class="input" id="ssNew" placeholder="Add screenshot slot… (e.g. Entry, Exit)">
        <button class="btn" id="ssAdd">${TJ.icon('plus')}Add</button>
      </div>
      <p class="note" style="margin-top:10px">${TJ.icon('info')}These boxes appear on every trade form. Old trades keep their original screenshots.</p>`;
    box.querySelectorAll('.cl-editor-row').forEach(row => {
      const i = +row.dataset.i;
      row.querySelector('input').addEventListener('change', e => {
        const v = e.target.value.trim();
        if (v) { s.shotSlots[i].label = v; save(); TJ.ui.toast('Slot renamed'); }
        else renderShotSlots();
      });
      row.addEventListener('click', e => {
        const a = e.target.closest('[data-a]');
        if (!a || a.disabled) return;
        if (a.dataset.a === 'up') { [s.shotSlots[i - 1], s.shotSlots[i]] = [s.shotSlots[i], s.shotSlots[i - 1]]; }
        if (a.dataset.a === 'down') { [s.shotSlots[i + 1], s.shotSlots[i]] = [s.shotSlots[i], s.shotSlots[i + 1]]; }
        if (a.dataset.a === 'del') { s.shotSlots.splice(i, 1); }
        save(); renderShotSlots();
      });
    });
    const add = () => {
      const v = $('ssNew').value.trim();
      if (!v) return;
      s.shotSlots.push({ id: TJ.store.uid(), label: v });
      save(); renderShotSlots();
    };
    $('ssAdd').addEventListener('click', add);
    $('ssNew').addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  }

  /* ---------- AI Review ---------- */
  function renderAI() {
    const provEl = $('aiProvider'), keyEl = $('aiKey'), modelEl = $('aiModel');
    if (!provEl || !TJ.ai) return;
    const ai = TJ.ai.normalize(s.ai);
    provEl.innerHTML = Object.entries(TJ.ai.PROVIDERS)
      .map(([id, p]) => `<option value="${id}">${esc(p.name)}</option>`).join('');
    const paint = () => {
      const p = TJ.ai.PROVIDERS[ai.provider];
      provEl.value = ai.provider;
      modelEl.innerHTML = p.models.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('');
      modelEl.value = ai[ai.provider].model;
      if (modelEl.selectedIndex < 0) modelEl.value = p.models[0][0];
      keyEl.value = ai[ai.provider].key;
      keyEl.placeholder = p.placeholder;
      $('aiKeyLabel').textContent = p.keyLabel;
      $('aiNote').innerHTML = p.note;
      $('aiStatus').textContent = '';
    };
    const grab = () => { ai[ai.provider] = { key: keyEl.value.trim(), model: modelEl.value }; };
    provEl.addEventListener('change', () => { grab(); ai.provider = provEl.value; paint(); });
    $('aiSave').addEventListener('click', () => {
      grab(); s.ai = ai; save();
      $('aiStatus').textContent = '';
      TJ.ui.toast('AI settings saved');
    });
    $('aiTest').addEventListener('click', async () => {
      grab(); s.ai = ai; save();
      const st = $('aiStatus');
      if (!ai[ai.provider].key) { st.textContent = '✗ Add your API key first'; return; }
      st.textContent = 'Testing…';
      try { await TJ.ai.ping(); st.textContent = '✓ Connected — ready to review'; }
      catch (e) { st.textContent = '✗ ' + ((e && e.message) || 'failed'); }
    });
    paint();
  }

  /* ---------- Generic list editors ---------- */
  const LISTS = [
    ['pairs', 'Pairs', 'tag'],
    ['sessions', 'Sessions', 'clock'],
    ['strategies', 'Strategies', 'layers'],
    ['structures', 'Market Structure', 'layers'],
    ['timeframes', 'Timeframes', 'clock'],
    ['levels', 'Levels', 'target'],
    ['emotions', 'Emotions', 'smile'],
    ['mistakes', 'Mistakes', 'alert'],
    ['tags', 'Tags', 'tag']
  ];
  function renderLists() {
    const grid = $('listsGrid');
    grid.innerHTML = LISTS.map(([key, title, icon]) => `
      <div class="list-editor" data-key="${key}">
        <div class="le-head">${TJ.icon(icon)}${title}<span class="count-badge">${s[key].length}</span></div>
        <div class="le-items">
          ${s[key].map(v => `<span class="le-chip">${esc(v)}
            <button data-v="${esc(v)}" title="Remove" aria-label="Remove ${esc(v)}">${TJ.icon('x')}</button></span>`).join('')}
        </div>
        <div class="le-add">
          <input class="input" placeholder="Add ${title.toLowerCase().replace(/s$/, '')}…">
          <button class="btn btn-sm">${TJ.icon('plus')}Add</button>
        </div>
      </div>`).join('');
    grid.querySelectorAll('.list-editor').forEach(ed => {
      const key = ed.dataset.key;
      ed.querySelector('.le-items').addEventListener('click', e => {
        const b = e.target.closest('button[data-v]');
        if (!b) return;
        s[key] = s[key].filter(x => x !== b.dataset.v);
        save(); renderLists();
      });
      const inp = ed.querySelector('.le-add input');
      const add = () => {
        const v = inp.value.trim();
        if (!v) return;
        if (s[key].includes(v)) { TJ.ui.toast('Already in the list', 'info'); return; }
        s[key].push(v); save(); renderLists();
        const ni = grid.querySelector(`.list-editor[data-key="${key}"] .le-add input`);
        if (ni) ni.focus();
      };
      ed.querySelector('.le-add .btn').addEventListener('click', add);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    });
  }

  /* ---------- Data actions ---------- */
  function renderData() {
    const defs = [
      ['btnExportJson', 'download', 'Export JSON (data)', 'Trades + settings, no images'],
      ['btnBackup', 'shield', 'Full Backup', 'Everything incl. screenshots'],
      ['btnExportCsv', 'download', 'Export CSV', 'Spreadsheet-ready trade list'],
      ['btnImport', 'upload', 'Import / Restore', 'Replace data from a JSON file'],
      ['btnStmt', 'upload', 'Import MT4/MT5 Statement', 'Merge trades from a broker report (HTML/CSV)'],
      ['btnPaste', 'clipboard', 'Paste FundingPips Trades', 'Copy the table from your share page & paste'],
      ['btnDemo', 'database', 'Load Demo Data', 'Adds 16 sample trades']
    ];
    $('dataActions').innerHTML = defs.map(([id, icon, label, sub]) => `
      <button class="btn" id="${id}" style="flex-direction:column;align-items:flex-start;gap:3px;padding:13px 15px">
        <span style="display:inline-flex;align-items:center;gap:8px;font-size:.9rem">${TJ.icon(icon)}${label}</span>
        <span class="muted" style="font-weight:500;font-size:.74rem">${sub}</span>
      </button>`).join('');

    $('btnExportJson').addEventListener('click', () => {
      TJ.download(`tradelog-data-${today()}.json`, JSON.stringify(TJ.store.exportData(), null, 2));
      TJ.ui.toast('Data exported');
    });

    $('btnExportCsv').addEventListener('click', () => {
      const rows = TJ.store.list();
      if (!rows.length) return TJ.ui.toast('No trades to export yet', 'info');
      TJ.download(`tradelog-trades-${today()}.csv`, TJ.store.toCSV(rows), 'text/csv');
      TJ.ui.toast(`Exported ${rows.length} trades to CSV`);
    });

    $('btnBackup').addEventListener('click', async () => {
      const btn = $('btnBackup');
      btn.disabled = true;
      TJ.ui.toast('Preparing backup…', 'info');
      const data = TJ.store.exportData();
      data.images = [];
      try {
        const recs = await TJ.images.all();
        for (const r of recs) {
          if (!r.blob) continue;
          data.images.push({
            id: r.id, tradeId: r.tradeId, slot: r.slot, name: r.name,
            dataUrl: await TJ.images.blobToDataURL(r.blob)
          });
        }
      } catch (e) { /* keep going without images */ }
      TJ.download(`tradelog-backup-${today()}.json`, JSON.stringify(data));
      TJ.ui.toast(`Backup ready · ${data.trades.length} trades · ${data.images.length} images`);
      btn.disabled = false;
    });

    const stmtInput = document.createElement('input');
    stmtInput.type = 'file';
    stmtInput.accept = '.htm,.html,.csv,.txt,.pdf';
    stmtInput.className = 'hidden';
    document.body.appendChild(stmtInput);
    $('btnStmt').addEventListener('click', () => { if (TJ.importer) stmtInput.click(); });
    stmtInput.addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f && TJ.importer) await TJ.importer.importStatementFile(f);
    });

    $('btnPaste').addEventListener('click', () => {
      if (!TJ.importer) return;
      const m = TJ.ui.modal({
        title: 'Paste FundingPips trades',
        wide: true,
        body: '<p class="hint" style="margin-top:0">FundingPips share page pe trades table select karke copy karo, phir neeche paste karo. (MT4/MT5 CSV text bhi chalega.)</p>' +
              '<textarea class="input" id="fpPaste" rows="9" style="width:100%;resize:vertical;font-size:.78rem;line-height:1.5" placeholder="Symbol  Type  Open Date  Open  Closed Date  Closed  TP  SL  Lots  Commission  Profit&#10;XAUUSD&#10;Buy  7/16/2026, 18:07  4015.96 …"></textarea>',
        actions: [
          { label: 'Import', class: 'btn-primary', icon: 'upload', onClick: () => {
              const v = document.getElementById('fpPaste').value;
              if (v && v.trim()) TJ.importer.importText(v);
            } },
          { label: 'Cancel' }
        ]
      });
      setTimeout(() => { const el = document.getElementById('fpPaste'); if (el) el.focus(); }, 60);
    });

    $('btnImport').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      let obj;
      try { obj = JSON.parse(await file.text()); }
      catch (err) { return TJ.ui.toast('That file is not valid JSON.', 'err'); }
      if (!obj || !Array.isArray(obj.trades)) return TJ.ui.toast('Not a TradeLog export — no trades found.', 'err');
      const nImg = (obj.images || []).length;
      const ok = await TJ.ui.confirm({
        title: 'Restore from backup?',
        message: `This replaces ALL current data with "${file.name}" (${obj.trades.length} trades${nImg ? ', ' + nImg + ' images' : ''}). This cannot be undone.`,
        confirmText: 'Replace everything', danger: true
      });
      if (!ok) return;
      TJ.store.replaceAll(obj);
      if (nImg) {
        try {
          await TJ.images.clear();
          for (const im of obj.images) {
            await TJ.images.put({ id: im.id, tradeId: im.tradeId, slot: im.slot, name: im.name, blob: TJ.images.dataURLToBlob(im.dataUrl) });
          }
        } catch (err) { TJ.ui.toast('Data restored, but images failed (IndexedDB unavailable).', 'err'); }
      }
      TJ.applyAppearance(TJ.store.settings());
      TJ.ui.toast('Restore complete');
      setTimeout(() => location.reload(), 700);
    });

    $('btnDemo').addEventListener('click', async () => {
      const ok = await TJ.ui.confirm({
        title: 'Load demo data?',
        message: 'Adds 16 realistic sample trades so you can explore the dashboard, statistics and calendar. Your existing trades are kept.',
        confirmText: 'Load demo'
      });
      if (!ok) return;
      TJ.store.seedDemo();
      TJ.ui.toast('Demo data loaded');
      setTimeout(() => location.reload(), 500);
    });

    /* Danger zone */
    $('btnReset').addEventListener('click', () => {
      const body = document.createElement('div');
      body.innerHTML = `
        <p>This permanently deletes <b>every trade, screenshot and setting</b> stored on this device. Export a backup first if you might want it back.</p>
        <div class="field"><label for="resetConfirm">Type <b>DELETE</b> to confirm</label>
          <input class="input" id="resetConfirm" autocomplete="off" placeholder="DELETE"></div>`;
      TJ.ui.modal({
        title: 'Reset all data',
        body,
        actions: [
          { label: 'Cancel' },
          {
            label: 'Erase everything', class: 'btn-danger',
            onClick: () => {
              const v = document.getElementById('resetConfirm').value.trim();
              if (v !== 'DELETE') { TJ.ui.toast('Type DELETE to confirm.', 'err'); return true; }
              TJ.store.clearAll();
              TJ.images.clear().catch(() => {});
              TJ.ui.toast('All data erased');
              setTimeout(() => location.reload(), 650);
            }
          }
        ]
      });
    });
  }

  /* ---------- About ---------- */
  async function renderAbout() {
    const box = $('aboutBox');
    const bytes = TJ.store.usage();
    let imgCount = 0, imgBytes = 0;
    try {
      const recs = await TJ.images.all();
      imgCount = recs.length;
      imgBytes = recs.reduce((sum, r) => sum + (r.size || (r.blob && r.blob.size) || 0), 0);
    } catch (e) { /* idb unavailable */ }
    const mb = n => (n / (1024 * 1024)).toFixed(2) + ' MB';
    box.innerHTML = `
      <div class="kv-grid" style="padding:0 0 14px">
        <div class="kv"><b>Version</b><span>v${TJ.VERSION} · schema ${TJ.store.SCHEMA}</span></div>
        <div class="kv"><b>Trades</b><span>${TJ.store.list().length}</span></div>
        <div class="kv"><b>Journal data</b><span>${(bytes / 1024).toFixed(1)} KB</span></div>
        <div class="kv"><b>Screenshots</b><span>${imgCount} · ${mb(imgBytes)}</span></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:9px">
        <p class="note">${TJ.icon('shield')}100% private — everything lives in this browser. No account, no server, no tracking.</p>
        <p class="note">${TJ.icon('info')}Shortcuts: <span class="kbd">N</span> new trade &nbsp;·&nbsp; <span class="kbd">/</span> focus search &nbsp;·&nbsp; <span class="kbd">Esc</span> close dialogs.</p>
        <p class="note">${TJ.icon('chart')}Charts rendered by <a href="https://www.chartjs.org" target="_blank" rel="noopener">Chart.js</a> (MIT), vendored locally for offline use.</p>
        <button class="btn hidden" id="btnInstall" style="align-self:flex-start">${TJ.icon('download')}Install as App</button>
      </div>`;
    const showInstall = () => {
      const b = $('btnInstall');
      if (!b || !TJ.installPrompt) return;
      b.classList.remove('hidden');
      b.onclick = async () => {
        TJ.installPrompt.prompt();
        await TJ.installPrompt.userChoice.catch(() => {});
        TJ.installPrompt = null;
        b.classList.add('hidden');
      };
    };
    document.addEventListener('tj:installable', showInstall);
    showInstall();
  }

  /* ---------- Boot ---------- */
  function init() {
    [['hAppearance', 'sun'], ['hPrefs', 'sliders'], ['hChecklist', 'clipboard'],
     ['hLists', 'tag'], ['hShots', 'camera'], ['hAI', 'flame'], ['hData', 'database'], ['hDanger', 'alert'], ['hAbout', 'info']]
      .forEach(([id, ic]) => { const el = $(id); if (el) el.innerHTML = TJ.icon(ic) + el.textContent; });
    appearance();
    prefs();
    renderChecklist();
    renderShotSlots();
    renderLists();
    renderAI();
    renderData();
    renderAbout();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
