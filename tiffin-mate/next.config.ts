import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained `.next/standalone` output (server + only the
  // node_modules actually reachable from the build) instead of requiring the
  // full node_modules tree at runtime - keeps the production Docker image
  // small and avoids a `npm install` step in the final image stage.
  output: 'standalone',
};

export default nextConfig;
