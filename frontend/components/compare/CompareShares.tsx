"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import TierPill from "@/components/ui/TierPill";
import { T } from "@/components/i18n/T";
import { IconClose, IconCrown, IconLock, IconSearch, IconShare } from "@/components/ui/icons";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { changePct, money } from "@/lib/formatters";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import {
  FREE_COMPARE,
  MAX_COMPARE,
  comparisonTitle,
  joinBn,
  joinEn,
  type Bi,
  type CompareQuestion,
  type CompareShare,
  type PickOption,
} from "@/lib/compare";

interface Props {
  codes: string[];
  names: Record<string, string>;
  options: PickOption[];
  /** The latest comparison's shares (price, today's move, grade), by code. */
  byCode: Record<string, CompareShare>;
  /** What each share leads on, once the comparison is in. */
  ahead: Record<string, { key: CompareQuestion["key"]; word: Bi }[]> | null;
  /** The official close the figures come from. */
  asOf: Bi | null;
  similar: { code: string; short: string }[];
  limit: number;
  isPremium: boolean;
  onAdd: (code: string) => void;
  onRemove: (code: string) => void;
  /** Shares a free reader picked past the limit: shown as locked rows with
   *  the Premium banner; taking a share off swaps the first one in. */
  pending: string[];
  onDismissPending: () => void;
}

const MAX_RESULTS = 8;
const MAX_SIMILAR = 4;

/** The ticker's change colour as a page class (the design lint keeps
 *  Tailwind tone classes for text; this card's CSS has its own). */
function toneClass(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v) || v === 0) return "";
  return v > 0 ? "cmp-pos" : "cmp-neg";
}

/**
 * The top of the comparison (2026-11-18): its own headline ("Square Pharma vs
 * Beacon Pharma", the official close, Copy link), the search always open, the
 * same-sector companies as "+ CODE" chips, then one row per share — its
 * number, name, price, today's move, our group word and what it is ahead on
 * (each a jump to that question's card) — and ✕. It replaced the name chips,
 * the dashed "Add a share" button and "The short version" card.
 *
 * A free reader at the limit keeps the search (2026-11-18, user: "do not just
 * say compare more than 2 with premium. let them choose stock then show the
 * premium lock banner"): the share they pick shows as a locked row under
 * theirs, with the Premium banner right under it.
 */
