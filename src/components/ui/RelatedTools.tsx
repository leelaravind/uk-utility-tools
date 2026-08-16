import type { Tool } from "@/lib/registry";
import { getRelatedTools } from "@/lib/registry";
import { ToolCard } from "./ToolCard";

export interface RelatedToolsProps {
  tool: Tool;
}

/** Grid of small cards for the tool's related slugs (via getRelatedTools). */
export function RelatedTools({ tool }: RelatedToolsProps) {
  const related = getRelatedTools(tool);
  if (related.length === 0) return null;
  return (
    <section
      aria-labelledby="related-heading"
      className="mt-12 border-t border-border pt-8"
    >
      <h2
        id="related-heading"
        className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
      >
        Related tools
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {related.map((relatedTool) => (
          <ToolCard key={relatedTool.slug} tool={relatedTool} compact />
        ))}
      </div>
    </section>
  );
}
