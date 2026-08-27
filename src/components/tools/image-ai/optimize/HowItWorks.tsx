"use client";

import {
  CLAUDE_PATCH_PX,
  documentedProfiles,
  VISION_PROVIDER_PROFILES,
} from "@/config/imageProviders";

/**
 * The expandable explainer.
 *
 * Every claim here is scoped to a provider that actually documents a rule.
 * There is no blanket statement about how "AI models" bill images, because
 * there is no single rule that applies to all of them.
 */
export function HowItWorks() {
  const documented = documentedProfiles();
  const undocumented = VISION_PROVIDER_PROFILES.filter(
    (p) => p.support !== "documented",
  );

  return (
    <details className="rounded-card border border-border bg-surface p-4 sm:p-5">
      <summary className="cursor-pointer text-base font-semibold text-foreground">
        How image optimization affects AI usage
      </summary>

      <div className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-muted">
        <p>
          Image token usage depends on the AI provider and model. For providers
          with documented image-token rules, reducing image dimensions can
          reduce visual-token usage.
        </p>

        <div>
          <h3 className="mb-1.5 text-sm font-semibold text-foreground">
            What actually changes the token count
          </h3>
          <p>
            Pixel dimensions and cropping can affect visual-token usage. Making
            an image smaller, or cropping away parts of it that do not matter,
            gives the model fewer pixels to encode. Every provider processes
            images differently, so the same picture can cost different amounts
            in different places — the estimate here always names the model tier
            it applies to.
          </p>
        </div>

        <div>
          <h3 className="mb-1.5 text-sm font-semibold text-foreground">
            How Claude counts an image
          </h3>
          <p>
            Claude currently divides an image into {CLAUDE_PATCH_PX}×
            {CLAUDE_PATCH_PX} pixel visual patches, one visual token per patch,
            with per-tier resolution limits:
          </p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            {documented.map((profile) =>
              profile.limits ? (
                <li key={profile.id}>
                  <span className="font-medium text-foreground">
                    {profile.providerLabel} {profile.modelTier}
                  </span>{" "}
                  ({profile.models}) — longest side up to{" "}
                  {profile.limits.maxEdgePx.toLocaleString("en-GB")} px, up to{" "}
                  {profile.limits.maxVisualTokens.toLocaleString("en-GB")} visual
                  tokens per image.
                </li>
              ) : null,
            )}
          </ul>
          <p className="mt-2">
            Claude may automatically resize an oversized image before it counts
            the tokens, and this tool accounts for that when estimating savings.
            That is why a 4K screenshot can show a large drop in file size and
            no drop at all in visual tokens: the model was never going to see
            those extra pixels in the first place.
          </p>
        </div>

        <div>
          <h3 className="mb-1.5 text-sm font-semibold text-foreground">
            Why quality and format are a separate thing
          </h3>
          <p>
            JPEG and WebP compression mainly reduces the number of bytes you
            upload — it does not reduce visual tokens. Converting a PNG to WebP
            at the same width and height, or dropping the quality slider, gives
            you a smaller and faster upload while the token estimate stays
            exactly where it was.
          </p>
        </div>

        <div>
          <h3 className="mb-1.5 text-sm font-semibold text-foreground">
            The trade-off
          </h3>
          <p>
            Smaller images can lose fine text detail. Screenshots of code,
            spreadsheets, receipts and scanned documents are the usual
            casualties — the model cannot read what is no longer legible. Use
            the zoom in the comparison above to check the optimised copy before
            you download it, and step back up a preset if anything has gone
            soft.
          </p>
        </div>

        {undocumented.length > 0 ? (
          <div>
            <h3 className="mb-1.5 text-sm font-semibold text-foreground">
              Providers without a published rule
            </h3>
            <p>
              {undocumented.map((p) => p.providerLabel).join(", ")} do not
              publish a stable public formula for image tokens, so no number is
              shown for them. Reducing dimensions still reduces the bytes you
              upload, and the dimension and file-size figures above remain
              accurate.
            </p>
          </div>
        ) : null}

        <p className="text-xs">
          These figures are estimates of visual tokens only. They do not include
          the text in your prompt, and they are not a price. Check your
          provider&apos;s own documentation and billing for authoritative
          numbers.
        </p>
      </div>
    </details>
  );
}
