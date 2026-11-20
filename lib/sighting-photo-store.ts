// lib/sighting-photo-store.ts
//
// WHAT: Hands the scanner's photo to the Report a Sighting form.
//
// WHY INDEXEDDB: the photo used to travel as base64 text in localStorage,
//   which browsers cap at about 5 MB — a large phone photo could be
//   silently lost. IndexedDB stores the original File as it is.
//
// NEVER THROWS: if storage is unavailable (private browsing, blocked
//   site data), saving does nothing and loading returns null, so the
//   reporter can still choose the photo again on the form.

const DB_NAME = "citia-is";
const STORE = "handoff";
const KEY = "sighting-photo";

// The key the old base64 hand-off used; cleared so it cannot linger.
const LEGACY_LOCAL_STORAGE_KEY = "citia_sighting_img";

interface StoredPhoto {
  blob: Blob;
  name: string;
  type: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

function clearLegacyCopy(): void {
  try {
    localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
  } catch {
    // Storage blocked: nothing to clear.
  }
}

export async function saveSightingPhoto(file: File): Promise<void> {
  clearLegacyCopy();
  try {
    const value: StoredPhoto = { blob: file, name: file.name, type: file.type };
    await withStore("readwrite", (store) => store.put(value, KEY));
  } catch {
    // The form will simply ask for the photo again.
  }
}

export async function loadSightingPhoto(): Promise<File | null> {
  clearLegacyCopy();
  try {
    const value = await withStore<StoredPhoto | undefined>("readonly", (store) => store.get(KEY));
    if (!value || !(value.blob instanceof Blob)) return null;
    return new File([value.blob], value.name || "sighting-photo", { type: value.type || value.blob.type });
  } catch {
    return null;
  }
}

export async function clearSightingPhoto(): Promise<void> {
  clearLegacyCopy();
  try {
    await withStore("readwrite", (store) => store.delete(KEY));
  } catch {
    // Nothing stored, or storage blocked.
  }
}
