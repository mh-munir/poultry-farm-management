import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  experimental: {
    // Keep production page collection deterministic on Windows/low-memory CI.
    cpus: 1,
    serverActions: {
      // increase body size limit for server actions to allow image uploads (5 MiB)
      bodySizeLimit: 5 * 1024 * 1024
    }
  }
};

export default nextConfig;
