import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: {
    // Enable standalone output for Docker
  },
};

export default nextConfig;
