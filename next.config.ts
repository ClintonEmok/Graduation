/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["duckdb"],
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;