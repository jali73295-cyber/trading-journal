/* ============================================================
   TradeLog Pro — storage.js
   LocalStorage data layer. All app data lives under the `tj.*`
   namespace. The trade schema is flat + versioned so future AI
   analysis can consume exports without any migration.
   ============================================================ */
(function () {
  'use strict';
  const TJ = (window.TJ = window.TJ || {});
  const NS = 'tj.';
  const K = { trades: NS + 'trades', settings: NS + 'settings', meta: NS + 'meta' };
  const SCHEMA = 1;

  const uid = () =>
    (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);

  /* ---------- Defaults ---------- */
  function defaults() {
    return {
      schemaVersion: SCHEMA,
      theme: 'dark',
      accent: '#7c6cff',
      fontSize: 'md',
      currency: '$',
      defaultRisk: 1,
      balance: null,
      ai: { provider: 'gemini', claude: { key: '', model: 'claude-sonnet-4-6' }, gemini: { key: '', model: 'gemini-2.5-flash' } },
      pairs: ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'US30', 'NAS100', 'SPX500', 'BTCUSD', 'ETHUSD'],
      sessions: ['Asia', 'London', 'New York', 'London Close', 'Sydney'],
      strategies: ['1MG', 'TopG', 'Fib', 'Supply & Demand'],
      timeframes: ['1M', '3M', '5M', '15M', '30M', '1H', '2H', '4H', 'Daily', 'Weekly'],
      levels: ['TJL1', 'TJL2 A+', 'SBR', 'RBS', 'DT', 'DB', 'QML A+', 'DUAL CHOC', 'ISS Level 2', 'ISS Level 3', 'ISS Level 4 A+'],
      structures: ['Bullish', 'Bearish', 'Ranging', 'Choppy', 'Reversal'],
      emotions: ['Calm', 'Confident', 'Focused', 'Neutral', 'Hesitant', 'Anxious', 'FOMO', 'Greedy', 'Fearful', 'Frustrated', 'Revenge', 'Tired'],
      mistakes: ['Early Entry', 'Late Entry', 'Moved Stop Loss', 'Oversized Position', 'No Confirmation', 'Ignored Plan', 'Revenge Trade', 'Chased Price', 'Exited Too Early', 'Held Too Long', 'Traded Into News', 'Overtrading'],
      tags: ['A+', 'News', 'FOMO', 'Revenge', 'SMC', 'ISS', 'Scalp', 'Swing'],
      checklist: ['Emotion Stable', 'Setup', 'Level Tap', 'Liquidity Sweep', 'Candle Confirmation', 'SL TP Set']
        .map(label => ({ id: uid(), label })),
      shotSlots: [{ id: uid(), label: 'Screenshot' }]
    };
  }

  /* ---------- Low-level ---------- */
  function read(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { console.warn('read failed', key, e); return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) {
      console.error('write failed', e);
      if (TJ.ui) TJ.ui.toast('Storage is full — export a backup and remove old data.', 'err');
      return false;
    }
  }

  let _settings = null, _trades = null, _meta = null;

  /* ---------- Settings ---------- */
  function settings() {
    if (_settings) return _settings;
    const saved = read(K.settings, null);
    if (!saved) {
      _settings = defaults();
      _settings.migratedV2 = true;
      write(K.settings, _settings); // persist so item ids are stable
    } else {
      _settings = Object.assign(defaults(), saved);
      if (!saved.migratedV2) {
        // One-time v2 migration: adopt the trader's custom vocabulary
        const d = defaults();
        _settings.levels = d.levels;
        _settings.strategies = d.strategies;
        _settings.checklist = d.checklist;
        _settings.shotSlots = d.shotSlots;
        _settings.migratedV2 = true;
        write(K.settings, _settings);
      }
    }
    return _settings;
  }
  function saveSettings(s) { _settings = s; write(K.settings, s); return s; }

  /* ---------- Meta ---------- */
  function meta() {
    if (!_meta) _meta = read(K.meta, { lastNumber: 0, createdAt: new Date().toISOString(), schema: SCHEMA });
    return _meta;
  }
  function saveMeta() { write(K.meta, meta()); }

  /* ---------- Trades ---------- */
  function trades() { if (!_trades) _trades = read(K.trades, []); return _trades; }
  function persist() { return write(K.trades, _trades || []); }
  const sortKey = t => (t.date || '0000-00-00') + 'T' + (t.time || '00:00');

  /** Newest-first list (copy). */
  function list() {
    return trades().slice().sort((a, b) =>
      sortKey(b).localeCompare(sortKey(a)) || (b.number || 0) - (a.number || 0));
  }
  /** Oldest-first list (copy) — used for equity curves. */
  function listAsc() { return list().reverse(); }
  function byId(id) { return trades().find(t => t.id === id) || null; }
  function nextNumber() { return (meta().lastNumber || 0) + 1; }

  /** Upsert. New trades get an id, number and createdAt automatically. */
  function save(t) {
    const arr = trades();
    const now = new Date().toISOString();
    if (!t.id) t.id = uid();
    const i = arr.findIndex(x => x.id === t.id);
    if (i < 0) {
      if (!t.number) { t.number = ++meta().lastNumber; saveMeta(); }
      t.createdAt = t.createdAt || now;
      arr.push(t);
    } else {
      arr[i] = t;
    }
    t.updatedAt = now;
    persist();
    return t;
  }
  function remove(id) {
    const arr = trades();
    const i = arr.findIndex(t => t.id === id);
    if (i > -1) { arr.splice(i, 1); persist(); }
  }

  /** Empty trade template (schema v1 — flat & AI-export friendly). */
  function blank() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return {
      id: '', number: 0, schema: SCHEMA,
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      session: '', pair: '', direction: 'buy',
      tfMain: '', tfHigher: '', tfEntry: '',
      structure: '', setup: '', day: '', level: '',
      entry: null, sl: null, tp: null,
      riskPct: settings().defaultRisk, lot: null,
      rrPlanned: null, rrAchieved: null,
      pnl: null, commission: null, spread: null,
      result: '', emotionBefore: '', emotionAfter: '', confidence: 5,
      checklist: {}, mistakes: [], lesson: '',
      tvLink: '', notes: '', tags: [], shots: {}
    };
  }

  /* ---------- Export / import ---------- */
  function exportData() {
    return {
      app: 'tradelog-pro', version: TJ.VERSION || '1.0.0', schema: SCHEMA,
      exportedAt: new Date().toISOString(),
      settings: settings(), meta: meta(), trades: trades()
    };
  }
  function replaceAll(data) {
    _settings = Object.assign(defaults(), data.settings || {});
    _meta = Object.assign({ lastNumber: 0, schema: SCHEMA }, data.meta || {});
    _trades = Array.isArray(data.trades) ? data.trades : [];
    const maxNo = _trades.reduce((m, t) => Math.max(m, t.number || 0), 0);
    if ((_meta.lastNumber || 0) < maxNo) _meta.lastNumber = maxNo;
    write(K.settings, _settings); write(K.meta, _meta); write(K.trades, _trades);
  }
  function clearAll() {
    [K.trades, K.settings, K.meta].forEach(k => localStorage.removeItem(k));
    _settings = _trades = _meta = null;
  }

  const CSV_COLS = ['number', 'date', 'time', 'session', 'pair', 'direction', 'tfMain', 'tfHigher', 'tfEntry',
    'structure', 'setup', 'day', 'level', 'entry', 'sl', 'tp', 'riskPct', 'lot', 'rrPlanned', 'rrAchieved',
    'pnl', 'commission', 'spread', 'result', 'emotionBefore', 'emotionAfter', 'confidence',
    'checklistScore', 'mistakes', 'lesson', 'tags', 'tvLink', 'notes'];
  function toCSV(rows) {
    const q = v => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const line = t => CSV_COLS.map(c => {
      if (c === 'mistakes' || c === 'tags') return q((t[c] || []).join(' | '));
      if (c === 'checklistScore') {
        const vals = Object.values(t.checklist || {});
        return vals.length ? `${vals.filter(Boolean).length}/${vals.length}` : '';
      }
      return q(t[c]);
    }).join(',');
    return CSV_COLS.join(',') + '\n' + rows.map(line).join('\n');
  }

  function usage() {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NS)) bytes += ((localStorage.getItem(k) || '').length + k.length) * 2;
    }
    return bytes;
  }

  /* ---------- Demo seed ---------- */
  function seedDemo() {
    const s = settings();
    const cl = s.checklist;
    const iso = daysAgo => {
      const d = new Date(); d.setDate(d.getDate() - daysAgo);
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    };
    const checks = ratio => {
      const o = {};
      cl.forEach((c, i) => { o[c.id] = (i / cl.length) < ratio; });
      return o;
    };
    // [daysAgo, time, pair, dir, session, setup, htf, ltf, structure, level,
    //  result, rrP, rrA, pnl, risk, emoB, emoA, conf, tags, mistakes, lesson]
    const rows = [
      [2, '10:15', 'XAUUSD', 'buy', 'London', 'TopG', '4H', '5M', 'Bullish', 'TJL1', 'win', 3, 2.8, 284, 1, 'Calm', 'Confident', 8, ['A+'], [], 'TJL1 tap + sweep — patience paid off.'],
      [3, '15:40', 'NAS100', 'sell', 'New York', '1MG', '1H', '3M', 'Bearish', 'QML A+', 'loss', 2.5, -1, -102, 1, 'FOMO', 'Frustrated', 4, ['News', 'FOMO'], ['Chased Price', 'Traded Into News'], 'Entered before CPI — no trades 15 min around red news.'],
      [4, '09:05', 'EURUSD', 'buy', 'London', 'Fib', '4H', '15M', 'Bullish', 'ISS Level 2', 'win', 2, 2.1, 208, 1, 'Focused', 'Calm', 7, ['ISS'], [], 'Clean fib retrace with candle confirmation.'],
      [6, '11:30', 'GBPJPY', 'sell', 'London', 'TopG', 'Daily', '15M', 'Bearish', 'DT', 'breakeven', 3, 0, -4, 1, 'Confident', 'Neutral', 7, [], ['Exited Too Early'], 'Moved SL to BE too fast; it later hit full TP.'],
      [8, '16:20', 'US30', 'buy', 'New York', '1MG', '1H', '5M', 'Reversal', 'SBR', 'win', 4, 3.6, 355, 1, 'Calm', 'Confident', 9, ['A+'], [], 'SBR flip at the London low — playbook A+.'],
      [10, '08:45', 'XAUUSD', 'sell', 'London', 'TopG', '4H', '5M', 'Bearish', 'RBS', 'loss', 2.5, -1, -98, 1, 'Anxious', 'Frustrated', 5, ['Revenge'], ['Revenge Trade', 'No Confirmation'], 'Revenge entry. Stop after 2 losses, walk away.'],
      [13, '14:10', 'BTCUSD', 'buy', 'New York', 'Supply & Demand', '4H', '30M', 'Bullish', 'ISS Level 3', 'win', 2, 2, 195, 1, 'Focused', 'Calm', 7, ['Swing'], [], 'HTF demand + LTF confirmation. Simple works.'],
      [16, '10:55', 'GBPUSD', 'buy', 'London', 'TopG', '4H', '5M', 'Bullish', 'TJL2 A+', 'win', 3, 3, 300, 1, 'Calm', 'Confident', 8, ['A+'], [], 'Textbook TJL2 A+ — screenshot for the playbook.'],
      [18, '17:35', 'NAS100', 'sell', 'New York', 'Fib', '30M', '1M', 'Ranging', 'DB', 'loss', 1.5, -1, -95, 1, 'Tired', 'Tired', 3, ['Scalp'], ['Overtrading', 'Late Entry'], 'Fifth trade of the day. Cap at 3 max.'],
      [21, '09:25', 'EURUSD', 'sell', 'London', '1MG', '1H', '5M', 'Bearish', 'DUAL CHOC', 'win', 2.5, 2.4, 238, 1, 'Confident', 'Confident', 8, ['ISS'], [], 'Dual CHoCH + displacement down.'],
      [24, '12:15', 'USDJPY', 'buy', 'New York', 'Fib', '4H', '15M', 'Bullish', 'ISS Level 2', 'rf', 2, 0, 0, 1, 'Neutral', 'Neutral', 6, [], [], 'SL to entry after 1R — stopped out risk-free.'],
      [27, '10:05', 'XAUUSD', 'buy', 'London', 'TopG', '4H', '5M', 'Bullish', 'ISS Level 4 A+', 'win', 3, 2.5, 252, 1, 'Calm', 'Confident', 8, ['A+'], [], 'Asia low sweep into ISS L4 — A+ only.'],
      [31, '15:50', 'US30', 'sell', 'New York', '1MG', '1H', '3M', 'Bearish', 'DT', 'loss', 3, -1, -100, 1, 'Greedy', 'Frustrated', 5, [], ['Oversized Position', 'Moved Stop Loss'], 'Widened the stop mid-trade — never again.'],
      [35, '11:00', 'GBPJPY', 'buy', 'London', 'Supply & Demand', 'Daily', '15M', 'Bullish', 'TJL1', 'win', 2, 1.9, 186, 1, 'Focused', 'Calm', 7, ['Swing'], [], 'Daily demand held; partials made it stress-free.'],
      [38, '09:40', 'EURUSD', 'buy', 'London', 'TopG', '4H', '5M', 'Bullish', 'ISS Level 3', 'win', 2.5, 2.5, 244, 1, 'Calm', 'Confident', 8, ['ISS'], [], 'Consistent model, consistent result.'],
      [41, '16:05', 'NAS100', 'buy', 'New York', 'Fib', '1H', '5M', 'Bullish', 'QML A+', 'loss', 2, -1, -97, 1, 'FOMO', 'Anxious', 4, ['FOMO', 'News'], ['Chased Price'], 'Chased extension. Let price come to the level.']
    ];
    rows.reverse().forEach(r => {
      const [d, time, pair, dir, session, setup, htf, ltf, structure, level, result, rrP, rrA, pnl, risk, eb, ea, conf, tags, mistakes, lesson] = r;
      const t = blank();
      const _sd = iso(d);
      const _wd = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(_sd + 'T00:00:00').getDay()];
      Object.assign(t, {
        date: _sd, time, pair, direction: dir, session, setup,
        day: (_wd === 'Sunday' || _wd === 'Saturday') ? '' : _wd,
        tfMain: htf, tfHigher: htf, tfEntry: ltf, structure, level,
        riskPct: risk, rrPlanned: rrP, rrAchieved: rrA, pnl,
        commission: -2, spread: 0.3, result,
        emotionBefore: eb, emotionAfter: ea, confidence: conf,
        tags, mistakes, lesson,
        checklist: checks(result === 'win' ? 1 : result === 'loss' ? 0.55 : 0.8),
        notes: ''
      });
      save(t);
    });
  }

  TJ.store = {
    uid, settings, saveSettings, defaults, meta, saveMeta,
    list, listAsc, byId, nextNumber, save, remove, blank,
    exportData, replaceAll, clearAll, toCSV, usage, seedDemo,
    KEYS: K, SCHEMA
  };
})();
