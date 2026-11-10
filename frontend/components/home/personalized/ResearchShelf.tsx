import Link from "@/components/ui/Link";
import { REPORTS, reportStat, type ResearchSummary } from "@/lib/research-reports";
import FindCard from "@/components/home/personalized/FindCard";
import { REPORT_ICON } from "@/components/research-reports/reportIcons";
import { T } from "@/components/i18n/T";
import { IconChevronRight, IconCrown } from "@/components/ui/icons";

/**
 * "Premium research" on the dashboard (2026-11-06, user: "feature all
 * research sections"): the six reports as tiles — icon, name, today's one
 * headline number from the hub's summary (`/api/user/home` `research`) or,
 * before the backend has built it, the question the report answers. Every
 * tile opens its report; a free reader meets that report's own Premium card
 * there (its three key numbers are free). One link to the hub.
 */
export default function ResearchShelf({
  summary,
  premium,
}: {
  summary: ResearchSummary | null | undefined;
  premium: boolean;
}) {
  return (
    <FindCard
      id="fc-research"
      tone="gold"
      icon={<IconCrown size={14} />}
      eyebrow={<T en="Premium research" bn="প্রিমিয়াম গবেষণা" />}
      title={<T en="Our research on the DSE" bn="ডিএসই নিয়ে আমাদের গবেষণা" />}
      lead={
        premium ? (
          <T
            en="Six reports where we check every company for you. Updated after every close."
            bn="ছয়টি প্রতিবেদন, যেখানে আমরা আপনার হয়ে প্রতিটি কোম্পানি যাচাই করি। প্রতিদিন বাজার বন্ধের পর হালনাগাদ।"
          />
        ) : (
          <T
            en="Six reports where we check every company for you. The headline numbers are free; the full reports are Premium."
            bn="ছয়টি প্রতিবেদন, যেখানে আমরা আপনার হয়ে প্রতিটি কোম্পানি যাচাই করি। মূল সংখ্যাগুলো ফ্রি, পুরো প্রতিবেদন প্রিমিয়ামে।"
          />
        )
      }
      href="/stock-insights"
      allLabel={<T en="All research" bn="সব গবেষণা" />}
      footLabel={<T en="See all six reports" bn="ছয়টি প্রতিবেদনই দেখুন" />}
    >
      <ul className="fcx">
        {REPORTS.map((r) => {
          const Icon = REPORT_ICON[r.slug];
          const stat = reportStat(r.slug, summary);
          return (
            <li key={r.slug}>
              <Link prefetch={false} href={`/stock-insights/${r.slug}`} className="fcx-tile">
                <span className="fcx-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="fcx-body">
                  <span className="fcx-name">
                    <T en={r.title.en} bn={r.title.bn} />
                  </span>
                  {stat ? (
                    <span className="fcx-stat">
                      <b className="nums">
                        <T en={stat.value.en} bn={stat.value.bn} />
                      </b>{" "}
                      <T en={stat.label.en} bn={stat.label.bn} />
                    </span>
                  ) : (
                    <span className="fcx-q">
                      <T en={r.question.en} bn={r.question.bn} />
                    </span>
                  )}
                </span>
                <span className="fcx-go" aria-hidden="true">
                  <IconChevronRight size={16} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </FindCard>
  );
}
