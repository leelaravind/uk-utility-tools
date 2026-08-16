"use client";

import {
  formatInvoiceDate,
  formatMoney,
  formatUnitPrice,
  type InvoiceData,
  type InvoiceTotals,
} from "@/lib/files/invoice";

/**
 * The A4-style invoice paper. Deliberately rendered with fixed "paper"
 * colours (white background, near-black ink) in both site themes so the
 * on-screen preview matches what prints.
 */
export function InvoicePreview({
  invoice,
  totals,
}: {
  invoice: InvoiceData;
  totals: InvoiceTotals;
}) {
  const { currency } = invoice;
  const hasVat = invoice.taxRate !== undefined;

  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-8 text-zinc-900 sm:p-12">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-3xl font-semibold uppercase tracking-widest">
            Invoice
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {invoice.invoiceNumber || "INV-001"}
          </p>
        </div>
        <div className="text-right text-sm">
          {invoice.from.name ? (
            <p className="text-base font-semibold">{invoice.from.name}</p>
          ) : (
            <p className="text-base font-semibold text-zinc-400">
              Your business name
            </p>
          )}
          {invoice.from.address ? (
            <p className="mt-1 whitespace-pre-line leading-relaxed text-zinc-600">
              {invoice.from.address}
            </p>
          ) : null}
        </div>
      </div>

      {/* Billed to + dates */}
      <div className="mt-10 flex flex-wrap items-start justify-between gap-6">
        <div className="text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Billed to
          </p>
          {invoice.to.name ? (
            <p className="mt-1.5 font-semibold">{invoice.to.name}</p>
          ) : (
            <p className="mt-1.5 font-semibold text-zinc-400">Client name</p>
          )}
          {invoice.to.address ? (
            <p className="mt-1 whitespace-pre-line leading-relaxed text-zinc-600">
              {invoice.to.address}
            </p>
          ) : null}
        </div>
        <dl className="text-sm">
          <div className="flex justify-between gap-8">
            <dt className="text-zinc-500">Issue date</dt>
            <dd className="font-medium tabular-nums">
              {formatInvoiceDate(invoice.issueDate)}
            </dd>
          </div>
          <div className="mt-1.5 flex justify-between gap-8">
            <dt className="text-zinc-500">Due date</dt>
            <dd className="font-medium tabular-nums">
              {formatInvoiceDate(invoice.dueDate)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Line items */}
      <table className="mt-10 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-zinc-900 text-left text-[11px] uppercase tracking-wider text-zinc-500">
            <th scope="col" className="py-2 pr-3 font-semibold">
              Description
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">
              Qty
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">
              Unit price
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.length === 0 ? (
            <tr className="border-b border-zinc-200">
              <td colSpan={4} className="py-3 italic text-zinc-400">
                Line items will appear here as you add them.
              </td>
            </tr>
          ) : (
            invoice.items.map((item, index) => (
              <tr key={index} className="border-b border-zinc-200 align-top">
                <td className="py-3 pr-3">{item.description}</td>
                <td className="py-3 pr-3 text-right tabular-nums">
                  {item.quantity}
                </td>
                <td className="py-3 pr-3 text-right tabular-nums">
                  {formatUnitPrice(item.unitPrice, currency)}
                </td>
                <td className="py-3 text-right font-medium tabular-nums">
                  {formatMoney(totals.lineTotals[index] ?? 0, currency)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-6 flex justify-end">
        <dl className="w-full max-w-xs text-sm">
          <div className="flex justify-between py-1.5">
            <dt className="text-zinc-500">Subtotal</dt>
            <dd className="font-medium tabular-nums">
              {formatMoney(totals.subtotal, currency)}
            </dd>
          </div>
          {hasVat ? (
            <div className="flex justify-between py-1.5">
              <dt className="text-zinc-500">VAT ({invoice.taxRate}%)</dt>
              <dd className="font-medium tabular-nums">
                {formatMoney(totals.taxAmount, currency)}
              </dd>
            </div>
          ) : null}
          <div className="mt-1.5 flex items-baseline justify-between border-t-2 border-zinc-900 pt-2.5">
            <dt className="text-base font-semibold">Total due</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {formatMoney(totals.total, currency)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Notes */}
      {invoice.notes ? (
        <div className="mt-10 border-t border-zinc-200 pt-4 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Notes
          </p>
          <p className="mt-1.5 whitespace-pre-line leading-relaxed text-zinc-700">
            {invoice.notes}
          </p>
        </div>
      ) : null}
    </div>
  );
}
