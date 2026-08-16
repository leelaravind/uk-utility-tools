/**
 * Thin wrapper over the static assets: adds `charset=utf-8` to HTML
 * responses (the asset layer serves bare `text/html`, which charset-naive
 * HTTP clients would decode as ISO-8859-1 and mangle £ and — characters).
 * Everything else passes straight through, including the _headers rules.
 */
const CANONICAL_HOST = "tools.itisyou.app";

const worker = {
  async fetch(request, env) {
    // Redirect the *.workers.dev hostname to the canonical custom domain so
    // crawlers never index a duplicate of the site.
    const url = new URL(request.url);
    if (url.hostname.endsWith(".workers.dev")) {
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }

    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get("content-type");
    if (type && type.startsWith("text/html") && !type.includes("charset")) {
      const headers = new Headers(response.headers);
      headers.set("content-type", "text/html; charset=utf-8");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    return response;
  },
};

export default worker;
