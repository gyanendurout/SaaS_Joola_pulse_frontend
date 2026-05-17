/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    const seoBase = process.env.SEO_API_URL ?? 'http://localhost:8000'
    return [
      {
        source: '/seo-api/:path*',
        destination: `${seoBase}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
