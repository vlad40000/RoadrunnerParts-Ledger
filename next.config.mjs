/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["header-generator"],
  outputFileTracingIncludes: {
    "/api/bom/lookup": [
      "./node_modules/header-generator/data_files/**/*"
    ]
  },
};
export default nextConfig;
