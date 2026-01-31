/** @type {import('next').NextConfig} */
const nextConfig = {
  serverComponentsExternalPackages: ["duckdb"],
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;