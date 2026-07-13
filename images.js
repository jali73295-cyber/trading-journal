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

  TJ.images = { put, get, del, all, forTrade, deleteForTrade, count, clear, url, revoke, blobToDataURL, dataURLToBlob };
})();
