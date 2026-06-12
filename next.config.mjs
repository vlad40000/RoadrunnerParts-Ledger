/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["got-scraping", "header-generator"],
  outputFileTracingIncludes: {
    "/api/bom/lookup": [
      "./node_modules/header-generator/data_files/**/*"
    ]
  },
};
export default nextConfig;
