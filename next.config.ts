import type { NextConfig } from "next";
import pkg from "./package.json";
import { buildContentSecurityPolicy } from "./src/lib/contentSecurityPolicy";

const isProd = process.env.NODE_ENV === "production";
const isDev = !isProd;

/** Nagłówki odpowiedzi HTTP — obrona przed sniffingiem / clickjackingiem; HSTS tylko na produkcji (HTTPS). */
const securityHeaders: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), camera=(self), geolocation=(self), microphone=(), payment=(), usb=()",
  },
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(isDev),
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  env: {
    APP_VERSION: pkg.version,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
  /** Legacy aliasy — query string jest zachowany automatycznie (np. `/admin/orders?open=123`). */
  async redirects() {
    return [
      { source: "/admin/orders", destination: "/admin", permanent: true },
      { source: "/admin/dur/spare-parts", destination: "/admin/dur/warehouse", permanent: true },
      {
        source: "/admin/dur/spare-part-categories",
        destination: "/admin/dur/warehouse",
        permanent: true,
      },
      { source: "/admin/dur/resource-groups", destination: "/admin/machines", permanent: true },
    ];
  },
};

export default nextConfig;
