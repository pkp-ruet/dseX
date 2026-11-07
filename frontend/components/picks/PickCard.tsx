import Link from "next/link";
import type { ForYouFact, ForYouItem } from "@/lib/api";
import { changePct, changeTone, money } from "@/lib/formatters";
import { sectorBn } from "@/lib/bn";
import { T } from "@/components/i18n/T";
import { StockRank } from "@/components/ui/StockRow";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";
import StarButton from "@/components/ui/StarButton";
import { IconAlert, IconArrowRight, IconCheck, IconCheckCircle, IconChevronDown, IconLock } from "@/components/ui/icons";

/** What the fit tag's colour means: clay = tied to the reader's own shares. */
const OWN_KINDS = new Set(["add_more", "watched", "upgrade", "similar", "style", "asked", "new_area"]);

const TONE: Record<ForYouFact["tone"], string> = {
  good: "text-positive",
  neutral: "text-text-main",
  watch: "text-watch",
};

/** The company's group colours its value (the ranking's colours). */
const GROUP_TONE: Record<string, string> = {
  excellent: "text-tier-excellent",
  good: "text-tier-good",
};

/**
 * One pick on the "Picked for you" page (2026-11-05, user: "in full page
 * every stock will [have the] same reasoning … more trustworthy and
 * attractive"). Every pick is argued the same way, in this order:
 *
 * 1. the company, its price and today's move, and the H / ★ mark;
 * 2. why it fits *you* — the engine's kind word + one sentence with the
 *    reader's own figures ("Like GP", "61% of your money is in …");
 * 3. the same four facts for every pick (the company · the price · profit ·
 *    cash dividend), each a short value and the sentence it rests on;
 * 4. one honest thing to watch (or that its page shows no warnings);
 * 5. the safety checks it passed, folded, each with the company's own figure;
 * 6. a link to our analysis of it, and a star to follow it.
 *
 * No price verdict and no fair-price range since 2026-11-08: this is a list
 * of companies to explore; whether one is worth buying today is the Buy
 * List's job (`/buy-list`).
 *
 * Text is `<T>` pairs, so it follows the navbar language switch.
 */
