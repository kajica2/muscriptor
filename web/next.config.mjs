/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: '100mb' },
  },
  transpilePackages: ['@muscriptor/shared-types'],
};

export default nextConfig;