"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { bnDate } from "@/lib/bn";
import RowLock from "@/components/premium/RowLock";
import LockPanel from "@/components/premium/LockPanel";
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
 * card shows its top three with the company hidden (the shared row-lock
 * preview: the list's own number shown) and one quiet line pointing at the
 * page's one promotion card below (`#ma-premium`).
 */
export default function MarketResearchLists({ research }: { research: MarketResearch }) {
  const { portfolio, watchlist } = usePersonalCodesCtx();
  const mine = new Set<string>([...portfolio, ...watchlist]);
  const yours = (l: MarketResearchList) => l.codes.filter((c) => mine.has(c.toUpperCase())).length;

  const [lead, ...rest] = research.lists;
  if (!lead) return null;

  return (
    <>
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
    </>
  );
}

function names(list: MarketResearchList) {
  const def = getResearchListDef(list.slug);
  return {
    name: def?.shortName ?? list.title_en,
    nameBn: def?.shortNameBn ?? list.title_bn,
    hook: def?.hook ?? list.idea_en,
    hookBn: def?.hookBn ?? list.idea_bn,
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
          <T
            en={`${list.passed === 1 ? "company passes" : "companies pass"} all ${list.checks} checks today`}
            bn={`টি কোম্পানি আজ ${list.checks}টি যাচাইয়ের সবগুলো পেরিয়েছে`}
          />
        </span>
        {list.then && diff != null && (
          <span className={`mk-delta ${diff > 0 ? "mk-delta--up" : diff < 0 ? "mk-delta--down" : ""}`}>
            <T
              en={`was ${list.then.n} on ${formatDate(list.then.date)}`}
              bn={`${bnDate(list.then.date)}-এ ছিল ${list.then.n}টি`}
            />
          </span>
        )}
      </div>
      {yours > 0 && (
        <p className="m-0 mt-1 text-sm font-semibold text-primary-ink">
          <T
            en={`${yours} of your shares ${yours === 1 ? "is" : "are"} on it`}
            bn={`আপনার ${yours}টি শেয়ার এই তালিকায় আছে`}
          />
        </p>
      )}
    </>
  );
}

/** The list's top three — for anyone not Premium, with the company hidden (one line points at `#ma-premium`). */
function Names({ list }: { list: MarketResearchList }) {
  const { lang } = useLang();
  if (list.top.length === 0)
    return (
      <p className="mk-empty">
        <T en="No company passes every check today." bn="আজ কোনো কোম্পানি সব যাচাই পেরোয়নি।" />
      </p>
    );
  const row = (s: MarketResearchList["top"][number], masked = false) => {
    const m = list.metric ? formatResearchMetric(list.metric, s.metric) : null;
    return (
      <MarketRow
        key={s.code}
        code={s.code}
        name={s.name}
        price={s.price}
        masked={masked}
        meta={m?.text ?? <T en="passes" bn="পেরিয়েছে" />}
        tone="accent"
      />
    );
  };
  return (
    <div className="mk-rl-names">
      {list.metric && (
        <p className="mk-rl-by">
          <T
            en={`Top ${list.top.length} by ${list.metric.label_en.toLowerCase()}`}
            bn={`${list.metric.label_bn} অনুযায়ী শীর্ষ ${list.top.length}টি`}
          />
        </p>
      )}
      <RowLock
        preview={<div className="mk-rows">{list.top.map((s) => row(s, true))}</div>}
        panel={
          <LockPanel
            job="find"
            count={list.top.length}
            lock={`Market analysis: ${list.slug ?? "research list"}`}
            href={`#${ANCHOR}`}
            codes={list.top.map((s) => s.code)}
            title={{ en: "See which companies these are", bn: "এগুলো কোন কোম্পানি, দেখুন" }}
          />
        }
      >
        <div className="mk-rows">{list.top.map((s) => row(s))}</div>
      </RowLock>
    </div>
  );
}

function SeeAll({ list, href }: { list: MarketResearchList; href: string }) {
  return (
    <div className="mk-card-foot">
      <Link href={href} prefetch={false} className="mk-link">
        {list.passed > 3 ? (
          <T en={`See all ${list.passed} and every check`} bn={`সব ${list.passed}টি আর প্রতিটি যাচাই দেখুন`} />
        ) : (
          <T en="See every check" bn="প্রতিটি যাচাই দেখুন" />
        )}
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
          <IconStar size={12} /> <T en="Fits today's market" bn="আজকের বাজারে মানানসই" />
        </span>
        <h3 className="mk-rl-name mt-3" id={`mk-rl-${list.id}`}>
          <Link href={n.href} prefetch={false}>
            <T en={n.name} bn={n.nameBn} />
          </Link>
        </h3>
        <p className="mk-rl-hook">
          <T en={n.hook} bn={n.hookBn} />
        </p>
        <div className="mk-rl-reason">
          <T en={reason[0]} bn={reason[1]} />
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
          <T en={n.name} bn={n.nameBn} />
        </Link>
      </h3>
      <p className="mk-rl-hook">
        <T en={n.hook} bn={n.hookBn} />
      </p>
      <Count list={list} yours={yours} />
      <Names list={list} />
      <SeeAll list={list} href={n.href} />
    </article>
  );
}

const FEATURES: { en: string; bn: string }[] = [
  { en: "Which companies pass each list today, and the number that put them there", bn: "আজ প্রতিটি তালিকায় কোন কোম্পানি আছে, আর কোন সংখ্যার জন্য" },
  { en: "Each company's own figure on every check, and the main risk we can see", bn: "প্রতিটি যাচাইয়ে কোম্পানির নিজের সংখ্যা, আর আমাদের চোখে পড়া প্রধান ঝুঁকি" },
  { en: "Which companies joined and which left each list this month", bn: "এ মাসে কোন কোম্পানি তালিকায় এসেছে, কোনটি বাদ পড়েছে" },
  { en: "Your own screens, built from the same checks", bn: "একই যাচাই দিয়ে নিজের স্ক্রিন তৈরি করুন" },
];

/** The page's one Premium section — every locked list points here. Gone for
 *  Premium readers once the plan is known (server render shows it, like every lock). */
function ResearchPromo({ lists, yours }: { lists: MarketResearchList[]; yours: number }) {
  const { isPremium, state } = usePremium();
  const { lang } = useLang();
  const bn = lang === "bn";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (mounted && isPremium) return null;

  const lead = lists[0];
  const def = lead ? getResearchListDef(lead.slug) : null;
  const leadName = lead ? (bn ? def?.shortNameBn ?? lead.title_bn : def?.shortName ?? lead.title_en) : null;
  // Stakes travel to /premium in the reader's language (sessionStorage), so
  // they are built from the language, like every lock card's.
  const stakes = [
    lead && lead.passed > 0
      ? bn
        ? `আজ “${leadName}” তালিকায় ${lead.passed}টি কোম্পানি আছে`
        : `${lead.passed} companies pass “${leadName}” today`
      : null,
    yours > 0
      ? bn
        ? `আপনার ${yours}টি শেয়ার এই তালিকাগুলোতে আছে`
        : `${yours} of your shares ${yours === 1 ? "is" : "are"} on these lists`
      : null,
  ].filter((s): s is string => !!s);
  const cta =
    state === "guest" ? (
      <T en="Sign up free, then try Premium" bn="ফ্রি অ্যাকাউন্ট খুলুন, তারপর প্রিমিয়াম দেখুন" />
    ) : (
      <T en="See Premium plans" bn="প্রিমিয়াম প্ল্যান দেখুন" />
    );

  const onCta = () => {
    trackEvent("premium_lock_tap", { area: "market-analysis", lock: "Research lists", state, stakes: stakes.length });
    savePremiumContext({ from: "market-analysis", label: bn ? "রিসার্চ তালিকা" : "The research lists", stakes });
  };

  return (
    <section id={ANCHOR} className="soft-card rl-promo mt-6 scroll-mt-24" aria-labelledby="ma-premium-title">
      <span className="rl-promo-tag">
        <IconLock size={12} /> <T en="Premium" bn="প্রিমিয়াম" />
      </span>
      <h3 className="rl-promo-head" id="ma-premium-title">
        <T en="See the companies on every list" bn="প্রতিটি তালিকার কোম্পানিগুলো দেখুন" />
      </h3>
      <p className="rl-promo-sub">
        <T
          en="The checks and the counts are free. Premium shows which companies pass, why, and what could go wrong with each."
          bn="যাচাই আর সংখ্যা ফ্রি। কোন কোম্পানি পেরিয়েছে, কেন, আর প্রতিটির কী ঝুঁকি আছে, তা প্রিমিয়ামে দেখা যায়।"
        />
      </p>

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

      <ul className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <li key={f.en} className="flex items-start gap-2 text-sm text-text-main">
            <span className="mt-0.5 shrink-0 text-positive" aria-hidden>
              <IconCheck size={16} />
            </span>
            <span>
              <T en={f.en} bn={f.bn} />
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
