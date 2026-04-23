import type { NextConfig } from "next";
import path from "path";

// Fail-closed: if NEXT_PUBLIC_APP_URL isn't set in production, the allowlist
// below collapses to [] and the defensive intent vanishes silently. Abort the
// boot instead — a missing production origin is a deployment misconfiguration,
// not something to swallow.
if (
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PUBLIC_APP_URL?.trim()
) {
  throw new Error(
    "NEXT_PUBLIC_APP_URL is required in production. Set it to the canonical https URL (e.g. https://dashboard.ad-lab.io) in your Vercel/host env."
  );
}

// Server Actions' default CSRF protection relies on the Origin header matching
// the request host. A CDN or proxy that rewrites Host/Origin can defeat that
// check silently, so we pin the allowlist explicitly. Deployment contract:
// keep this list aligned with production + any proxy hostnames that terminate
// TLS in front of the app. The localhost/127.0.0.1 dev origins are gated to
// non-production only — accepting them in production would let an attacker
// spoof the Origin header and bypass CSRF. Production uses NEXT_PUBLIC_APP_URL.
const serverActionsAllowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "").replace(/\/$/, ""),
  ...(process.env.NODE_ENV !== "production" ? ["localhost:3000", "127.0.0.1:3000"] : []),
].filter((o): o is string => typeof o === "string" && o.length > 0);

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: serverActionsAllowedOrigins,
      // Default is 1MB. Avatar/logo uploads allow up to 2MB files; multipart
      // framing adds a few KB of overhead, so 3MB gives comfortable headroom
      // without widening the attack surface for oversized payloads.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
