import type { NextConfig } from "next";

const isStaticExport = process.env.PLAYWRIGHT_STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  ...(isStaticExport
    ? {
        output: "export" as const,
      }
    : {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: "http://localhost:3002/api/:path*", // Proxy to Express backend
            },
          ];
        },
      }),
};

export default nextConfig;
