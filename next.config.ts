import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['duckdb'],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
