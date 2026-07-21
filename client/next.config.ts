import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getImageRemotePatterns() {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    {
      protocol: "https",
      hostname: "images.unsplash.com",
      pathname: "/**",
    },
  ];

  try {
    const parsed = new URL(apiUrl);
    const protocol = parsed.protocol.replace(":", "") as "http" | "https";

    patterns.push({
      protocol,
      hostname: parsed.hostname,
      pathname: "/api/uploads/**",
    });
  } catch {
    // Keep defaults when API URL is invalid during local setup.
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: getImageRemotePatterns(),
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
