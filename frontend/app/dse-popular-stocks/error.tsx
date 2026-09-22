"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

/** Route error boundary — same surface as app/error.tsx, route-specific copy. */
export default function PopularError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("dse-popular-stocks failed to render:", error);
  }, [error]);

  return (
    <ErrorState
      title="Couldn't load popular stocks"
      bn="জনপ্রিয় শেয়ার এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
      onRetry={reset}
      links={[{ href: "/dsestockranking", label: "Stock rankings" }]}
    />
  );
}
