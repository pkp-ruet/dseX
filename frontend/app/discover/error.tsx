"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";

/** Route error boundary — same surface as app/error.tsx, route-specific copy. */
export default function PickedForYouError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("discover failed to render:", error);
  }, [error]);

  return (
    <ErrorState
      title={<T en="We couldn't load your picks" bn="আপনার বাছাই এখন লোড করা যাচ্ছে না" />}
      onRetry={reset}
      links={[{ href: "/dsestockranking", label: <T en="Company ranking" bn="কোম্পানির র‍্যাঙ্কিং" /> }]}
    />
  );
}
