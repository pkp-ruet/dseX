"use client";

import { useEffect, useMemo, useState } from "react";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { IconLock } from "@/components/ui/icons";
import PremiumGate from "@/components/premium/PremiumGate";
import { PersonalCodesProvider, usePersonalCodesCtx } from "@/components/market-analysis/PersonalCodes";
import type { LatestResultRow } from "@/lib/api";
import { FREE_RESULTS_ROWS } from "@/lib/free-share";
import { RESULT_LEVEL, RESULT_LEVEL_ORDER } from "@/lib/results";
import { usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import { useLang } from "@/context/LangContext";
import { T } from "@/components/i18n/T";
import { bnDate } from "@/lib/bn";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";
import ResultRow from "./ResultRow";
import ResultsFilterPreview from "./ResultsFilterPreview";

const PAGE = 50;
type Level = LatestResultRow["level"];
type Filter = "all" | "mine" | Level;
const FILTERS: Filter[] = ["all", "mine", ...RESULT_LEVEL_ORDER];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Monday, 27 Oct 2026" — read as a calendar date, so no time zone can shift it. */
function enDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Rows grouped by the day they were posted (rows arrive newest first). */
function byDay(rows: LatestResultRow[]): { day: string; items: LatestResultRow[] }[] {
  const groups: { day: string; items: LatestResultRow[] }[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.day === r.post_date) last.items.push(r);
    else groups.push({ day: r.post_date, items: [r] });
  }
  return groups;
}

/**
 * Every company's latest quarterly report, newest first, grouped by the day
 * it was posted (redesigned clean 2026-10-28, styles `rs-*` in
 * app/styles/results.css). One bar shows how the reports split; the chips
 * filter: All · My stocks (holdings ∪ watchlist) · Better · Mixed · Weaker ·
 * About the same. Each row taps through to the stock page's results card.
 *
 * Free readers (user decision 2026-10-28): the newest FREE_RESULTS_ROWS of
 * All, the rest blurred behind one lock, and **every filter locked** — the
 * counts stay free, and tapping a locked chip opens a preview (what it
 * means, how many, three rows blurred) with one button to /premium. Screen-
 * only like every lock: the rows stay in the HTML, marked `.premium-locked`.
 * Premium readers get every filter (in the URL, `?level=good|watch|bad|
 * neutral|mine`) and one unbroken list.
 */
export default function ResultsFeed(props: { rows: LatestResultRow[]; counts: Record<Level, number> }) {
  return (
    <PersonalCodesProvider>
      <Feed {...props} />
    </PersonalCodesProvider>
  );
}

