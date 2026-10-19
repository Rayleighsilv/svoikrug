/** @type {import('next').NextConfig} */
const nextConfig = {
  // Минимальный production-образ: собирает автономный сервер
  // (web/.next/standalone/server.js), см. web/Dockerfile.
  output: 'standalone',
};

export default nextConfig;
