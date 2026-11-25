"use client";

import { useEffect, useRef } from "react";
import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import { IconCrown, IconLock } from "@/components/ui/icons";
import ReportKeyButton from "@/components/premium/ReportKeyButton";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { takaGroup } from "@/lib/formatters";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { Bi, StockAnalysis } from "@/lib/stock-report";
import { useMyStake } from "../YourPosition";

/** Which version of the card a GA event came from (v3 = the analysis card,
 *  2026-11-05; v4 = the "In short" shape, 2026-11-24). */
const VARIANT = "v4";

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

/** "3 things" / "1 thing" / "3টি": a count, never the things. */
function things(n: number): Bi {
  return { en: `${n} ${n === 1 ? "thing" : "things"}`, bn: `${n}টি` };
}

/** Grey bars where the hidden lines go: as many as there are lines (at most
 *  three), or one wide bar for the price. */
function Ghosts({ n, bar = false }: { n: number; bar?: boolean }) {
  if (n <= 0) return null;
  const widths = bar ? ["100%"] : ["88%", "64%", "76%"].slice(0, Math.min(3, n));
  return (
    <span className="spa-ghosts" aria-hidden="true">
      {widths.map((w, i) => (
        <span key={i} className="spa-ghost" data-bar={bar ? "true" : undefined} style={{ width: w }} />
      ))}
    </span>
  );
}

/**
 * THE Premium card on the stock page (`#ch-premium`; rebuilt 2026-11-05, user:
 * "the way we are introducing our premium need to change. right now it's
 * header focused on buy signal. but our main goal is to present our
 * fundamental analysis"). It sells OUR ANALYSIS of the company. Since
 * 2026-11-24 (analysis only, no Buy / Sell on the page) it has the shape of
 * the "In short" card it stands in for: what's good and what to watch as
 * counts with grey bars (never the lines), today's price against our fair
 * price and the six parts, locked. Then the price, one button, and the free
 * taste (for a guest: sign up for 10 a month). It sits right under the
 * cover, above the chart. GA events carry `variant: "v4"`.
 *
 * Since 2026-11-08 a signed-in free reader's first 10 shares a month open by
 * themselves, so a free reader only meets this card once those are read —
 * the card then says so first, naming the shares they read ("used_up" on GA).
 */
export default function PremiumPromo({
  code,
  name,
  analysis,
  ltp,
}: {
  code: string;
  name: string;
  analysis: StockAnalysis;
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
  // Counts only: how many good things and things to watch, never which.
  const nGood = analysis.good?.length ?? null;
  const nWatch = analysis.watch?.length ?? null;

  // The month's free analyses, all read (a guest has none; a failed open has some left).
  const keys = user?.report_keys;
  const usedUp = state === "free" && !!keys && keys.left <= 0;
  const read = (keys?.read ?? []).filter((c) => c !== code.toUpperCase());
  const shown = read.slice(0, 3);
  const more = read.length - shown.length;
  const back = comesBack(keys?.month);

  const href = user ? `${PREMIUM_PATH}#pay` : PREMIUM_PATH;

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
        ...(bn
          ? ["কী ভালো", "কী খেয়াল রাখবেন", "আজকের দাম কি ন্যায্য"]
          : ["What's good", "What to keep an eye on", "Is today's price fair"]
        ).slice(0, stake ? 2 : 3),
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
                en={`${first ? `${first}, you` : "You"} have this much in ${code}. See what's good about it, what to keep an eye on, and whether today's price is fair.`}
                bn={`${first ? `${first}, ` : ""}${code}-এ আপনার এতটা টাকা আছে। এর ভালো দিক কী, কী খেয়াল রাখবেন, আর আজকের দাম ন্যায্য কি না, দেখে নিন।`}
              />
            </span>
          </h2>
        ) : (
          <h2 id="sp-t" className="sp-title">
            <T
              en={`What's good about ${name}, what to keep an eye on, and is today's price fair?`}
              bn={`${name}: কী ভালো, কী খেয়াল রাখবেন, আর আজকের দাম কি ন্যায্য?`}
            />
          </h2>
        )}
        <p className="sp-lead">
          <T
            en="We read its accounts, its dividends and its notices to DSE, and checked its price against what it earns. Then we say it in plain words."
            bn="এর হিসাব, ডিভিডেন্ড আর ডিএসইতে দেওয়া নোটিশ আমরা খুঁটিয়ে দেখেছি, আর আয়ের তুলনায় দাম যাচাই করেছি। তারপর সহজ ভাষায় বলেছি।"
          />
        </p>
      </div>

      <div className="sp-body">
        <p className="sp-k">
          <T en="What's in our analysis" bn="আমাদের বিশ্লেষণে যা আছে" />
        </p>
        <ul className="spa-rows">
          <li className="spa-row">
            <span className="spa-mk" data-tone="good" aria-hidden="true">✓</span>
            <span className="min-w-0">
              <b className="spa-name"><T en="What's good" bn="ভালো দিক" /></b>
              <Ghosts n={nGood ?? 3} />
            </span>
            {nGood != null && <span className="spa-cnt"><T en={things(nGood).en} bn={things(nGood).bn} /></span>}
          </li>
          <li className="spa-row">
            <span className="spa-mk" data-tone="fair" aria-hidden="true">!</span>
            <span className="min-w-0">
              <b className="spa-name"><T en="Keep an eye on" bn="যা খেয়াল রাখবেন" /></b>
              <Ghosts n={nWatch ?? 1} />
            </span>
            {nWatch != null && <span className="spa-cnt"><T en={things(nWatch).en} bn={things(nWatch).bn} /></span>}
          </li>
          <li className="spa-row">
            <span className="spa-mk spa-mk--lock" aria-hidden="true"><IconLock size={13} /></span>
            <span className="min-w-0">
              <b className="spa-name"><T en="Today's price, against what we think it is worth" bn="আমাদের হিসাবে ন্যায্য দামের তুলনায় আজকের দাম" /></b>
              <Ghosts n={1} bar />
            </span>
          </li>
          <li className="spa-row">
            <span className="spa-mk spa-mk--lock" aria-hidden="true"><IconLock size={13} /></span>
            <span className="min-w-0">
              <b className="spa-name">
                <T
                  en="Why we say it: profit, loans, business, dividend, price and safety"
                  bn="কেন বলছি: মুনাফা, ঋণ, ব্যবসা, ডিভিডেন্ড, দাম আর নিরাপত্তা"
                />
              </b>
            </span>
            <span className="spa-cnt"><T en={`${analysis.parts.length} parts`} bn={`${analysis.parts.length}টি অংশ`} /></span>
          </li>
        </ul>
        <p className="spa-every">
          <T
            en="The same analysis on every DSE share, updated after every result, with a notification when our view of the price changes."
            bn="ডিএসইর প্রতিটি শেয়ারে একই বিশ্লেষণ, প্রতিটি ফলের পর হালনাগাদ, আর দাম নিয়ে আমাদের মত বদলালে নোটিফিকেশন।"
          />
        </p>
      </div>
      <div className="sp-foot">
        <div className="sp-cta">
          <Button href={href} onClick={onTap} size="lg" block>
            <T en="Read our analysis" bn="আমাদের বিশ্লেষণ পড়ুন" />
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
