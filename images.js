/* ============================================================
   TradeLog Pro — images.js
   IndexedDB layer for screenshots. LocalStorage can't hold
   large binaries, so blobs live here; trades store only the
   image ids in `trade.shots`.
   Record: { id, tradeId, slot, name, size, createdAt, blob }
   ============================================================ */
(function () {
  'use strict';
  const TJ = (window.TJ = window.TJ || {});
  const DB_NAME = 'tj-images';
  const STORE = 'images';
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const s = db.createObjectStore(STORE, { keyPath: 'id' });
          s.createIndex('tradeId', 'tradeId', { unique: false });
        }
      };
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }
  const wrap = req => new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });

  async function put(rec) {
    const db = await open();
    rec.createdAt = rec.createdAt || new Date().toISOString();
    if (rec.blob && rec.blob.size != null) rec.size = rec.blob.size;
    return wrap(db.transaction(STORE, 'readwrite').objectStore(STORE).put(rec));
  }
  async function get(id) {
    const db = await open();
    return wrap(db.transaction(STORE).objectStore(STORE).get(id));
  }
  async function del(id) {
    const db = await open();
    revoke(id);
    return wrap(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
  }
  async function all() {
    const db = await open();
    return wrap(db.transaction(STORE).objectStore(STORE).getAll());
  }
  async function forTrade(tradeId) {
    const db = await open();
    return wrap(db.transaction(STORE).objectStore(STORE).index('tradeId').getAll(tradeId));
  }
  async function deleteForTrade(tradeId) {
    const recs = await forTrade(tradeId).catch(() => []);
    await Promise.all(recs.map(r => del(r.id)));
    return recs.length;
  }
  async function count() {
    const db = await open();
    return wrap(db.transaction(STORE).objectStore(STORE).count());
  }
  async function clear() {
    const db = await open();
    _urls.forEach(u => URL.revokeObjectURL(u));
    _urls.clear();
    return wrap(db.transaction(STORE, 'readwrite').objectStore(STORE).clear());
  }

  /* Object URL cache so repeated renders don't leak */
  const _urls = new Map();
  function revoke(id) {
    if (_urls.has(id)) { URL.revokeObjectURL(_urls.get(id)); _urls.delete(id); }
  }
  async function url(id) {
    if (!id) return null;
    if (_urls.has(id)) return _urls.get(id);
    const rec = await get(id).catch(() => null);
    if (!rec || !rec.blob) return null;
    const u = URL.createObjectURL(rec.blob);
    _urls.set(id, u);
    return u;
  }

  /* ---------- Compression ----------
     Shrinks a photo/screenshot before it goes into IndexedDB so many
     more trades fit on the device. Downscales to <= maxSide px and
     re-encodes as JPEG. Skips tiny files and anything that isn't a
     raster image. Falls back to the original on any failure. */
  const loadImage = url => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
  async function compress(file, opts) {
    opts = opts || {};
    const maxSide = opts.maxSide || 1600;
    const quality = opts.quality || 0.72;
    try {
      if (!file || !/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) return file; // gif/unknown → leave alone
      if (file.size <= 220 * 1024) return file;                                    // already small
      const url = URL.createObjectURL(file);
      let img;
      try { img = await loadImage(url); } finally { URL.revokeObjectURL(url); }
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#0b0f17';                // flatten any transparency to the app bg
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', quality));
      if (blob && blob.size < file.size) {
        blob.name = (file.name || 'screenshot').replace(/\.(png|webp|jpe?g)$/i, '') + '.jpg';
        return blob;
      }
      return file;                              // compression didn't help (rare) → keep original
    } catch (e) {
      return file;                              // never block a save because of compression
    }
  }

  /* ---------- Storage usage ---------- */
  async function estimate() {
    let usage = null, quota = null;
    if (navigator.storage && navigator.storage.estimate) {
      try { const e = await navigator.storage.estimate(); usage = e.usage; quota = e.quota; } catch (_) {}
    }
    let imgBytes = 0, imgCount = 0;
    try {
      const recs = await all();
      imgCount = recs.length;
      recs.forEach(r => { imgBytes += (r.size || (r.blob && r.blob.size) || 0); });
    } catch (_) {}
    return { usage, quota, imgBytes, imgCount };
  }

  /* Backup helpers */
  const blobToDataURL = blob => new Promise((res, rej) => {
    const f = new FileReader();
    f.onload = () => res(f.result);
    f.onerror = () => rej(f.error);
    f.readAsDataURL(blob);
  });
  function dataURLToBlob(dataUrl) {
    const [head, body] = dataUrl.split(',');
    const mime = (head.match(/data:(.*?)(;|$)/) || [])[1] || 'image/png';
    const bin = atob(body);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  TJ.images = { put, get, del, all, forTrade, deleteForTrade, count, clear, url, revoke, compress, estimate, blobToDataURL, dataURLToBlob };
})();
