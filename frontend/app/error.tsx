"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

/**
 * Root error boundary — catches any server-component throw under `app/` that a
 * route doesn't handle itself. Shares copy and layout with every other failure
 * surface via ErrorState, so a cold backend looks the same on every page.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page failed to render:", error);
  }, [error]);

  return (
    <ErrorState
      onRetry={reset}
      links={[{ href: "/dsestockranking", label: "Stock rankings" }]}
    />
  );
}
