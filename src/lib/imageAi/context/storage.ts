/**
 * Local model storage: measuring it and clearing it.
 *
 * The only thing this tool persists is downloaded engine assets — the OCR
 * WebAssembly and its language data. The image, the recognised text and the
 * generated context are never written to storage; when the tab closes they are
 * gone.
 *
 * `navigator.storage.estimate()` reports the whole origin's usage, not this
 * feature's share, so the number is presented as "storage used by this site"
 * rather than being dressed up as an exact model size. Being vague and true
 * beats being precise and wrong.
 */

import { OCR_CACHE_NAME } from "./ocr/assets";

/** Storage names this tool is allowed to delete. */
const CLEARABLE_PATTERNS: readonly RegExp[] = [
  new RegExp(`^${OCR_CACHE_NAME}$`, "i"),
  /tesseract/i,
  /traineddata/i,
];

/**
 * True when a storage key belongs to this tool's model cache. Conservative on
 * purpose: "Clear local models" must never delete another tool's data.
 */
export function isClearableStorageName(name: string): boolean {
  return CLEARABLE_PATTERNS.some((pattern) => pattern.test(name));
}

/** Human-readable size using 1024-byte units. */
export function formatStorageSize(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) {
    return "None yet";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

export interface StorageUsage {
  /** Bytes reported for this origin, or undefined when unavailable. */
  bytes?: number;
  /** True when the browser refused to report a number. */
  unknown: boolean;
}

/** Ask the browser how much this origin is using. Never throws. */
export async function readStorageUsage(): Promise<StorageUsage> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (estimate && typeof estimate.usage === "number") {
      return { bytes: estimate.usage, unknown: false };
    }
  } catch {
    // Some browsers refuse in private mode; that is not an error worth showing.
  }
  return { unknown: true };
}

interface DatabaseListing {
  databases?: () => Promise<Array<{ name?: string }>>;
}

/**
 * Delete cached engine assets. Returns the number of stores removed so the UI
 * can confirm something actually happened.
 */
export async function clearLocalModels(): Promise<number> {
  let removed = 0;

  try {
    const listing = indexedDB as unknown as DatabaseListing;
    const databases = (await listing.databases?.()) ?? [];
    for (const database of databases) {
      const name = database.name;
      if (!name || !isClearableStorageName(name)) continue;
      await new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      });
      removed += 1;
    }
  } catch {
    // Enumeration is unsupported in some browsers; fall through to caches.
  }

  try {
    if (typeof caches !== "undefined") {
      for (const key of await caches.keys()) {
        if (!isClearableStorageName(key)) continue;
        if (await caches.delete(key)) removed += 1;
      }
    }
  } catch {
    // Cache Storage is unavailable in some contexts; nothing else to do.
  }

  return removed;
}
