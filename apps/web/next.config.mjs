/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nexus/types", "@nexus/storage", "@nexus/design-system", "@nexus/canvas"],
  reactStrictMode: true,
};

export default nextConfig;
