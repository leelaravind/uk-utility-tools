/**
 * Shared currency support — the single source of truth for every tool that
 * displays money.
 *
 * FROZEN CONTRACT: tools import `SupportedCurrency`, `CURRENCY_OPTIONS` and
 * `formatCurrency` from here rather than formatting money themselves.
 *
 * Formatting deliberately does NOT use `Intl.NumberFormat`'s currency style.
 * Under `en-GB` (and several other locales) ICU renders USD as `US$1,234.56`,
 * and the exact prefix/spacing drifts between Node and browser ICU builds.
 * Instead we group the digits with `Intl.NumberFormat`'s decimal style — which
 * is stable — and prepend our own symbol, so every tool shows the same
 * `£1,234.56` / `$1,234.56` / `€1,234.56` shape everywhere, in every runtime.
 *
 * The maths in every calculator is currency-neutral: changing the currency
 * changes presentation only, never a computed number.
 */

export type SupportedCurrency = "GBP" | "USD" | "EUR";

export interface CurrencyMeta {
  code: SupportedCurrency;
  /** Prefix shown before the amount, e.g. "£". */
  symbol: string;
  /** Full name, e.g. "British pound". */
  name: string;
  /** Label for select options, e.g. "GBP (£)". */
  label: string;
}

export const CURRENCIES: Record<SupportedCurrency, CurrencyMeta> = {
  GBP: { code: "GBP", symbol: "£", name: "British pound", label: "GBP (£)" },
  USD: { code: "USD", symbol: "$", name: "US dollar", label: "USD ($)" },
  EUR: { code: "EUR", symbol: "€", name: "Euro", label: "EUR (€)" },
};

/** Display order used by every currency selector on the site. */
export const CURRENCY_CODES: SupportedCurrency[] = ["GBP", "USD", "EUR"];

export const DEFAULT_CURRENCY: SupportedCurrency = "GBP";

/** Ready-made options for `<SelectInput>`. */
export const CURRENCY_OPTIONS: { value: SupportedCurrency; label: string }[] =
  CURRENCY_CODES.map((code) => ({
    value: code,
    label: CURRENCIES[code].label,
  }));

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return (
    typeof value === "string" &&
    (CURRENCY_CODES as string[]).includes(value)
  );
}

/** The symbol alone, e.g. "£". Falls back to GBP for unknown input. */
export function currencySymbol(currency: SupportedCurrency): string {
  return (CURRENCIES[currency] ?? CURRENCIES[DEFAULT_CURRENCY]).symbol;
}

export interface FormatCurrencyOptions {
  /** Fraction digits shown. Defaults to exactly 2. */
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  /** Drop ".00" on whole amounts (used for compact summary lines). */
  trimWholeDecimals?: boolean;
}

/**
 * Format a MAJOR-unit amount, e.g. `formatCurrency(1000, "USD")` → "$1,000.00".
 *
 * Negative amounts render as "-£12.34" (sign outside the symbol), matching how
 * the rest of the site shows deductions.
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = DEFAULT_CURRENCY,
  options: FormatCurrencyOptions = {},
): string {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = Math.max(minimumFractionDigits, 2),
    trimWholeDecimals = false,
  } = options;

  const safe = Number.isFinite(amount) ? amount : 0;
  const whole = trimWholeDecimals && Number.isInteger(safe);

  const digits = new Intl.NumberFormat("en-GB", {
    style: "decimal",
    minimumFractionDigits: whole ? 0 : minimumFractionDigits,
    maximumFractionDigits: whole ? 0 : maximumFractionDigits,
    useGrouping: true,
  }).format(Math.abs(safe));

  const sign = safe < 0 ? "-" : "";
  return `${sign}${currencySymbol(currency)}${digits}`;
}

/** Format an amount held in MINOR units (pence/cents), e.g. 123456 → "£1,234.56". */
export function formatCurrencyFromMinor(
  minorUnits: number,
  currency: SupportedCurrency = DEFAULT_CURRENCY,
  options: FormatCurrencyOptions = {},
): string {
  const safe = Number.isFinite(minorUnits) ? minorUnits : 0;
  return formatCurrency(safe / 100, currency, options);
}

/**
 * Storage key for the visitor's currency preference.
 *
 * Browser-only, no account, no tracking: it stores a three-letter code and
 * nothing else. See `useCurrencyPreference` for the React binding.
 */
export const CURRENCY_STORAGE_KEY = "itisyou-tools:currency";
