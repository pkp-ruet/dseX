"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";

/** Route error boundary — same surface as app/error.tsx, route-specific copy. */
export default function MarketAnalysisError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("market-analysis failed to render:", error);
  }, [error]);

  return (
    <ErrorState
      title={<T en="We couldn't load the market analysis" bn="বাজার বিশ্লেষণ এখন লোড করা যাচ্ছে না" />}
      onRetry={reset}
      links={[{ href: "/dse-today", label: <T en="DSE today" bn="আজকের DSE" /> }]}
    />
  );
}
