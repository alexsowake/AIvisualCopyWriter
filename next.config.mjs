/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['heic-convert'],
  },
};

export default nextConfig;
