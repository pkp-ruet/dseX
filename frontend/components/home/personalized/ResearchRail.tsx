"use client";

import type { ResearchListSummary } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { companyShort } from "@/lib/formatters";
import { RESEARCH_LISTS, formatResearchMetric } from "@/lib/research-lists";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import RailCard, { Rail, RailHeader } from "@/components/home/personalized/RailCard";
import StockRow from "@/components/ui/StockRow";
import { tt } from "@/components/home/tt";
import { T } from "@/components/i18n/T";

/**
 * The six research lists on the homepage (replaced the four "Ready-made
 * lists" lenses, 2026-10-24): the dashboard's swipe rail, one card per list,
 * its top three names with the number that put them there, "See all N".
 * Every reader sees it since 2026-10-29 (the Free vs Premium plan: the top 3
 * of every list is free); the rest of each list is locked on its own page.
 * It used to be a promotion card with counts only for anyone not Premium.
 */
export default function ResearchRail({
  lists,
  held,
  watched,
  lang = "en",
}: {
  lists: ResearchListSummary[] | null | undefined;
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const live = new Map((lists ?? []).map((l) => [l.slug, l]));
  const rows = RESEARCH_LISTS.map((def) => ({ def, l: live.get(def.slug) }));
  const full = rows.some((r) => (r.l?.top.length ?? 0) > 0);

  if (full) {
    return (
      <div>
        <RailHeader
          title={tt("researchTitle")}
          sub={tt("researchSub")}
          href="/stock-insights#research"
          linkLabel={tt("allLists")}
        />
        <Rail>
          {rows.filter((r) => r.l && r.l.top.length > 0).map(({ def, l }) => (
            <RailCard
              key={def.slug}
              title={<T en={def.shortName} bn={def.shortNameBn} />}
              sub={<T en={def.hook} bn={def.hookBn} />}
              href={`/stock-insights/${def.slug}`}
              linkLabel={tt("researchSeeAll", { n: l!.passed })}
              listLabel={tt("topN", { n: l!.top.length })}
              valueLabel={l!.metric ? <T en={l!.metric.label_en} bn={l!.metric.label_bn} /> : undefined}
            >
              {l!.top.map((s) => {
                const m = l!.metric ? formatResearchMetric(l!.metric, s.metric) : null;
                return (
                  <StockRow
                    key={s.code}
                    size="sm"
                    stack
                    code={s.code}
                    name={companyShort(s.name) || s.name}
                    lang={lang}
                    mark={<OwnerMark code={s.code} held={held} watched={watched} lang={lang} />}
                    right={m ? (
                      <span className={`block text-base font-bold tabular-nums nums ${m.cls || "text-text-main"}`}>{m.text}</span>
                    ) : undefined}
                  />
                );
              })}
            </RailCard>
          ))}
        </Rail>
      </div>
    );
  }

  return null;
}
