"use client";

import { useEffect, useRef } from "react";
import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconCrown, IconLock } from "@/components/ui/icons";
import ReportKeyButton from "@/components/premium/ReportKeyButton";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { takaGroup } from "@/lib/formatters";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { AnalysisPart, Bi, RedFlagsSection, StockAnalysis, Tone } from "@/lib/stock-report";
import { useMyStake } from "../YourPosition";

/** Which version of the card a GA event came from (v3 = the analysis card, 2026-11-05). */
const VARIANT = "v3";

/** What we read for each part, from the part's own figures — never its answer. */
function lookedAt(p: AnalysisPart): Bi {
  switch (p.key) {
    case "profit": {
      const n = p.series?.length ?? 0;
      return n >= 2
        ? { en: `${n} years of profit, this year's results, and how much of it arrives as cash`, bn: `${n} বছরের মুনাফা, এ বছরের ফল, আর মুনাফার কতটা নগদে আসে` }
        : { en: "Its profit, this year's results, and how much of it arrives as cash", bn: "মুনাফা, এ বছরের ফল, আর মুনাফার কতটা নগদে আসে" };
    }
    case "finances":
      return p.bars?.length
        ? { en: "Its loans against the savings it has built up, and its interest", bn: "জমানো টাকার তুলনায় ঋণ, আর সুদের চাপ" }
        : { en: "How much of its own money stands behind it", bn: "এর পেছনে নিজস্ব মূলধন কতটা" };
    case "business": {
      const of = p.ranks?.[0]?.of;
      return of
        ? { en: `Its place among the ${of} companies in its sector`, bn: `নিজের সেক্টরের ${of}টি কোম্পানির মধ্যে এর অবস্থান` }
        : { en: "How it compares with the other companies in its sector", bn: "নিজের সেক্টরের অন্য কোম্পানির সঙ্গে তুলনা" };
    }
    case "dividend": {
      const n = p.series?.length ?? 0;
      return n >= 2
        ? { en: `${n} years of dividends, and whether it can keep paying`, bn: `${n} বছরের ডিভিডেন্ড, আর তা দিয়ে যেতে পারবে কি না` }
        : { en: "Its dividends, and whether it can keep paying", bn: "ডিভিডেন্ড, আর তা দিয়ে যেতে পারবে কি না" };
    }
    case "price":
      return { en: "Our fair price, and how it compares with its usual price and similar companies", bn: "আমাদের হিসাবে ন্যায্য দাম, আর স্বাভাবিক দাম ও একই ধরনের কোম্পানির সঙ্গে তুলনা" };
    case "safety":
    default:
      return { en: "The auditor, the regulator, its loans, its owners and how easy it is to sell", bn: "নিরীক্ষক, নিয়ন্ত্রক সংস্থা, ঋণ, মালিকানা আর বিক্রির সহজতা" };
  }
}

/** "1 Dec" — when the month's free analyses come back (Dhaka calendar). */
function comesBack(month: string | undefined): Bi {
  const m = /^(\d{4})-(\d{2})$/.exec(month ?? "");
  const en = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const bn = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const i = m ? Number(m[2]) % 12 : 0;
  return { en: `1 ${en[i]}`, bn: `1 ${bn[i]}` };
}

/** The shares they read, each a link back to its analysis. */
function ReadList({ codes }: { codes: string[] }) {
  return (
    <>
      {codes.map((c, i) => (
        <span key={c}>
          {i > 0 && ", "}
          <Link href={`/stock/${c}#ch-analysis`} prefetch={false} className="font-semibold underline">
            {c}
          </Link>
        </span>
      ))}
    </>
  );
}

/** The safety-check count is free (it always was): a chip on that row. */
function safetyCount(rf: RedFlagsSection["counts"] | null): { text: Bi; tone: Tone } | null {
  if (!rf) return null;
  if (rf.red > 0) {
    return { tone: "bad", text: { en: `${rf.checks} checks · ${rf.red} serious`, bn: `${rf.checks}টি যাচাই · ${rf.red}টি গুরুতর` } };
  }
  if (rf.amber > 0) {
    return {
      tone: "fair",
      text: { en: `${rf.checks} checks · nothing serious · ${rf.amber} to look at`, bn: `${rf.checks}টি যাচাই · গুরুতর কিছু নেই · দেখার মতো ${rf.amber}টি` },
    };
  }
  return { tone: "good", text: { en: `${rf.checks} checks · all passed`, bn: `${rf.checks}টি যাচাই · সবই ঠিক` } };
}

