"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

function parseBest(raw: string): Record<string, number> {
  try {
    const value: unknown = raw ? JSON.parse(raw) : {};
    return value && typeof value === "object" ? (value as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/**
 * Persists a map of best scores in localStorage using useSyncExternalStore
 * so SSR and hydration never diverge.
 */
export function useBestScores(storageKey: string, eventName: string) {
  const subscribe = useCallback(
    (callback: () => void) => {
      window.addEventListener("storage", callback);
      window.addEventListener(eventName, callback);
      return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(eventName, callback);
      };
    },
    [eventName],
  );

  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey) ?? "";
    } catch {
      return "";
    }
  }, [storageKey]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const scores = useMemo(() => parseBest(raw), [raw]);

  const saveScore = useCallback(
    (key: string, score: number) => {
      try {
        const current = parseBest(window.localStorage.getItem(storageKey) ?? "");
        if (score <= (current[key] ?? 0)) return;
        const next = { ...current, [key]: score };
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        window.dispatchEvent(new Event(eventName));
      } catch {
        // Ignore storage quota or private-mode errors
      }
    },
    [storageKey, eventName],
  );

  return { scores, saveScore };
}
