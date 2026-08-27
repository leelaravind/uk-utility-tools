"use client";

import { Button, CopyButton } from "@/components/ui";
import {
  AI_PROVIDERS,
  wrapForProvider,
} from "@/lib/imageAi/context/providerWrappers";
import {
  TOKEN_ESTIMATE_NOTE,
  estimateSize,
  formatSizeSummary,
} from "@/lib/imageAi/context/tokenEstimate";

/**
 * Copy buttons and output size metrics.
 *
 * All five buttons copy the same context; only the covering instructions
 * differ. None of them contacts a provider, needs a key, or sends anything —
 * they put text on the clipboard and stop.
 *
 * The size line reports characters and UTF-8 bytes exactly and the token count
 * as an estimate, with the wording the specification requires. It deliberately
 * makes no "tokens saved" claim: that number cannot be computed honestly
 * without the receiving model's image tokenizer.
 */
export interface CopyActionsProps {
  /** The universal context every wrapper carries verbatim. */
  context: string;
  /** Text currently shown in the result panel, for the size readout. */
  displayed: string;
  onDownload: () => void;
}

export function CopyActions({
  context,
  displayed,
  onDownload,
}: CopyActionsProps) {
  const shown = estimateSize(displayed);
  const copied = estimateSize(context);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {AI_PROVIDERS.map((provider) => (
          <CopyButton
            key={provider.id}
            label={provider.label}
            text={wrapForProvider(provider.id, context)}
          />
        ))}
        <Button variant="secondary" onClick={onDownload}>
          Download .json
        </Button>
      </div>

      <p className="text-sm text-muted">
        <span className="block">
          View shown above:{" "}
          <span className="text-foreground">{formatSizeSummary(shown)}</span>
        </span>
        <span className="block">
          What the copy buttons put on your clipboard:{" "}
          <span className="text-foreground">{formatSizeSummary(copied)}</span>{" "}
          plus a short instruction wrapper.
        </span>
        <span className="block">{TOKEN_ESTIMATE_NOTE}</span>
      </p>

      <p className="text-sm leading-relaxed text-muted">
        Every copy button puts the same context on your clipboard — only the
        instructions wrapped around it differ. Nothing is sent to ChatGPT,
        Claude, Gemini, Grok or anywhere else; you paste it yourself.
      </p>
    </div>
  );
}
