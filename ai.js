/* =========================================================
   TradeLog Pro — js/ai.js
   AI Review powered by the Claude API (Anthropic).
   Bring-your-own-key: the key lives ONLY in this browser's
   localStorage and every request goes straight from this
   device to api.anthropic.com — no middle server.
   ========================================================= */
(function () {
  'use strict';
  const TJ = window.TJ = window.TJ || {};
  const M = () => TJ.metrics;
  const S = () => TJ.store.settings();

  const API_URL = 'https://api.anthropic.com/v1/messages';
  const MODELS = [
    ['claude-sonnet-4-6', 'Claude Sonnet 4.6 — recommended'],
    ['claude-haiku-4-5-20251001', 'Claude Haiku 4.5 — fastest & cheapest'],
    ['claude-opus-4-8', 'Claude Opus 4.8 — deepest analysis']
  ];

  const cfg = () => Object.assign({ key: '', model: MODELS[0][0] }, S().ai || {});
  const ready = () => !!cfg().key.trim();

  /* ---------- Core API call ---------- */
  async function call({ system, content, maxTokens = 1800 }) {
    const { key, model } = cfg();
    if (!key.trim()) { const e = new Error('NO_KEY'); e.code = 'NO_KEY'; throw e; }
    let res;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': key.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ model: model, max_tokens: maxTokens, system: system, messages: [{ role: 'user', content: content }] })
      });
    } catch (err) {
      const e = new Error('Network error — check your internet connection and try again.');
      e.code = 'NET'; throw e;
    }
    if (!res.ok) {
      let msg = 'API error ' + res.status;
      try { const j = await res.json(); msg = (j.error && j.error.message) || msg; } catch (_) { /* noop */ }
      if (res.status === 401) msg = 'Invalid API key — check it in Settings → AI Review.';
      if (res.status === 429) msg = 'Rate limited or out of credits on your Anthropic account. ' + msg;
      if (res.status === 529) msg = 'Anthropic servers are overloaded — try again in a minute.';
      const e = new Error(msg); e.status = res.status; throw e;
    }
    const data = await res.json();
    return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  }

  /* ---------- Prompt building ---------- */
  function systemPrompt() {
    const s = S();
    return [
      "You are a blunt, experienced trading performance coach reviewing a retail trader's private journal.",
      'Trader vocabulary — levels: ' + (s.levels || []).join(', ') + '. Strategies: ' + (s.strategies || []).join(', ') +
        '. Results: TP = win, SL = loss, RF = risk-free exit (0R), BE = breakeven. R = risk multiple (1R = amount risked per trade).',
      'Ground every observation in the data provided — quote the actual numbers. If the sample is small, say so instead of over-claiming.',
      'Reply in Hinglish (Roman Hindi naturally mixed with English trading terms) — that is how this trader talks. Direct and practical, zero flattery, no generic advice.',
      'Format: short markdown sections with ## headings and - bullets. Keep it tight.'
    ].join('\n');
  }

  function compact(t) {
    const s = S();
    const cl = t.checklist || {};
    const missed = (s.checklist || []).filter(i => !cl[i.id]).map(i => i.label);
    const o = {
      n: t.number, date: t.date, pair: t.pair, dir: t.direction, session: t.session,
      strategy: t.setup, level: t.level, structure: t.structure,
      tf: [t.tfHigher, t.tfMain, t.tfEntry].filter(Boolean).join(' / '),
      result: t.result || 'open',
      rr_planned: t.rrPlanned,
      r: t.result ? +M().rOf(t).toFixed(2) : null,
      pnl: t.pnl, risk_pct: t.riskPct, confidence: t.confidence,
      emotion_before: t.emotionBefore, emotion_after: t.emotionAfter,
      checklist_missed: missed.length ? missed : null,
      mistakes: (t.mistakes && t.mistakes.length) ? t.mistakes : null,
      tags: (t.tags && t.tags.length) ? t.tags : null,
      lesson: (t.lesson || '').slice(0, 250) || null,
      notes: (t.notes || '').slice(0, 250) || null
    };
    Object.keys(o).forEach(k => { if (o[k] == null || o[k] === '') delete o[k]; });
    return o;
  }

  function groupRows(ts, keyFn) {
    return M().groupBy(ts, keyFn).slice(0, 8).map(g => ({
      key: g.key, trades: g.count, tp: g.wins, sl: g.losses,
      r: +g.r.toFixed(2), pnl: +(g.pnl || 0).toFixed(2)
    }));
  }

  function summaryPayload(ts, label) {
    const s = M().summary(ts);
    const stats = {
      period: label, trades: s.total, tp: s.wins, sl: s.losses, rf: s.rf, be: s.be, open: s.open,
      win_rate_pct: +s.winRate.toFixed(1),
      total_r: +s.totalR.toFixed(2),
      total_pnl: +(s.totalPnl || 0).toFixed(2),
      avg_r_per_trade: +s.expectancy.toFixed(2),
      profit_factor: (s.profitFactor === Infinity) ? 'inf' : +(+s.profitFactor).toFixed(2),
      max_win_streak: s.streakW, max_loss_streak: s.streakL
    };
    return [
      'Review my trading journal. Period: ' + label + '. Currency: ' + (S().currency || '$') + '.',
      'OVERALL: ' + JSON.stringify(stats),
      'BY SESSION: ' + JSON.stringify(groupRows(ts, t => t.session || '—')),
      'BY STRATEGY: ' + JSON.stringify(groupRows(ts, t => t.setup || '—')),
      'BY LEVEL: ' + JSON.stringify(groupRows(ts, t => t.level || '—')),
      'TRADES (newest first, max 80): ' + JSON.stringify(ts.slice(0, 80).map(compact)),
      '',
      'Give me exactly these sections:',
      '## Verdict — 2-3 line honest overall read',
      '## Kya kaam kar raha hai — best level/strategy/session combos, with numbers',
      '## Paisa kahan leak ho raha hai — patterns across mistakes, emotions, sessions, levels; quantify in R',
      '## Agle hafte ke 3 rules — specific, measurable, is data se nikle hue',
      '## Ek habit pehle fix karo — the single highest-impact change'
    ].join('\n');
  }

  function tradePayload(t) {
    const full = compact(t);
    full.entry = t.entry; full.sl = t.sl; full.tp = t.tp; full.lot = t.lot;
    full.rr_achieved = t.rrAchieved; full.commission = t.commission; full.spread = t.spread;
    Object.keys(full).forEach(k => { if (full[k] == null || full[k] === '') delete full[k]; });
    return [
      'Review this single trade from my journal in depth.',
      'TRADE: ' + JSON.stringify(full),
      (t.notes ? 'FULL NOTES: ' + String(t.notes).slice(0, 800) : ''),
      '',
      'If chart screenshot(s) are attached, analyse them against the claimed level/strategy.',
      'Give me exactly these sections:',
      '## Setup quality — kya ye sach me ' + (t.level || 'claimed level') + ' + ' + (t.setup || 'strategy') + ' wala valid setup tha?' + (Object.keys(t.shots || {}).length ? ' Chart se verify karo.' : ''),
      '## Entry / SL / TP placement — kya sahi tha, kya better ho sakta tha',
      '## Risk & psychology — risk %, emotions, checklist misses',
      '## 2 concrete improvements agli baar ke liye',
      '## Grade — /10 with a one-line reason'
    ].filter(Boolean).join('\n');
  }

  /* ---------- Screenshot → image blocks (downscaled for cost) ---------- */
  function loadImg(url) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  }

  async function toImageBlock(blob, maxSide = 1400) {
    const okType = /^image\/(jpeg|png|webp|gif)$/.test(blob.type);
    if (okType && blob.size < 800 * 1024) {
      const d = await TJ.images.blobToDataURL(blob);
      return { type: 'image', source: { type: 'base64', media_type: blob.type, data: d.split(',')[1] } };
    }
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadImg(url);
      const sc = Math.min(1, maxSide / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * sc));
      cv.height = Math.max(1, Math.round(img.height * sc));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const d = cv.toDataURL('image/jpeg', 0.85);
      return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: d.split(',')[1] } };
    } finally { URL.revokeObjectURL(url); }
  }

  async function shotBlocks(t, max = 2) {
    const ids = Object.values(t.shots || {}).filter(Boolean).slice(0, max);
    const blocks = [];
    for (const id of ids) {
      try {
        const rec = await TJ.images.get(id);
        if (rec && rec.blob) blocks.push(await toImageBlock(rec.blob));
      } catch (e) { /* skip unreadable image */ }
    }
    return blocks;
  }

  /* ---------- Tiny markdown renderer for the reply ---------- */
  function mdLite(text) {
    let h = TJ.esc(text || '');
    h = h.replace(/^#{1,4}\s*(.+)$/gm, '<h4>$1</h4>');
    h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/^\s*[-*•]\s+(.+)$/gm, '<li>$1</li>');
    h = h.replace(/(?:<li>.*<\/li>\n?)+/g, m => '<ul>' + m.replace(/\n/g, '') + '</ul>');
    h = h.split(/\n{2,}/).map(p => {
      const s = p.trim();
      if (!s) return '';
      return /^<(h4|ul)/.test(s) ? s : '<p>' + s.replace(/\n/g, '<br>') + '</p>';
    }).join('');
    return '<div class="ai-out">' + h + '</div>';
  }

  /* ---------- Modal flows ---------- */
  function needKeyModal() {
    TJ.ui.modal({
      title: 'AI Review setup',
      body: '<p>Add your Anthropic API key first — it stays only on this device and is sent directly to Anthropic.</p>' +
            '<p class="hint">Get a key at <strong>console.anthropic.com</strong> → API keys. Each review costs a few cents.</p>',
      actions: [
        { label: 'Open Settings', class: 'btn-primary', onClick: () => { location.href = 'settings.html#hAI'; return true; } },
        { label: 'Close' }
      ]
    });
  }

  function loadingBody(msg) {
    return '<div class="ai-load"><div class="ai-spin"></div><div>' + TJ.esc(msg) +
           '<br><span class="hint">Claude is analysing — usually 5–20 seconds…</span></div></div>';
  }

  function runFlow(title, work) {
    let raw = '';
    const m = TJ.ui.modal({
      title: title, wide: true,
      body: loadingBody('Journal data bheja ja raha hai…'),
      actions: [
        { label: 'Copy', icon: 'copy', onClick: () => {
            if (raw && navigator.clipboard) {
              navigator.clipboard.writeText(raw).then(() => TJ.ui.toast('Copied'));
            }
            return true;
          } },
        { label: 'Close' }
      ]
    });
    const bodyEl = m.el.querySelector('.modal-b');
    work().then(text => {
      raw = text;
      bodyEl.innerHTML = mdLite(text);
    }).catch(err => {
      if (err && err.code === 'NO_KEY') { m.close(); needKeyModal(); return; }
      bodyEl.innerHTML = '<p><strong>Review nahi ban paya.</strong></p>' +
        '<p class="hint">' + TJ.esc((err && err.message) || String(err)) + '</p>';
    });
  }

  /* ---------- Public: full performance review ---------- */
  function openSummary() {
    if (!ready()) return needKeyModal();
    const all = TJ.store.list();
    if (all.filter(t => t.result).length < 3) {
      return TJ.ui.toast('Pehle kam se kam 3 closed trades log karo', 'err');
    }
    const cut = days => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    const m = TJ.ui.modal({
      title: 'AI Performance Review',
      body: '<p>Kaunsa period review karna hai?</p>' +
        '<div class="ai-chips">' +
          '<button class="btn" data-p="7">Last 7 days</button>' +
          '<button class="btn" data-p="30">Last 30 days</button>' +
          '<button class="btn btn-primary" data-p="all">All time</button>' +
        '</div>' +
        '<p class="hint">1 API call · data goes straight from this device to Anthropic · a few cents per review</p>'
    });
    m.el.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.p;
      m.close();
      const ts = p === 'all' ? all : all.filter(t => (t.date || '') >= cut(+p));
      if (!ts.some(t => t.result)) return TJ.ui.toast('Is period me koi closed trade nahi hai', 'err');
      const label = (p === 'all' ? 'All time' : 'Last ' + p + ' days') + ' (' + ts.length + ' trades)';
      runFlow('AI Review — ' + label, () =>
        call({ system: systemPrompt(), content: [{ type: 'text', text: summaryPayload(ts, label) }], maxTokens: 2000 }));
    }));
  }

  /* ---------- Public: single-trade review (with screenshots) ---------- */
  function openTradeReview(t) {
    if (!ready()) return needKeyModal();
    runFlow('AI Review — Trade #' + t.number + (t.pair ? ' · ' + t.pair : ''), async () => {
      const imgs = await shotBlocks(t, 2);
      const content = imgs.concat([{ type: 'text', text: tradePayload(t) }]);
      return call({ system: systemPrompt(), content: content, maxTokens: 1600 });
    });
  }

  /* ---------- Public: connection test ---------- */
  function ping() {
    return call({ content: [{ type: 'text', text: 'Reply with exactly: OK' }], maxTokens: 8 });
  }

  TJ.ai = { MODELS: MODELS, ready: ready, call: call, ping: ping, openSummary: openSummary, openTradeReview: openTradeReview };
})();
