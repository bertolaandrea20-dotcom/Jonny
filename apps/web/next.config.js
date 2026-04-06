/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/Jonny',
  assetPrefix: '/Jonny/',
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: ['localhost', 'via.placeholder.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
