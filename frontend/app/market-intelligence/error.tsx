"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

/** Route error boundary — same surface as app/error.tsx, route-specific copy. */
export default function MarketIntelligenceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("market-intelligence failed to render:", error);
  }, [error]);

  return (
    <ErrorState
      title="Couldn't load market intelligence"
      bn="মার্কেট ইন্টেলিজেন্স এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
      onRetry={reset}
      links={[{ href: "/market-analysis", label: "Market analysis" }]}
    />
  );
}