/**
 * THE Premium card on the stock page (`#ch-premium`; rebuilt 2026-11-05, user:
 * "the way we are introducing our premium need to change. right now it's
 * header focused on buy signal. but our main goal is to present our
 * fundamental analysis"). It sells OUR ANALYSIS of the company: the headline
 * is the grade (free on the cover) and "see exactly why", then the analysis's
 * six parts as a locked contents list — what we read for each, never the
 * answer — with the safety-check count free, and our conclusion as the last
 * row. Then the price, one button, and the free taste (for a guest: sign up
 * for 10 a month). It sits right under the cover, above the chart. GA events
 * carry `variant: "v3"`.
 *
 * Since 2026-11-08 a signed-in free reader's first 10 shares a month open by
 * themselves, so a free reader only meets this card once those are read —
 * the card then says so first, naming the shares they read ("used_up" on GA).
 */
export default function PremiumPromo({
  code,
  name,
  analysis,
  redFlags,
  ltp,
}: {
  code: string;
  name: string;
  analysis: StockAnalysis;
  redFlags: RedFlagsSection["counts"] | null;
  ltp: number | null;
}) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  const first = (user?.display_name ?? "").trim().split(/\s+/)[0] || "";
  const { mine } = useMyStake(code);
  const qty = mine.reduce((s, h) => s + (Number(h.qty) || 0), 0);
  const held = qty > 0 && ltp != null ? qty * ltp : null;

  const g = analysis.grade;
  const strongish = g.tone === "good";

  // The month's free analyses, all read (a guest has none; a failed open has some left).
  const keys = user?.report_keys;
  const usedUp = state === "free" && !!keys && keys.left <= 0;
  const read = (keys?.read ?? []).filter((c) => c !== code.toUpperCase());
  const shown = read.slice(0, 3);
  const more = read.length - shown.length;
  const back = comesBack(keys?.month);
  const sc = safetyCount(redFlags);

  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=stock#pay" : user ? `${PREMIUM_PATH}#pay` : PREMIUM_PATH;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", {
          area: "stock", lock: "stock-promo", state, stakes: analysis.parts.length, variant: VARIANT,
          holder: held ? 1 : 0, grade: g.word.en, used_up: usedUp ? 1 : 0,
        });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, analysis.parts.length, held, g.word.en, usedUp]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "stock", lock: "stock-promo", state, stakes: analysis.parts.length, variant: VARIANT, holder: held ? 1 : 0, used_up: usedUp ? 1 : 0 });
    const stake = held ? (bn ? `${code}-এ আপনার ${takaGroup(held)}` : `Your ${takaGroup(held)} in ${code}`) : null;
    savePremiumContext({
      from: "stock",
      label: bn ? `${name}: আমাদের বিশ্লেষণ` : `Our analysis of ${name}`,
      stakes: [
        ...(stake ? [stake] : []),
        ...analysis.parts.slice(0, stake ? 2 : 3).map((p) => (bn ? p.question.bn : p.question.en)),
      ],
    });
  };

  return (
    <section ref={ref} id="ch-premium" className="sp stock-anchor" aria-labelledby="sp-t">
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          <T en={`Premium · Our analysis of ${name}`} bn={`প্রিমিয়াম · ${name}: আমাদের বিশ্লেষণ`} />
        </p>
        {usedUp && keys && (
          <p className="spa-used">
            <T
              en={
                <>
                  You have read your {keys.per_month} free analyses this month
                  {shown.length > 0 && <>: <ReadList codes={shown} />{more > 0 && ` and ${more} more`}</>}. {keys.per_month} more come on {back.en}.
                </>
              }
              bn={
                <>
                  এ মাসের {keys.per_month}টি ফ্রি বিশ্লেষণ পড়া হয়ে গেছে
                  {shown.length > 0 && <>: <ReadList codes={shown} />{more > 0 && ` আর আরও ${more}টি`}</>}। {back.bn} আবার {keys.per_month}টি পাবেন।
                </>
              }
            />
          </p>
        )}
        {held ? (
          <h2 id="sp-t" className="spx-stake">
            <b className="pv">{takaGroup(held)}</b>
            <span>
              <T
                en={`${first ? `${first}, you` : "You"} have this much in ${code}. We graded the business behind it “${g.word.en}”. See exactly why.`}
                bn={`${first ? `${first}, ` : ""}${code}-এ আপনার এতটা টাকা আছে। এর পেছনের ব্যবসাকে আমরা “${g.word.bn}” গ্রেড দিয়েছি। কেন, দেখে নিন।`}
              />
            </span>
          </h2>
        ) : (
          <h2 id="sp-t" className="sp-title">
            {strongish ? (
              <T en={`${name} is graded “${g.word.en}”. See exactly why.`} bn={`${name}-কে আমরা “${g.word.bn}” গ্রেড দিয়েছি। কেন, দেখে নিন।`} />
            ) : (
              <T
                en={`${name} is graded “${g.word.en}”. See what is strong, what is weak, and why.`}
                bn={`${name}-কে আমরা “${g.word.bn}” গ্রেড দিয়েছি। কোথায় শক্তিশালী, কোথায় দুর্বল, আর কেন, দেখে নিন।`}
              />
            )}
          </h2>
        )}
        <p className="sp-lead">
          <T
            en="We read its accounts for the last five years, this year's results, its loans, its dividends and its price, and explain each one in plain words."
            bn="গত পাঁচ বছরের হিসাব, এ বছরের ফল, ঋণ, ডিভিডেন্ড আর দাম আমরা খুঁটিয়ে দেখেছি, আর প্রতিটি সহজ ভাষায় বুঝিয়ে বলেছি।"
          />
        </p>
      </div>

      <div className="sp-body">
        <p className="sp-k">
          <T en="What's in the analysis" bn="বিশ্লেষণে যা আছে" />
        </p>
        <ol className="spa-rows">
          {analysis.parts.map((p, i) => {
            const lk = lookedAt(p);
            return (
              <li key={p.key} className="spa-row">
                <span className="spa-n" aria-hidden="true">{i + 1}</span>
                <span className="min-w-0">
                  <b className="block text-text-main">
                    <T en={`${p.name.en} · ${p.question.en}`} bn={`${p.name.bn} · ${p.question.bn}`} />
                  </b>
                  <span className="block text-sm text-text-main">
                    <T en={lk.en} bn={lk.bn} />
                  </span>
                  {p.key === "safety" && sc && (
                    <span className="spa-free" data-tone={sc.tone}>
                      <T en={`${sc.text.en} · free`} bn={`${sc.text.bn} · ফ্রি`} />
                    </span>
                  )}
                </span>
                <span className="spa-lock" aria-label={bn ? "প্রিমিয়াম" : "Premium"}>
                  <IconLock size={14} />
                </span>
              </li>
            );
          })}
          <li className="spa-row spa-concl">
            <span className="spa-n" aria-hidden="true">
              <IconArrowRight size={14} />
            </span>
            <span className="min-w-0">
              <b className="block text-text-main">
                <T en="Our conclusion" bn="আমাদের সিদ্ধান্ত" />
              </b>
              <span className="block text-sm text-text-main">
                <T en="Should you buy it today, and up to what price?" bn="আজ কি কেনা উচিত, আর কত দাম পর্যন্ত?" />
              </span>
            </span>
            <span className="spa-lock" aria-hidden="true">
              <IconLock size={14} />
            </span>
          </li>
        </ol>
        <p className="spa-every">
          <T
            en="The same analysis on every DSE share, updated after every result, with a notification when our answer changes."
            bn="ডিএসইর প্রতিটি শেয়ারে একই বিশ্লেষণ, প্রতিটি ফলের পর হালনাগাদ, আর আমাদের উত্তর বদলালে নোটিফিকেশন।"
          />
        </p>
      </div>

      <div className="sp-foot">
        <div className="sp-price">
          {offer ? (
            <>
              <b>
                <T en={`Your first month: ৳${offer.amount}`} bn={`আপনার প্রথম মাস: ৳${offer.amount}`} />
              </b>
              <span>
                <T en={`Instead of ৳${offer.list_amount}, once.`} bn={`৳${offer.list_amount}-এর বদলে, একবারই।`} />
              </span>
            </>
          ) : (
            <>
              <b>
                <T en={`৳${LOWEST_PRICE} a month`} bn={`মাসে ৳${LOWEST_PRICE}`} />
              </b>
              <span>
                <T en={`About ৳${FROM_MONTH} a month on the yearly plan.`} bn={`বছরের প্ল্যানে মাসে প্রায় ৳${FROM_MONTH}।`} />
              </span>
            </>
          )}
        </div>
        <div className="sp-cta">
          <Button href={href} onClick={onTap} size="lg" block>
            {offer ? (
              <T en={`Get your first month for ৳${offer.amount}`} bn={`প্রথম মাস ৳${offer.amount}-এ নিন`} />
            ) : (
              <T en="Get Premium" bn="প্রিমিয়াম নিন" />
            )}
          </Button>
        </div>
      </div>

      {!usedUp && (
        <div className="sp-body">
          <div className="spx-taste">
            <p className="spx-taste-k">
              <T en={`Try it free on ${code}`} bn={`${code}-এ ফ্রিতে দেখে নিন`} />
            </p>
            <div className="spx-taste-act">
              <ReportKeyButton code={code} />
            </div>
          </div>
        </div>
      )}

      <p className="sp-fine">
        {state === "guest" ? (
          <T
            en="Create a free account, then pay by bKash, Nagad or bank transfer. Nothing renews by itself."
            bn="একটি ফ্রি অ্যাকাউন্ট খুলুন, তারপর bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।"
          />
        ) : (
          <T en="Pay by bKash, Nagad or bank transfer. Nothing renews by itself." bn="bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিতে পারবেন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।" />
        )}
      </p>
    </section>
  );
}
