import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "http://192.168.1.8:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "192.168.1.8",
    "127.0.0.1",
    "localhost",
  ],
};

export default nextConfig;
