import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Allow pdf-parse (CommonJS) to be bundled server-side correctly
  serverExternalPackages: ["pdf-parse", "mammoth"],

  // Fix workspace root detection warning
  outputFileTracingRoot: path.join(__dirname, "../"),

  // Increase request body size for file uploads (default is 4MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
