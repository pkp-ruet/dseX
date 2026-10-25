"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Bn from "@/components/i18n/Bn";
import PremiumGate from "@/components/premium/PremiumGate";
import { PageLockScope } from "@/components/premium/LockScope";
import { IconArrowRight, IconCheck, IconLock, IconStar } from "@/components/ui/icons";
import type { MarketResearch, MarketResearchList } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { formatResearchMetric, getResearchListDef } from "@/lib/research-lists";
import { trackEvent } from "@/lib/track";
import MarketRow from "./MarketRow";
import { usePersonalCodesCtx } from "./PersonalCodes";

/** The page's one Premium section. */
const ANCHOR = "ma-premium";

/**
 * "Where to Invest Today" — the six research lists, the one that fits today's
 * market first (replaced the four free lenses 2026-10-25: three of them were
 * rougher, free copies of these lists). Free: the idea, how many companies
 * pass today and how many did a month ago. Premium: which companies — each
 * card's names blur in place and point at the one promotion card below
 * (`#ma-premium`), the stock page's pattern.
 */
export default function MarketResearchLists({ research }: { research: MarketResearch }) {
  const { portfolio, watchlist } = usePersonalCodesCtx();
  const mine = new Set<string>([...portfolio, ...watchlist]);
  const yours = (l: MarketResearchList) => l.codes.filter((c) => mine.has(c.toUpperCase())).length;

  const [lead, ...rest] = research.lists;
  if (!lead) return null;

  return (
    <PageLockScope anchor={ANCHOR}>
      <LeadCard list={lead} yours={yours(lead)} reason={[research.reason_en, research.reason_bn]} />
      {rest.length > 0 && (
        <div className="mk-rl-grid">
          {rest.map((l) => (
            <ListCard key={l.id} list={l} yours={yours(l)} />
          ))}
        </div>
      )}
      <ResearchPromo
        lists={research.lists}
        yours={new Set(research.lists.flatMap((l) => l.codes.filter((c) => mine.has(c.toUpperCase())))).size}
      />
    </PageLockScope>
  );
}

function names(list: MarketResearchList) {
  const def = getResearchListDef(list.slug);
  return {
    name: def?.shortName ?? list.title_en,
    nameBn: def?.shortNameBn ?? list.title_bn,
    hook: def?.hook ?? list.idea_en,
    href: `/stock-insights/${list.slug}`,
  };
}

/** Today's pass count, the count about a month ago, and the reader's own. */
function Count({ list, yours }: { list: MarketResearchList; yours: number }) {
  const diff = list.then ? list.passed - list.then.n : null;
  return (
    <>
      <div className="mk-rl-count">
        <span className="mk-bignum-n">{list.passed}</span>
        <span className="mk-bignum-of">
          {list.passed === 1 ? "company passes" : "companies pass"} all {list.checks} checks today
        </span>
        {list.then && diff != null && (
          <span className={`mk-delta ${diff > 0 ? "mk-delta--up" : diff < 0 ? "mk-delta--down" : ""}`}>
            was {list.then.n} on {formatDate(list.then.date)}
          </span>
        )}
      </div>
      <Bn className="mk-card-bn">আজ {list.passed}টি কোম্পানি সব যাচাই পেরিয়েছে</Bn>
      {yours > 0 && (
        <p className="m-0 mt-1 text-sm font-semibold text-primary-ink">
          {yours} of your stocks {yours === 1 ? "is" : "are"} on it
        </p>
      )}
    </>
  );
}

/** The list's top three — blurred for anyone not Premium (one line points at `#ma-premium`). */
function Names({ list }: { list: MarketResearchList }) {
  if (list.top.length === 0) return <p className="mk-empty">No company passes every check today.</p>;
  return (
    <div className="mk-rl-names">
      {list.metric && <p className="mk-rl-by">Top {list.top.length} by {list.metric.label_en.toLowerCase()}</p>}
      <PremiumGate label="Which companies pass" preview="blur" peek={120}>
        <div className="mk-rows">
          {list.top.map((s) => {
            const m = list.metric ? formatResearchMetric(list.metric, s.metric) : null;
            return (
              <MarketRow key={s.code} code={s.code} name={s.name} price={s.price} meta={m?.text ?? "passes"} tone="accent" />
            );
          })}
        </div>
      </PremiumGate>
    </div>
  );
}

function SeeAll({ list, href }: { list: MarketResearchList; href: string }) {
  return (
    <div className="mk-card-foot">
      <Link href={href} prefetch={false} className="mk-link">
        {list.passed > 3 ? `See all ${list.passed} and every check` : "See every check"}
        <IconArrowRight size={14} />
      </Link>
    </div>
  );
}

