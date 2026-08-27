/**
 * Source-level privacy guard.
 *
 * The launch gate for this feature is that the image and everything derived
 * from it never leaves the browser. A behavioural end-to-end network test
 * proves that for one run; this test proves the stronger structural property:
 * there is no code in the feature that could transmit anything at all.
 *
 * It reads the feature's own source files and fails if a transmitting API
 * appears in any of them. That makes the guarantee impossible to regress
 * quietly — adding a `fetch` to this feature breaks the build, not just a
 * manual audit.
 *
 * The one permitted network activity — tesseract.js fetching its own static
 * WebAssembly and language files — happens inside the third-party library, is
 * documented in ocr/assets.ts, and carries no image-derived data.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Scoped to the Image → AI Context feature's own files. The sibling Optimize
 * panel on the same route is covered by its own tests; mixing them here would
 * make one team's change fail the other team's guard.
 */
const FEATURE_ROOTS = [
  join(process.cwd(), "src", "lib", "imageAi", "context"),
  join(process.cwd(), "src", "components", "tools", "image-ai", "context"),
];

const EXTRA_FILES = [
  join(process.cwd(), "src", "components", "tools", "image-ai", "AiContextPanel.tsx"),
];

/** APIs that can move bytes off the device. */
const TRANSMITTING_APIS: Array<{ name: string; pattern: RegExp }> = [
  { name: "fetch()", pattern: /(^|[^.\w])fetch\s*\(/ },
  { name: "XMLHttpRequest", pattern: /\bXMLHttpRequest\b/ },
  { name: "navigator.sendBeacon", pattern: /\bsendBeacon\s*\(/ },
  { name: "WebSocket", pattern: /new\s+WebSocket\b/ },
  { name: "EventSource", pattern: /new\s+EventSource\b/ },
  { name: "RTCPeerConnection", pattern: /\bRTCPeerConnection\b/ },
  { name: "navigator.geolocation", pattern: /\bgeolocation\b/ },
  { name: "form submission", pattern: /\.submit\s*\(\s*\)/ },
  { name: "dangerouslySetInnerHTML", pattern: /dangerouslySetInnerHTML/ },
  { name: "innerHTML assignment", pattern: /\.innerHTML\s*=/ },
  { name: "eval", pattern: /(^|[^.\w])eval\s*\(/ },
  { name: "new Function", pattern: /new\s+Function\s*\(/ },
];

function collectSourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      // The guard applies to shipped code; test files may name these APIs.
      if (/\.test\.tsx?$/.test(entry)) continue;
      out.push(path);
    }
  };
  walk(root);
  return out;
}

const files = [...FEATURE_ROOTS.flatMap(collectSourceFiles), ...EXTRA_FILES];

describe("privacy boundary", () => {
  it("finds the feature's source files", () => {
    expect(files.length).toBeGreaterThan(15);
    expect(files.some((f) => f.endsWith("AiContextPanel.tsx"))).toBe(true);
    expect(files.some((f) => f.endsWith("analyzeInBrowser.ts"))).toBe(true);
    expect(files.some((f) => f.endsWith("tesseractClient.ts"))).toBe(true);
  });

  it.each(TRANSMITTING_APIS)(
    "never uses $name anywhere in the feature",
    ({ pattern }) => {
      const offenders = files.filter((file) => {
        const source = readFileSync(file, "utf8");
        // Strip comments so that prose about `fetch` does not fail the test.
        const code = source
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/(^|[^:])\/\/.*$/gm, "$1");
        return pattern.test(code);
      });
      expect(offenders).toEqual([]);
    },
  );

  it("never references a remote inference endpoint", () => {
    const forbidden = [
      "api.openai.com",
      "api.anthropic.com",
      "generativelanguage.googleapis.com",
      "api.x.ai",
      "api-inference.huggingface.co",
      "googletagmanager.com",
      "google-analytics.com",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const host of forbidden) {
        expect(`${file}: ${source.includes(host)}`).toBe(`${file}: false`);
      }
    }
  });

  it("never persists image-derived data to storage", () => {
    // Only the model cache and preferences may be written. Recognised text and
    // generated context are held in memory and nowhere else.
    const writes = /\b(localStorage|sessionStorage)\s*\.\s*setItem\b/;
    const offenders = files.filter((file) =>
      writes.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
