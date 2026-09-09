import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/nowe",
        destination: "/spot",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
