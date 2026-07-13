import type { MetadataRoute } from "next";

// Next 15 serves this at /manifest.webmanifest. Needed so the app is installable
// (Add to Home Screen) — a hard requirement for web push on iOS, and a nicer
// standalone experience on Android. Icons live in /public/icons (see README).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TopStockBD — DSE Stock Analysis",
    short_name: "TopStockBD",
    description:
      "Track your DSE stocks, watchlist and portfolio — with a daily snapshot of what moved.",
    start_url: "/?utm_source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#E8760A",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
