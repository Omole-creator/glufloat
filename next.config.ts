import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Blog cover images live in the public Supabase Storage bucket. next/image
    // refuses any remote host not listed here, so without this a post with a
    // cover renders a broken image.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
