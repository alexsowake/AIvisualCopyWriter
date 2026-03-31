/** @type {import('next').NextConfig} */
const nextConfig = {
  // 处理 HEIC 转换等依赖 Wasm/Native 的外部包，规避 Webpack 静态分析警告
  serverExternalPackages: ['heic-convert', 'heic-decode', 'libheif-js'],
};

export default nextConfig;
