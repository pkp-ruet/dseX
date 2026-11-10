import Link from "@/components/ui/Link";
import type { ReactNode } from "react";
import PageHeader from "@/components/ui/PageHeader";
import PageGate from "@/components/premium/PageGate";
import { IconArrowRight, IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { dayWords, REPORTS, reportDef, type Bi, type ReportSlug } from "@/lib/research-reports";

export const RESEARCH_ANCHOR = "rr-premium";

/**
 * One research report page (2026-11-05): the title and the question it
 * answers, when it was updated, three free key numbers, then the report
 * behind ONE Premium card (`PageGate`: in the HTML for search, shown in place
 * for Premium), how we made it, and the other two reports.
 */
export default function ReportShell({
  slug,
  asOf,
  stats,
  promo,
  method,
  children,
}: {
  slug: ReportSlug;
  asOf: string | null;
  stats: { value: ReactNode; label: Bi; tone?: "negative" | "watch" | "positive" }[];
  promo: ReactNode;
  method: Bi[];
  children: ReactNode;
}) {
  const def = reportDef(slug);
  const day = dayWords(asOf);
  const others = REPORTS.filter((r) => r.slug !== slug);
  return (
    <div className="rr-page">
      <PageHeader
        eyebrow={
          <Link href="/stock-insights" className="rr-eyebrow">
            <span className="rr-crown" aria-hidden="true">
              <IconCrown size={14} />
            </span>
            <T en="Premium research" bn="প্রিমিয়াম গবেষণা" />
          </Link>
        }
        title={<T en={def.title.en} bn={def.title.bn} />}
        lead={<T en={def.question.en} bn={def.question.bn} />}
      />
      {asOf && (
        <p className="rr-dateline">
          <T en={`Updated ${day.en}. ${def.source.en}`} bn={`হালনাগাদ ${day.bn}। ${def.source.bn}`} />
        </p>
      )}

      <dl className="rr-stats">
        {stats.map((s) => (
          <div key={s.label.en} className="rr-stat">
            <dd className={`rr-stat-v nums${s.tone ? ` rr-tone-${s.tone}` : ""}`}>{s.value}</dd>
            <dt className="rr-stat-l">
              <T en={s.label.en} bn={s.label.bn} />
            </dt>
          </div>
        ))}
      </dl>

      <PageGate promo={promo} anchor={RESEARCH_ANCHOR}>
        <div className="rr-body">{children}</div>
      </PageGate>

      <section className="rr-method" aria-labelledby="rr-method-t">
        <h2 id="rr-method-t" className="rr-h2">
          <T en="How we made this report" bn="প্রতিবেদনটি কীভাবে তৈরি" />
        </h2>
        <ul className="rr-method-list">
          {method.map((m) => (
            <li key={m.en}>
              <T en={m.en} bn={m.bn} />
            </li>
          ))}
        </ul>
        <p className="rr-note">
          <T
            en="This report states facts from public filings. It is not advice to buy or sell any share."
            bn="এই প্রতিবেদনে প্রকাশিত নথির তথ্য দেওয়া হয়েছে। কোনো শেয়ার কেনা বা বেচার পরামর্শ নয়।"
          />
        </p>
      </section>

      <nav className="rr-more" aria-label="More research">
        <p className="rr-more-k">
          <T en="More Premium research" bn="আরও প্রিমিয়াম গবেষণা" />
        </p>
        <div className="rr-more-grid">
          {others.map((r) => (
            <Link key={r.slug} href={`/stock-insights/${r.slug}`} className="rr-more-card">
              <span className="rr-more-t">
                <T en={r.title.en} bn={r.title.bn} />
              </span>
              <span className="rr-more-q">
                <T en={r.question.en} bn={r.question.bn} />
              </span>
              <span className="rr-more-go" aria-hidden="true">
                <IconArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
