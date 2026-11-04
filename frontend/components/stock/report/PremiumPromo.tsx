"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { IconAlert, IconBell, IconCalendar, IconCheck, IconCrown, IconGrid, IconLock } from "@/components/ui/icons";
import PriceAgainst from "@/components/premium/PriceAgainst";
import ReportKeyButton from "@/components/premium/ReportKeyButton";
import { T } from "@/components/i18n/T";
import { dayParts, dayShort } from "@/components/dividend-calendar/dates";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { freeReportCode } from "@/lib/free-report";
import { takaGroup } from "@/lib/formatters";
import { DEFAULT_PORTFOLIO_SETTINGS } from "@/lib/portfolio-ledger";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { PromoSoon, StockPromoLead } from "@/lib/stock-promo";
import type { Bi, ChartEvent, Tone } from "@/lib/stock-report";
import { useMyStake } from "../YourPosition";
import { usePortfolioFit } from "./usePortfolioFit";

/** Which version of the card a GA event came from (old card = no variant). */
const VARIANT = "v2";
const TOP_LINES = 3;
const HAPPENED_SHOWN = 4;

/** The report's parts, as the short questions they answer (the chips). */
const PARTS: { key: string; q: Bi }[] = [
  { key: "answer", q: { en: "Should you buy it today?", bn: "আজ কি কিনবেন?" } },
  { key: "ch-company", q: { en: "Is it a good company?", bn: "কোম্পানিটি কি ভালো?" } },
  { key: "ch-price", q: { en: "Is the price right?", bn: "দাম কি ন্যায্য?" } },
  { key: "ch-risks", q: { en: "Could anything go wrong?", bn: "কোনো সমস্যা হতে পারে?" } },
  { key: "ch-view", q: { en: "Our view, put together", bn: "সব মিলিয়ে আমাদের মত" } },
  { key: "note", q: { en: "A written analysis", bn: "লিখিত বিশ্লেষণ" } },
];

const ALSO: Bi[] = [
  { en: "On every DSE share", bn: "ডিএসইর প্রতিটি শেয়ারে" },
  { en: "Updated after every result", bn: "প্রতিটি ফল প্রকাশের পর হালনাগাদ" },
  { en: "A notification when our answer changes", bn: "আমাদের উত্তর বদলালে নোটিফিকেশন" },
];

/** A chart event's dot colour on the timeline. */
const EVENT_TONE: Record<ChartEvent["kind"], Tone> = {
  results: "neutral",
  dividend: "good",
  record: "good",
  insider_buy: "good",
  insider_sell: "fair",
  category: "fair",
  rating: "neutral",
};

/**
 * THE Premium card on the stock page (`#ch-premium`, 2026-11-01, user: "there
 * will be one premium promotion card. it will explain what premium does in
 * very simple and plain language … very clean, attractive and premium").
 * A free reader sees the price, the chart and the data room; this card is
 * where the report would be. It never shows an answer.
 *
 * Enriched 2026-11-04 (user: "need this kind of same improvement in stock page
 * premium promo", after the portfolio card's), from `lead` (`lib/stock-promo.ts`,
 * built on the server from what the page already holds) and the reader's own
 * shares:
 *  1. a holder's headline is the taka they have in it ("Should you keep it,
 *     buy more or sell?"); everyone sees the answer's three lights as dots
 *     ("2 look good, 1 needs a look") and the safety checks counted;
 *  2. the nearest real date (results, a board meeting, a record date, an AGM,
 *     within 14 days);
 *  3. three lines on what the report shows on THIS share (the portfolio check
 *     first for a reader with shares), the report's parts as chips, and
 *     "Premium answers each one" said once;
 *  4. what happened on the share in the last 90 days (the chart's events) and
 *     that Premium tells a follower the same day;
 *  5. the free taste made visible: the report keys and today's free report in
 *     one box;
 *  6. the price against their own money and the usual broker fee.
 * GA events carry `variant: "v2"`.
 */
