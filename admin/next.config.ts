import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/uploads/:path*",
        destination: `${apiUrl}/api/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
