import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  basePath: '/tools/job-tracker',
  serverExternalPackages: [
    "@prisma/adapter-libsql",
    "@libsql/client",
    "libsql",
    "@libsql/linux-x64-gnu",
  ],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
