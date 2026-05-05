"use client";

import { useEffect } from "react";
import Link from "next/link";

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
    <div className="text-center py-20 px-4">
      <h2 className="text-2xl font-bold mb-2">Couldn&apos;t load this stock</h2>
      <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
        The data service didn&apos;t respond in time. This is usually a brief
        cold-start — try again in a moment.
      </p>
      <div className="flex justify-center gap-3 flex-wrap">
        <button
          onClick={() => reset()}
          className="text-sm font-medium px-4 py-2 rounded-md bg-[var(--primary)] text-white hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/stocks"
          className="text-sm font-medium px-4 py-2 rounded-md border border-[var(--border)] hover:bg-[var(--surface-hover)]"
        >
          Browse all stocks
        </Link>
        <Link
          href="/"
          className="text-sm font-medium px-4 py-2 rounded-md text-[var(--primary)] hover:underline self-center"
        >
          ← Home
        </Link>
      </div>
    </div>
  );
}
