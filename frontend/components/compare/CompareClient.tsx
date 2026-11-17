"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { T } from "@/components/i18n/T";
import Skeleton from "@/components/ui/Skeleton";
import CompareShares from "@/components/compare/CompareShares";
import CompareStart from "@/components/compare/CompareStart";
import CompareAnalysis from "@/components/compare/CompareAnalysis";
import { CompareDates, PlainWords, QuestionCard } from "@/components/compare/CompareCards";
import { dayShort } from "@/components/dividend-calendar/dates";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import { getComparison } from "@/lib/api";
import {
  FREE_COMPARE,
  MAX_COMPARE,
  PARTS,
  aheadOn,
  joinBn,
  joinEn,
  parseCodes,
  type ComparePayload,
  type CompareShare,
  type PickOption,
} from "@/lib/compare";
import { usePremium } from "@/lib/premium";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";

/**
 * The comparison itself. The chosen codes live in the URL (`?s=GP,ROBI`), so
 * a comparison can be shared or bookmarked; the page reads them after mount
 * (no `useSearchParams`, which would blank the server render) and fetches
 * `/api/compare` for them. A free reader compares up to FREE_COMPARE shares,
 * Premium up to MAX_COMPARE; a link with more than the reader may see keeps
 * the first ones and says so.
 *
 * Order (2026-11-18): the shares card (headline, search, one row per share
 * with what it is ahead on) → for Premium, "In plain words" → The company
 * (four questions) → our analysis (Premium) or the one Premium card → The
 * price (two) → Dividends and dates (the dividend card + the dates card).
 */
