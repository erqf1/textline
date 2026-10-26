// Kleiner Schlüssel-Wert-Speicher auf IndexedDB: "files" (Dateien im Browser, Schlüssel = Pfad "/name.txt")
// und "kv" (Einstellungen, Sitzung). Bleibt auch auf dem Handy erhalten, solange man die Website-Daten nicht löscht.
let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('textline', 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('files');
        req.result.createObjectStore('kv');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = t.onabort = () => reject(t.error);
  });
}

export const get = (store, key) => run(store, 'readonly', (s) => s.get(key));
export const put = (store, key, value) => run(store, 'readwrite', (s) => s.put(value, key));
export const del = (store, key) => run(store, 'readwrite', (s) => s.delete(key));
export const keys = (store) => run(store, 'readonly', (s) => s.getAllKeys());
export const values = (store) => run(store, 'readonly', (s) => s.getAll());
