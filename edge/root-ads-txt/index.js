/**
 * Serves /ads.txt for the ROOT domain itisyou.app.
 *
 * AdSense only registers root domains, so its crawler looks for
 * itisyou.app/ads.txt — but the root app is a SPA that answers every path
 * with HTML. This worker is routed to exactly one path
 * (itisyou.app/ads.txt) and leaves every other root-domain request
 * untouched.
 */
const ADS_TXT = "google.com, pub-4472252904102516, DIRECT, f08c47fec0942fa0\n";

const worker = {
  async fetch() {
    return new Response(ADS_TXT, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  },
};

export default worker;
