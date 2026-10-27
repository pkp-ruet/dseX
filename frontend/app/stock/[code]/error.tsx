"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";

export default function StockError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Stock page failed to load:", error);
  }, [error]);

  return (
    <ErrorState
      title={<T en="We couldn't load this stock" bn="এই শেয়ারের তথ্য এখন লোড করা যাচ্ছে না" />}
      onRetry={reset}
      links={[{ href: "/stocks", label: <T en="Browse all stocks" bn="সব শেয়ার দেখুন" /> }]}
    />
  );
}
