import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForBuild: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "psrefstuff.lenovo.com",
      },
      {
        protocol: "https",
        hostname: "**.lenovo.com",
      },
      {
        protocol: "https",
        hostname: "dlcdnwebimgs.asus.com",
      },
      {
        protocol: "https",
        hostname: "**.asus.com",
      },
      {
        protocol: "https",
        hostname: "static.acer.com",
      },
      {
        protocol: "https",
        hostname: "**.acer.com",
      },
      {
        protocol: "https",
        hostname: "**.hp.com",
      },
      {
        protocol: "https",
        hostname: "**.msi.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "i.imgur.com",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/**" }] : []),
    ],
  },
};

export default nextConfig;
