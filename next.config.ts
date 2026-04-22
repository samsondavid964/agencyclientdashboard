import type { NextConfig } from "next";
import path from "path";

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
    },
  },
};

export default nextConfig;
