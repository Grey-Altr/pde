import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default withSerwist(nextConfig);
