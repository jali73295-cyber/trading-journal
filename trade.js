/* ============================================================
   TradeLog Pro — trade.js
   One page, three modes driven by the URL:
   · trade.html                → new trade form
   · trade.html?duplicate=ID   → new trade pre-filled from ID
   · trade.html?edit=ID        → edit form
   · trade.html?id=ID          → read-only detail view
   ============================================================ */
(function () {
  'use strict';
  const TJ = window.TJ;
  const M = TJ.metrics, fmt = TJ.fmt, esc = TJ.esc;
  const $ = id => document.getElementById(id);

  // Legacy slot keys from v1 trades still display with their old names
  const LEGACY_SLOTS = { entry: 'Entry Screenshot', exit: 'Exit Screenshot', markup: 'Chart Markup', before: 'Before Trade', after: 'After Trade' };
  let slots = []; // active slot ids for the form (from Settings + this trade's own keys)

  const S = TJ.store.settings();
  const labelFor = slot => {
    const def = (S.shotSlots || []).find(x => x.id === slot);
    return def ? def.label : (LEGACY_SLOTS[slot] || 'Screenshot');
  };
  const root = $('tradeRoot');
  const params = new URLSearchParams(location.search);
  const viewId = params.get('id');
  const editId = params.get('edit');
  const dupId = params.get('duplicate');

  let mode = 'new';
  let trade = null;

  if (viewId) { trade = TJ.store.byId(viewId); mode = 'view'; }
  else if (editId) { trade = TJ.store.byId(editId); mode = 'edit'; }
  else if (dupId) {
    trade = TJ.store.blank();
    const src = TJ.store.byId(dupId);
    if (src) {
      const c = JSON.parse(JSON.stringify(src));
      delete c.id; delete c.number; delete c.createdAt; delete c.updatedAt;
      c.shots = {};
      c.date = trade.date; c.time = trade.time;
      Object.assign(trade, c);
    }
  } else {
    trade = TJ.store.blank();
  }

  /* ============================ NOT FOUND ============================ */
  function notFound() {
    $('tradeTitle').textContent = 'Trade not found';
    $('tradeSub').textContent = 'It may have been deleted.';
    root.innerHTML = `<section class="card"><div class="empty">
      <div class="empty-ico">${TJ.icon('alert')}</div>
      <h3>Nothing here</h3>
      <p>This trade doesn't exist anymore. It may have been deleted or the link is stale.</p>
      <div class="row"><a class="btn btn-primary" href="index.html">${TJ.icon('arrow-l')} Back to journal</a></div>
    </div></section>`;
  }

  /* ============================ FORM MODE ============================ */
  let dirState = 'buy';
  let resState = '';
  let chipTags = null, chipMist = null;
  const staged = {}; // slot -> { file, url } | { remove: true }

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dayFromDate = ds => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ds || '');
    if (!m) return '';
    const d = new Date(+m[1], +m[2] - 1, +m[3]).getDay(); // 0=Sun..6=Sat
    return (d >= 1 && d <= 5) ? DAYS[d - 1] : '';
  };
  const opts = (list, val) =>
    `<option value="">—</option>` + [...new Set([...list, ...(val ? [val] : [])])]
      .map(o => `<option value="${esc(o)}"${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('');
  const dlist = (id, list) =>
    `<datalist id="${id}">${list.map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
  const numField = (id, label, val, step = 'any', ph = '', col = 'c4') => `
    <div class="field ${col}"><label for="${id}">${label}</label>
      <input class="input" id="${id}" type="number" step="${step}" inputmode="decimal"
        value="${val === null || val === undefined ? '' : val}" placeholder="${ph}"></div>`;

  function renderForm() {
    const isEdit = mode === 'edit';
    const number = isEdit ? trade.number : TJ.store.nextNumber();
    dirState = trade.direction || 'buy';
    resState = trade.result || '';
    const baseSlots = (S.shotSlots && S.shotSlots.length) ? S.shotSlots.map(x => x.id) : [];
    slots = [...baseSlots, ...Object.keys(trade.shots || {}).filter(k => !baseSlots.includes(k))];
    if (!slots.length) slots = ['shot-default'];

    $('tradeTitle').textContent = isEdit ? `Edit Trade #${number}` : 'New Trade';
    $('tradeSub').textContent = isEdit ? `${trade.pair || ''} · ${fmt.dateFull(trade.date)}` : `Will be logged as trade #${number}`;
    $('tradeActions').innerHTML = `
      <a class="btn btn-ghost" href="${isEdit ? 'trade.html?id=' + trade.id : 'index.html'}">Cancel</a>
      <button class="btn btn-primary" id="saveBtn">${TJ.icon('save')}<span class="lbl">Save Trade</span></button>`;

    const structures = (S.structures && S.structures.length) ? S.structures : ['Bullish', 'Bearish', 'Ranging', 'Choppy', 'Reversal'];
    root.innerHTML = `
      ${dlist('dlPairs', S.pairs)}${dlist('dlLevels', S.levels)}${dlist('dlEmotions', S.emotions)}${dlist('dlZones', S.zones || [])}

      <section class="card" style="--i:0">
        <div class="card-h"><h3>${TJ.icon('info')}General</h3>
          <span class="count-badge mono">Trade #${number} · auto</span></div>
        <div class="card-b fg">
          <div class="field c3"><label for="f_date">Date <span class="req">*</span></label>
            <input class="input" id="f_date" type="date" value="${esc(trade.date || '')}"></div>
          <div class="field c3"><label for="f_time">Time</label>
            <input class="input" id="f_time" type="time" value="${esc(trade.time || '')}"></div>
          <div class="field c3"><label for="f_session">Trading Session</label>
            <select class="select" id="f_session">${opts(S.sessions, trade.session)}</select></div>
          <div class="field c3"><label for="f_zone">Zone Size</label>
            <input class="input" id="f_zone" list="dlZones" placeholder="e.g. 15 pips / small"
              value="${esc(trade.zoneSize || '')}"></div>
          <div class="field c3"><label for="f_pair">Pair <span class="req">*</span></label>
            <input class="input" id="f_pair" list="dlPairs" placeholder="e.g. XAUUSD"
              value="${esc(trade.pair || '')}" style="text-transform:uppercase"></div>
          <div class="field c6"><label>Direction</label>
            <div class="seg" id="dirSeg">
              <button type="button" data-v="buy" class="s-buy">▲ Buy</button>
              <button type="button" data-v="sell" class="s-sell">▼ Sell</button>
            </div></div>
        </div>
      </section>

      <section class="card" style="--i:1">
        <div class="card-h"><h3>${TJ.icon('layers')}Market Context</h3></div>
        <div class="card-b fg">
          <div class="field c4"><label for="f_tfMain">Timeframe (analysis)</label>
            <select class="select" id="f_tfMain">${opts(S.timeframes, trade.tfMain)}</select></div>
          <div class="field c4"><label for="f_tfHigher">Higher Timeframe</label>
            <select class="select" id="f_tfHigher">${opts(S.timeframes, trade.tfHigher)}</select></div>
          <div class="field c4"><label for="f_tfEntry">Entry Timeframe</label>
            <select class="select" id="f_tfEntry">${opts(S.timeframes, trade.tfEntry)}</select></div>
          <div class="field c4"><label for="f_structure">Market Structure</label>
            <select class="select" id="f_structure">${opts(structures, trade.structure)}</select></div>
          <div class="field c4"><label for="f_day">Day</label>
            <select class="select" id="f_day">${opts(DAYS, trade.day || dayFromDate(trade.date))}</select></div>
          <div class="field c4"><label for="f_level">Level</label>
            <input class="input" id="f_level" list="dlLevels" placeholder="e.g. Order Block"
              value="${esc(trade.level || '')}"></div>
        </div>
      </section>

      <section class="card" style="--i:2">
        <div class="card-h"><h3>${TJ.icon('target')}Execution</h3>
          <span class="hint">RR Planned auto-calculates from Entry / SL / TP</span></div>
        <div class="card-b fg">
          ${numField('f_entry', 'Entry Price', trade.entry, 'any', '0.0000')}
          ${numField('f_sl', 'Stop Loss', trade.sl, 'any', '0.0000')}
          ${numField('f_tp', 'Take Profit', trade.tp, 'any', '0.0000')}
          ${numField('f_risk', 'Risk %', trade.riskPct, '0.1', '1')}
          ${numField('f_rrp', 'RR Planned', trade.rrPlanned, '0.01', 'auto')}
        </div>
      </section>

      <section class="card" style="--i:3">
        <div class="card-h"><h3>${TJ.icon('activity')}Result</h3>
          <span class="hint">RR Achieved is a signed R-multiple: +2.5 TP · −1 SL · 0 RF/BE</span></div>
        <div class="card-b fg">
          <div class="field c12"><label>Outcome</label>
            <div class="seg" id="resSeg">
              <button type="button" data-v="win" class="s-win">TP</button>
              <button type="button" data-v="loss" class="s-loss">SL</button>
              <button type="button" data-v="rf" class="s-rf">RF</button>
              <button type="button" data-v="breakeven" class="s-be">BE</button>
            </div></div>
          ${numField('f_lot', 'Lot Size', trade.lot, 'any', '0.10')}
          ${numField('f_rra', 'RR Achieved', trade.rrAchieved, '0.01', '+2.5 / −1 / 0')}
          ${numField('f_pnl', 'Profit / Loss (' + esc(S.currency || '$') + ')', trade.pnl, '0.01', '0.00')}
          ${numField('f_comm', 'Commission', trade.commission, '0.01', '0.00')}
          ${numField('f_spread', 'Spread', trade.spread, 'any', '0.0')}
          ${numField('f_pips', 'Pips', trade.pips, 'any', '0.0')}
        </div>
      </section>

      <section class="card" style="--i:4">
        <div class="card-h"><h3>${TJ.icon('smile')}Psychology</h3></div>
        <div class="card-b fg">
          <div class="field c4"><label for="f_eb">Emotion Before Trade</label>
            <input class="input" id="f_eb" list="dlEmotions" value="${esc(trade.emotionBefore || '')}" placeholder="e.g. Calm"></div>
          <div class="field c4"><label for="f_ea">Emotion After Trade</label>
            <input class="input" id="f_ea" list="dlEmotions" value="${esc(trade.emotionAfter || '')}" placeholder="e.g. Confident"></div>
          <div class="field c4"><label for="f_conf">Confidence Score</label>
            <div class="range-wrap">
              <input type="range" id="f_conf" min="1" max="10" step="1" value="${trade.confidence || 5}">
              <span class="range-val" id="confVal">${trade.confidence || 5}</span>
            </div></div>
        </div>
      </section>

      <section class="card" style="--i:5">
        <div class="card-h"><h3>${TJ.icon('clipboard')}Checklist</h3>
          <span class="hint">Customize items in Settings</span>
          <span class="spacer"></span><span class="count-badge" id="clScore"></span></div>
        <div class="card-b">
          <div class="fg" id="clWrap">
            ${S.checklist.map(item => `
              <label class="check c4"><input type="checkbox" data-cl="${esc(item.id)}"
                ${trade.checklist && trade.checklist[item.id] ? 'checked' : ''}>
                <span class="box"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>
                <span class="txt">${esc(item.label)}</span></label>`).join('')}
          </div>
          <div class="progress" style="margin-top:14px"><i id="clBar"></i></div>
        </div>
      </section>

      <section class="card" style="--i:6">
        <div class="card-h"><h3>${TJ.icon('alert')}Review</h3></div>
        <div class="card-b" style="display:flex;flex-direction:column;gap:16px">
          <div class="field"><label>Mistakes</label><div id="mistChips"></div></div>
          <div class="field"><label for="f_lesson">Lesson</label>
            <textarea class="textarea" id="f_lesson" placeholder="What will you do differently next time?">${esc(trade.lesson || '')}</textarea></div>
        </div>
      </section>

      <section class="card" style="--i:7">
        <div class="card-h"><h3>${TJ.icon('camera')}Screenshots</h3>
          <span class="hint">Stored locally in your browser (IndexedDB)</span></div>
        <div class="shots-grid" id="shotsGrid"></div>
      </section>

      <section class="card" style="--i:8">
        <div class="card-h"><h3>${TJ.icon('link')}Links, Tags &amp; Notes</h3></div>
        <div class="card-b" style="display:flex;flex-direction:column;gap:16px">
          <div class="field"><label for="f_tv">TradingView Link</label>
            <input class="input" id="f_tv" type="url" placeholder="https://www.tradingview.com/x/…" value="${esc(trade.tvLink || '')}"></div>
          <div class="field"><label>Tags</label><div id="tagChips"></div></div>
          <div class="field"><label for="f_notes">External Notes</label>
            <textarea class="textarea" id="f_notes" placeholder="Anything else worth remembering…">${esc(trade.notes || '')}</textarea></div>
        </div>
      </section>

      <div style="display:flex;gap:10px;justify-content:flex-end">
        <a class="btn btn-ghost" href="${isEdit ? 'trade.html?id=' + trade.id : 'index.html'}">Cancel</a>
        <button class="btn btn-primary" id="saveBtn2">${TJ.icon('save')}Save Trade</button>
      </div>`;

    wireForm();
  }

  function segWire(id, initial, onSet) {
    const seg = $(id);
    const set = v => {
      seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.v === v));
      onSet(v);
    };
    seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => set(b.dataset.v)));
    set(initial);
  }

  function wireForm() {
    // Suggest P/L in account currency: R achieved × (balance × risk%). Never overwrites what you typed.
    const suggestPnl = () => {
      const pnlEl = $('f_pnl');
      if (!pnlEl || pnlEl.value.trim() !== '') return;
      const bal = +(S.balance || 0);
      const riskP = parseFloat($('f_risk').value);
      const rraV = parseFloat($('f_rra').value);
      if (!bal || isNaN(riskP) || isNaN(rraV)) return;
      pnlEl.value = Math.round(rraV * bal * (riskP / 100) * 100) / 100;
    };
    segWire('dirSeg', dirState, v => { dirState = v; });
    segWire('resSeg', resState, v => {
      resState = v;
      const rra = $('f_rra');
      if (rra && rra.value.trim() === '' && v) {
        if (v === 'win') rra.value = $('f_rrp').value || '';
        if (v === 'loss') rra.value = -1;
        if (v === 'rf') rra.value = 0;
        if (v === 'breakeven') rra.value = 0;
      }
      suggestPnl();
    });

    // RR planned auto-calc
    const calcRR = () => {
      const e = parseFloat($('f_entry').value), sl = parseFloat($('f_sl').value), tp = parseFloat($('f_tp').value);
      const rrp = $('f_rrp');
      if (rrp.dataset.dirty) return;
      if ([e, sl, tp].some(v => isNaN(v)) || e === sl) return;
      rrp.value = Math.round((Math.abs(tp - e) / Math.abs(e - sl)) * 100) / 100;
    };
    ['f_entry', 'f_sl', 'f_tp'].forEach(id => $(id).addEventListener('input', calcRR));
    $('f_rrp').addEventListener('input', () => { $('f_rrp').dataset.dirty = '1'; });
    $('f_rra').addEventListener('input', suggestPnl);
    const dayEl = $('f_day');
    if (dayEl) {
      dayEl.addEventListener('change', () => { dayEl.dataset.dirty = '1'; });
      $('f_date').addEventListener('change', () => {
        if (dayEl.dataset.dirty) return;
        const d = dayFromDate($('f_date').value);
        if (d) dayEl.value = d;
      });
    }

    // Confidence slider
    const conf = $('f_conf');
    const paintConf = () => {
      $('confVal').textContent = conf.value;
      conf.style.setProperty('--fill', ((conf.value - 1) / 9 * 100) + '%');
    };
    conf.addEventListener('input', paintConf);
    paintConf();

    // Checklist score
    const paintCl = () => {
      const boxes = [...document.querySelectorAll('[data-cl]')];
      const n = boxes.filter(b => b.checked).length;
      $('clScore').textContent = `${n} / ${boxes.length}`;
      $('clBar').style.width = boxes.length ? (n / boxes.length * 100) + '%' : '0%';
    };
    document.querySelectorAll('[data-cl]').forEach(b => b.addEventListener('change', paintCl));
    paintCl();

    // Chips (persist custom values back into settings so filters know them)
    const persistOption = key => v => {
      const s = TJ.store.settings();
      if (!s[key].includes(v)) { s[key].push(v); TJ.store.saveSettings(s); }
    };
    chipMist = TJ.ui.chips($('mistChips'), {
      options: S.mistakes, value: trade.mistakes || [],
      placeholder: 'Add mistake…', onNewOption: persistOption('mistakes')
    });
    chipTags = TJ.ui.chips($('tagChips'), {
      options: S.tags, value: trade.tags || [],
      placeholder: 'Add tag…', onNewOption: persistOption('tags')
    });

    renderShots();
    $('saveBtn').addEventListener('click', doSave);
    $('saveBtn2').addEventListener('click', doSave);
  }

  /* ---------- Screenshot slots ---------- */
  function renderShots() {
    const grid = $('shotsGrid');
    grid.innerHTML = slots.map(slot => `
      <div class="shot" data-slot="${slot}">
        <div class="shot-lab">${esc(labelFor(slot))}</div>
        <div class="shot-body"></div>
        <div class="shot-btns"></div>
        <input type="file" accept="image/*" class="hidden">
      </div>`).join('');
    slots.forEach(slot => paintSlot(slot));
  }

  async function paintSlot(slot) {
    const el = root.querySelector(`.shot[data-slot="${slot}"]`);
    if (!el) return;
    const body = el.querySelector('.shot-body');
    const btns = el.querySelector('.shot-btns');
    const input = el.querySelector('input[type=file]');
    const st = staged[slot];
    const existingId = trade.shots && trade.shots[slot];

    let src = null;
    if (st && st.file) src = st.url;
    else if (!(st && st.remove) && existingId) src = await TJ.images.url(existingId).catch(() => null);

    if (src) {
      el.classList.add('filled');
      body.innerHTML = `<img class="shot-img" src="${src}" alt="${slot} screenshot">`;
      body.querySelector('img').addEventListener('click', () =>
        TJ.ui.lightbox([{ src, title: labelFor(slot) }]));
      btns.innerHTML = `
        <button type="button" class="btn btn-ghost btn-sm" data-a="replace">${TJ.icon('upload')}Replace</button>
        <button type="button" class="btn btn-danger btn-sm" data-a="remove">${TJ.icon('trash')}Remove</button>`;
    } else {
      el.classList.remove('filled');
      body.innerHTML = `<div class="shot-ph">${TJ.icon('camera')}<span>Click to upload</span></div>`;
      body.querySelector('.shot-ph').addEventListener('click', () => input.click());
      btns.innerHTML = '';
    }
    btns.onclick = e => {
      const a = e.target.closest('[data-a]');
      if (!a) return;
      if (a.dataset.a === 'replace') input.click();
      if (a.dataset.a === 'remove') {
        if (staged[slot] && staged[slot].url) URL.revokeObjectURL(staged[slot].url);
        staged[slot] = { remove: true };
        paintSlot(slot);
      }
    };
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { TJ.ui.toast('Please choose an image file.', 'err'); return; }
      if (staged[slot] && staged[slot].url) URL.revokeObjectURL(staged[slot].url);
      staged[slot] = { file, url: URL.createObjectURL(file) };
      input.value = '';
      paintSlot(slot);
    };
  }

  /* ---------- Collect + save ---------- */
  function collect() {
    const g = id => $(id);
    const numv = id => { const v = g(id).value.trim(); return v === '' ? null : parseFloat(v); };
    const t = Object.assign({}, trade);

    t.date = g('f_date').value;
    t.time = g('f_time').value;
    t.session = g('f_session').value;
    t.zoneSize = g('f_zone').value.trim();
    t.pair = g('f_pair').value.trim().toUpperCase();
    t.direction = dirState;
    t.tfMain = g('f_tfMain').value;
    t.tfHigher = g('f_tfHigher').value;
    t.tfEntry = g('f_tfEntry').value;
    t.structure = g('f_structure').value;
    t.day = g('f_day').value;
    t.level = g('f_level').value.trim();
    t.entry = numv('f_entry'); t.sl = numv('f_sl'); t.tp = numv('f_tp');
    t.riskPct = numv('f_risk'); t.lot = numv('f_lot');
    t.rrPlanned = numv('f_rrp'); t.rrAchieved = numv('f_rra');
    t.pnl = numv('f_pnl'); t.commission = numv('f_comm'); t.spread = numv('f_spread'); t.pips = numv('f_pips');
    t.result = resState;
    t.emotionBefore = g('f_eb').value.trim();
    t.emotionAfter = g('f_ea').value.trim();
    t.confidence = +g('f_conf').value;
    t.checklist = {};
    document.querySelectorAll('[data-cl]').forEach(b => { t.checklist[b.dataset.cl] = b.checked; });
    t.mistakes = chipMist.get();
    t.tags = chipTags.get();
    t.lesson = g('f_lesson').value.trim();
    t.notes = g('f_notes').value.trim();
    let tv = g('f_tv').value.trim();
    if (tv && !/^https?:\/\//i.test(tv)) tv = 'https://' + tv;
    t.tvLink = tv;

    if (!t.date) { TJ.ui.toast('Date is required.', 'err'); g('f_date').focus(); return null; }
    if (!t.pair) { TJ.ui.toast('Pair is required.', 'err'); g('f_pair').focus(); return null; }
    return t;
  }

  async function doSave() {
    const t = collect();
    if (!t) return;
    ['saveBtn', 'saveBtn2'].forEach(id => { const b = $(id); if (b) b.disabled = true; });

    const saved = TJ.store.save(t);
    try {
      for (const slot of slots) {
        const st = staged[slot];
        if (!st) continue;
        saved.shots = saved.shots || {};
        const oldId = saved.shots[slot];
        if (st.remove) {
          if (oldId) { await TJ.images.del(oldId).catch(() => {}); delete saved.shots[slot]; }
        } else if (st.file) {
          if (oldId) await TJ.images.del(oldId).catch(() => {});
          const id = TJ.store.uid();
          await TJ.images.put({ id, tradeId: saved.id, slot, name: st.file.name, blob: st.file });
          saved.shots[slot] = id;
          if (st.url) URL.revokeObjectURL(st.url);
        }
      }
    } catch (e) {
      console.warn(e);
      TJ.ui.toast('Trade saved, but screenshots could not be stored (IndexedDB unavailable).', 'err');
    }
    TJ.store.save(saved);
    TJ.updateUsage();
    TJ.ui.toast(mode === 'edit' ? `Trade #${saved.number} updated` : `Trade #${saved.number} saved`);
    setTimeout(() => { location.href = 'trade.html?id=' + saved.id; }, 380);
  }

  /* ============================ VIEW MODE ============================ */
  const kv = (label, valueHtml) =>
    (valueHtml === null || valueHtml === undefined || valueHtml === '' || valueHtml === '—')
      ? '' : `<div class="kv"><b>${label}</b><span>${valueHtml}</span></div>`;

  async function renderView() {
    const t = trade;
    const r = M.rOf(t);
    $('tradeTitle').textContent = `Trade #${t.number}`;
    $('tradeSub').textContent = `${t.pair || ''} · ${fmt.dateFull(t.date)}${t.time ? ' · ' + t.time : ''}`;
    $('tradeActions').innerHTML = `
      <a class="btn btn-ghost" href="index.html">${TJ.icon('arrow-l')}<span class="lbl">Journal</span></a>
      <button class="btn" id="aiFbBtn">${TJ.icon('flame')}<span class="lbl">AI Review</span></button>
      <a class="btn" href="trade.html?duplicate=${t.id}">${TJ.icon('copy')}<span class="lbl">Duplicate</span></a>
      <button class="btn btn-danger" id="delBtn">${TJ.icon('trash')}<span class="lbl">Delete</span></button>
      <a class="btn btn-primary" href="trade.html?edit=${t.id}">${TJ.icon('pencil')}<span class="lbl">Edit</span></a>`;
    if (TJ.ai) $('aiFbBtn').addEventListener('click', () => TJ.ai.openTradeReview(t));
    $('delBtn').addEventListener('click', async () => {
      const ok = await TJ.ui.confirm({
        title: `Delete trade #${t.number}?`,
        message: 'The trade and its screenshots will be removed permanently.',
        confirmText: 'Delete', danger: true
      });
      if (!ok) return;
      try { await TJ.images.deleteForTrade(t.id); } catch (e) {}
      TJ.store.remove(t.id);
      TJ.ui.toast('Trade deleted');
      setTimeout(() => location.href = 'index.html', 300);
    });

    const clItems = S.checklist.filter(i => t.checklist && i.id in t.checklist);
    const clChecked = clItems.filter(i => t.checklist[i.id]).length;
    const conf = t.confidence || 0;
    const tfLine = [t.tfMain && `Analysis ${t.tfMain}`, t.tfHigher && `HTF ${t.tfHigher}`, t.tfEntry && `Entry ${t.tfEntry}`]
      .filter(Boolean).join(' · ');

    root.innerHTML = `
      <section class="card hero" style="--i:0">
        <div>
          <div class="hero-pair"><span class="mono">${esc(t.pair || '—')}</span>
            ${TJ.dirBadge(t.direction)} ${TJ.resultBadge(t.result)}</div>
          <div class="hero-chips">
            <span>${fmt.dateFull(t.date)}${t.time ? ' · ' + esc(t.time) : ''}</span>
            ${t.session ? `<span class="sep">•</span><span>${esc(t.session)} session</span>` : ''}
            ${t.setup ? `<span class="sep">•</span><span>${esc(t.setup)}</span>` : ''}
            ${(t.tags || []).map(x => `<span class="tagpill">${TJ.icon('tag')}${esc(x)}</span>`).join('')}
            ${t.tvLink ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${esc(t.tvLink)}">${TJ.icon('external')}TradingView</a>` : ''}
          </div>
        </div>
        <div class="hero-r">
          <div class="big ${TJ.rClass(r)}">${t.result ? fmt.r(r) : 'Open'}</div>
          <div class="sub2">
            ${t.pnl !== null && t.pnl !== undefined ? `P/L <b class="${TJ.rClass(t.pnl)}">${fmt.money(t.pnl)}</b> · ` : ''}
            Planned ${fmt.n(t.rrPlanned)}R · Risk ${fmt.n(t.riskPct)}%
          </div>
        </div>
      </section>

      <div class="detail-grid">
        <div style="display:flex;flex-direction:column;gap:18px">
          <section class="card" style="--i:1">
            <div class="card-h"><h3>${TJ.icon('layers')}Market Context</h3></div>
            <div class="kv-grid">
              ${kv('Timeframes', esc(tfLine) || null)}
              ${kv('Structure', esc(t.structure))}
              ${kv('Day', esc(t.day || ''))}
              ${kv('Level', esc(t.level))}
              ${kv('Session', esc(t.session))}
              ${kv('Zone Size', esc(t.zoneSize || ''))}
            </div>
          </section>
          <section class="card" style="--i:2">
            <div class="card-h"><h3>${TJ.icon('target')}Execution</h3></div>
            <div class="kv-grid">
              ${kv('Entry', fmt.n(t.entry, 5))}
              ${kv('Stop Loss', fmt.n(t.sl, 5))}
              ${kv('Take Profit', fmt.n(t.tp, 5))}
              ${kv('Risk %', t.riskPct != null ? fmt.n(t.riskPct) + '%' : null)}
              ${kv('Lot Size', fmt.n(t.lot, 3))}
              ${kv('RR Planned', t.rrPlanned != null ? fmt.n(t.rrPlanned) + 'R' : null)}
              ${kv('RR Achieved', t.result ? `<span class="rr ${TJ.rClass(r)}">${fmt.r(r)}</span>` : null)}
              ${kv('Commission', fmt.money(t.commission))}
              ${kv('Spread', fmt.n(t.spread, 3))}
              ${kv('Pips', fmt.n(t.pips, 1))}
            </div>
          </section>
          <section class="card" style="--i:3">
            <div class="card-h"><h3>${TJ.icon('smile')}Psychology</h3></div>
            <div class="kv-grid">
              ${kv('Before trade', esc(t.emotionBefore))}
              ${kv('After trade', esc(t.emotionAfter))}
              ${kv('Confidence', `${conf}/10`)}
            </div>
            <div style="padding:0 20px 18px">
              <div class="progress"><i style="width:${conf * 10}%"></i></div>
            </div>
          </section>
        </div>

        <div style="display:flex;flex-direction:column;gap:18px">
          ${clItems.length ? `
          <section class="card" style="--i:2">
            <div class="card-h"><h3>${TJ.icon('clipboard')}Checklist</h3>
              <span class="spacer"></span><span class="count-badge">${clChecked} / ${clItems.length}</span></div>
            <div class="cl-list">
              ${clItems.map(i => `<div class="cl-item ${t.checklist[i.id] ? 'ok' : 'miss'}">
                ${TJ.icon(t.checklist[i.id] ? 'check' : 'x')}<span>${esc(i.label)}</span></div>`).join('')}
            </div>
          </section>` : ''}
          ${(t.mistakes || []).length || t.lesson ? `
          <section class="card" style="--i:3">
            <div class="card-h"><h3>${TJ.icon('alert')}Review</h3></div>
            ${(t.mistakes || []).length ? `<div class="chips" style="padding:16px 20px 4px">
              ${t.mistakes.map(m => `<span class="badge b-loss">${esc(m)}</span>`).join('')}</div>` : ''}
            ${t.lesson ? `<div class="prose">${esc(t.lesson)}</div>` : ''}
          </section>` : ''}
          ${t.notes ? `
          <section class="card" style="--i:4">
            <div class="card-h"><h3>${TJ.icon('pencil')}Notes</h3></div>
            <div class="prose">${esc(t.notes)}</div>
          </section>` : ''}
        </div>
      </div>

      <section class="card" style="--i:4">
        <div class="card-h"><h3>${TJ.icon('camera')}Screenshots</h3></div>
        <div class="shots-grid" id="viewShots"><div class="note" style="padding:4px 2px">${TJ.icon('info')}Loading images…</div></div>
      </section>

      <p class="note">${TJ.icon('clock')}Created ${new Date(t.createdAt || Date.now()).toLocaleString()}${t.updatedAt ? ' · Updated ' + new Date(t.updatedAt).toLocaleString() : ''}</p>`;

    // Screenshots (async)
    const wrap = $('viewShots');
    const entries = Object.entries(t.shots || {}).map(([slot, id]) => ({ slot, label: labelFor(slot), id })).filter(e => e.id);
    if (!entries.length) {
      wrap.innerHTML = `<div class="note" style="grid-column:1/-1">${TJ.icon('camera')}No screenshots attached.
        <a class="link" href="trade.html?edit=${t.id}">Add some</a></div>`;
      return;
    }
    const items = [];
    for (const e of entries) {
      e.src = await TJ.images.url(e.id).catch(() => null);
      if (e.src) items.push({ src: e.src, title: `${t.pair} — ${e.label}`, caption: `${fmt.dateFull(t.date)} · ${t.setup || ''}` });
    }
    wrap.innerHTML = entries.map(e => e.src ? `
      <div class="shot filled"><div class="shot-lab">${e.label}</div>
        <img class="shot-img" data-slot="${e.slot}" src="${e.src}" alt="${e.label}"></div>` : '').join('') ||
      `<div class="note" style="grid-column:1/-1">${TJ.icon('alert')}Images could not be loaded on this device.</div>`;
    wrap.querySelectorAll('img').forEach((img, i) =>
      img.addEventListener('click', () => TJ.ui.lightbox(items, i)));
  }

  /* ============================ BOOT ============================ */
  function init() {
    if ((viewId || editId) && !trade) return notFound();
    if (mode === 'view') renderView(); else renderForm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
