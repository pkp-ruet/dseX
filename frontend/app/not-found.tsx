import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  description:
    "The page you're looking for doesn't exist. Browse DSE stock rankings and DSEF scores on TopStockBD.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold mb-2">404 — Page Not Found</h2>
      <p className="text-[var(--text-muted)] mb-6">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex justify-center gap-4">
        <Link
          href="/"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          ← Home
        </Link>
        <Link
          href="/dsestockranking"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          Stock Rankings →
        </Link>
      </div>
    </div>
  );
}
