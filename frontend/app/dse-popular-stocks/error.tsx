"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";

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
      title={<T en="We couldn't load popular stocks" bn="জনপ্রিয় শেয়ার এখন লোড করা যাচ্ছে না" />}
      onRetry={reset}
      links={[{ href: "/dsestockranking", label: <T en="Stock rankings" bn="শেয়ার র‍্যাঙ্কিং" /> }]}
    />
  );
}
