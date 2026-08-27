/**
 * Central tool registry — the single source of truth for every tool on the site.
 *
 * FROZEN CONTRACT: all agents/pages import from this file. Do not change field
 * names or slugs. New tools are added by appending to the TOOLS array.
 */

import { AI_CONTEXT_ENABLED } from "@/config/features";

export type CategoryId =
  | "work-pay"
  | "money"
  | "career"
  | "documents"
  | "images"
  | "everyday"
  | "creator";

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  { id: "work-pay", name: "Work & Pay", description: "Shift, hours, overtime and pay calculators" },
  { id: "money", name: "Money", description: "Debt, tax and money calculators" },
  { id: "career", name: "Career", description: "CV, job application and career helpers" },
  { id: "documents", name: "Documents", description: "PDF and document utilities" },
  { id: "images", name: "Images", description: "Image tools that run in your browser" },
  { id: "everyday", name: "Everyday Tools", description: "Handy utilities for daily tasks" },
  { id: "creator", name: "Creator Tools", description: "Helpers for titles, hooks and descriptions" },
];

export interface Tool {
  /** URL slug — the route is `/${slug}` */
  slug: string;
  /** Display name used on cards and H1s */
  title: string;
  /** Short name for compact contexts (nav, related-tools chips) */
  shortTitle: string;
  /** One-sentence description used on cards and meta descriptions */
  description: string;
  category: CategoryId;
  /** Alternate names + common search phrases for instant search */
  keywords: string[];
  /** Slugs of related tools shown at the bottom of the tool page */
  related: string[];
  /** Shown in the "Popular tools" section on the landing page */
  popular?: boolean;
  /**
   * The single tool given the hero slot at the top of the landing page.
   * Exactly one tool should carry this.
   */
  featured?: boolean;
  /** Icon key — mapped to an inline SVG in the icon component */
  icon: string;
}

