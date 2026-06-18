"use client";

import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";

/**
 * Renders Google Analytics on every route EXCEPT admin pages.
 * Admin views (`/admin/*`) are internal tooling and should not pollute
 * GA traffic/pageview reports, so the GA script is simply not mounted there.
 */
export default function ConditionalAnalytics({ gaId }: { gaId: string }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