export default function PremiumPromo({
  code,
  name,
  has,
  lead,
  ltp,
}: {
  code: string;
  name: string;
  has: string[];
  lead: StockPromoLead | null;
  /** Today's official close, for a holder's taka. */
  ltp: number | null;
}) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(freeReportCode()), []);

  const first = (user?.display_name ?? "").trim().split(/\s+/)[0] || "";
  const { mine } = useMyStake(code);
  const qty = mine.reduce((s, h) => s + (Number(h.qty) || 0), 0);
  const held = qty > 0 && ltp != null ? qty * ltp : null;

  // For a reader with shares (2026-11-04): what buying it would do to their own
  // portfolio, counted — the count is free, which things and how much is Premium.
  const { fit } = usePortfolioFit(code, null);
  const fitLine: Bi | null = fit
    ? fit.changed > 1
      ? {
          en: `What buying it would change in your portfolio: ${fit.changed} things, worked out on your own ${fit.n} share${fit.n === 1 ? "" : "s"}`,
          bn: `কিনলে আপনার পোর্টফোলিওতে কী বদলাবে: ${fit.changed}টি বিষয়, আপনার নিজের ${fit.n}টি শেয়ার ধরে হিসাব`,
        }
      : {
          en: `Your grade, your spread and your dividends if you buy it, worked out on your own ${fit.n} share${fit.n === 1 ? "" : "s"}`,
          bn: `কিনলে আপনার গ্রেড, টাকার বণ্টন আর ডিভিডেন্ডের কী হবে, আপনার নিজের ${fit.n}টি শেয়ার ধরে হিসাব`,
        }
    : null;

  const lines: { icon: ReactNode; text: Bi }[] = [
    ...(fitLine ? [{ icon: <IconGrid size={18} />, text: fitLine }] : []),
    ...(lead?.shows ?? []).map((t) => ({ icon: <IconCheck size={18} />, text: t })),
  ].slice(0, TOP_LINES);
  const parts = PARTS.filter((p) => has.includes(p.key));

  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=stock#pay" : user ? `${PREMIUM_PATH}#pay` : PREMIUM_PATH;
  const price = offer ? offer.amount : LOWEST_PRICE;

  const lights = lead?.lights ?? [];
  const good = lights.filter((t) => t === "good").length;
  const checks = lead?.checks ?? null;
  const happened = lead?.happened ?? [];

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", {
          area: "stock", lock: "stock-promo", state, stakes: parts.length, variant: VARIANT,
          holder: held ? 1 : 0, soon: lead?.soon ? 1 : 0, happened: happened.length,
        });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, parts.length, held, lead?.soon, happened.length]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "stock", lock: "stock-promo", state, stakes: parts.length, variant: VARIANT, holder: held ? 1 : 0 });
    const stake = held ? (bn ? `${code}-এ আপনার ${takaGroup(held)}` : `Your ${takaGroup(held)} in ${code}`) : null;
    savePremiumContext({
      from: "stock",
      label: bn ? `${code}-এর পূর্ণ রিপোর্ট` : `The full report on ${code}`,
      stakes: [...(stake ? [stake] : []), ...parts.slice(0, stake ? 2 : 3).map((p) => (bn ? p.q.bn : p.q.en))],
    });
  };

  return (
    <section ref={ref} id="ch-premium" className="sp stock-anchor" aria-labelledby="sp-t">
      {/* ── The lead: their money in it, or the question; the lights as dots ── */}
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          <T en={`Premium · the full report on ${code}`} bn={`প্রিমিয়াম · ${code}-এর পূর্ণ রিপোর্ট`} />
        </p>
        {held ? (
          <h2 id="sp-t" className="spx-stake">
            <b className="pv">{takaGroup(held)}</b>
            <span>
              <T
                en={`${first ? `${first}, you` : "You"} have this much in ${code}. Should you keep it, buy more or sell?`}
                bn={`${first ? `${first}, ` : ""}${code}-এ আপনার এতটা টাকা আছে। রাখবেন, আরও কিনবেন, নাকি বিক্রি করবেন?`}
              />
            </span>
          </h2>
        ) : (
          <h2 id="sp-t" className="sp-title">
            <T en={`Should you buy ${name} today? We have an answer.`} bn={`আজ কি ${name} কিনবেন? আমাদের উত্তর তৈরি।`} />
          </h2>
        )}
        <p className="sp-lead">
          <T
            en="The price and every number on this page are free. Premium gives you our answer, and why, in plain words."
            bn="এই পেজের দাম আর সব সংখ্যা ফ্রি। প্রিমিয়াম দেয় আমাদের উত্তর, আর তার কারণ, সহজ ভাষায়।"
          />
        </p>

        {lights.length > 0 && (
          <div className="spx-areas">
            <span className="spx-dots" aria-hidden="true">
              {lights.map((t, i) => (
                <i key={i} data-tone={t} />
              ))}
            </span>
            <span>
              {good === lights.length ? (
                <T en={`All ${lights.length} things our answer weighs look good today.`} bn={`আমাদের উত্তর যে ${lights.length}টি বিষয় দেখে, আজ তার সবগুলোই ভালো।`} />
              ) : good === 0 ? (
                <T en={`All ${lights.length} things our answer weighs need a look.`} bn={`আমাদের উত্তর যে ${lights.length}টি বিষয় দেখে, তার সবগুলোতেই নজর দরকার।`} />
              ) : (
                <T
                  en={`Of the ${lights.length} things our answer weighs, ${good} look${good === 1 ? "s" : ""} good and ${lights.length - good} need${lights.length - good === 1 ? "s" : ""} a look.`}
                  bn={`আমাদের উত্তর যে ${lights.length}টি বিষয় দেখে, তার ${good}টি ভালো, ${lights.length - good}টিতে নজর দরকার।`}
                />
              )}
            </span>
          </div>
        )}
        {checks && checks.total > 0 && (
          <p className="spx-checks" data-red={checks.red ? "true" : undefined}>
            {checks.red > 0 && <IconAlert size={16} />}
            <span>
              {checks.red > 0 ? (
                <T
                  en={`We ran ${checks.total} safety checks: ${checks.red} serious problem${checks.red === 1 ? "" : "s"}${checks.amber ? `, ${checks.amber} smaller thing${checks.amber === 1 ? "" : "s"}` : ""}.`}
                  bn={`আমরা ${checks.total}টি নিরাপত্তা যাচাই করেছি: ${checks.red}টি গুরুতর সমস্যা${checks.amber ? `, ${checks.amber}টি ছোট বিষয়` : ""}।`}
                />
              ) : checks.amber > 0 ? (
                <T
                  en={`We ran ${checks.total} safety checks: nothing serious, ${checks.amber} smaller thing${checks.amber === 1 ? "" : "s"} to look at.`}
                  bn={`আমরা ${checks.total}টি নিরাপত্তা যাচাই করেছি: গুরুতর কিছু নেই, দেখার মতো ${checks.amber}টি ছোট বিষয়।`}
                />
              ) : (
                <T en={`We ran ${checks.total} safety checks and found nothing wrong.`} bn={`আমরা ${checks.total}টি নিরাপত্তা যাচাই করেছি, কোনো সমস্যা পাইনি।`} />
              )}
            </span>
          </p>
        )}
      </div>

      <div className="sp-body">
        {/* ── The nearest real date ── */}
        {lead?.soon && <SoonLine soon={lead.soon} code={code} qty={qty} />}

        {/* ── What the report shows on this share: three lines, the parts as chips ── */}
        <p className="sp-k">
          <T en={`What the full report shows you on ${code}`} bn={`${code} নিয়ে পূর্ণ রিপোর্টে যা দেখবেন`} />
        </p>
        {lines.length > 0 && (
          <ul className="spx-finds">
            {lines.map((l, i) => (
              <li key={i}>
                <span className="sp-icon" aria-hidden="true">{l.icon}</span>
                <b>
                  <T en={l.text.en} bn={l.text.bn} />
                </b>
              </li>
            ))}
          </ul>
        )}
        {parts.length > 0 && (
          <div className="spx-more">
            <span className="spx-more-k">
              <T en="It also answers:" bn="আরও উত্তর দেয়:" />
            </span>
            {parts.map((p) => (
              <span key={p.key} className="spx-chip">
                <T en={p.q.en} bn={p.q.bn} />
              </span>
            ))}
          </div>
        )}
        <p className="spx-shows">
          <IconLock size={14} />
          <T en="Premium answers each one in plain words, with the reason." bn="প্রিমিয়াম প্রতিটির উত্তর দেয় সহজ ভাষায়, কারণসহ।" />
        </p>

        {/* ── What happened on the share in the last 90 days ── */}
        {happened.length > 0 && (
          <div className="spx-missed">
            <p className="sp-k">
              <T
                en={`${happened.length} thing${happened.length === 1 ? "" : "s"} happened on ${code} in the last 90 days`}
                bn={`গত 90 দিনে ${code}-এ ${happened.length}টি ঘটনা`}
              />
            </p>
            <ol className="spx-days">
              {happened.slice(0, HAPPENED_SHOWN).map((e, i) => {
                const p = dayParts(e.date);
                return (
                  <li key={`${e.date}-${i}`} data-tone={EVENT_TONE[e.kind]}>
                    <span className="spx-day">
                      {p ? <T en={`${p.day} ${p.month.en}`} bn={`${p.day} ${p.month.bn}`} /> : e.date}
                    </span>
                    <span>
                      <T en={e.label.en} bn={e.label.bn || e.label.en} />
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="spx-days-more">
              {happened.length > HAPPENED_SHOWN && (
                <>
                  <T en={`And ${happened.length - HAPPENED_SHOWN} more. `} bn={`আরও ${happened.length - HAPPENED_SHOWN}টি। `} />
                </>
              )}
              <T
                en={`Follow ${code} with Premium and we tell you the same day when its results, a warning or our answer change, with what it means.`}
                bn={`প্রিমিয়ামে ${code} ফলো করলে এর ফল, কোনো সতর্কতা বা আমাদের উত্তর বদলালে সেদিনই জানাই, সঙ্গে তার মানে।`}
              />
            </p>
          </div>
        )}

        {/* ── The free taste: report keys and today's free report ── */}
        <div className="spx-taste">
          <p className="spx-taste-k">
            <T en={`Try it free on ${code}`} bn={`${code}-এ ফ্রিতে দেখে নিন`} />
          </p>
          <div className="spx-taste-act">
            <ReportKeyButton code={code} />
          </div>
          {today && today !== code.toUpperCase() && (
            <p className="spx-taste-note">
              <Link href={`/stock/${today}#ch-answer`} prefetch={false} className="font-semibold text-primary-ink hover:underline active:opacity-70">
                <T en={`Or read today's free report: the full report on ${today}.`} bn={`অথবা আজকের ফ্রি রিপোর্ট পড়ুন: ${today}-এর পূর্ণ রিপোর্ট।`} />
              </Link>
            </p>
          )}
        </div>

        <ul className="sp-also">
          {ALSO.map((a, i) => (
            <li key={i}>
              <span aria-hidden="true">{i === 2 ? <IconBell size={14} /> : <IconCheck size={14} />}</span>
              <T en={a.en} bn={a.bn} />
            </li>
          ))}
        </ul>
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
          <PriceAgainst
            price={price}
            feePct={DEFAULT_PORTFOLIO_SETTINGS.fee_pct}
            usualFee
            held={held}
            minHeld={10_000}
            of={(a) => ({ en: `the ${a} you have in ${code}`, bn: `${code}-এ আপনার ${a}` })}
          />
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

/** The nearest dated thing ahead, as one line that ends on what Premium adds. */
function SoonLine({ soon, code, qty }: { soon: PromoSoon; code: string; qty: number }) {
  const d = dayShort(soon.date);
  const on = soon.approx ? { en: `around ${d.en}`, bn: `${d.bn}-এর কাছাকাছি` } : { en: `on ${d.en}`, bn: d.bn };
  let text: Bi;
  if (soon.kind === "results") {
    text = {
      en: `${code} posts its results ${on.en}. What they need to show is in Premium.`,
      bn: `${on.bn} ${code}-এর আর্থিক ফল আসছে। কত মুনাফা হলে ফল ভালো, তা প্রিমিয়ামে।`,
    };
  } else if (soon.kind === "board") {
    text = {
      en: `${code}'s board meets ${on.en} for its results. What they need to show is in Premium.`,
      bn: `${on.bn} ${code}-এর পর্ষদ সভা, আর্থিক ফলের জন্য। কত মুনাফা হলে ফল ভালো, তা প্রিমিয়ামে।`,
    };
  } else if (soon.kind === "record") {
    const cash = soon.cashPs ? (qty > 0 ? soon.cashPs * qty : null) : null;
    const extra =
      cash != null
        ? { en: `: ${takaGroup(cash)} is coming on your ${qty} shares`, bn: `: আপনার ${qty}টি শেয়ারে আসছে ${takaGroup(cash)}` }
        : soon.cashPs
          ? { en: `, ৳${soon.cashPs.toFixed(2)} a share`, bn: `, শেয়ারপ্রতি ৳${soon.cashPs.toFixed(2)}` }
          : { en: "", bn: "" };
    text = {
      en: `${code}'s record date is ${on.en.replace(/^on /, "")}${extra.en}. Whether it can keep paying is in Premium.`,
      bn: `${code}-এর রেকর্ড ডেট ${on.bn}${extra.bn}। কোম্পানিটি এভাবে দিয়ে যেতে পারবে কি না, তা প্রিমিয়ামে।`,
    };
  } else {
    text = {
      en: `${code}'s AGM is ${on.en}. Our read on its dividend is in Premium.`,
      bn: `${on.bn} ${code}-এর এজিএম। এর ডিভিডেন্ড নিয়ে আমাদের মত প্রিমিয়ামে।`,
    };
  }
  return (
    <p className={`spx-soon${soon.kind === "record" && qty > 0 ? " pv" : ""}`}>
      <span className="spx-soon-icon" aria-hidden="true">
        <IconCalendar size={18} />
      </span>
      <span>
        <T en={text.en} bn={text.bn} />
      </span>
    </p>
  );
}