const ALL_TOOLS: Tool[] = [
  {
    slug: "image-ai-optimizer",
    title: "Image Optimizer for AI",
    shortTitle: "AI Image Optimizer",
    description:
      "Resize and compress an image before you send it to Claude, ChatGPT, Gemini or Grok, and see the estimated visual-token cost before and after. Runs entirely in your browser.",
    category: "images",
    keywords: [
      "optimize image for ai",
      "reduce image tokens for claude",
      "claude image token calculator",
      "resize image for claude",
      "compress image for ai",
      "image token estimator",
      "visual tokens",
      "screenshot size for ai",
    ],
    related: ["image-context", "image-tools", "pdf-tools"],
    popular: true,
    featured: true,
    icon: "image",
  },
  {
    slug: "shift-pay",
    title: "Shift Pay Calculator",
    shortTitle: "Shift Pay",
    description:
      "Work out your estimated pay for a single shift, including unpaid breaks, night premiums, weekend premiums and overtime.",
    category: "work-pay",
    keywords: [
      "shift pay calculator",
      "night shift pay",
      "night shift calculator",
      "overnight shift pay",
      "shift wage calculator",
      "hourly pay per shift",
      "unpaid break pay",
      "weekend premium",
      "night premium",
      "how much will I earn this shift",
    ],
    related: ["hours", "overtime", "salary", "holiday-pay"],
    popular: true,
    icon: "clock-pound",
  },
  {
    slug: "salary",
    title: "UK Salary / Take-Home Pay Calculator",
    shortTitle: "Salary Calculator",
    description:
      "Estimate your UK take-home pay after income tax, National Insurance, pension and student loan deductions.",
    category: "work-pay",
    keywords: [
      "uk salary calculator",
      "take home pay calculator",
      "take-home pay",
      "net salary calculator",
      "after tax calculator",
      "income tax calculator",
      "national insurance calculator",
      "monthly salary calculator",
      "wage after tax",
      "paye calculator",
    ],
    related: ["shift-pay", "overtime", "self-employed", "holiday-pay"],
    popular: true,
    icon: "wallet",
  },
  {
    slug: "overtime",
    title: "Overtime Pay Calculator",
    shortTitle: "Overtime",
    description:
      "Calculate overtime pay with common multipliers like time and a half or double time, or a custom overtime rate.",
    category: "work-pay",
    keywords: [
      "overtime calculator",
      "overtime pay",
      "time and a half calculator",
      "double time pay",
      "overtime rate",
      "extra hours pay",
      "1.5x pay calculator",
    ],
    related: ["shift-pay", "hours", "salary"],
    icon: "trending-up",
  },
  {
    slug: "hours",
    title: "Working Hours Calculator",
    shortTitle: "Working Hours",
    description:
      "Add up hours between a start and finish time, subtract unpaid breaks and see totals in decimal hours — with a weekly timesheet mode.",
    category: "work-pay",
    keywords: [
      "working hours calculator",
      "hours calculator",
      "timesheet calculator",
      "time card calculator",
      "hours between times",
      "work hours per week",
      "decimal hours",
      "overnight hours calculator",
      "break deduction",
    ],
    related: ["shift-pay", "overtime", "holiday-pay"],
    popular: true,
    icon: "timer",
  },
  {
    slug: "holiday-pay",
    title: "Holiday Pay Estimator",
    shortTitle: "Holiday Pay",
    description:
      "Estimate holiday hours and holiday pay for hourly and part-time UK workers, including a 12.07% accrual mode for irregular and casual hours.",
    category: "work-pay",
    keywords: [
      "holiday pay calculator",
      "holiday entitlement",
      "annual leave pay",
      "holiday hours calculator",
      "statutory holiday pay",
      "5.6 weeks holiday",
      "part time holiday entitlement",
    ],
    related: ["salary", "hours", "shift-pay"],
    icon: "sun",
  },
  {
    slug: "credit-card",
    title: "Credit Card Payoff Calculator",
    shortTitle: "Card Payoff",
    description:
      "See how long it will take to clear a credit card balance, the total interest cost, and the monthly payment needed to be debt-free by a target date.",
    category: "money",
    keywords: [
      "credit card payoff calculator",
      "credit card interest",
      "card interest calculator",
      "how long to pay off credit card",
      "credit card repayment calculator",
      "apr calculator",
      "debt payoff",
      "minimum payment trap",
      "pay off debt faster",
    ],
    related: ["salary", "self-employed"],
    popular: true,
    icon: "credit-card",
  },
  {
    slug: "self-employed",
    title: "Self-Employed Profit Estimator",
    shortTitle: "Self-Employed",
    description:
      "Estimate profit from self-employment: revenue minus allowable expenses, with an illustrative UK tax estimate.",
    category: "money",
    keywords: [
      "self employed calculator",
      "self employed tax",
      "sole trader profit",
      "freelance income calculator",
      "profit calculator",
      "side hustle tax",
      "self assessment estimate",
    ],
    related: ["salary", "invoice", "credit-card"],
    icon: "briefcase",
  },
  {
    slug: "visa-dates",
    title: "Visa Date / Countdown Calculator",
    shortTitle: "Visa Dates",
    description:
      "Count down the days remaining on a visa, see how much of the period has elapsed, and download calendar reminders. Not immigration advice.",
    category: "everyday",
    keywords: [
      "visa countdown",
      "visa expiry calculator",
      "days until visa expires",
      "visa date calculator",
      "brp expiry",
      "visa time remaining",
      "date countdown",
    ],
    related: ["qr", "cv-match"],
    icon: "calendar",
  },
  {
    slug: "cv-match",
    title: "CV ↔ Job Description Match Checker",
    shortTitle: "CV Match",
    description:
      "Paste your CV and a job description to see matching keywords, missing skills and a simple match score — all analysed privately in your browser.",
    category: "career",
    keywords: [
      "cv match checker",
      "cv keyword checker",
      "ats checker",
      "job description match",
      "cv vs job description",
      "resume match",
      "cv scanner",
      "keyword match score",
    ],
    related: ["job-answer", "invoice", "creator-tools"],
    icon: "file-check",
  },
  {
    slug: "job-answer",
    title: "Job Application Answer Builder",
    shortTitle: "Answer Builder",
    description:
      "Build tailored, structured answers to job application and interview questions — STAR and other proven frameworks, three variants, no account. Runs entirely in your browser.",
    category: "career",
    keywords: [
      "job application answer generator",
      "interview answer builder",
      "star interview answer",
      "star method answer",
      "competency answer examples",
      "job application question answers",
      "interview question answer helper",
      "behavioural interview answers",
      "why do you want this job",
      "tell me about yourself answer",
      "application form answers",
      "interview preparation",
    ],
    related: ["cv-match", "creator-tools"],
    icon: "message-square",
  },
  {
    slug: "image-tools",
    title: "Image Compressor / Resizer",
    shortTitle: "Image Tools",
    description:
      "Compress and resize images in your browser — reduce file size, set dimensions and convert formats. Your image never leaves your device.",
    category: "images",
    keywords: [
      "image compressor",
      "compress image",
      "resize image",
      "image resizer",
      "reduce image size",
      "shrink photo",
      "jpg compressor",
      "png to jpg",
      "photo size reducer",
      "compress image to 100kb",
    ],
    related: ["pdf-tools", "qr"],
    popular: true,
    icon: "image",
  },
  {
    slug: "pdf-tools",
    title: "PDF Merge / Split / Reorder",
    shortTitle: "PDF Tools",
    description:
      "Merge, split, reorder, extract and remove PDF pages directly in your browser. Files are processed locally and never uploaded.",
    category: "documents",
    keywords: [
      "pdf merge",
      "merge pdf files",
      "combine pdf",
      "split pdf",
      "reorder pdf pages",
      "delete pdf pages",
      "extract pdf pages",
      "pdf editor free",
      "join pdfs",
    ],
    related: ["image-tools", "invoice", "qr"],
    popular: true,
    icon: "file-stack",
  },
  {
    slug: "qr",
    title: "QR Code Generator",
    shortTitle: "QR Codes",
    description:
      "Create QR codes for links, text, Wi-Fi, email and phone numbers. Download as PNG or SVG — free, no watermark, no account.",
    category: "everyday",
    keywords: [
      "qr code generator",
      "free qr code",
      "wifi qr code",
      "url to qr",
      "qr maker",
      "qr code png",
      "qr code svg",
      "make a qr code",
    ],
    related: ["image-tools", "invoice", "visa-dates"],
    icon: "qr-code",
  },
  {
    slug: "invoice",
    title: "Invoice Generator",
    shortTitle: "Invoices",
    description:
      "Create a clean professional invoice with line items, VAT and totals, then print or save as PDF. Nothing is stored on a server.",
    category: "documents",
    keywords: [
      "invoice generator",
      "free invoice maker",
      "invoice template",
      "create invoice pdf",
      "vat invoice",
      "sole trader invoice",
      "freelance invoice",
      "billing generator",
    ],
    related: ["self-employed", "pdf-tools", "qr"],
    icon: "receipt",
  },
  {
    slug: "creator-tools",
    title: "Creator Tools",
    shortTitle: "Creator Tools",
    description:
      "Free helpers for creators: title variations, hook ideas, description skeletons and a hashtag/keyword organiser.",
    category: "creator",
    keywords: [
      "youtube title generator",
      "video title ideas",
      "hook generator",
      "youtube description template",
      "hashtag organiser",
      "keyword organiser",
      "content ideas",
      "creator helper",
    ],
    related: ["cv-match", "job-answer", "qr"],
    icon: "sparkles",
  },
  {
    slug: "image-context",
    title: "Image → AI Context",
    shortTitle: "Image to AI Context",
    description:
      "Convert an image into compact, AI-readable context in your browser — local OCR and layout analysis, then copy the structured result into any AI. Your image is not uploaded.",
    category: "images",
    keywords: [
      "image to ai context",
      "screenshot to ai context",
      "image to text for ai",
      "image to json",
      "local image analysis",
      "private image reader",
      "screenshot to ai prompt context",
      "extract text from screenshot",
    ],
    related: ["image-ai-optimizer", "image-tools", "cv-match"],
    icon: "image",
  },
];

