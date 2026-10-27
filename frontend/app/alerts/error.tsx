"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";

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
      title={<T en="We couldn't load your alerts" bn="আপনার অ্যালার্ট এখন লোড করা যাচ্ছে না" />}
      onRetry={reset}
      links={[{ href: "/watchlist", label: <T en="Your watchlist" bn="আপনার ওয়াচলিস্ট" /> }]}
    />
  );
}
