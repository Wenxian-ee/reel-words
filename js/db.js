// Minimal IndexedDB wrapper — all data stays in the browser
const DB_NAME = 'reel-words';
const VERSION = 1;
const STORE = 'entries';

let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function run(mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export const db = {
  all: () => run('readonly', s => s.getAll()),
  put: entry => run('readwrite', s => s.put(entry)),
  putMany: list => run('readwrite', s => { list.forEach(e => s.put(e)); }),
  remove: id => run('readwrite', s => s.delete(id)),
  removeMany: ids => run('readwrite', s => { ids.forEach(id => s.delete(id)); }),
  clear: () => run('readwrite', s => s.clear()),
};
