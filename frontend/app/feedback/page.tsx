import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import FeedbackClient from "@/components/survey/FeedbackClient";
import { T } from "@/components/i18n/T";

// Personal: noindex, no sitemap entry (SEO rule 3 — only indexable URLs).
export const metadata: Metadata = {
  title: "Your feedback",
  description: "Nine short questions about how TopStockBD works for you.",
  robots: { index: false, follow: false },
};

/**
 * The reader survey on a page (2026-11-24): the same flow the pop-up opens,
 * for any signed-in reader. Linked from the menu, the profile and the survey
 * email. Rules: backend/services/survey.py.
 */
export default function FeedbackRoute() {
  return (
    <div className="page-narrow">
      <PageHeader
        title={<T en="Your feedback" bn="আপনার মতামত" />}
        lead={
          <T
            en="Nine short questions about how TopStockBD works for you. What you tell us decides what we build next."
            bn="TopStockBD আপনার কেমন কাজে লাগছে, তা নিয়ে 9টি ছোট প্রশ্ন। আপনার কথা শুনেই ঠিক করি এরপর কী বানাব।"
          />
        }
      />
      <FeedbackClient />
    </div>
  );
}
