/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['llkacrchwiefgdgmuixl.supabase.co'],
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_OZON_API_URL: process.env.NEXT_PUBLIC_OZON_API_URL,
  },
  output: 'standalone',
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
