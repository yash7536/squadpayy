import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server accept requests when opened from a phone on the
  // same Wi-Fi via http://<this machine's LAN IP>:3000 — without this,
  // Next.js's dev-only cross-origin origin check can interfere with asset/
  // RSC requests from that origin, which is exactly the "network" URL
  // printed by `next dev` for real-device testing. Add your machine's IP
  // here if it changes (check with `ipconfig` / `ifconfig`).
  allowedDevOrigins: ["192.168.29.89"],
};

export default nextConfig;
