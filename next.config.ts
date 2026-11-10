import type { NextConfig } from "next";

// Static export: the whole product is static files (docs/DECISIONS.md D-001).
const nextConfig: NextConfig = {
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
