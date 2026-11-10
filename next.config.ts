import type { NextConfig } from "next";

// Static export: the whole product is static files (docs/DECISIONS.md D-001).
const nextConfig: NextConfig = {
  output: "export",
  // Emit review/index.html etc., so any static host (and `python -m http.server`) serves /review/.
  trailingSlash: true,
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
