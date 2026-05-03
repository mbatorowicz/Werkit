import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: pkg.version,
  },
};

export default nextConfig;
