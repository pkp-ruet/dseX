"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

/** Route error boundary — same surface as app/error.tsx, route-specific copy. */
export default function AlertsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("alerts failed to render:", error);
  }, [error]);

  return (
    <ErrorState
      title="Couldn't load your alerts"
      bn="আপনার অ্যালার্ট এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
      onRetry={reset}
      links={[{ href: "/watchlist", label: "Your watchlist" }]}
    />
  );
}
