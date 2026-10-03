"use client";
import { useCallback, useEffect, useState } from "react";
import type { CheckInExtraction, Explanation, PrescriptionExtraction } from "./ai/types";

export type StoredRx = {
  extraction: PrescriptionExtraction;
  explanation: Explanation | null;
  payload: unknown;
  demo: boolean;
  at: string;
};
export type StoredCheckIn = { id: string; at: string; transcript: string; data: CheckInExtraction; demo?: boolean };
export type AdherenceMap = Record<string, "taken" | "missed">; // `${isoDate}|${doseKey}`

export const KEYS = { rx: "medilens.rx", checkIns: "medilens.checkins", adherence: "medilens.adherence" } as const;

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
    window.dispatchEvent(new Event("medilens:update"));
  } catch {}
}

// Browser storage is the source of truth in the prototype; Neon is a best-effort mirror.
export function useLocal<T>(key: string, initial: T): [T, (v: T) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const read = () => {
      setValue(readLocal(key, initial));
      setReady(true);
    };
    read();
    window.addEventListener("medilens:update", read);
    return () => window.removeEventListener("medilens:update", read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback((v: T) => writeLocal(key, v), [key]);
  return [value, set, ready];
}

export const mirrorToDb = (body: unknown) =>
  fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
