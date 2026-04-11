/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['heic-convert'],
  allowedDevOrigins: ['192.168.31.2'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        zlib: false,
      };
    }
    return config;
  },
};

export default nextConfig;
