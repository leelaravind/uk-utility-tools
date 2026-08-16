/**
 * Root-domain edge worker for the ITISYOU network.
 *
 * Serves exactly three things, leaving every other itisyou.app path to the
 * existing application:
 *   1. GET itisyou.app/          → the ITISYOU network landing page
 *   2. GET itisyou.app/ads.txt   → AdSense authorisation record
 *   3. www.itisyou.app/*         → 301 to the apex domain (custom domain
 *                                  attached to this worker)
 */

const ADS_TXT = "google.com, pub-4472252904102516, DIRECT, f08c47fec0942fa0\n";

const LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ITISYOU — practical tools and calm spaces</title>
<meta name="description" content="ITISYOU is a small independent network of web experiences: free UK utility tools that run in your browser, and a quiet space to slow down. No accounts, privacy-first.">
<link rel="canonical" href="https://itisyou.app/">
<meta property="og:title" content="ITISYOU — practical tools and calm spaces">
<meta property="og:description" content="A small independent network of web experiences: free browser-based utility tools and a quiet space to unwind. No accounts required.">
<meta property="og:url" content="https://itisyou.app/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ITISYOU">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%234f46e5'/%3E%3Ccircle cx='16' cy='16' r='6' fill='white'/%3E%3C/svg%3E">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4472252904102516" crossorigin="anonymous"></script>
<style>
  :root{
    --bg:#fafaf9;--surface:#ffffff;--fg:#1c1917;--muted:#57534e;--faint:#a8a29e;
    --border:#e7e5e4;--accent:#4f46e5;--accent-soft:#eef2ff;--accent-border:#c7d2fe;
  }
  @media (prefers-color-scheme:dark){
    :root{
      --bg:#0c0a09;--surface:#1c1917;--fg:#fafaf9;--muted:#d6d3d1;--faint:#78716c;
      --border:#292524;--accent:#818cf8;--accent-soft:#1e1b4b;--accent-border:#3730a3;
    }
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html{color-scheme:light dark}
  body{background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.65;-webkit-font-smoothing:antialiased}
  .wrap{max-width:44rem;margin:0 auto;padding:4rem 1.25rem 3rem}
  .mark{display:inline-flex;align-items:center;gap:.6rem;font-weight:700;letter-spacing:.12em;font-size:.95rem}
  .mark .dot{width:1.4rem;height:1.4rem;border-radius:.45rem;background:var(--accent);display:inline-block;position:relative}
  .mark .dot::after{content:"";position:absolute;inset:35%;border-radius:50%;background:#fff}
  h1{font-size:clamp(1.9rem,5vw,2.6rem);letter-spacing:-.02em;line-height:1.15;margin-top:2.2rem}
  .lede{color:var(--muted);font-size:1.08rem;margin-top:1rem;max-width:38rem}
  h2{font-size:1.25rem;letter-spacing:-.01em;margin-bottom:.4rem}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:1rem;padding:1.5rem;margin-top:1.4rem;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  .card p{color:var(--muted);margin-top:.35rem}
  .card ul{color:var(--muted);margin:.6rem 0 0 1.1rem}
  .card li{margin-top:.25rem}
  .btn{display:inline-block;margin-top:1rem;background:var(--accent);color:#fff;text-decoration:none;font-weight:600;font-size:.95rem;padding:.65rem 1.15rem;border-radius:.6rem}
  .btn:hover{filter:brightness(1.08)}
  .btn.secondary{background:var(--accent-soft);color:var(--accent);border:1px solid var(--accent-border)}
  .next{margin-top:2.4rem;color:var(--muted)}
  .next h2{color:var(--fg)}
  footer{margin-top:3.5rem;padding-top:1.5rem;border-top:1px solid var(--border);color:var(--faint);font-size:.9rem;display:flex;flex-wrap:wrap;gap:.5rem 1.25rem}
  footer a{color:var(--muted);text-decoration:none}
  footer a:hover{text-decoration:underline}
  a:focus-visible,.btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
</style>
</head>
<body>
<div class="wrap">
  <span class="mark"><span class="dot" aria-hidden="true"></span>ITISYOU</span>

  <h1>Practical tools and calm spaces, built for the open web.</h1>
  <p class="lede">ITISYOU is a small independent network of web experiences built around
  two ideas that rarely sit together: practical usefulness and calm simplicity. Everything
  we make runs in your browser, needs no account, and treats your privacy as the default —
  not a setting.</p>

  <div class="card">
    <h2>Tools — free UK utility tools</h2>
    <p>A polished collection of fifteen free calculators and utilities for everyday tasks,
    designed around one principle: one problem, one form, one instantly useful answer.</p>
    <ul>
      <li><strong>Work &amp; pay</strong> — shift pay, take-home salary, overtime, working hours and holiday pay calculators, using tax figures verified against GOV.UK.</li>
      <li><strong>Money</strong> — credit card payoff planning and self-employed profit estimates.</li>
      <li><strong>Documents &amp; images</strong> — merge and split PDFs, compress images, build invoices and QR codes, all processed on your own device and never uploaded.</li>
      <li><strong>Career</strong> — compare your CV against a job description, draft application answers, and count down visa dates.</li>
    </ul>
    <a class="btn" href="https://tools.itisyou.app/">Open the tools →</a>
  </div>

  <div class="card">
    <h2>Space — a quiet place</h2>
    <p>The other half of the network is the opposite of a productivity tool: a calm,
    ambient corner of the web made for slowing down. No feeds, no notifications, no
    goals — just a quiet place to pause for a few minutes and breathe.</p>
    <a class="btn secondary" href="https://space.itisyou.app/">Visit the space →</a>
  </div>

  <div class="next">
    <h2>What's next</h2>
    <p>ITISYOU is young and growing deliberately. We have plenty of ideas in the
    works — new tools, and new experiences — and we add them only when they meet the
    same bar as everything above: genuinely useful or genuinely calming, free to use,
    and respectful of your privacy.</p>
  </div>

  <footer>
    <span>© 2026 ITISYOU</span>
    <a href="https://tools.itisyou.app/about">About</a>
    <a href="https://tools.itisyou.app/privacy">Privacy</a>
    <a href="https://tools.itisyou.app/terms">Terms</a>
    <a href="https://tools.itisyou.app/contact">Contact</a>
  </footer>
</div>
</body>
</html>
`;

const worker = {
  async fetch(request) {
    const url = new URL(request.url);

    // www.itisyou.app (custom domain on this worker) → apex, keeping path.
    if (url.hostname === "www.itisyou.app") {
      url.hostname = "itisyou.app";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/ads.txt") {
      return new Response(ADS_TXT, {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=3600",
        },
      });
    }

    return new Response(LANDING_HTML, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
      },
    });
  },
};

export default worker;