export default function CompareShares({
  codes,
  names,
  options,
  byCode,
  ahead,
  asOf,
  similar,
  limit,
  isPremium,
  onAdd,
  onRemove,
  pending,
  onDismissPending,
}: Props) {
  const { bn } = useLang();
  const [q, setQ] = useState("");
  // Only Premium's ceiling hides the search; a free reader may always pick.
  const full = isPremium && codes.length >= limit;

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const starts: PickOption[] = [];
    const contains: PickOption[] = [];
    for (const o of options) {
      if (codes.includes(o.code) || pending.includes(o.code)) continue;
      const c = o.code.toLowerCase();
      const n = o.name.toLowerCase();
      if (c.startsWith(s) || n.startsWith(s)) starts.push(o);
      else if (c.includes(s) || n.includes(s)) contains.push(o);
      if (starts.length >= MAX_RESULTS) break;
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [q, options, codes, pending]);

  const suggestions = similar.filter((s) => !codes.includes(s.code) && !pending.includes(s.code)).slice(0, MAX_SIMILAR);

  function add(code: string) {
    onAdd(code);
    setQ("");
  }

  async function copyLink() {
    const url = window.location.origin + window.location.pathname + window.location.search;
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: <T en="Link copied" bn="লিংক কপি হয়েছে" />, tone: "success" });
    } catch {
      toast({ message: <T en="We couldn't copy the link" bn="লিংক কপি করা যায়নি" />, tone: "error" });
    }
  }

  const ready = codes.length >= 2;
  const title: Bi = ready
    ? comparisonTitle(codes.map((c) => names[c] ?? c))
    : codes.length === 1
      ? { en: "Add one more share", bn: "আরও একটি শেয়ার যোগ করুন" }
      : { en: "Pick 2 or more shares to compare", bn: "তুলনা করতে 2 বা তার বেশি শেয়ার বেছে নিন" };

  return (
    <section className="cmp-shares cmp-card" aria-labelledby="cmp-shares-t">
      <div className="cmp-sh-head">
        <h2 id="cmp-shares-t" className="cmp-sh-title">
          <T en={title.en} bn={title.bn} />
        </h2>
        {ready ? (
          <p className="cmp-sh-sub">
            <span>
              {asOf && <T en={`Official close, ${asOf.en}`} bn={`অফিশিয়াল সমাপনী দাম, ${asOf.bn}`} />}
            </span>
            <button type="button" className="cmp-copy" onClick={copyLink}>
              <IconShare size={14} />
              <T en="Copy link" bn="লিংক কপি করুন" />
            </button>
          </p>
        ) : (
          <p className="cmp-sh-lead">
            {codes.length === 1 ? (
              <T
                en={`Pick a share to put next to ${names[codes[0]] ?? codes[0]}.`}
                bn={`${names[codes[0]] ?? codes[0]}-এর পাশে রাখতে একটি শেয়ার বেছে নিন।`}
              />
            ) : (
              <T en="We answer the same seven questions for each, side by side." bn="প্রতিটির জন্য আমরা একই সাতটি প্রশ্নের উত্তর দিই, পাশাপাশি।" />
            )}
          </p>
        )}
      </div>

      {full ? (
        <p className="cmp-full">
          <T
            en={`You are comparing ${MAX_COMPARE} shares, the most at once. Take one off to add another.`}
            bn={`আপনি ${MAX_COMPARE}টি শেয়ার তুলনা করছেন, একসাথে এর বেশি নয়। আরেকটি যোগ করতে একটি বাদ দিন।`}
          />
        </p>
      ) : (
        <div className="cmp-find">
          <label className="cmp-search-box" htmlFor="cmp-q">
            <IconSearch size={18} />
            <span className="sr-only">
              <T en="Add a share" bn="শেয়ার যোগ করুন" />
            </span>
            <input
              id="cmp-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && hits[0]) add(hits[0].code);
                if (e.key === "Escape") setQ("");
              }}
              placeholder={
                codes.length
                  ? bn
                    ? "শেয়ার যোগ করুন: কোম্পানির নাম বা কোড লিখুন"
                    : "Add a share: type a name or code"
                  : bn
                    ? "কোম্পানির নাম বা কোড লিখুন"
                    : "Type a company name or code"
              }
              autoComplete="off"
            />
          </label>
          {q.trim() ? (
            hits.length ? (
              <ul className="cmp-res">
                {hits.map((o) => (
                  <li key={o.code}>
                    <button type="button" className="cmp-res-row" onClick={() => add(o.code)}>
                      <span className="min-w-0">
                        <b>{o.name}</b> <span className="cmp-res-code">{o.code}</span>
                      </span>
                      <span className="cmp-res-add">
                        <T en="Add" bn="যোগ করুন" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cmp-res-none">
                <T en={`No graded company matches “${q.trim()}”.`} bn={`“${q.trim()}” নামে গ্রেড পাওয়া কোনো কোম্পানি নেই।`} />
              </p>
            )
          ) : suggestions.length && codes.length ? (
            <div className="cmp-similar">
              <span>
                <T en="Same sector:" bn="একই সেক্টর:" />
              </span>
              {suggestions.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  className="cmp-plus"
                  onClick={() => add(s.code)}
                  aria-label={bn ? `${s.short} যোগ করুন` : `Add ${s.short}`}
                  title={s.short}
                >
                  + {s.code}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {codes.length > 0 && (
        <ol className="cmp-rows">
          {codes.map((c, i) => {
            const s = byCode[c];
            const lead = ahead ? ahead[c] ?? [] : null;
            const name = names[c] ?? c;
            return (
              <li key={c} className="cmp-row">
                <span className="cmp-num" aria-hidden="true">
                  {i + 1}
                </span>
                <Link href={`/stock/${c}`} className="cmp-row-co">
                  <b>{name}</b>
                  {name !== c && <span>{c}</span>}
                </Link>
                <span className="cmp-row-px">
                  {s?.price != null && (
                    <>
                      <b>{money(s.price)}</b>
                      <span className={toneClass(s.change_pct)}>{changePct(s.change_pct)}</span>
                    </>
                  )}
                </span>
                <button
                  type="button"
                  className="cmp-row-x"
                  onClick={() => onRemove(c)}
                  aria-label={bn ? `${name} বাদ দিন` : `Take ${name} off`}
                >
                  <IconClose size={15} />
                </button>
                {ready && s && lead && (
                  <span className="cmp-row-ahead">
                    {s.score != null && <TierPill score={s.score} />}
                    {lead.length ? (
                      <>
                        <span className="cmp-ahead-lab">
                          <T en="Ahead on" bn="এগিয়ে" />
                        </span>
                        {lead.map((a) => (
                          <a
                            key={a.key}
                            href={`#cq-${a.key}`}
                            className="cmp-ahead"
                            onClick={() => trackEvent("compare_jump", { key: a.key, n: codes.length })}
                          >
                            <T en={a.word.en} bn={a.word.bn} />
                          </a>
                        ))}
                      </>
                    ) : (
                      <span className="cmp-ahead-lab">
                        <T en="Not first on any of the seven questions here" bn="এখানে সাতটি প্রশ্নের কোনোটিতে প্রথম নয়" />
                      </span>
                    )}
                  </span>
                )}
              </li>
            );
          })}
          {pending.map((c) => {
            const name = names[c] ?? c;
            return (
              <li key={c} className="cmp-row cmp-row--locked">
                <span className="cmp-num cmp-num--lock" aria-hidden="true">
                  <IconLock size={13} />
                </span>
                <span className="cmp-row-co">
                  <b>{name}</b>
                  {name !== c && <span>{c}</span>}
                </span>
                <span className="cmp-lock-pill">
                  <IconCrown size={12} />
                  <T en="Premium" bn="প্রিমিয়াম" />
                </span>
                <button
                  type="button"
                  className="cmp-row-x"
                  onClick={onDismissPending}
                  aria-label={bn ? `${name} যোগ করবেন না` : `Don't add ${name}`}
                >
                  <IconClose size={15} />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {pending.length > 0 && (
        <PendingLock pending={pending} codes={codes} names={names} onDismiss={onDismissPending} />
      )}

      <p className="cmp-sh-foot">
        {isPremium ? (
          <T en={`${codes.length} of up to ${limit} shares`} bn={`সর্বোচ্চ ${limit}টির মধ্যে ${codes.length}টি শেয়ার`} />
        ) : (
          <T en={`${codes.length} of ${limit} shares on a free account`} bn={`ফ্রি অ্যাকাউন্টে ${limit}টির মধ্যে ${codes.length}টি শেয়ার`} />
        )}
      </p>
    </section>
  );
}

/**
 * The Premium lock banner a free reader meets after picking a share past the
 * limit: it names the share they picked, says what Premium does here, and
 * offers the swap (take one off above and it takes that place). The card
 * after "The company" (`#cmp-premium`) stays the place for our analysis;
 * this one is only about adding the share.
 */
function PendingLock({
  pending,
  codes,
  names,
  onDismiss,
}: {
  pending: string[];
  codes: string[];
  names: Record<string, string>;
  onDismiss: () => void;
}) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const href = user ? `${PREMIUM_PATH}?src=compare-add#pay` : `${PREMIUM_PATH}?src=compare-add`;
  const picked = pending.map((c) => names[c] ?? c);
  const mine = codes.map((c) => names[c] ?? c);
  const key = pending.join(",");
  const n = codes.length;

  // One view per set of picked shares.
  useEffect(() => {
    trackEvent("premium_lock_view", { area: "compare-stocks", lock: "compare-add", state, code: key, n });
  }, [key, state, n]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "compare-stocks", lock: "compare-add", state, code: key, n });
    savePremiumContext({
      from: "compare-stocks",
      label: bn ? "শেয়ার তুলনা" : "Compare stocks",
      stakes: [bn ? `${joinBn(mine)}-এর পাশে ${joinBn(picked)}` : `${joinEn(picked)} next to ${joinEn(mine)}`],
    });
  };

  return (
    <div className="cmp-lock" role="status">
      <p className="cmp-lock-tag">
        <IconCrown size={15} />
        <T en="Premium" bn="প্রিমিয়াম" />
      </p>
      <p className="cmp-lock-h">
        {mine.length ? (
          <T en={`Put ${joinEn(picked)} next to ${joinEn(mine)}`} bn={`${joinBn(mine)}-এর পাশে ${joinBn(picked)} রাখুন`} />
        ) : (
          <T en={`Compare ${joinEn(picked)} too`} bn={`${joinBn(picked)}-ও তুলনা করুন`} />
        )}
      </p>
      <p className="cmp-lock-line">
        <T
          en={`A free account compares ${FREE_COMPARE} shares at a time. Premium puts up to ${MAX_COMPARE} side by side, with our analysis of each.`}
          bn={`ফ্রি অ্যাকাউন্টে একসাথে ${FREE_COMPARE}টি শেয়ার তুলনা করা যায়। প্রিমিয়ামে ${MAX_COMPARE}টি পর্যন্ত পাশাপাশি দেখা যায়, সাথে প্রতিটির ওপর আমাদের বিশ্লেষণ।`}
        />
      </p>
      <div className="cmp-lock-acts">
        <Button href={href} onClick={onTap}>
          <T en="Get Premium" bn="প্রিমিয়াম নিন" />
        </Button>
        <button type="button" className="cmp-lock-later" onClick={onDismiss}>
          <T en="Not now" bn="এখন না" />
        </button>
      </div>
      <p className="cmp-lock-fine">
        <T
          en={`Or take a share off above, and ${picked[0]} takes its place.`}
          bn={`অথবা ওপরের একটি শেয়ার বাদ দিন, তার জায়গায় ${picked[0]} আসবে।`}
        />
      </p>
    </div>
  );
}
