/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Kita matikan trailingSlash karena merusak path CSS di web IP lokal
  trailingSlash: false, 
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
