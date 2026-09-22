"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

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
      title="Couldn't load this sector"
      bn="এই খাতের তথ্য এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
      onRetry={reset}
      links={[{ href: "/sectors", label: "All sectors" }]}
    />
  );
}
