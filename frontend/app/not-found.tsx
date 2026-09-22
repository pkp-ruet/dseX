import type { Metadata } from "next";
import Link from "next/link";
import Bn from "@/components/i18n/Bn";

export const metadata: Metadata = {
  title: "Page Not Found",
  description:
    "The page you're looking for doesn't exist. Browse DSE stock rankings and DSEF scores on TopStockBD.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="page-narrow text-center py-20">
      <p className="page-eyebrow">404</p>
      <h1 className="page-h1">Page not found</h1>
      <Bn className="page-h1-bn mx-auto">এই পাতাটি নেই, বা সরিয়ে নেওয়া হয়েছে।</Bn>
      <p className="page-lead mx-auto">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Home
        </Link>
        <Link href="/dsestockranking" className="btn-quiet">
          Stock Rankings
        </Link>
      </div>
    </div>
  );
}
