"use client";

import { useState } from "react";

import {
  Button,
  CurrencyInput,
  DateInput,
  NumberInput,
  ResultCard,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/ui";
import {
  computeInvoiceTotals,
  draftToInvoice,
  formatMoney,
  validateInvoice,
  type InvoiceCurrency,
  type InvoiceDraft,
  type InvoiceDraftItem,
} from "@/lib/files/invoice";
import { InvoicePreview } from "./InvoicePreview";

/* Local-timezone YYYY-MM-DD (dates only enter lib code as strings). */
function localIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function plusDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

interface Row extends InvoiceDraftItem {
  id: number;
}

let nextRowId = 1;

function emptyRow(): Row {
  return { id: nextRowId++, description: "", quantity: "", unitPrice: "" };
}

interface MetaState {
  fromName: string;
  fromAddress: string;
  toName: string;
  toAddress: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: InvoiceCurrency;
  taxRate: string;
  notes: string;
}

const CURRENCY_OPTIONS = [
  { value: "GBP", label: "British pound (£)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "US dollar ($)" },
];

const PRINT_CSS = `
@page { size: A4; margin: 12mm; }
@media print {
  body * { visibility: hidden; }
  .invoice-print, .invoice-print * { visibility: visible; }
  .invoice-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    overflow: visible !important;
  }
}
`;

export function InvoiceIsland() {
  const [meta, setMeta] = useState<MetaState>(() => {
    const now = new Date();
    return {
      fromName: "",
      fromAddress: "",
      toName: "",
      toAddress: "",
      invoiceNumber: "INV-001",
      issueDate: localIso(now),
      dueDate: localIso(plusDays(now, 30)),
      currency: "GBP",
      taxRate: "",
      notes: "",
    };
  });
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
  const [showErrors, setShowErrors] = useState(false);

  const draft: InvoiceDraft = {
    ...meta,
    items: rows.map((row) => ({
      description: row.description,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
    })),
  };

  const validation = validateInvoice(draft);
  const errors = validation.errors;
  /** Emptiness errors only appear after a print attempt. */
  const gated = (message?: string) => (showErrors ? message : undefined);

  const invoice = draftToInvoice(draft);
  const totals = computeInvoiceTotals(invoice.items, invoice.taxRate);

  function patch(partial: Partial<MetaState>) {
    setMeta((prev) => ({ ...prev, ...partial }));
  }

  function patchRow(id: number, partial: Partial<InvoiceDraftItem>) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...partial } : row)),
    );
  }

  function removeRow(id: number) {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length > 0 ? next : [emptyRow()];
    });
  }

  function handlePrint() {
    if (validation.ok) {
      window.print();
    } else {
      setShowErrors(true);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <style>{PRINT_CSS}</style>

      <p className="rounded-card border border-accent-soft-border bg-accent-soft p-4 text-sm leading-relaxed text-accent-emphasis">
        <strong className="font-semibold">Everything stays in your browser</strong>{" "}
        — no account, no upload, nothing saved on a server. Print or save as PDF
        when you&apos;re done.
      </p>

      <div className="flex flex-col gap-6 rounded-card border border-border bg-surface-subtle p-4 sm:p-6">
        {/* Parties */}
        <div className="grid gap-6 sm:grid-cols-2">
          <section aria-labelledby="invoice-from-heading" className="flex flex-col gap-4">
            <h2 id="invoice-from-heading" className="text-base font-semibold text-foreground">
              Your details
            </h2>
            <TextInput
              id="from-name"
              label="Your name / business name"
              value={meta.fromName}
              onChange={(v) => patch({ fromName: v })}
              placeholder="e.g. Jane Smith Design"
              error={gated(errors.fromName)}
            />
            <TextAreaInput
              id="from-address"
              label="Your address (optional)"
              value={meta.fromAddress}
              onChange={(v) => patch({ fromAddress: v })}
              rows={3}
              hint="Include your VAT number here if you're VAT-registered."
            />
          </section>

          <section aria-labelledby="invoice-to-heading" className="flex flex-col gap-4">
            <h2 id="invoice-to-heading" className="text-base font-semibold text-foreground">
              Client details
            </h2>
            <TextInput
              id="to-name"
              label="Client name / business"
              value={meta.toName}
              onChange={(v) => patch({ toName: v })}
              placeholder="e.g. Acme Ltd"
              error={gated(errors.toName)}
            />
            <TextAreaInput
              id="to-address"
              label="Client address (optional)"
              value={meta.toAddress}
              onChange={(v) => patch({ toAddress: v })}
              rows={3}
            />
          </section>
        </div>

        {/* Invoice meta */}
        <section aria-labelledby="invoice-meta-heading" className="flex flex-col gap-4">
          <h2 id="invoice-meta-heading" className="text-base font-semibold text-foreground">
            Invoice details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              id="invoice-number"
              label="Invoice number"
              value={meta.invoiceNumber}
              onChange={(v) => patch({ invoiceNumber: v })}
              placeholder="INV-001"
              hint="Use a sequence that never repeats, e.g. INV-001, INV-002…"
              error={gated(errors.invoiceNumber)}
            />
            <SelectInput
              id="invoice-currency"
              label="Currency"
              value={meta.currency}
              onChange={(v) => patch({ currency: v as InvoiceCurrency })}
              options={CURRENCY_OPTIONS}
            />
            <DateInput
              id="issue-date"
              label="Issue date"
              value={meta.issueDate}
              onChange={(v) => patch({ issueDate: v })}
              error={errors.issueDate}
            />
            <DateInput
              id="due-date"
              label="Due date"
              value={meta.dueDate}
              onChange={(v) => patch({ dueDate: v })}
              error={errors.dueDate}
            />
          </div>
          <NumberInput
            id="vat-rate"
            label="VAT rate (optional)"
            value={meta.taxRate}
            onChange={(v) => patch({ taxRate: v })}
            suffix="%"
            placeholder="e.g. 20"
            inputMode="decimal"
            hint="Leave blank if you don't charge VAT. The UK standard rate is 20%."
            error={errors.taxRate}
          />
        </section>

        {/* Line items */}
        <section aria-labelledby="invoice-items-heading" className="flex flex-col gap-4">
          <h2 id="invoice-items-heading" className="text-base font-semibold text-foreground">
            Line items
          </h2>
          {rows.map((row, index) => {
            const rowErrors = errors.itemErrors[index] ?? {};
            return (
              <div
                key={row.id}
                className="grid gap-3 rounded-field border border-border bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_7rem_9rem_auto] sm:items-start"
              >
                <TextInput
                  id={`item-${row.id}-description`}
                  label="Description"
                  value={row.description}
                  onChange={(v) => patchRow(row.id, { description: v })}
                  placeholder="e.g. Website design — homepage"
                  error={gated(rowErrors.description)}
                />
                <NumberInput
                  id={`item-${row.id}-quantity`}
                  label="Qty"
                  value={row.quantity}
                  onChange={(v) => patchRow(row.id, { quantity: v })}
                  placeholder="1"
                  error={rowErrors.quantity}
                />
                <CurrencyInput
                  id={`item-${row.id}-price`}
                  label="Unit price"
                  value={row.unitPrice}
                  onChange={(v) => patchRow(row.id, { unitPrice: v })}
                  currency={meta.currency}
                  placeholder="0.00"
                  error={rowErrors.unitPrice}
                />
                <div className="sm:pt-7">
                  <button
                    type="button"
                    aria-label={`Remove line item ${index + 1}`}
                    title={`Remove line item ${index + 1}`}
                    onClick={() => removeRow(row.id)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-field border border-border-strong bg-surface text-danger transition-colors hover:bg-surface-subtle"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>
              </div>
            );
          })}
          {gated(errors.items) ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {errors.items}
            </p>
          ) : null}
          <div>
            <Button
              variant="secondary"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
            >
              + Add line item
            </Button>
          </div>
        </section>

        {/* Notes */}
        <section aria-labelledby="invoice-notes-heading" className="flex flex-col gap-4">
          <h2 id="invoice-notes-heading" className="text-base font-semibold text-foreground">
            Notes (optional)
          </h2>
          <TextAreaInput
            id="invoice-notes"
            label="Payment details and terms"
            value={meta.notes}
            onChange={(v) => patch({ notes: v })}
            rows={3}
            hint="e.g. bank name, sort code, account number, and payment terms such as 'Payment due within 30 days'."
          />
        </section>
      </div>

      {/* Totals */}
      <ResultCard
        live
        title="Invoice total"
        primary={{
          label: "Total due",
          value: formatMoney(totals.total, meta.currency),
        }}
        rows={[
          {
            label: "Subtotal",
            value: formatMoney(totals.subtotal, meta.currency),
          },
          ...(invoice.taxRate !== undefined
            ? [
                {
                  label: `VAT (${invoice.taxRate}%)`,
                  value: formatMoney(totals.taxAmount, meta.currency),
                },
              ]
            : []),
        ]}
        actions={
          <Button onClick={handlePrint}>Print / Save as PDF</Button>
        }
        footnote="Estimated totals for illustration. In your browser's print dialogue, choose 'Save as PDF' as the destination to download the invoice."
      />
      {showErrors && !validation.ok ? (
        <p role="alert" className="text-sm font-medium text-danger">
          Fix the highlighted fields above, then print again.
        </p>
      ) : null}

      {/* Live preview */}
      <section aria-labelledby="invoice-preview-heading" className="flex flex-col gap-3">
        <h2 id="invoice-preview-heading" className="text-base font-semibold text-foreground">
          Preview
        </h2>
        <div className="invoice-print overflow-x-auto rounded-card border border-border bg-white shadow-card">
          <InvoicePreview invoice={invoice} totals={totals} />
        </div>
      </section>
    </div>
  );
}
