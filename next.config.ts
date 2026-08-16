import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site — every route is prerendered to HTML at build time and
  // served as static assets (Cloudflare Workers static assets).
  output: "export",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