export default function CompareClient({ options }: { options: PickOption[] }) {
  const params = useUrlParams();
  const { isPremium, isLoading, state } = usePremium();
  const limit = isPremium ? MAX_COMPARE : FREE_COMPARE;

  const [codes, setCodes] = useState<string[] | null>(null);
  const [trimmed, setTrimmed] = useState<string[]>([]);
  const [dropped, setDropped] = useState<string[]>([]);
  const [data, setData] = useState<ComparePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [allDates, setAllDates] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // The URL's codes, once, after mount.
  useEffect(() => {
    if (params && codes === null) setCodes(parseCodes(params.get("s")));
  }, [params, codes]);

  // A link with more shares than this reader may compare keeps the first ones
  // (only once the plan is known, so a Premium reader's 5 aren't cut first).
  useEffect(() => {
    if (!codes || isLoading || codes.length <= limit) return;
    setTrimmed(codes.slice(limit));
    setCodes(codes.slice(0, limit));
  }, [codes, isLoading, limit]);

  useUrlSync({ s: codes && codes.length ? codes.join(",") : null }, codes !== null);

  const key = codes ? codes.join(",") : "";
  useEffect(() => {
    if (!codes || isLoading || codes.length > limit) return;
    if (codes.length === 0) {
      setData(null);
      setFailed(false);
      return;
    }
    let live = true;
    setLoading(true);
    setFailed(false);
    getComparison(codes)
      .then((d) => {
        if (!live) return;
        setData(d);
        if (d.missing.length) {
          // Not a graded company (a fund, a bond, a typo): take it off and say so.
          setDropped(d.missing);
          setCodes(codes.filter((c) => !d.missing.includes(c)));
        }
      })
      .catch(() => live && setFailed(true))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // `key` stands for `codes` (a new array with the same codes is no change).
  }, [key, isLoading, limit, attempt]);

  const names = useMemo(() => {
    const m: Record<string, string> = {};
    for (const o of options) m[o.code] = o.name;
    for (const s of data?.shares ?? []) m[s.code] = s.short;
    return m;
  }, [options, data]);

  // Each share's number = its place in the comparison (the URL's order).
  const nums = useMemo(() => {
    const m: Record<string, number> = {};
    (codes ?? []).forEach((c, i) => (m[c] = i + 1));
    return m;
  }, [codes]);

  const byCode = useMemo(() => {
    const m: Record<string, CompareShare> = {};
    for (const s of data?.shares ?? []) m[s.code] = s;
    return m;
  }, [data]);

  const onLimit = useCallback(() => {
    if (!isPremium) {
      trackEvent("compare_limit", { state, n: codes?.length ?? 0 });
      showLimitNotice("compare");
    } else {
      toast({
        message: <T en={`You can compare up to ${MAX_COMPARE} shares at once.`} bn={`একসাথে ${MAX_COMPARE}টি পর্যন্ত শেয়ার তুলনা করা যায়।`} />,
      });
    }
  }, [isPremium, state, codes]);

  const onAdd = useCallback(
    (code: string) => {
      if (!codes || !code || codes.includes(code)) return;
      if (codes.length >= limit) {
        onLimit();
        return;
      }
      setTrimmed([]);
      setDropped([]);
      setCodes([...codes, code]);
      trackEvent("compare_add", { code, n: codes.length + 1, state });
    },
    [codes, limit, onLimit, state],
  );

  const onRemove = useCallback(
    (code: string) => {
      if (!codes) return;
      setCodes(codes.filter((c) => c !== code));
      trackEvent("compare_remove", { code, n: codes.length - 1, state });
    },
    [codes, state],
  );

  const onPick = (set: string[], mine: boolean) => {
    setTrimmed([]);
    setDropped([]);
    setCodes(set.slice(0, limit));
    trackEvent(mine ? "compare_mine" : "compare_preset", { codes: set.join(","), state });
  };

  // Before the URL is read: the shares card's shape, so the page doesn't jump.
  if (codes === null) {
    return (
      <div className="cmp-wrap" aria-busy="true">
        <div className="cmp-shares cmp-card">
          <Skeleton height={24} width="55%" />
          <Skeleton height={46} />
        </div>
      </div>
    );
  }

  const shown = data && codes.length >= 2 && data.shares.length >= 2 ? data : null;
  const ahead = shown ? aheadOn(shown.questions) : null;
  const byKey = new Map((shown?.questions ?? []).map((q) => [q.key, q]));
  // Dhaka's date, for "today" / "in 3 days" on the dates (the prices' day is the last close).
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
  const asOf = shown?.as_of ? dayShort(shown.as_of) : null;

  return (
    <div className="cmp-wrap">
      <CompareShares
        codes={codes}
        names={names}
        options={options}
        byCode={byCode}
        ahead={ahead}
        asOf={asOf}
        similar={data?.similar ?? []}
        limit={limit}
        isPremium={isPremium}
        onAdd={onAdd}
        onRemove={onRemove}
        onLimit={onLimit}
      />

      {trimmed.length > 0 && (
        <p className="cmp-note" role="status">
          <T
            en={`A free account compares ${FREE_COMPARE} shares at a time, so we left out ${joinEn(trimmed)}.`}
            bn={`ফ্রি অ্যাকাউন্টে একসাথে ${FREE_COMPARE}টি শেয়ার তুলনা করা যায়, তাই ${joinBn(trimmed)} বাদ রাখা হয়েছে।`}
          />{" "}
          <button type="button" className="cmp-note-link" onClick={() => showLimitNotice("compare")}>
            <T en="Compare more with Premium" bn="প্রিমিয়ামে আরও তুলনা করুন" />
          </button>
        </p>
      )}
      {dropped.length > 0 && (
        <p className="cmp-note" role="status">
          <T
            en={`We have no grade for ${joinEn(dropped)}, so ${dropped.length > 1 ? "they are" : "it is"} not in the comparison. Funds and bonds aren't graded.`}
            bn={`${joinBn(dropped)}-এর কোনো গ্রেড নেই, তাই তুলনায় রাখা হয়নি। মিউচুয়াল ফান্ড আর বন্ডের গ্রেড দেওয়া হয় না।`}
          />
        </p>
      )}

      {codes.length === 0 && <CompareStart options={options} limit={limit} onPick={onPick} />}

      {failed && (
        <div className="cmp-card cmp-fail" role="alert">
          <p>
            <T en="We couldn't load the comparison just now." bn="এই মুহূর্তে তুলনা লোড করা যায়নি।" />
          </p>
          <button type="button" className="btn-quiet" onClick={() => setAttempt((n) => n + 1)}>
            <T en="Try again" bn="আবার চেষ্টা করুন" />
          </button>
        </div>
      )}

      {codes.length >= 2 && !shown && !failed && (
        <div className="cmp-qs" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="cmp-q">
              <Skeleton height={22} width="70%" />
              <Skeleton height={16} width="90%" />
              <Skeleton height={80} />
            </div>
          ))}
        </div>
      )}

      {shown && (
        <div className={loading ? "cmp-body is-loading" : "cmp-body"}>
          {isPremium && shown.plain && <PlainWords plain={shown.plain} />}
          {PARTS.map((p, i) => (
            <Fragment key={p.key}>
              <section className="cmp-part" aria-labelledby={`cmp-part-${p.key}`}>
                <div className="cmp-part-h">
                  <h2 id={`cmp-part-${p.key}`}>
                    <T en={p.title.en} bn={p.title.bn} />
                  </h2>
                  <p>
                    <T en={p.lead.en} bn={p.lead.bn} />
                  </p>
                </div>
                <div className="cmp-qs">
                  {p.qs.map((k) => {
                    const q = byKey.get(k);
                    return q ? <QuestionCard key={k} q={q} names={names} nums={nums} /> : null;
                  })}
                  {p.key === "cash" && (
                    <CompareDates
                      dates={shown.dates}
                      names={names}
                      nums={nums}
                      today={today}
                      open={allDates}
                      onToggle={() => setAllDates((o) => !o)}
                    />
                  )}
                </div>
              </section>
              {i === 0 && <CompareAnalysis data={shown} nums={nums} />}
            </Fragment>
          ))}
          <p className="cmp-end">
            <T
              en="Being first on one question is not a tip. Open a company's page for our full analysis."
              bn="একটি প্রশ্নে প্রথম হওয়া কোনো টিপস নয়। পুরো বিশ্লেষণের জন্য কোম্পানির পেজ খুলুন।"
            />
          </p>
        </div>
      )}
    </div>
  );
}
