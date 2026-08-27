"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  CURRENCY_STORAGE_KEY,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
  type SupportedCurrency,
} from "./currency";

/**
 * The visitor's currency choice, shared across every tool on the page and
 * remembered between visits.
 *
 * Browser storage only: one three-letter code in localStorage. No account, no
 * cookie, no network call, nothing that identifies anyone. If storage is
 * unavailable (private mode, storage disabled) it degrades to an in-memory
 * preference for the session.
 *
 * Implemented as an external store rather than `useState` + `useEffect` for
 * two reasons: the site is statically exported, so the server snapshot must be
 * the default currency or hydration would mismatch; and every mounted currency
 * control needs to update together when any one of them changes.
 */

let cached: SupportedCurrency | null = null;
const listeners = new Set<() => void>();

function readStorage(): SupportedCurrency {
  try {
    const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    return isSupportedCurrency(stored) ? stored : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

/** Must return a stable value between renders, so the read is memoised. */
function getSnapshot(): SupportedCurrency {
  if (cached === null) cached = readStorage();
  return cached;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Keep tabs in step when the visitor changes currency in another one.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== CURRENCY_STORAGE_KEY) return;
    cached = readStorage();
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function setCurrencyPreference(next: SupportedCurrency): void {
  cached = next;
  try {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, next);
  } catch {
    // Storage blocked — the choice still applies for this session.
  }
  emit();
}

export function useCurrencyPreference(
  initial: SupportedCurrency = DEFAULT_CURRENCY,
): [SupportedCurrency, (next: SupportedCurrency) => void] {
  const getServerSnapshot = useCallback(() => initial, [initial]);
  const currency = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return [currency, setCurrencyPreference];
}
