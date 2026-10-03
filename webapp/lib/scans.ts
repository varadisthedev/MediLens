"use client";
import type { Explanation, PrescriptionExtraction } from "./ai/types";

// Saved prescription photos live in this browser's IndexedDB only. They are never uploaded.
export type Scan = {
  id: string;
  scope: string; // "guest" or account id
  at: string;
  image: string; // data URL of the downscaled JPEG
  extraction: PrescriptionExtraction;
  explanation: Explanation | null;
  payload: unknown;
  demo: boolean;
};

const STORE = "scans";

const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("medilens", 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const putScan = (s: Scan) => run("readwrite", (st) => st.put(s)).catch(() => undefined);
export const getScan = (id: string) => run<Scan | undefined>("readonly", (st) => st.get(id)).catch(() => undefined);
export const deleteScan = (id: string) => run("readwrite", (st) => st.delete(id)).catch(() => undefined);
export const listScans = (scope: string) =>
  run<Scan[]>("readonly", (st) => st.getAll())
    .then((all) => all.filter((s) => s.scope === scope).sort((a, b) => b.at.localeCompare(a.at)))
    .catch(() => [] as Scan[]);
