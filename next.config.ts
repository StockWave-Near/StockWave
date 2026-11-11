import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // Apply security headers to every route.
        source: "/(.*)",
        headers: [
          // Prevent the #k= claim key from leaking into Referer headers on navigations.
          { key: "Referrer-Policy", value: "no-referrer" },
          // Disallow rendering this site inside iframes (clickjacking protection).
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
