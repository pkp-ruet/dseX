import Link from "next/link";
import { tt } from "@/components/home/tt";
import { T } from "@/components/i18n/T";
import DashHeader from "@/components/home/personalized/DashHeader";

/**
 * "Today's market at a glance" — the backend's plain paragraph on the day
 * (`summary_bn`, and its English twin `summary_en` from 2026-10-27). The card
 * follows the page language; with an older backend that sends only Bengali it
 * shows in Bengali mode only. Bengali readers go on to the daily Bengali
 * article, English readers to Market analysis.
 */
export default function BanglaSnapshotCard({
  summary,
  summaryEn,
}: {
  summary: string | null | undefined;
  summaryEn?: string | null;
}) {
  const bn = (summary ?? "").trim();
  const en = (summaryEn ?? "").trim();
  if (!bn && !en) return null;
  const link = "inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-primary-ink hover:underline active:opacity-70";
  return (
    <section className="soft-card overflow-hidden" data-l={en && bn ? undefined : en ? "en" : "bn"}>
      <DashHeader
        title={tt("snapshotTitle")}
        right={
          <T
            en={<Link prefetch={false} href="/market-analysis" className={link}>{tt("fullPicture")} →</Link>}
            bn={<Link prefetch={false} href="/share-bazar" className={link}>{tt("readFull")} →</Link>}
          />
        }
      />
      <p className="px-4 py-4 text-base leading-relaxed text-text-main sm:px-5">
        <T en={en || bn} bn={bn || en} />
      </p>
    </section>
  );
}
