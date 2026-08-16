/**
 * Renders a JSON-LD structured-data block. Server-renderable.
 *
 * `<` is escaped to `<` so untrusted strings cannot break out of the
 * script tag (per the Next.js JSON-LD guide).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
