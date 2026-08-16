
import { getTool } from "@/lib/registry";
import { pageMetadata } from "@/lib/seo";
import { ToolLayout } from "@/components/ui";
import { InvoiceIsland } from "@/components/tools/invoice/InvoiceIsland";

export const metadata = pageMetadata({
  title:
    "Free Invoice Generator — Line Items, VAT & Print to PDF",
  description:
    "Create a clean professional invoice with line items, VAT and totals, then print or save it as a PDF. No account, no watermark — nothing stored on a server.",
  path: "/invoice",
});

const FAQS = [
  {
    question: "How do I save my invoice as a PDF?",
    answer:
      "Click 'Print / Save as PDF', then in your browser's print dialogue change the destination (printer) to 'Save as PDF' and confirm. Only the invoice itself prints — the rest of the page is automatically hidden.",
  },
  {
    question: "Is my invoice data stored anywhere?",
    answer:
      "No. Everything you type stays in your browser tab and disappears when you close it. Nothing is sent to or saved on a server, which also means you should save the PDF (and note the invoice number) before closing the page.",
  },
  {
    question: "What should a UK invoice include?",
    answer:
      "At minimum: the word 'invoice', a unique invoice number, your name and address, the customer's name and address, the date, a clear description of the goods or services, the amount for each item and the total. Sole traders must invoice under their own name (a business name may appear alongside). VAT-registered businesses have extra requirements, such as showing their VAT number and the VAT amount.",
  },
  {
    question: "Do I need to charge VAT on my invoices?",
    answer:
      "Only if you are VAT-registered. Registration is compulsory once your taxable turnover passes the registration threshold (£90,000 as at 2024–25 — check the current figure with HMRC), and optional below it. If you're not registered, leave the VAT field blank and don't mention VAT on the invoice.",
  },
  {
    question: "What VAT rate should I use?",
    answer:
      "The UK standard rate is 20%, which covers most goods and services. A reduced rate of 5% and a zero rate apply to specific categories. This tool applies whatever single rate you enter to the whole invoice — check the correct rate for what you sell on GOV.UK.",
  },
  {
    question: "Can I invoice in euros or dollars?",
    answer:
      "Yes — switch the currency to EUR or USD and every amount, including the totals, is formatted in that currency. If you're VAT-registered and invoicing in a foreign currency, note that HMRC requires the VAT amount to also be shown in sterling; add that in the notes.",
  },
  {
    question: "How are the totals rounded?",
    answer:
      "Each line is calculated as quantity × unit price and rounded to the nearest penny (halves round up). The lines are then summed into the subtotal, and VAT is calculated on that subtotal and rounded the same way. All arithmetic is done in whole pence to avoid floating-point errors.",
  },
];

export default function InvoicePage() {
  return (
    <ToolLayout
      tool={getTool("invoice")!}
      explanation={
        <>
          <h3>What makes a good invoice</h3>
          <p>
            A good invoice leaves no room for questions — the client can see
            who it&apos;s from, what it&apos;s for, how much is due and by
            when. The essentials:
          </p>
          <ul>
            <li>
              A <strong>unique, sequential invoice number</strong> (e.g.
              INV-001, INV-002) — it keeps your records straight and is a legal
              requirement for VAT invoices.
            </li>
            <li>Your name or business name and address.</li>
            <li>The client&apos;s name and address.</li>
            <li>The issue date and a clear due date.</li>
            <li>
              A plain-English description of each item of work, with its
              quantity and price.
            </li>
            <li>
              Payment details in the notes — bank name, sort code and account
              number — so the client can pay without emailing you first.
            </li>
          </ul>

          <h3>UK VAT invoice basics</h3>
          <p>
            If you&apos;re VAT-registered, a full VAT invoice must additionally
            show your VAT registration number, the rate of VAT applied and the
            VAT amount as a separate line — this tool shows VAT separately when
            you enter a rate, and you can put your VAT number in the address
            block. The UK standard rate is 20%; reduced (5%) and zero rates
            apply to specific goods and services. If you&apos;re not
            VAT-registered, don&apos;t charge or mention VAT at all — just
            leave the VAT field blank.
          </p>

          <h3>How the totals are calculated</h3>
          <p>
            All money maths runs in whole pence to avoid the rounding drift
            you get with ordinary decimal arithmetic:
          </p>
          <ol>
            <li>
              Each line total is quantity × unit price, rounded to the nearest
              penny (halves round up — 3 × £0.333 becomes £1.00).
            </li>
            <li>The subtotal is the sum of the rounded line totals.</li>
            <li>
              VAT is your rate applied to the subtotal, rounded the same way,
              and added to give the total due.
            </li>
          </ol>

          <h3>Printing and privacy</h3>
          <p>
            The preview below the form is the actual invoice. Clicking{" "}
            <strong>Print / Save as PDF</strong> opens your browser&apos;s
            print dialogue with everything except the invoice hidden, so the
            PDF contains only the invoice on a clean A4 page. Nothing you type
            is uploaded or stored — closing the tab clears it all, so download
            your PDF first.
          </p>
        </>
      }
      faqs={FAQS}
      disclaimer={
        <>
          This generator produces an illustrative invoice layout and does not
          guarantee statutory compliance — check the invoicing and VAT
          requirements that apply to your business (for example HMRC&apos;s
          VAT invoice rules) before relying on it. Figures are calculated from
          what you enter and nothing here is financial, tax or legal advice.
        </>
      }
    >
      <InvoiceIsland />
    </ToolLayout>
  );
}
