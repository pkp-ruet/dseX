"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";

/** Route error boundary — same surface as app/error.tsx, route-specific copy. */
export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("blog failed to render:", error);
  }, [error]);

  return (
    <ErrorState
      title={<T en="We couldn't load this post" bn="এই লেখাটি এখন লোড করা যাচ্ছে না" />}
      onRetry={reset}
      links={[{ href: "/blog", label: <T en="All posts" bn="সব লেখা" /> }]}
    />
  );
}
