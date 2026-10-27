"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";

/** Route error boundary — same surface as app/error.tsx, route-specific copy. */
export default function DseTodayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("dse-today failed to render:", error);
  }, [error]);

  return (
    <ErrorState
      title={<T en="We couldn't load today's market" bn="আজকের বাজারের তথ্য এখন লোড করা যাচ্ছে না" />}
      onRetry={reset}
      links={[{ href: "/market-analysis", label: <T en="Market analysis" bn="বাজার বিশ্লেষণ" /> }]}
    />
  );
}
