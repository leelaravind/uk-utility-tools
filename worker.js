/**
 * Thin wrapper over the static assets: adds `charset=utf-8` to HTML
 * responses (the asset layer serves bare `text/html`, which charset-naive
 * HTTP clients would decode as ISO-8859-1 and mangle £ and — characters).
 * Everything else passes straight through, including the _headers rules.
 */
const worker = {
  async fetch(request, env) {
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
