import type { NextConfig } from "next";

const isStaticExport = process.env.PLAYWRIGHT_STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  trailingSlash: true,
  ...(isStaticExport
    ? {
        output: "export" as const,
        images: {
          unoptimized: true,
        },
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
