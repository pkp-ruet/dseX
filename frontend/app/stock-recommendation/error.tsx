"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

/** Route error boundary — same surface as app/error.tsx, route-specific copy. */
export default function RecommendationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("stock-recommendation failed to render:", error);
  }, [error]);

  return (
    <ErrorState
      title="Couldn't load the recommendations"
      bn="সুপারিশ এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
      onRetry={reset}
      links={[{ href: "/dsestockranking", label: "Stock rankings" }]}
    />
  );
}
