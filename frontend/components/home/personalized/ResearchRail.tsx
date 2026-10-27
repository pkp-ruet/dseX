"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ResearchListSummary } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { companyShort } from "@/lib/formatters";
import { RESEARCH_LISTS, formatResearchMetric } from "@/lib/research-lists";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import RailCard, { Rail, RailHeader } from "@/components/home/personalized/RailCard";
import StockRow from "@/components/ui/StockRow";
import { IconLock } from "@/components/ui/icons";
import { tt } from "@/components/home/tt";
import { T } from "@/components/i18n/T";

/**
 * The six research lists on the homepage (replaced the four "Ready-made
 * lists" lenses, 2026-10-24). Premium readers get the dashboard's swipe rail:
 * one card per list, its top three names with the number that put them there,
 * "See all N". Everyone else gets ONE promotion card: what the lists are, how
 * many stocks pass each today (no names — the lists are fully Premium) and a
 * button to /premium.
 *
 * Server render + first paint are the promotion (the server knows no user),
 * so the landing page's HTML never carries a locked list's names.
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
  const bn = lang === "bn";
  const { isPremium, state } = usePremium();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const live = new Map((lists ?? []).map((l) => [l.slug, l]));
  const rows = RESEARCH_LISTS.map((def) => ({ def, l: live.get(def.slug) }));
  const full = mounted && isPremium && rows.some((r) => (r.l?.top.length ?? 0) > 0);

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

  const cta =
    state === "guest" ? tt("researchCtaGuest") : tt("researchCtaFree");

  const onCta = () => {
    trackEvent("premium_lock_tap", { area: "home-research", lock: "Research lists", state, stakes: 0 });
    savePremiumContext({ from: "home-research", label: "Research lists" });
  };

  return (
    <div>
      <RailHeader
        title={tt("researchTitle")}
        sub={tt("researchSub")}
        href="/stock-insights#research"
        linkLabel={tt("allLists")}
      />
      <article className="soft-card dash-box rl-promo">
        <span className="rl-promo-tag">
          <IconLock size={12} /> Premium
        </span>
        <h4 className="rl-promo-head">{tt("researchPromoHead")}</h4>
        <p className="rl-promo-sub">{tt("researchPromoSub")}</p>
        <ul className="rl-promo-grid">
          {rows.map(({ def, l }) => (
            <li key={def.slug}>
              <Link prefetch={false} href={`/stock-insights/${def.slug}`} className="rl-promo-item">
                <span className="rl-promo-name"><T en={def.shortName} bn={def.shortNameBn} /></span>
                {l && <span className="rl-promo-count">{tt("researchPass", { n: l.passed })}</span>}
              </Link>
            </li>
          ))}
        </ul>
        <Link href={PREMIUM_PATH} prefetch={false} className="btn-primary rl-promo-cta" onClick={onCta}>
          {cta}
        </Link>
      </article>
    </div>
  );
}
