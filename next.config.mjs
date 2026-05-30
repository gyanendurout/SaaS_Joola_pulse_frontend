/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    const seoBase = process.env.SEO_API_URL ?? 'http://localhost:8000'
    const analyticsBase = process.env.ANALYTICS_API_URL ?? 'http://localhost:8001'
    return [
      {
        source: '/seo-api/:path*',
        destination: `${seoBase}/api/:path*`,
      },
      {
        source: '/analytics-api/:path*',
        destination: `${analyticsBase}/:path*`,
      },
    ]
  },
}

export default nextConfig