function Feed({ rows, counts }: { rows: LatestResultRow[]; counts: Record<Level, number> }) {
  const { bn } = useLang();
  const t = (en: string, b: string) => (bn ? b : en);
  const { isPremium, isLoading, state } = usePremium();
  const { portfolio, watchlist } = usePersonalCodesCtx();
  const urlParams = useUrlParams();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);
  const [preview, setPreview] = useState<Filter | null>(null);
  useEffect(() => setMounted(true), []);
  const unlocked = mounted && isPremium;

  // A shared `?level=` opens that filter — for Premium readers only.
  useEffect(() => {
    if (!urlParams || isLoading || !isPremium) return;
    const lv = urlParams.get("level");
    if (lv && (FILTERS as string[]).includes(lv)) setFilter(lv as Filter);
  }, [urlParams, isLoading, isPremium]);
  useUrlSync({ level: filter === "all" ? null : filter }, urlParams !== null && !isLoading);

  const mine = useMemo(() => {
    const codes = new Set([...portfolio, ...watchlist]);
    return rows.filter((r) => codes.has(r.code.toUpperCase()));
  }, [rows, portfolio, watchlist]);
  const signedIn = state !== "guest";

  const rowsFor = (f: Filter) => (f === "all" ? rows : f === "mine" ? mine : rows.filter((r) => r.level === f));
  const countFor = (f: Filter) => (f === "all" ? rows.length : f === "mine" ? mine.length : counts[f] ?? 0);
  const filtered = rowsFor(filter);
  const dayCount: Record<string, number> = {};
  for (const r of filtered) dayCount[r.post_date] = (dayCount[r.post_date] ?? 0) + 1;

  const label = (f: Filter) =>
    f === "all" ? { en: "All", bn: "সব" }
      : f === "mine" ? { en: "My stocks", bn: "আমার শেয়ার" }
        : { en: RESULT_LEVEL[f].short, bn: RESULT_LEVEL[f].shortBn };

  const choose = (f: Filter) => {
    if (f === filter) return;
    if (f !== "all" && !unlocked) {
      setPreview(f);
      trackEvent("premium_lock_view", { area: "results", lock: "Results filter", filter: f, state });
      return;
    }
    setFilter(f);
    setShown(PAGE);
  };

  // ---- the list ----
  const list = (items: LatestResultRow[], continuesDay?: string) => (
    <div>
      {byDay(items).map((g, i) => (
        <section key={g.day} className="rs-day" aria-label={enDay(g.day)}>
          {!(i === 0 && g.day === continuesDay) && (
            <h2 className="rs-day-head">
              <T en={enDay(g.day)} bn={bnDate(g.day, true)} />
              <span className="rs-day-n">
                <T
                  en={`${dayCount[g.day]} ${dayCount[g.day] === 1 ? "report" : "reports"}`}
                  bn={`${dayCount[g.day]}টি প্রতিবেদন`}
                />
              </span>
            </h2>
          )}
          <ul className="soft-card rs-list">
            {g.items.map((r) => (
              <li key={r.code}>
                <ResultRow r={r} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );

  let body;
  if (filtered.length === 0) {
    body =
      filter === "mine" ? (
        <EmptyState
          className="mt-6"
          title={<T en="None of your stocks has a report here" bn="আপনার কোনো শেয়ারের প্রতিবেদন এখানে নেই" />}
          message={
            <T
              en="When a company you own or follow posts its quarterly results, it shows here."
              bn="আপনার কেনা বা অনুসরণ করা কোনো কোম্পানি প্রান্তিকের ফল প্রকাশ করলে তা এখানে দেখাবে।"
            />
          }
          actions={[
            { href: "/watchlist", label: <T en="Build your watchlist" bn="ওয়াচলিস্ট বানান" /> },
            { href: "/portfolio", label: <T en="Add your portfolio" bn="পোর্টফোলিও যোগ করুন" /> },
          ]}
        />
      ) : (
        <EmptyState
          className="mt-6"
          title={<T en="No reports here" bn="এখানে কোনো প্রতিবেদন নেই" />}
          message={
            <T
              en="No company's latest report falls in this group right now."
              bn="এই ভাগে এখন কোনো কোম্পানির সর্বশেষ প্রতিবেদন নেই।"
            />
          }
        />
      );
  } else if (unlocked) {
    body = (
      <>
        {list(filtered.slice(0, shown))}
        {filtered.length > shown && (
          <div className="rs-more">
            <Button variant="quiet" onClick={() => setShown((n) => n + PAGE)}>
              <T
                en={`Show more (${filtered.length - shown} left)`}
                bn={`আরও দেখুন (${filtered.length - shown}টি বাকি)`}
              />
            </Button>
          </div>
        )}
      </>
    );
  } else {
    // Free readers and the server render: the newest few open, the rest locked.
    const free = filtered.slice(0, FREE_RESULTS_ROWS);
    const locked = filtered.slice(FREE_RESULTS_ROWS, PAGE);
    const lockedAll = filtered.slice(FREE_RESULTS_ROWS);
    const lockedBetter = lockedAll.filter((r) => r.level === "good").length;
    const mineCodes = new Set(mine.map((r) => r.code));
    const lockedMine = lockedAll.filter((r) => mineCodes.has(r.code)).length;
    body = (
      <>
        {list(free)}
        {locked.length > 0 && (
          <PremiumGate
            label={{ en: "Every company's results", bn: "সব কোম্পানির ফল" }}
            preview="blur"
            peek={220}
            stakes={[
              { en: `${lockedAll.length} more companies' latest results`, bn: `আরও ${lockedAll.length}টি কোম্পানির সর্বশেষ ফল` },
              lockedMine > 0
                ? { en: `${lockedMine} of them on your stocks`, bn: `এর মধ্যে ${lockedMine}টি আপনার শেয়ার` }
                : "",
              lockedBetter > 0
                ? { en: `${lockedBetter} of them earned clearly more than a year ago`, bn: `এর মধ্যে ${lockedBetter}টির মুনাফা গত বছরের চেয়ে স্পষ্টভাবে বেশি` }
                : "",
            ]}
            className="mt-2"
          >
            {list(locked, free[free.length - 1]?.post_date)}
          </PremiumGate>
        )}
      </>
    );
  }

  // ---- the locked-filter preview ----
  const pv = preview;
  const pvRows = pv ? rowsFor(pv) : [];
  const pvTitle = pv == null ? "" : pv === "mine" ? t("Results on your stocks", "আপনার শেয়ারের ফল") : t(RESULT_LEVEL[pv as Level].en, RESULT_LEVEL[pv as Level].bn);
  const pvLine =
    pv == null ? ""
      : pv === "mine"
        ? signedIn
          ? t("Only the companies you own or follow, newest report first.", "শুধু আপনার কেনা বা অনুসরণ করা কোম্পানিগুলো, নতুন প্রতিবেদন আগে।")
          : t("Sign up, follow your stocks, and see only their results here.", "সাইন আপ করে আপনার শেয়ারগুলো অনুসরণ করুন, তারপর শুধু সেগুলোর ফল এখানে দেখুন।")
        : t(RESULT_LEVEL[pv as Level].means, RESULT_LEVEL[pv as Level].meansBn);
  const pvCountLabel =
    pv === "mine"
      ? t(pvRows.length === 1 ? "of your stocks has a report here" : "of your stocks have a report here", "টি আপনার শেয়ারের প্রতিবেদন আছে")
      : t(pvRows.length === 1 ? "company" : "companies", "টি কোম্পানি");

  return (
    <div>
      <div className="rs-split" role="img" aria-label={t(
        `${counts.good ?? 0} better, ${counts.watch ?? 0} mixed, ${counts.bad ?? 0} weaker, ${counts.neutral ?? 0} about the same`,
        `${counts.good ?? 0}টি ভালো, ${counts.watch ?? 0}টি মিশ্র, ${counts.bad ?? 0}টি দুর্বল, ${counts.neutral ?? 0}টি প্রায় আগের মতো`,
      )}>
        {RESULT_LEVEL_ORDER.map((lv) =>
          (counts[lv] ?? 0) > 0 ? (
            <span key={lv} className={`rs-lv--${lv}`} style={{ width: `${((counts[lv] ?? 0) / Math.max(1, rows.length)) * 100}%` }} />
          ) : null,
        )}
      </div>

      <div className="rs-filters" role="group" aria-label={t("Filter results", "ফল বাছাই")}>
        {FILTERS.map((f) => {
          const l = label(f);
          const isLevel = f !== "all" && f !== "mine";
          const showCount = f !== "mine" || (mounted && signedIn);
          return (
            <Chip
              key={f}
              active={filter === f}
              onClick={() => choose(f)}
              icon={isLevel ? <span className={`rs-dot rs-lv--${f}`} /> : undefined}
            >
              <T en={l.en} bn={l.bn} />
              {showCount && <span className="rs-chip-n">{countFor(f)}</span>}
              {f !== "all" && !unlocked && (
                <span className="rs-chip-lock">
                  <IconLock size={14} />
                  <span className="sr-only">{t("Premium", "প্রিমিয়াম")}</span>
                </span>
              )}
            </Chip>
          );
        })}
      </div>

      <p className="rs-key">
        <T
          en="EPS is profit per share for the months the report covers (3, 6 or 9), next to the same months a year ago. The big figure is how much it changed. Tap a company for the full read."
          bn="ইপিএস মানে প্রতিবেদনের সময়ের (3, 6 বা 9 মাস) শেয়ারপ্রতি মুনাফা, পাশে এক বছর আগের একই সময়ের হিসাব। বড় সংখ্যাটি দেখায় কতটা বদলেছে। পুরো ব্যাখ্যা দেখতে কোম্পানিতে চাপ দিন।"
        />
      </p>

      {body}

      <ResultsFilterPreview
        open={pv != null}
        onClose={() => setPreview(null)}
        title={pvTitle}
        line={pvLine}
        count={pvRows.length}
        countLabel={pvCountLabel}
        rows={pvRows}
        empty={pv === "mine"
          ? t("None of your stocks has a report here yet.", "আপনার কোনো শেয়ারের প্রতিবেদন এখনো এখানে নেই।")
          : t("No company's latest report falls in this group right now.", "এই ভাগে এখন কোনো কোম্পানির সর্বশেষ প্রতিবেদন নেই।")}
        onCta={() => {
          trackEvent("premium_lock_tap", { area: "results", lock: "Results filter", filter: pv ?? "", state });
          savePremiumContext({
            from: "results",
            label: pvTitle,
            stakes: [
              pv === "mine" && pvRows.length > 0
                ? t(`${pvRows.length} of your stocks have new results`, `আপনার ${pvRows.length}টি শেয়ারের নতুন ফল আছে`)
                : t(`${pvRows.length} companies in "${pvTitle}"`, `"${pvTitle}" ভাগে ${pvRows.length}টি কোম্পানি`),
              t(`${Math.max(0, rows.length - FREE_RESULTS_ROWS)} more companies' latest results`, `আরও ${Math.max(0, rows.length - FREE_RESULTS_ROWS)}টি কোম্পানির সর্বশেষ ফল`),
            ],
          });
          setPreview(null);
        }}
        t={t}
      />
    </div>
  );
}
