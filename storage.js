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
      pairs: ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'US30', 'NAS100', 'SPX500', 'BTCUSD', 'ETHUSD'],
      sessions: ['Asia', 'London', 'New York', 'London Close', 'Sydney'],
      strategies: ['SMC', 'ICT 2022', 'Breakout', 'Reversal', 'Trend Continuation', 'Supply & Demand', 'Range Scalp', 'Swing'],
      timeframes: ['1M', '3M', '5M', '15M', '30M', '1H', '2H', '4H', 'Daily', 'Weekly'],
      levels: ['Order Block', 'FVG', 'Breaker', 'Liquidity Pool', 'Equal Highs', 'Equal Lows', 'Support', 'Resistance', 'Session High/Low', 'Fib 0.705'],
      emotions: ['Calm', 'Confident', 'Focused', 'Neutral', 'Hesitant', 'Anxious', 'FOMO', 'Greedy', 'Fearful', 'Frustrated', 'Revenge', 'Tired'],
      mistakes: ['Early Entry', 'Late Entry', 'Moved Stop Loss', 'Oversized Position', 'No Confirmation', 'Ignored Plan', 'Revenge Trade', 'Chased Price', 'Exited Too Early', 'Held Too Long', 'Traded Into News', 'Overtrading'],
      tags: ['A+', 'News', 'FOMO', 'Revenge', 'SMC', 'ISS', 'Scalp', 'Swing'],
      checklist: ['Trend Confirmed', 'Liquidity Taken', 'CHOCH', 'MSS', 'FVG', 'OB', 'Risk Calculated', 'News Checked', 'Emotion Stable']
        .map(label => ({ id: uid(), label }))
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
      write(K.settings, _settings); // persist so checklist item ids are stable
    } else {
      _settings = Object.assign(defaults(), saved);
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
      structure: '', setup: '', level: '',
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
    'structure', 'setup', 'level', 'entry', 'sl', 'tp', 'riskPct', 'lot', 'rrPlanned', 'rrAchieved',
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
      [2, '10:15', 'XAUUSD', 'buy', 'London', 'SMC', '4H', '5M', 'Bullish', 'Order Block', 'win', 3, 2.8, 284, 1, 'Calm', 'Confident', 8, ['A+', 'SMC'], [], 'Patience at the OB paid off. Wait for the sweep every time.'],
      [3, '15:40', 'NAS100', 'sell', 'New York', 'ICT 2022', '1H', '3M', 'Bearish', 'FVG', 'loss', 2.5, -1, -102, 1, 'FOMO', 'Frustrated', 4, ['News', 'FOMO'], ['Chased Price', 'Traded Into News'], 'Entered right before CPI — no trades 15 min around red news.'],
      [4, '09:05', 'EURUSD', 'buy', 'London', 'Breakout', '4H', '15M', 'Bullish', 'Liquidity Pool', 'win', 2, 2.1, 208, 1, 'Focused', 'Calm', 7, ['SMC'], [], 'Clean breakout with retest confirmation.'],
      [6, '11:30', 'GBPJPY', 'sell', 'London', 'SMC', 'Daily', '15M', 'Bearish', 'Equal Highs', 'breakeven', 3, 0, -4, 1, 'Confident', 'Neutral', 7, [], ['Exited Too Early'], 'Moved SL to BE too fast; trade later ran to full TP.'],
      [8, '16:20', 'US30', 'buy', 'New York', 'Reversal', '1H', '5M', 'Reversal', 'Session High/Low', 'win', 4, 3.6, 355, 1, 'Calm', 'Confident', 9, ['A+'], [], 'NY reversal off the London low — best setup of the playbook.'],
      [10, '08:45', 'XAUUSD', 'sell', 'London', 'SMC', '4H', '5M', 'Bearish', 'Breaker', 'loss', 2.5, -1, -98, 1, 'Anxious', 'Frustrated', 5, ['Revenge'], ['Revenge Trade', 'No Confirmation'], 'Took it to win back yesterday. Stop after 2 losses, walk away.'],
      [13, '14:10', 'BTCUSD', 'buy', 'New York', 'Trend Continuation', '4H', '30M', 'Bullish', 'FVG', 'win', 2, 2, 195, 1, 'Focused', 'Calm', 7, ['Swing'], [], 'HTF trend + LTF FVG fill. Simple works.'],
      [16, '10:55', 'GBPUSD', 'buy', 'London', 'SMC', '4H', '5M', 'Bullish', 'Order Block', 'win', 3, 3, 300, 1, 'Calm', 'Confident', 8, ['A+', 'SMC'], [], 'Textbook CHOCH into OB. Screenshot for the playbook.'],
      [18, '17:35', 'NAS100', 'sell', 'New York', 'Range Scalp', '30M', '1M', 'Ranging', 'Resistance', 'loss', 1.5, -1, -95, 1, 'Tired', 'Tired', 3, ['Scalp'], ['Overtrading', 'Late Entry'], 'Fifth trade of the day. Cap at 3 trades max.'],
      [21, '09:25', 'EURUSD', 'sell', 'London', 'ICT 2022', '1H', '5M', 'Bearish', 'FVG', 'win', 2.5, 2.4, 238, 1, 'Confident', 'Confident', 8, ['SMC'], [], 'Judas swing into premium then displacement down.'],
      [24, '12:15', 'USDJPY', 'buy', 'New York', 'Breakout', '4H', '15M', 'Bullish', 'Support', 'breakeven', 2, 0, 0, 1, 'Neutral', 'Neutral', 6, [], [], 'Choppy day, right to scratch it.'],
      [27, '10:05', 'XAUUSD', 'buy', 'London', 'SMC', '4H', '5M', 'Bullish', 'Liquidity Pool', 'win', 3, 2.5, 252, 1, 'Calm', 'Confident', 8, ['A+'], [], 'Asia low sweep + MSS. A+ conditions only.'],
      [31, '15:50', 'US30', 'sell', 'New York', 'Reversal', '1H', '3M', 'Bearish', 'Equal Highs', 'loss', 3, -1, -100, 1, 'Greedy', 'Frustrated', 5, [], ['Oversized Position', 'Moved Stop Loss'], 'Widened the stop mid-trade — never again.'],
      [35, '11:00', 'GBPJPY', 'buy', 'London', 'Trend Continuation', 'Daily', '15M', 'Bullish', 'Order Block', 'win', 2, 1.9, 186, 1, 'Focused', 'Calm', 7, ['Swing'], [], 'Daily OB held; partials at 1R made it stress-free.'],
      [38, '09:40', 'EURUSD', 'buy', 'London', 'SMC', '4H', '5M', 'Bullish', 'FVG', 'win', 2.5, 2.5, 244, 1, 'Calm', 'Confident', 8, ['SMC'], [], 'Consistent model, consistent result.'],
      [41, '16:05', 'NAS100', 'buy', 'New York', 'Breakout', '1H', '5M', 'Bullish', 'Resistance', 'loss', 2, -1, -97, 1, 'FOMO', 'Anxious', 4, ['FOMO', 'News'], ['Chased Price'], 'Chased an extended move. Let it come back to the level.']
    ];
    rows.reverse().forEach(r => {
      const [d, time, pair, dir, session, setup, htf, ltf, structure, level, result, rrP, rrA, pnl, risk, eb, ea, conf, tags, mistakes, lesson] = r;
      const t = blank();
      Object.assign(t, {
        date: iso(d), time, pair, direction: dir, session, setup,
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
