import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 10 images × up to 5 MB each = up to 50 MB payload
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
