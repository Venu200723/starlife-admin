// STAR LIFE CLINIC — Staff / Admin website (separate Next.js app)
// Deployed as a standalone Vercel project: shared patient-app sources are
// vendored into ./shared (tsconfig paths @/* -> ./shared/*).

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  // The staff app lives under /staff so a single-port host (e.g. the preview
  // gateway) can reverse-proxy it from the patient app; direct :3001 access
  // uses the same path.
  basePath: "/staff",
  // Inlined into THIS app's client bundle only — the shared apiFetch() in
  // ../src prefixes staff API calls with it; the patient bundle never has it.
  env: {
    NEXT_PUBLIC_STAFF_BASE: "/staff",
  },
  async redirects() {
    return [
      // Bare :3001 visits land on the app root.
      { source: "/", destination: "/staff", permanent: false, basePath: false },
    ];
  },
};

export default nextConfig;
