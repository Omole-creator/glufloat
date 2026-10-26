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
  // The creator partnership summary is shared by link in outreach emails. It
  // is not linked from any page; keep search engines from listing it.
  async headers() {
    return [
      {
        source: "/creators/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
