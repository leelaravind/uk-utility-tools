import Link from "next/link";
import type { Metadata } from "next";

import { TOOLS } from "@/lib/registry";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">
        404
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        That page doesn’t exist
      </h1>
      <p className="mt-3 leading-relaxed text-muted">
        The page you’re looking for may have moved. Head back to the homepage
        to search all {TOOLS.length} free tools.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-field bg-accent-solid px-5 text-base font-medium text-accent-fg transition-colors hover:bg-accent-solid-hover"
      >
        Search all tools
      </Link>
    </div>
  );
}
