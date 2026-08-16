"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Button,
  CheckboxInput,
  CopyButton,
  NumberInput,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/ui";
import {
  buildEmailPayload,
  buildPhonePayload,
  buildTextPayload,
  buildUrlPayload,
  buildWifiPayload,
  type QrErrorField,
  type QrPayloadResult,
  type WifiSecurity,
} from "@/lib/files/qrPayload";

type Mode = "url" | "text" | "wifi" | "email" | "phone";
type EcLevel = "L" | "M" | "Q" | "H";

const MODES: { id: Mode; label: string }[] = [
  { id: "url", label: "URL" },
  { id: "text", label: "Text" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
];

const ALT_TEXT: Record<Mode, string> = {
  url: "QR code that opens a web link",
  text: "QR code containing plain text",
  wifi: "QR code containing Wi-Fi connection details",
  email: "QR code that starts an email",
  phone: "QR code that dials a phone number",
};

const SIZE_OPTIONS = [
  { value: "128", label: "128 × 128px — small" },
  { value: "256", label: "256 × 256px — standard" },
  { value: "512", label: "512 × 512px — large" },
  { value: "1024", label: "1024 × 1024px — print quality" },
];

const EC_OPTIONS = [
  { value: "L", label: "L — low (7% recoverable)" },
  { value: "M", label: "M — medium (15%, recommended)" },
  { value: "Q", label: "Q — quartile (25%)" },
  { value: "H", label: "H — high (30%)" },
];

const SECURITY_OPTIONS = [
  { value: "WPA", label: "WPA / WPA2 / WPA3 (most networks)" },
  { value: "WEP", label: "WEP (older routers)" },
  { value: "nopass", label: "No password (open network)" },
];

export function QrIsland() {
  const [mode, setMode] = useState<Mode>("url");

  // Per-mode fields.
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [ssid, setSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [security, setSecurity] = useState<WifiSecurity>("WPA");
  const [hidden, setHidden] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [phone, setPhone] = useState("");

  // Options.
  const [sizeStr, setSizeStr] = useState("256");
  const [marginStr, setMarginStr] = useState("4");
  const [ecLevel, setEcLevel] = useState<EcLevel>("M");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderedKey, setRenderedKey] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const result: QrPayloadResult = useMemo(() => {
    switch (mode) {
      case "url":
        return buildUrlPayload(url);
      case "text":
        return buildTextPayload(text);
      case "wifi":
        return buildWifiPayload({ ssid, password: wifiPassword, security, hidden });
      case "email":
        return buildEmailPayload({ to: emailTo, subject: emailSubject, body: emailBody });
      case "phone":
        return buildPhonePayload(phone);
    }
  }, [mode, url, text, ssid, wifiPassword, security, hidden, emailTo, emailSubject, emailBody, phone]);

  // Only surface validation errors once the user has started typing.
  const touched: Record<Mode, boolean> = {
    url: url.trim() !== "",
    text: text.trim() !== "",
    wifi: ssid !== "" || wifiPassword !== "",
    email: emailTo.trim() !== "" || emailSubject !== "" || emailBody !== "",
    phone: phone.trim() !== "",
  };

  function errorFor(field: QrErrorField): string | undefined {
    if (!touched[mode]) return undefined;
    if (!result.ok && result.field === field) return result.error;
    return undefined;
  }

  const payload = result.ok ? result.payload : null;

  const size = Number.parseInt(sizeStr, 10);

  let marginError: string | undefined;
  let margin = 4;
  const marginTrimmed = marginStr.trim();
  if (!/^\d+$/.test(marginTrimmed) || Number.parseInt(marginTrimmed, 10) > 16) {
    marginError = "Enter a whole number of modules from 0 to 16.";
  } else {
    margin = Number.parseInt(marginTrimmed, 10);
  }

  // A key describing exactly what should be on the canvas right now.
  const renderKey =
    payload !== null && !marginError
      ? `${size}|${margin}|${ecLevel}|${payload}`
      : null;
  const ready = renderKey !== null && renderedKey === renderKey;

  // Debounced live preview.
  useEffect(() => {
    if (!renderKey || !payload) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const { toCanvas } = await import("qrcode");
        if (cancelled) return;
        await toCanvas(canvas, payload, {
          width: size,
          margin,
          errorCorrectionLevel: ecLevel,
          color: { dark: "#000000ff", light: "#ffffffff" },
        });
        if (!cancelled) {
          setRenderedKey(renderKey);
          setRenderError(null);
        }
      } catch {
        if (!cancelled) {
          setRenderedKey(null);
          setRenderError(
            "Sorry — that content couldn't be turned into a QR code. Try shortening it.",
          );
        }
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [renderKey, payload, size, margin, ecLevel]);

  function triggerDownload(href: string, filename: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    triggerDownload(canvas.toDataURL("image/png"), `qr-${mode}.png`);
  }

  async function downloadSvg() {
    if (!payload) return;
    try {
      const { toString: qrToString } = await import("qrcode");
      const svg = await qrToString(payload, {
        type: "svg",
        margin,
        errorCorrectionLevel: ecLevel,
        width: size,
      });
      const blobUrl = URL.createObjectURL(
        new Blob([svg], { type: "image/svg+xml" }),
      );
      triggerDownload(blobUrl, `qr-${mode}.svg`);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch {
      setRenderError(
        "Sorry — the SVG couldn't be generated. Try downloading the PNG instead.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label="QR code type" className="flex flex-wrap gap-2">
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(m.id)}
              className={[
                "inline-flex h-11 items-center justify-center rounded-field border px-4 text-base font-medium transition-colors",
                active
                  ? "border-accent-solid bg-accent-solid text-accent-fg"
                  : "border-border-strong bg-surface text-foreground hover:bg-surface-subtle",
              ].join(" ")}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        {mode === "url" ? (
          <TextInput
            id="qr-url"
            label="Web address"
            value={url}
            onChange={setUrl}
            placeholder="example.com or https://example.com"
            hint="We'll add https:// automatically if you leave it off."
            error={errorFor("url")}
          />
        ) : null}

        {mode === "text" ? (
          <TextAreaInput
            id="qr-text"
            label="Text"
            value={text}
            onChange={setText}
            rows={4}
            placeholder="Any text — a note, a serial number, a message…"
            error={errorFor("text")}
          />
        ) : null}

        {mode === "wifi" ? (
          <>
            <TextInput
              id="qr-wifi-ssid"
              label="Network name (SSID)"
              value={ssid}
              onChange={setSsid}
              placeholder="e.g. BT-ABC123"
              hint="Exactly as it appears in your Wi-Fi list, including capitals."
              error={errorFor("ssid")}
            />
            <SelectInput
              id="qr-wifi-security"
              label="Security"
              value={security}
              onChange={(v) => setSecurity(v as WifiSecurity)}
              options={SECURITY_OPTIONS}
              hint="Almost every modern router uses WPA."
            />
            {security !== "nopass" ? (
              <TextInput
                id="qr-wifi-password"
                label="Password"
                value={wifiPassword}
                onChange={setWifiPassword}
                error={errorFor("password")}
              />
            ) : null}
            <CheckboxInput
              id="qr-wifi-hidden"
              label="Hidden network"
              checked={hidden}
              onChange={setHidden}
              hint="Tick this only if your network doesn't broadcast its name."
            />
          </>
        ) : null}

        {mode === "email" ? (
          <>
            <TextInput
              id="qr-email-to"
              label="To"
              value={emailTo}
              onChange={setEmailTo}
              placeholder="name@example.co.uk"
              error={errorFor("to")}
            />
            <TextInput
              id="qr-email-subject"
              label="Subject (optional)"
              value={emailSubject}
              onChange={setEmailSubject}
            />
            <TextAreaInput
              id="qr-email-body"
              label="Message (optional)"
              value={emailBody}
              onChange={setEmailBody}
              rows={3}
              hint="Scanning opens the person's email app with these details pre-filled."
            />
          </>
        ) : null}

        {mode === "phone" ? (
          <TextInput
            id="qr-phone"
            label="Phone number"
            value={phone}
            onChange={setPhone}
            placeholder="e.g. 07700 900123 or +44 7700 900123"
            hint="Scanning opens the dialler with this number ready to call."
            error={errorFor("phone")}
          />
        ) : null}
      </div>

      <details className="rounded-card border border-border bg-surface">
        <summary className="cursor-pointer select-none px-4 py-3 text-base font-medium text-foreground">
          Options — size, margin &amp; error correction
        </summary>
        <div className="flex flex-col gap-4 border-t border-border p-4">
          <SelectInput
            id="qr-size"
            label="Size"
            value={sizeStr}
            onChange={setSizeStr}
            options={SIZE_OPTIONS}
            hint="Use 512px or more if you plan to print the code."
          />
          <NumberInput
            id="qr-margin"
            label="Margin (quiet zone)"
            value={marginStr}
            onChange={setMarginStr}
            suffix="modules"
            inputMode="numeric"
            hint="Blank border around the code. Keep at least 2–4 so scanners can find it."
            error={marginError}
          />
          <SelectInput
            id="qr-ec"
            label="Error correction"
            value={ecLevel}
            onChange={(v) => setEcLevel(v as EcLevel)}
            options={EC_OPTIONS}
            hint="Higher levels survive smudges and damage but make the code denser. M suits most uses; pick H for small printed labels."
          />
        </div>
      </details>

      <section aria-labelledby="qr-preview-heading" aria-live="polite" className="flex flex-col gap-4">
        <h2
          id="qr-preview-heading"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          Your QR code
        </h2>

        {payload && !marginError ? (
          <div className="flex flex-col items-start gap-4">
            <div className="rounded-card border border-border bg-white p-3">
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={ALT_TEXT[mode]}
                className="block h-auto w-64 max-w-full"
              />
            </div>
            {renderError && !ready ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {renderError}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={downloadPng} disabled={!ready}>
                Download PNG
              </Button>
              <Button variant="secondary" onClick={downloadSvg} disabled={!ready}>
                Download SVG
              </Button>
              <CopyButton text={payload} label="Copy payload" />
            </div>
            <p className="text-xs leading-relaxed text-muted">
              Tip: scan the code with your own phone before sharing or printing
              it.
            </p>
          </div>
        ) : (
          <div className="flex min-h-40 items-center justify-center rounded-card border border-dashed border-border-strong bg-surface-subtle px-6 py-10 text-center">
            <p className="text-sm text-muted">
              {touched[mode] && !result.ok
                ? "Fix the highlighted field above and your QR code will appear here."
                : "Fill in the fields above — your QR code appears here automatically."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
