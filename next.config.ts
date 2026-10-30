import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Internal (staff) pages live under /concierge, member pages under /proposal — one prefix per
  // audience, so access control can later be a single proxy.ts matcher. "/" has no page of its own.
  async redirects() {
    return [{ source: "/", destination: "/concierge", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
