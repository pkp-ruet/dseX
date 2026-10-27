import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/components/i18n/T";

export const metadata: Metadata = {
  title: "Page Not Found",
  description:
    "The page you're looking for doesn't exist. Browse DSE stock rankings and company scores on TopStockBD.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="page-narrow text-center py-20">
      <p className="page-eyebrow">404</p>
      <h1 className="page-h1">
        <T en="We couldn't find this page" bn="পেজটি খুঁজে পাওয়া যায়নি" />
      </h1>
      <p className="page-lead mx-auto">
        <T
          en="The page may have moved, or the link may have a small mistake in it."
          bn="পেজটি হয়তো সরানো হয়েছে, অথবা লিংকে ছোট কোনো ভুল আছে।"
        />
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          <T en="Home" bn="হোম" />
        </Link>
        <Link href="/dsestockranking" className="btn-quiet">
          <T en="Stock rankings" bn="শেয়ার র‍্যাঙ্কিং" />
        </Link>
      </div>
    </div>
  );
}
