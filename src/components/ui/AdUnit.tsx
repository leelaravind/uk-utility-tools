"use client";

import { useEffect, useRef } from "react";

import { ADSENSE_CLIENT_ID } from "@/config/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * A single responsive AdSense display unit. Rendered only by AdSlot when
 * AD_UNITS_ENABLED is true and a slot ID is configured — never hardcode
 * this component into pages directly.
 */
export function AdUnit({ slotId }: { slotId: string }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blocker or script not loaded — fail silently, never break the tool.
    }
  }, []);

  return (
    <div className="my-6" aria-hidden="true">
      <p className="mb-1 text-center text-[10px] uppercase tracking-widest text-faint">
        Advertisement
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