/**
 * Every tool in the codebase, including any hidden behind a development flag.
 * Use this only for tooling that must see unreleased work.
 */
export const ALL_TOOLS_INCLUDING_DEVELOPMENT: Tool[] = ALL_TOOLS;

/**
 * The public catalogue.
 *
 * The homepage, instant search, category listings, related-tool links and the
 * generated sitemap ALL derive from this array, so a tool omitted here
 * disappears from public discovery everywhere at once. That is deliberate:
 * one flag, one filter, no scattered checks.
 */
export const TOOLS: Tool[] = ALL_TOOLS.filter(
  (tool) => AI_CONTEXT_ENABLED || tool.slug !== "image-context",
);

export const SITE_NAME = "ITISYOU Tools";
export const SITE_URL = "https://tools.itisyou.app";
export const SITE_TAGLINE = "Useful tools. No account required.";
export const SITE_DESCRIPTION =
  "Free calculators and browser-based utilities for work, money, documents and everyday tasks. Private by design — no login, no uploads.";

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function getToolsByCategory(category: CategoryId): Tool[] {
  return TOOLS.filter((t) => t.category === category);
}

export function getRelatedTools(tool: Tool): Tool[] {
  return tool.related
    .map((slug) => getTool(slug))
    .filter((t): t is Tool => Boolean(t));
}

export function getPopularTools(): Tool[] {
  return TOOLS.filter((t) => t.popular);
}

/** The tool given the hero slot at the top of the landing page. */
export function getFeaturedTool(): Tool | undefined {
  return TOOLS.find((t) => t.featured);
}