/** The list that fits today's market: wider, with the reason, names on the right from 900px. */
function LeadCard({ list, yours, reason }: { list: MarketResearchList; yours: number; reason: [string, string] }) {
  const n = names(list);
  return (
    <article className="soft-card mk-card mk-rl-lead" aria-labelledby={`mk-rl-${list.id}`}>
      <div>
        <span className="mk-tag">
          <IconStar size={12} /> Fits today&apos;s market
        </span>
        <h3 className="mk-rl-name mt-3" id={`mk-rl-${list.id}`}>
          <Link href={n.href} prefetch={false}>
            {n.name}
          </Link>
        </h3>
        <Bn className="mk-card-bn">{n.nameBn}</Bn>
        <p className="mk-rl-hook">{n.hook}</p>
        <div className="mk-rl-reason">
          {reason[0]}
          <Bn className="mk-card-bn">{reason[1]}</Bn>
        </div>
        <Count list={list} yours={yours} />
      </div>
      <div>
        <Names list={list} />
        <SeeAll list={list} href={n.href} />
      </div>
    </article>
  );
}

function ListCard({ list, yours }: { list: MarketResearchList; yours: number }) {
  const n = names(list);
  return (
    <article className="soft-card mk-card mk-rl-card" aria-labelledby={`mk-rl-${list.id}`}>
      <h3 className="mk-rl-name" id={`mk-rl-${list.id}`}>
        <Link href={n.href} prefetch={false}>
          {n.name}
        </Link>
      </h3>
      <Bn className="mk-card-bn">{n.nameBn}</Bn>
      <p className="mk-rl-hook">{n.hook}</p>
      <Count list={list} yours={yours} />
      <Names list={list} />
      <SeeAll list={list} href={n.href} />
    </article>
  );
}

const FEATURES: { en: string; bn: string }[] = [
  { en: "Which companies pass each list today, with the number that put them there", bn: "আজ প্রতিটি তালিকায় কোন কোম্পানি আছে, আর কোন সংখ্যার জন্য" },
  { en: "Each company's own figure on every check, and the main risk we can see", bn: "প্রতিটি যাচাইয়ে কোম্পানির নিজের সংখ্যা, আর প্রধান ঝুঁকি" },
  { en: "Who joined and who left each list this month", bn: "এই মাসে কে তালিকায় এলো, কে বাদ পড়ল" },
  { en: "Your own lists, built from the same checks", bn: "একই যাচাই দিয়ে নিজের তালিকা বানান" },
];

/** The page's one Premium section — every locked list points here. Gone for
 *  Premium readers once the plan is known (server render shows it, like every lock). */
function ResearchPromo({ lists, yours }: { lists: MarketResearchList[]; yours: number }) {
  const { isPremium, state } = usePremium();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (mounted && isPremium) return null;

  const lead = lists[0];
  const leadName = lead ? getResearchListDef(lead.slug)?.shortName ?? lead.title_en : null;
  const stakes = [
    lead && lead.passed > 0 ? `${lead.passed} companies pass “${leadName}” today` : null,
    yours > 0 ? `${yours} of your stocks ${yours === 1 ? "is" : "are"} on these lists` : null,
  ].filter((s): s is string => !!s);
  const cta = state === "guest" ? "Sign up free, then try Premium" : "See Premium plans";

  const onCta = () => {
    trackEvent("premium_lock_tap", { area: "market-analysis", lock: "Research lists", state, stakes: stakes.length });
    savePremiumContext({ from: "market-analysis", label: "The research lists", stakes });
  };

  return (
    <section id={ANCHOR} className="soft-card rl-promo mt-6 scroll-mt-24" aria-labelledby="ma-premium-title">
      <span className="rl-promo-tag">
        <IconLock size={12} /> Premium
      </span>
      <h3 className="rl-promo-head" id="ma-premium-title">
        See the companies on every list
      </h3>
      <p className="rl-promo-sub">
        The checks and the counts are free. Premium shows which companies pass, why, and what could go wrong with each.
      </p>
      <Bn className="rl-promo-sub">যাচাই আর সংখ্যা ফ্রি। কোন কোম্পানি পেরিয়েছে, কেন, আর কী ঝুঁকি — প্রিমিয়ামে।</Bn>

      {stakes.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {stakes.map((s) => (
            <li key={s} className="flex items-start gap-2 text-sm font-semibold text-text-main">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-1 grid gap-2 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <li key={f.en} className="flex items-start gap-2 text-sm text-text-main">
            <span className="mt-0.5 shrink-0 text-positive" aria-hidden>
              <IconCheck size={16} />
            </span>
            <span>
              {f.en}
              <Bn as="span" className="block text-text-muted">{f.bn}</Bn>
            </span>
          </li>
        ))}
      </ul>

      <Link href={PREMIUM_PATH} prefetch={false} className="btn-primary rl-promo-cta" onClick={onCta}>
        {cta}
      </Link>
    </section>
  );
}
