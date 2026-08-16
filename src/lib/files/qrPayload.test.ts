import { describe, expect, it } from "vitest";

import {
  buildEmailPayload,
  buildPhonePayload,
  buildTextPayload,
  buildUrlPayload,
  buildWifiPayload,
  escapeWifiValue,
} from "./qrPayload";

describe("buildUrlPayload", () => {
  it("adds https:// when no scheme is given", () => {
    expect(buildUrlPayload("example.com")).toEqual({
      ok: true,
      payload: "https://example.com",
    });
    expect(buildUrlPayload("www.gov.uk/renew-passport")).toEqual({
      ok: true,
      payload: "https://www.gov.uk/renew-passport",
    });
  });

  it("keeps an existing http/https scheme untouched", () => {
    expect(buildUrlPayload("http://example.com/page?a=1")).toEqual({
      ok: true,
      payload: "http://example.com/page?a=1",
    });
    expect(buildUrlPayload("HTTPS://EXAMPLE.COM")).toEqual({
      ok: true,
      payload: "HTTPS://EXAMPLE.COM",
    });
  });

  it("does not mistake a port for a scheme", () => {
    expect(buildUrlPayload("localhost:3000")).toEqual({
      ok: true,
      payload: "https://localhost:3000",
    });
  });

  it("passes through bare schemes like mailto:", () => {
    expect(buildUrlPayload("mailto:hi@example.com")).toEqual({
      ok: true,
      payload: "mailto:hi@example.com",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(buildUrlPayload("  example.com  ")).toEqual({
      ok: true,
      payload: "https://example.com",
    });
  });

  it("rejects empty input", () => {
    const result = buildUrlPayload("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("url");
  });

  it("rejects input containing spaces", () => {
    const result = buildUrlPayload("not a url");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/spaces/i);
  });

  it("rejects unparseable addresses", () => {
    const result = buildUrlPayload("https://");
    expect(result.ok).toBe(false);
  });
});

describe("buildTextPayload", () => {
  it("encodes the text exactly as typed, keeping newlines", () => {
    expect(buildTextPayload("Line one\nLine two")).toEqual({
      ok: true,
      payload: "Line one\nLine two",
    });
  });

  it("rejects empty and whitespace-only text", () => {
    expect(buildTextPayload("").ok).toBe(false);
    expect(buildTextPayload("   ").ok).toBe(false);
  });
});

describe("escapeWifiValue", () => {
  it("escapes backslash, semicolon, comma, colon and double quote", () => {
    expect(escapeWifiValue("a;b")).toBe("a\\;b");
    expect(escapeWifiValue("a,b")).toBe("a\\,b");
    expect(escapeWifiValue("a:b")).toBe("a\\:b");
    expect(escapeWifiValue('a"b')).toBe('a\\"b');
    expect(escapeWifiValue("a\\b")).toBe("a\\\\b");
  });

  it("leaves ordinary characters and emoji untouched", () => {
    expect(escapeWifiValue("Flat 4 🦊 network")).toBe("Flat 4 🦊 network");
  });
});

describe("buildWifiPayload", () => {
  it("builds a standard WPA payload", () => {
    expect(
      buildWifiPayload({
        ssid: "HomeNetwork",
        password: "hunter22",
        security: "WPA",
        hidden: false,
      }),
    ).toEqual({ ok: true, payload: "WIFI:T:WPA;S:HomeNetwork;P:hunter22;;" });
  });

  it("escapes special characters in SSID and password", () => {
    // SSID "Cafe;Net", password: p,a:s"s\  →  each special char escaped.
    expect(
      buildWifiPayload({
        ssid: "Cafe;Net",
        password: 'p,a:s"s\\',
        security: "WPA",
        hidden: false,
      }),
    ).toEqual({
      ok: true,
      payload: 'WIFI:T:WPA;S:Cafe\\;Net;P:p\\,a\\:s\\"s\\\\;;',
    });
  });

  it("keeps emoji in the SSID as-is", () => {
    expect(
      buildWifiPayload({
        ssid: "Flat 🦊",
        password: "pw",
        security: "WPA",
        hidden: false,
      }),
    ).toEqual({ ok: true, payload: "WIFI:T:WPA;S:Flat 🦊;P:pw;;" });
  });

  it("omits P: entirely for open (nopass) networks", () => {
    expect(
      buildWifiPayload({
        ssid: "Cafe Guest",
        password: "",
        security: "nopass",
        hidden: false,
      }),
    ).toEqual({ ok: true, payload: "WIFI:T:nopass;S:Cafe Guest;;" });
  });

  it("adds H:true; for hidden networks", () => {
    expect(
      buildWifiPayload({
        ssid: "Home",
        password: "pw",
        security: "WPA",
        hidden: true,
      }),
    ).toEqual({ ok: true, payload: "WIFI:T:WPA;S:Home;P:pw;H:true;;" });
    expect(
      buildWifiPayload({
        ssid: "Home",
        password: "",
        security: "nopass",
        hidden: true,
      }),
    ).toEqual({ ok: true, payload: "WIFI:T:nopass;S:Home;H:true;;" });
  });

  it("supports WEP", () => {
    expect(
      buildWifiPayload({
        ssid: "OldRouter",
        password: "abc12",
        security: "WEP",
        hidden: false,
      }),
    ).toEqual({ ok: true, payload: "WIFI:T:WEP;S:OldRouter;P:abc12;;" });
  });

  it("requires an SSID", () => {
    const result = buildWifiPayload({
      ssid: "  ",
      password: "pw",
      security: "WPA",
      hidden: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("ssid");
  });

  it("requires a password unless security is nopass", () => {
    const result = buildWifiPayload({
      ssid: "Home",
      password: "",
      security: "WPA",
      hidden: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("password");
  });
});

describe("buildEmailPayload", () => {
  it("builds a bare mailto: when there is no subject or body", () => {
    expect(buildEmailPayload({ to: "test@example.co.uk" })).toEqual({
      ok: true,
      payload: "mailto:test@example.co.uk",
    });
  });

  it("percent-encodes subject and body", () => {
    expect(
      buildEmailPayload({
        to: "test@example.co.uk",
        subject: "Hello & welcome",
        body: "Line one\nLine two",
      }),
    ).toEqual({
      ok: true,
      payload:
        "mailto:test@example.co.uk?subject=Hello%20%26%20welcome&body=Line%20one%0ALine%20two",
    });
  });

  it("includes only the parts that are provided", () => {
    expect(
      buildEmailPayload({ to: "a@b.com", subject: "Hi" }),
    ).toEqual({ ok: true, payload: "mailto:a@b.com?subject=Hi" });
    expect(buildEmailPayload({ to: "a@b.com", body: "Hi" })).toEqual({
      ok: true,
      payload: "mailto:a@b.com?body=Hi",
    });
  });

  it("rejects a missing or invalid address", () => {
    const missing = buildEmailPayload({ to: "" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.field).toBe("to");

    expect(buildEmailPayload({ to: "not-an-email" }).ok).toBe(false);
    expect(buildEmailPayload({ to: "two words@example.com" }).ok).toBe(false);
  });
});

describe("buildPhonePayload", () => {
  it("strips spaces, hyphens, dots and brackets", () => {
    expect(buildPhonePayload("07700 900123")).toEqual({
      ok: true,
      payload: "tel:07700900123",
    });
    expect(buildPhonePayload("+44 7700 900-123")).toEqual({
      ok: true,
      payload: "tel:+447700900123",
    });
    expect(buildPhonePayload("(020) 7946.0958")).toEqual({
      ok: true,
      payload: "tel:02079460958",
    });
  });

  it("keeps a leading + for international numbers", () => {
    expect(buildPhonePayload("+447700900123")).toEqual({
      ok: true,
      payload: "tel:+447700900123",
    });
  });

  it("rejects empty, non-numeric and too-short input", () => {
    const empty = buildPhonePayload("   ");
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.field).toBe("phone");

    expect(buildPhonePayload("call me").ok).toBe(false);
    expect(buildPhonePayload("12").ok).toBe(false);
    expect(buildPhonePayload("++44123456").ok).toBe(false);
  });
});