export default function PickCard({
  item,
  rank,
  open = true,
  lockHref = "#dp-premium",
}: {
  item: ForYouItem;
  rank: number;
  /** false = a free reader's company: name, fit and reason open, the case (facts,
   *  watch-out, checks) replaced by one line pointing at the Premium card. */
  open?: boolean;
  lockHref?: string;
}) {
  const own = OWN_KINDS.has(item.kind);
  const facts = item.facts ?? [];
  const checks = item.checks ?? [];

  return (
    <li id={`pick-${item.code}`} className="pk-card soft-card">
      <header className="pk-head">
        <StockRank n={rank} solid={rank <= 3} />
        <div className="pk-ident">
          <Link prefetch={false} href={`/stock/${item.code}`} className="pk-name">
            {item.name || item.code}
          </Link>
          <span className="pk-code">
            {item.code}
            {item.sector && (
              <>
                <span aria-hidden="true"> · </span>
                <T en={item.sector} bn={item.sector_bn || sectorBn(item.sector)} />
              </>
            )}
            <PersonalMark code={item.code} />
          </span>
        </div>
        <div className="pk-price">
          <span className="nums text-base font-bold text-text-main">{money(item.price)}</span>
          {item.change_pct != null && (
            <span className={`nums text-xs font-semibold ${changeTone(item.change_pct)}`}>{changePct(item.change_pct)}</span>
          )}
        </div>
      </header>

      <div className="pk-fit">
        <div className="pk-tags">
          <span className={`pk-tag ${own ? "pk-tag--own" : item.strong ? "pk-tag--strong" : ""}`}>
            <T en={item.tag_en} bn={item.tag_bn} />
          </span>
          {item.new && (
            <span className="pk-tag pk-tag--new">
              <T en="New today" bn="আজ নতুন" />
            </span>
          )}
        </div>
        <p className="pk-why">
          <T en={item.why_en} bn={item.why_bn} />
        </p>
      </div>

      {!open && (
        <a href={lockHref} className="pk-locked">
          <span className="pk-locked-icon" aria-hidden="true">
            <IconLock size={14} />
          </span>
          <span className="min-w-0 flex-1">
            <T
              en="Its figures, one thing to watch and the checks it passed are Premium."
              bn="এর সংখ্যা, খেয়াল রাখার মতো একটি বিষয় আর যাচাইগুলো প্রিমিয়ামে।"
            />
          </span>
          <IconArrowRight size={14} />
        </a>
      )}

      {open && facts.length > 0 && (
        <dl className="pk-facts">
          {facts.map((f) => (
            <div key={f.key} className="pk-fact">
              <dt>
                <T en={f.label.en} bn={f.label.bn} />
              </dt>
              <dd className={`pk-fact-value ${f.key === "company" ? GROUP_TONE[item.tier] ?? "text-text-main" : TONE[f.tone]}`}>
                <T en={f.value.en} bn={f.value.bn} />
              </dd>
              {f.note && (
                <dd className="pk-fact-note">
                  <T en={f.note.en} bn={f.note.bn} />
                </dd>
              )}
            </div>
          ))}
        </dl>
      )}

      {!open ? null : item.watch ? (
        <p className="pk-watch">
          <span className="mt-0.5 shrink-0" aria-hidden="true">
            <IconAlert size={16} />
          </span>
          <span className="min-w-0">
            <span className="font-semibold">
              <T en="One thing to watch: " bn="একটি বিষয় খেয়াল রাখুন: " />
            </span>
            <T en={item.watch.en} bn={item.watch.bn} />
          </span>
        </p>
      ) : (
        <p className="pk-clear">
          <span className="mt-0.5 shrink-0" aria-hidden="true">
            <IconCheckCircle size={16} />
          </span>
          <span className="min-w-0">
            <T
              en="Nothing to watch: its stock page shows no warnings today."
              bn="খেয়াল রাখার মতো কিছু নেই: আজ এর পেজে কোনো সতর্কতা নেই।"
            />
          </span>
        </p>
      )}

      {open && checks.length > 0 && (
        <details className="pk-checks group">
          <summary>
            <span className="pk-checks-tick" aria-hidden="true">
              <IconCheck size={12} />
            </span>
            <span className="min-w-0 flex-1">
              <T en={`Passed all ${checks.length} of our checks`} bn={`আমাদের ${checks.length}টি যাচাইয়ের সবগুলোতেই পাস`} />
            </span>
            <span className="pk-checks-hint">
              <T en="See its figures" bn="সংখ্যা দেখুন" />
            </span>
            <span className="pk-checks-chev transition-transform group-open:rotate-180" aria-hidden="true">
              <IconChevronDown size={16} />
            </span>
          </summary>
          <ul>
            {checks.map((c) => (
              <li key={c.key}>
                <span className="pk-check-mark" aria-hidden="true">
                  <IconCheck size={14} />
                </span>
                <span className="min-w-0">
                  <span className="pk-check-label">
                    <T en={c.label.en} bn={c.label.bn} />
                  </span>
                  <span className="pk-check-value">
                    <T en={c.value.en} bn={c.value.bn} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <footer className="pk-foot">
        <Link prefetch={false} href={`/stock/${item.code}#ch-analysis`} className="pk-more" data-pick={item.code}>
          <T en={`Read our analysis of ${item.code}`} bn={`${item.code}-এর বিশ্লেষণ পড়ুন`} />
          <IconArrowRight size={16} />
        </Link>
        <span className="pk-follow">
          <span className="text-sm font-semibold text-text-main">
            <T en="Follow" bn="ফলো করুন" />
          </span>
          <StarButton code={item.code} />
        </span>
      </footer>
    </li>
  );
}
