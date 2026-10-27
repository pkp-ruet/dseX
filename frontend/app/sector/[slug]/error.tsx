"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";

/** Route error boundary — same surface as app/error.tsx, route-specific copy. */
export default function SectorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("sector/[slug] failed to render:", error);
  }, [error]);

  return (
    <ErrorState
      title={<T en="We couldn't load this sector" bn="এই সেক্টরের তথ্য এখন লোড করা যাচ্ছে না" />}
      onRetry={reset}
      links={[{ href: "/sectors", label: <T en="All sectors" bn="সব সেক্টর" /> }]}
    />
  );
}
