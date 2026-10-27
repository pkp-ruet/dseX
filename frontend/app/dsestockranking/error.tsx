"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";

/** Route error boundary — same surface as app/error.tsx, route-specific copy. */
export default function RankingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("dsestockranking failed to render:", error);
  }, [error]);

  return (
    <ErrorState
      title={<T en="We couldn't load the rankings" bn="র‍্যাঙ্কিং এখন লোড করা যাচ্ছে না" />}
      onRetry={reset}
      links={[{ href: "/stocks", label: <T en="Browse all stocks" bn="সব শেয়ার দেখুন" /> }]}
    />
  );
}
