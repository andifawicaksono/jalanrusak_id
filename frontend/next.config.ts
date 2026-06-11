import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    // Izinkan load gambar dari backend lokal dan domain eksternal
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      // Tambahkan domain production di sini jika sudah deploy
      // { protocol: 'https', hostname: 'your-domain.com', pathname: '/uploads/**' },
    ],
  },
};

export default nextConfig;
