import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  // Phone testing over LAN or a tunnel: the dev server blocks other hostnames
  // and the page silently never hydrates. DEV_ORIGINS=192.168.1.20,*.trycloudflare.com
  allowedDevOrigins: process.env.DEV_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [],
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
