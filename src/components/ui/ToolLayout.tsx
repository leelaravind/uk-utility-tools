import Link from "next/link";
import type { ReactNode } from "react";

import { CATEGORIES, SITE_URL, type Tool } from "@/lib/registry";
import { JsonLd } from "@/components/seo/JsonLd";
import { AdSlot } from "./AdSlot";
import { Disclaimer } from "./Disclaimer";
import { FaqSection } from "./FaqSection";
import { RelatedTools } from "./RelatedTools";

export interface ToolLayoutProps {
  tool: Tool;
  /** The interactive island (client component) for this tool. */
  children: ReactNode;
  /** Rendered under an h2 "How it works". Plain h3/p/ul markup is styled. */
  explanation?: ReactNode;
  faqs?: { question: string; answer: string }[];
  /** Inline content only — it is wrapped in <Disclaimer> automatically. */
  disclaimer?: ReactNode;
}

/**
 * SERVER component — the shared shell for every tool page. Renders
 * breadcrumbs, h1/lead, the interactive island, explanation, FAQs,
 * related tools and all JSON-LD (BreadcrumbList, WebApplication, FAQPage).
 */
export function ToolLayout({
  tool,
  children,
  explanation,
  faqs,
  disclaimer,
}: ToolLayoutProps) {
  const category = CATEGORIES.find((c) => c.id === tool.category);
  const toolUrl = `${SITE_URL}/${tool.slug}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      ...(category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: category.name,
              item: `${SITE_URL}/#${category.id}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: category ? 3 : 2,
        name: tool.shortTitle,
        item: toolUrl,
      },
    ],
  };

  const webApplicationLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.title,
    url: toolUrl,
    description: tool.description,
    applicationCategory:
      tool.category === "work-pay" || tool.category === "money"
        ? "FinanceApplication"
        : "UtilityApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
  };

  const faqLd =
    faqs && faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }
      : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={webApplicationLd} />
      {faqLd ? <JsonLd data={faqLd} /> : null}

      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <li>
            <Link href="/" className="transition-colors hover:text-accent">
              Home
            </Link>
          </li>
          {category ? (
            <>
              <li aria-hidden="true" className="text-faint">
                /
              </li>
              <li>
                <Link
                  href={`/#${category.id}`}
                  className="transition-colors hover:text-accent"
                >
                  {category.name}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden="true" className="text-faint">
            /
          </li>
          <li aria-current="page" className="font-medium text-foreground">
            {tool.shortTitle}
          </li>
        </ol>
      </nav>

      <header className="mb-8 mt-5">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {tool.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">
          {tool.description}
        </p>
      </header>

      <section aria-label={tool.shortTitle}>{children}</section>

      <AdSlot position="after-input" />

      {explanation ? (
        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="mt-12 border-t border-border pt-8"
        >
          <h2
            id="how-it-works-heading"
            className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            How it works
          </h2>
          <div className="rich-text mt-4">{explanation}</div>
        </section>
      ) : null}

      <AdSlot position="after-explanation" />

      {faqs && faqs.length > 0 ? <FaqSection faqs={faqs} /> : null}

      <AdSlot position="before-related" />

      <RelatedTools tool={tool} />

      {disclaimer ? (
        <div className="mt-10">
          <Disclaimer>{disclaimer}</Disclaimer>
        </div>
      ) : null}
    </div>
  );
}
