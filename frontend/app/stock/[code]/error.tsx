"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

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
      title="Couldn't load this stock"
      bn="এই শেয়ারের তথ্য এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
      onRetry={reset}
      links={[{ href: "/stocks", label: "Browse all stocks" }]}
    />
  );
}
