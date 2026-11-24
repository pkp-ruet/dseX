import type { Metadata } from "next";
import NotificationsClient from "@/components/notifications/NotificationsClient";
import Link from "@/components/ui/Link";
import { IconChevronRight, IconEye } from "@/components/ui/icons";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

// Personal: noindex, no sitemap entry (SEO rule 3 — only indexable URLs).
export const metadata: Metadata = {
  title: "Updates",
  description: "Everything on your DSE shares in one place: the dates coming up and what we noticed in the last 30 days.",
  robots: { index: false, follow: false },
};

/**
 * Updates (2026-11-20, the app map): THE one feed of news on the reader's
 * shares. The dates coming up (from the watchlist's old "Coming up" card),
 * what we noticed in the last 30 days, then one line to the watchlist, where
 * each share's Watch sheet sets what we tell you (rules and price alerts,
 * 2026-11-25; /alerts and /watch-rules 301 there). Same URL as Notifications, so
 * every push and the navbar bell still land here.
 */
export default function UpdatesPage() {
  return (
    <div className="page-narrow">
      <PageHeader
        title={<T en="Updates" bn="আপডেট" />}
        lead={
          <T
            en="The dates coming up and everything we noticed on the shares you own or follow, newest first."
            bn="আপনার কেনা বা অনুসরণ করা শেয়ারের সামনের তারিখ, আর সেগুলোতে আমরা যা দেখেছি, নতুনগুলো আগে।"
          />
        }
      />
      <NotificationsClient />
      <Link href="/watchlist" className="wrp-link">
        <span className="wrp-link-ic" aria-hidden="true">
          <IconEye size={22} />
        </span>
        <span className="wrp-link-text">
          <strong>
            <T en="Choose what we tell you" bn="কী জানাব, বেছে নিন" />
          </strong>
          <T
            en="On your watchlist, tap Watching on any share: results, a dividend, its grade, a big fall, a price."
            bn="ওয়াচলিস্টে যেকোনো শেয়ারের নজরে বোতামে চাপুন: আর্থিক ফল, ডিভিডেন্ড, গ্রেড, বড় দরপতন, একটি দাম।"
          />
        </span>
        <IconChevronRight size={18} />
      </Link>
    </div>
  );
}
