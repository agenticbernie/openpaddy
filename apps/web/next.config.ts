import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@openpaddy/shared'],
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
