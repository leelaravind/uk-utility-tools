/**
 * Pure QR payload builders + validation for the QR Code Generator.
 *
 * Every builder is deterministic, throws nothing, and returns a
 * discriminated result: either the exact string to encode, or a
 * human-readable error plus the field it relates to (so the UI can put the
 * message under the right input).
 */

export type QrErrorField =
  | "url"
  | "text"
  | "ssid"
  | "password"
  | "to"
  | "phone";

export type QrPayloadResult =
  | { ok: true; payload: string }
  | { ok: false; error: string; field: QrErrorField };

function ok(payload: string): QrPayloadResult {
  return { ok: true, payload };
}

function fail(field: QrErrorField, error: string): QrPayloadResult {
  return { ok: false, field, error };
}

/** Schemes we pass through untouched even without a `//` (e.g. mailto:). */
const BARE_SCHEMES = /^(mailto|tel|sms|geo|whatsapp):/i;
/** Anything like `https://`, `ftp://` — a real scheme followed by `//`. */
const SCHEME_WITH_SLASHES = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Build a URL payload. Adds `https://` when no scheme is present
 * ("example.com" → "https://example.com") and validates the result parses
 * as a URL. The user's text is preserved rather than normalised.
 */
export function buildUrlPayload(input: string): QrPayloadResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return fail("url", "Enter a web address to encode.");
  }
  if (/\s/.test(trimmed)) {
    return fail(
      "url",
      "Web addresses can't contain spaces — check the address and try again.",
    );
  }

  const hasScheme =
    SCHEME_WITH_SLASHES.test(trimmed) || BARE_SCHEMES.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      !parsed.hostname
    ) {
      return fail("url", "That doesn't look like a valid web address.");
    }
  } catch {
    return fail("url", "That doesn't look like a valid web address.");
  }

  return ok(candidate);
}

/** Build a plain-text payload. The text is encoded exactly as typed. */
export function buildTextPayload(input: string): QrPayloadResult {
  if (!input.trim()) {
    return fail("text", "Enter some text to encode.");
  }
  return ok(input);
}

export type WifiSecurity = "WPA" | "WEP" | "nopass";

export interface WifiOptions {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
}

/**
 * Escape the characters that are special in WIFI: payloads
 * (backslash, semicolon, comma, colon and double quote), per the
 * de-facto MECARD-style spec.
 */
export function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

/**
 * Build a Wi-Fi network payload:
 * `WIFI:T:WPA;S:MyNetwork;P:secret;H:true;;`
 * `nopass` networks omit the `P:` section entirely.
 */
export function buildWifiPayload(opts: WifiOptions): QrPayloadResult {
  if (!opts.ssid.trim()) {
    return fail("ssid", "Enter the network name (SSID) exactly as it appears.");
  }
  if (opts.security !== "nopass" && !opts.password) {
    return fail(
      "password",
      "Enter the Wi-Fi password, or set security to 'No password'.",
    );
  }

  let payload = `WIFI:T:${opts.security};S:${escapeWifiValue(opts.ssid)};`;
  if (opts.security !== "nopass") {
    payload += `P:${escapeWifiValue(opts.password)};`;
  }
  if (opts.hidden) {
    payload += "H:true;";
  }
  payload += ";";
  return ok(payload);
}

export interface EmailOptions {
  to: string;
  subject?: string;
  body?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Build a `mailto:` payload. Subject and body are percent-encoded with
 * encodeURIComponent; the query string is omitted when both are empty.
 */
export function buildEmailPayload(opts: EmailOptions): QrPayloadResult {
  const to = opts.to.trim();
  if (!to) {
    return fail("to", "Enter the email address the message should go to.");
  }
  if (!EMAIL_PATTERN.test(to)) {
    return fail(
      "to",
      "That doesn't look like a valid email address — check for typos.",
    );
  }

  const params: string[] = [];
  if (opts.subject) params.push(`subject=${encodeURIComponent(opts.subject)}`);
  if (opts.body) params.push(`body=${encodeURIComponent(opts.body)}`);

  return ok(`mailto:${to}${params.length > 0 ? `?${params.join("&")}` : ""}`);
}

/**
 * Build a `tel:` payload. Spaces, hyphens, dots and brackets are stripped;
 * a single leading `+` is kept for international numbers.
 */
export function buildPhonePayload(input: string): QrPayloadResult {
  const normalised = input.replace(/[\s().-]/g, "");
  if (!normalised) {
    return fail("phone", "Enter a phone number to encode.");
  }
  if (!/^\+?\d{3,15}$/.test(normalised)) {
    return fail(
      "phone",
      "Enter a valid phone number using digits only (a leading + is fine).",
    );
  }
  return ok(`tel:${normalised}`);
}
