/** @type {import('next').NextConfig} */
const nextConfig = {
  // 处理 HEIC 转换等依赖 Wasm/Native 的外部包，规避 Webpack 静态分析警告
  // 在 Next.js 14.2.35 中，需置于 experimental 属性下
  experimental: {
    serverComponentsExternalPackages: ['heic-convert', 'heic-decode', 'libheif-js'],
  },
};

export default nextConfig;
