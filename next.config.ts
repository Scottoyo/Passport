import type { NextConfig } from "next";

// Business hero/logo images are public URLs served from this project's own
// Supabase Storage bucket (business-media) - next/image needs the host
// allow-listed to optimize them, unlike the site's other images which are
// all local files under public/.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
