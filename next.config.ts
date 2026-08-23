import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: supabaseUrl
    ? {
        remotePatterns: [
          { protocol: "https", hostname: new URL(supabaseUrl).hostname },
        ],
      }
    : undefined,
};

export default nextConfig;
