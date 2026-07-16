/* =========================================================
   TradeLog Pro — js/importer.js
   Broker statement import (MT4 / MT5).
   Parses the HTML report saved from the desktop terminal
   (and CSV exports), then MERGES trades into the journal —
   nothing is replaced, duplicates are skipped via the broker
   ticket / position id.
   ========================================================= */
(function () {
  'use strict';
  const TJ = window.TJ = window.TJ || {};

  /* ---------- text & number helpers ---------- */
  const clean = s => String(s == null ? '' : s)
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const num = raw => {
    let s = clean(raw).replace(/ /g, '');
    if (!s || s === '-' || s === '—') return null;
    const hasC = s.indexOf(',') !== -1, hasD = s.indexOf('.') !== -1;
    if (hasC && hasD) s = s.replace(/,/g, '');
    else if (hasC) {
      s = (/,\d{1,2}$/.test(s) && s.indexOf(',') === s.lastIndexOf(','))
        ? s.replace(',', '.') : s.replace(/,/g, '');
    }
    const v = parseFloat(s);
    return isNaN(v) ? null : v;
  };

  function splitDT(s) {
    const m = clean(s).match(/(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})[ T]+(\d{2}):(\d{2})(?::\d{2})?/);
    if (!m) return null;
    return { date: m[1] + '-' + m[2] + '-' + m[3], time: m[4] + ':' + m[5] };
  }

  /* ---------- header mapping (works for MT4 + MT5 layouts) ---------- */
  function headerMap(low) {
    const m = { format: 'MT5' };
    const timeIdx = [], priceIdx = [];
    low.forEach((h, i) => {
      if (/^(time|open ?time|opening time)$/.test(h)) timeIdx.push(i);
      else if (/^close ?time$/.test(h)) m.closeTime = i;
      else if (h === 'price' || h === 'open price') priceIdx.push(i);
      else if (h === 'close price') m.close = i;
      else if (/^(position|ticket|order|deal)$/.test(h)) { if (m.ticket == null) m.ticket = i; }
      else if (h === 'symbol' || h === 'item') m.symbol = i;
      else if (h === 'type') m.type = i;
      else if (/^(volume|size|lots?)$/.test(h)) m.lot = i;
      else if (/^s ?\/ ?l$/.test(h) || h === 'sl' || h === 'stop loss') m.sl = i;
      else if (/^t ?\/ ?p$/.test(h) || h === 'tp' || h === 'take profit') m.tp = i;
      else if (h === 'commission') m.commission = i;
      else if (h === 'swap') m.swap = i;
      else if (h === 'profit') m.profit = i;
    });
    m.openTime = timeIdx[0];
    if (timeIdx[1] != null && m.closeTime == null) m.closeTime = timeIdx[1];
    if (m.open == null) m.open = priceIdx[0];
    if (m.close == null && priceIdx[1] != null) m.close = priceIdx[1];
    if (low.includes('item')) m.format = 'MT4';
    return (m.symbol != null && m.type != null && m.openTime != null && m.profit != null) ? m : null;
  }

  function rowFrom(cells, m) {
    const g = i => (i == null ? '' : (cells[i] || ''));
    const type = clean(g(m.type)).toLowerCase();
    if (type !== 'buy' && type !== 'sell') return null;      // skips balance rows, pending orders etc.
    const openTime = g(m.openTime);
    if (!/\d{4}[.\-\/]\d{2}[.\-\/]\d{2}/.test(openTime)) return null;
    const lotRaw = clean(g(m.lot));                          // MT5 shows "0.50 / 0.50" (filled/total)
    const lm = lotRaw.match(/-?[\d.,]+/);
    return {
      format: m.format,
      ticket: clean(g(m.ticket)),
      symbol: clean(g(m.symbol)),
      type: type,
      openTime: openTime,
      closeTime: g(m.closeTime),
      lot: lm ? num(lm[0]) : null,
      open: num(g(m.open)),
      close: m.close != null ? num(g(m.close)) : null,
      sl: num(g(m.sl)),
      tp: num(g(m.tp)),
      commission: num(g(m.commission)),
      swap: num(g(m.swap)),
      profit: num(g(m.profit))
    };
  }

  /* ---------- HTML statement (MT4 "Detailed Report" / MT5 "Report") ---------- */
  function parseHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out = [];
    doc.querySelectorAll('table').forEach(tb => {
      let map = null;
      tb.querySelectorAll('tr').forEach(tr => {
        const cells = Array.prototype.map.call(tr.children, td => clean(td.textContent));
        const low = cells.map(c => c.toLowerCase());
        if ((low.includes('symbol') || low.includes('item')) && low.includes('type') && low.includes('profit')) {
          map = low.includes('direction') ? 'skip' : headerMap(low);  // 'Direction' ⇒ MT5 Deals table (would double-count)
          return;
        }
        if (!map || map === 'skip') return;
        const r = rowFrom(cells, map);
        if (r) out.push(r);
      });
    });
    return out;
  }

  /* ---------- CSV / TSV exports ---------- */
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const delim = [';', '\t', ','].reduce((b, d) =>
      (lines[0].split(d).length > lines[0].split(b).length ? d : b), ',');
    const split = l => l.split(delim).map(clean);
    const m = headerMap(split(lines[0]).map(c => c.toLowerCase()));
    if (!m) return [];
    const out = [];
    for (let i = 1; i < lines.length; i++) {
      const r = rowFrom(split(lines[i]), m);
      if (r) out.push(r);
    }
    return out;
  }

  /* ---------- statement row → TradeLog trade ---------- */
  function toTrade(r) {
    const o = splitDT(r.openTime);
    if (!o) return null;
    const c = r.closeTime ? splitDT(r.closeTime) : null;
    const dir = r.type;
    const entry = r.open, close = r.close;
    const sl = (r.sl && r.sl > 0) ? r.sl : null;
    const tp = (r.tp && r.tp > 0) ? r.tp : null;
    const profit = r.profit == null ? 0 : r.profit;
    let rrA = null, rrP = null;
    if (entry != null && sl != null && Math.abs(entry - sl) > 1e-12) {
      const risk = Math.abs(entry - sl);
      if (close != null) rrA = +(((close - entry) * (dir === 'buy' ? 1 : -1)) / risk).toFixed(2);
      if (tp != null) rrP = +((Math.abs(tp - entry)) / risk).toFixed(2);
    }
    const result = profit > 1e-9 ? 'win' : (profit < -1e-9 ? 'loss' : 'breakeven');
    const bits = [
      'Imported from ' + r.format + ' statement',
      r.ticket ? '#' + r.ticket : '',
      c ? ('closed ' + c.date + ' ' + c.time + (close != null ? ' @ ' + close : '')) : '',
      r.swap ? ('swap ' + r.swap) : ''
    ].filter(Boolean);
    return {
      date: o.date, time: o.time,
      pair: clean(r.symbol).toUpperCase(),
      direction: dir,
      lot: r.lot != null ? r.lot : null,
      entry: entry != null ? entry : null,
      sl: sl, tp: tp,
      result: result,
      rrPlanned: rrP, rrAchieved: rrA,
      pnl: +profit.toFixed(2),
      commission: r.commission ? +Math.abs(r.commission).toFixed(2) : null,
      ticket: r.ticket ? String(r.ticket) : '',
      notes: bits.join(' · ')
    };
  }

  const sig = t => [t.date, t.time, t.pair, t.direction, t.lot, t.pnl].join('|');

  /* ---------- public: parse + merge with confirmation ---------- */
  async function importStatementFile(file) {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.pdf')) {
      TJ.ui.toast('PDF report me trades table nahi hoti — MT4/MT5 desktop se HTML report use karo', 'err');
      return 0;
    }
    let text = '';
    try { text = await file.text(); }
    catch (e) { TJ.ui.toast('File read nahi ho payi', 'err'); return 0; }
    const rows = (name.endsWith('.csv') || name.endsWith('.txt')) ? parseCSV(text) : parseHTML(text);
    const trades = rows.map(toTrade).filter(Boolean);
    if (!trades.length) {
      TJ.ui.toast('Is file me trades nahi mile — MT4/MT5 ka HTML report ya CSV chahiye', 'err');
      return 0;
    }
    const existing = TJ.store.list();
    const tickets = new Set(existing.map(t => String(t.ticket || '')).filter(Boolean));
    const sigs = new Set(existing.map(sig));
    const fresh = trades.filter(t => !(t.ticket && tickets.has(t.ticket)) && !sigs.has(sig(t)));
    const dup = trades.length - fresh.length;
    if (!fresh.length) {
      TJ.ui.toast('Sab ' + trades.length + ' trades pehle se journal me hain — kuch naya nahi', 'info');
      return 0;
    }
    const ok = await TJ.ui.confirm({
      title: 'Import statement?',
      message: '"' + file.name + '" me ' + trades.length + ' trades mile. ' + fresh.length + ' naye import honge' +
        (dup ? ' (' + dup + ' duplicate skip)' : '') + '. Existing data safe rahega — ye merge hai, replace nahi.',
      confirmText: 'Import ' + fresh.length + ' trades'
    });
    if (!ok) return 0;
    fresh.sort((a, b) => (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time));
    for (const f of fresh) {
      TJ.store.save(Object.assign(TJ.store.blank(), f));
    }
    TJ.ui.toast(fresh.length + ' trades imported ✓');
    return fresh.length;
  }

  TJ.importer = { importStatementFile: importStatementFile, parseHTML: parseHTML, parseCSV: parseCSV, toTrade: toTrade };
})();
