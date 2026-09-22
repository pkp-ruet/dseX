"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

/** Route error boundary — same surface as app/error.tsx, route-specific copy. */
export default function TodaysNewsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("todays-news failed to render:", error);
  }, [error]);

  return (
    <ErrorState
      title="Couldn't load today's news"
      bn="আজকের খবর এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
      onRetry={reset}
      links={[{ href: "/dse-today", label: "DSE today" }]}
    />
  );
}
