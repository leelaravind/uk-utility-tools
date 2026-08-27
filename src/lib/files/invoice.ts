/**
 * Pure invoice logic: types, parsing, validation and money maths.
 *
 * All money maths runs in integer minor units (pence/cents) so rounding
 * is explicit and deterministic. Nothing here touches the DOM, storage
 * or the clock — dates come in as strings from the form.
 *
 * Money is rendered through the shared currency helpers in `@/lib/currency`
 * so an invoice shows the same symbols as the rest of the site.
 */

import {
  formatCurrency,
  formatCurrencyFromMinor,
  type SupportedCurrency,
} from "@/lib/currency";

/**
 * An invoice is priced in one of the site's supported currencies. This is an
 * alias rather than its own union so invoices can never drift away from the
 * shared currency list — and so invoice money is formatted by exactly the
 * same code as every calculator.
 */
export type InvoiceCurrency = SupportedCurrency;

export interface InvoiceParty {
  name: string;
  address?: string;
}

export interface InvoiceItem {
  description: string;
  /** Quantity — may be fractional (e.g. 1.5 hours). */
  quantity: number;
  /** Unit price in MAJOR units (pounds/euros/dollars), e.g. 45.5. */
  unitPrice: number;
}

export interface InvoiceData {
  from: InvoiceParty;
  to: InvoiceParty;
  invoiceNumber: string;
  /** YYYY-MM-DD */
  issueDate: string;
  /** YYYY-MM-DD */
  dueDate: string;
  currency: InvoiceCurrency;
  items: InvoiceItem[];
  /** Percentage, e.g. 20 for UK standard-rate VAT. Omit for no tax line. */
  taxRate?: number;
  notes?: string;
}

export interface InvoiceTotals {
  /** Per-line totals in minor units, same order as the items given. */
  lineTotals: number[];
  /** Sum of line totals, minor units. */
  subtotal: number;
  /** Tax on the subtotal, minor units (0 when no rate given). */
  taxAmount: number;
  /** subtotal + taxAmount, minor units. */
  total: number;
}

/**
 * Round to the nearest integer, halves up, with a guard against binary
 * floating-point artefacts (e.g. 100.49999999999999 for 1.005 × 100).
 */
function roundHalfUp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Number(value.toFixed(4)));
}

/**
 * Compute invoice totals in integer minor units.
 *
 * Per line: round(quantity × unitPrice) to the nearest penny/cent.
 * Tax: round(subtotal × rate ÷ 100), applied to the rounded subtotal.
 */
export function computeInvoiceTotals(
  items: InvoiceItem[],
  taxRate?: number,
): InvoiceTotals {
  const lineTotals = items.map((item) =>
    roundHalfUp(item.quantity * item.unitPrice * 100),
  );
  const subtotal = lineTotals.reduce((sum, t) => sum + t, 0);
  const rate = taxRate !== undefined && Number.isFinite(taxRate) ? taxRate : 0;
  const taxAmount = rate === 0 ? 0 : roundHalfUp((subtotal * rate) / 100);
  return { lineTotals, subtotal, taxAmount, total: subtotal + taxAmount };
}

/**
 * Format an amount in minor units, e.g. 123456 → "£1,234.56".
 *
 * Delegates to the shared formatter. This matters on a document a client
 * actually reads: `Intl`'s currency style under `en-GB` renders USD as
 * "US$1,234.56", which is wrong on an invoice — "$1,234.56" is what a
 * dollar-priced invoice should say.
 */
export function formatMoney(
  minorUnits: number,
  currency: InvoiceCurrency,
): string {
  return formatCurrencyFromMinor(minorUnits, currency);
}

/**
 * Format a unit price given in MAJOR units, keeping sub-penny precision
 * when present (e.g. 0.333 → "£0.333", 10.5 → "£10.50").
 */
