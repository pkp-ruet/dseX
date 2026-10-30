"use client";

import Link from "next/link";
import { T } from "@/components/i18n/T";
import { bnDate } from "@/lib/bn";
import { IconArrowRight, IconStar } from "@/components/ui/icons";
import type { MarketResearch, MarketResearchList } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { formatResearchMetric, getResearchListDef } from "@/lib/research-lists";
import MarketRow from "./MarketRow";
import { usePersonalCodesCtx } from "./PersonalCodes";

/**
 * "Where to Invest Today" — the six research lists, the one that fits today's
 * market first (replaced the four free lenses 2026-10-25: three of them were
 * rougher, free copies of these lists). Free: the idea, how many companies
 * pass today, how many did a month ago, and the top three (2026-10-29, the
 * Free vs Premium plan — top 3 of every list is free). Premium: every other
 * company on each list — named by the page's ONE question card (`#ma-premium`,
 * `PageQuestions`, at the end of the page since 2026-10-31).
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

/** The list's top three: free for everyone since 2026-10-29 (the Free vs Premium plan). */
function Names({ list }: { list: MarketResearchList }) {
  if (list.top.length === 0)
    return (
      <p className="mk-empty">
        <T en="No company passes every check today." bn="আজ কোনো কোম্পানি সব যাচাই পেরোয়নি।" />
      </p>
    );
  const row = (s: MarketResearchList["top"][number]) => {
    const m = list.metric ? formatResearchMetric(list.metric, s.metric) : null;
    return (
      <MarketRow
        key={s.code}
        code={s.code}
        name={s.name}
        price={s.price}
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
      <div className="mk-rows">{list.top.map((s) => row(s))}</div>
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
