/** @type {import('next').NextConfig} */
const nextConfig = {
  // Kita matikan trailingSlash karena merusak path CSS di web IP lokal
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