export function formatUnitPrice(
  unitPrice: number,
  currency: InvoiceCurrency,
): string {
  return formatCurrency(unitPrice, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

/**
 * Parse a human-typed decimal ("1,234.5", " 12 ") to a number.
 * Returns null when the input isn't a plain decimal number.
 */
export function parseDecimal(input: string): number | null {
  const cleaned = input.trim().replace(/,/g, "");
  if (cleaned === "" || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** True for a real calendar date in YYYY-MM-DD form (leap years handled). */
export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const max = month === 2 && isLeap ? 29 : DAYS_IN_MONTH[month - 1];
  return day <= max;
}

/* ------------------------------------------------------------------ */
/* Draft (string) form model — mirrors what the user types             */
/* ------------------------------------------------------------------ */

export interface InvoiceDraftItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface InvoiceDraft {
  fromName: string;
  fromAddress: string;
  toName: string;
  toAddress: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: InvoiceCurrency;
  items: InvoiceDraftItem[];
  /** Percent as typed; empty string = no VAT line. */
  taxRate: string;
  notes: string;
}

export interface InvoiceItemErrors {
  description?: string;
  quantity?: string;
  unitPrice?: string;
}

export interface InvoiceErrors {
  fromName?: string;
  toName?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  taxRate?: string;
  /** List-level problem, e.g. no usable line items at all. */
  items?: string;
  /** Per-row errors, same order as draft.items. */
  itemErrors: InvoiceItemErrors[];
}

export interface InvoiceValidation {
  ok: boolean;
  errors: InvoiceErrors;
}

/** A row the user hasn't touched at all — ignored rather than flagged. */
export function isEmptyDraftItem(item: InvoiceDraftItem): boolean {
  return (
    item.description.trim() === "" &&
    item.quantity.trim() === "" &&
    item.unitPrice.trim() === ""
  );
}

/**
 * Validate a draft invoice with friendly, human-readable messages.
 * Rows that are completely empty are ignored (not errors) as long as at
 * least one usable row exists.
 */
export function validateInvoice(draft: InvoiceDraft): InvoiceValidation {
  const errors: InvoiceErrors = { itemErrors: draft.items.map(() => ({})) };

  if (draft.fromName.trim() === "") {
    errors.fromName = "Add your name or business name.";
  }
  if (draft.toName.trim() === "") {
    errors.toName = "Add the client's name.";
  }
  if (draft.invoiceNumber.trim() === "") {
    errors.invoiceNumber = "Give the invoice a number or reference.";
  }

  if (!isValidIsoDate(draft.issueDate)) {
    errors.issueDate = "Enter a valid issue date.";
  }
  if (!isValidIsoDate(draft.dueDate)) {
    errors.dueDate = "Enter a valid due date.";
  } else if (
    isValidIsoDate(draft.issueDate) &&
    draft.dueDate < draft.issueDate
  ) {
    errors.dueDate = "The due date can't be before the issue date.";
  }

  if (draft.taxRate.trim() !== "") {
    const rate = parseDecimal(draft.taxRate);
    if (rate === null || rate < 0 || rate > 100) {
      errors.taxRate = "VAT rate must be a number between 0 and 100.";
    }
  }

  let usableRows = 0;
  draft.items.forEach((item, index) => {
    if (isEmptyDraftItem(item)) return;
    usableRows += 1;
    const rowErrors: InvoiceItemErrors = {};
    if (item.description.trim() === "") {
      rowErrors.description = "Describe this item.";
    }
    const quantity = parseDecimal(item.quantity);
    if (quantity === null || quantity <= 0) {
      rowErrors.quantity = "Quantity must be a number above zero.";
    }
    const unitPrice = parseDecimal(item.unitPrice);
    if (unitPrice === null || unitPrice < 0) {
      rowErrors.unitPrice = "Price must be a number of 0 or more.";
    }
    errors.itemErrors[index] = rowErrors;
  });

  if (usableRows === 0) {
    errors.items = "Add at least one line item.";
  }

  const ok =
    !errors.fromName &&
    !errors.toName &&
    !errors.invoiceNumber &&
    !errors.issueDate &&
    !errors.dueDate &&
    !errors.taxRate &&
    !errors.items &&
    errors.itemErrors.every(
      (e) => !e.description && !e.quantity && !e.unitPrice,
    );

  return { ok, errors };
}

/**
 * Convert a VALID draft (see validateInvoice) into a typed InvoiceData.
 * Completely empty rows are dropped; unparsable numbers fall back to 0
 * so this never throws even on an invalid draft.
 */
export function draftToInvoice(draft: InvoiceDraft): InvoiceData {
  const items: InvoiceItem[] = draft.items
    .filter((item) => !isEmptyDraftItem(item))
    .map((item) => ({
      description: item.description.trim(),
      quantity: parseDecimal(item.quantity) ?? 0,
      unitPrice: parseDecimal(item.unitPrice) ?? 0,
    }));

  const taxRate =
    draft.taxRate.trim() === ""
      ? undefined
      : (parseDecimal(draft.taxRate) ?? undefined);

  return {
    from: {
      name: draft.fromName.trim(),
      address: draft.fromAddress.trim() || undefined,
    },
    to: {
      name: draft.toName.trim(),
      address: draft.toAddress.trim() || undefined,
    },
    invoiceNumber: draft.invoiceNumber.trim(),
    issueDate: draft.issueDate,
    dueDate: draft.dueDate,
    currency: draft.currency,
    items,
    taxRate,
    notes: draft.notes.trim() || undefined,
  };
}

/** "2026-08-16" → "16 August 2026" (falls back to the raw string). */
export function formatInvoiceDate(isoDate: string): string {
  if (!isValidIsoDate(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split("-").map(Number);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${day} ${monthNames[month - 1]} ${year}`;
}
