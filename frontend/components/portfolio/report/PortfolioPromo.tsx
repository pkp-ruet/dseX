"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import {
  IconAlert, IconBell, IconBook, IconBriefcase, IconCalendar, IconCheck, IconCoin, IconCrown, IconGrid,
  IconList, IconLock, IconNews, IconPlus, IconSun, IconTarget, IconTrendDown, IconTrendUp,
} from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { tx } from "@/components/report/chip";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { isoLocal, todayDhaka } from "@/lib/dividend-dates";
import { takaGroup } from "@/lib/formatters";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { Grade } from "@/lib/portfolio-analysis";
import type { PfFinding, PfPromo, PfTaste } from "@/lib/portfolio-report";
import type { Bi } from "@/lib/stock-report";
import { PfQuestion } from "./PfReportChapter";

/** Which version of the card a GA event came from (old card = no variant). */
const VARIANT = "v2";

const ICON: Record<PfFinding["key"], ReactNode> = {
  decide: <IconTarget size={18} />,
  warn: <IconAlert size={18} />,
  add: <IconPlus size={18} />,
  weak: <IconBriefcase size={18} />,
  grade: <IconTrendUp size={18} />,
  spread: <IconGrid size={18} />,
  moves: <IconList size={18} />,
  week: <IconNews size={18} />,
  paid: <IconCoin size={18} />,
  cash: <IconCoin size={18} />,
  results: <IconCalendar size={18} />,
  each: <IconBook size={18} />,
  strong: <IconCheck size={18} />,
  daily: <IconBell size={18} />,
  loss: <IconTrendDown size={18} />,
};

/** A finding in two or three words, for the "+N more" chips. */
const SHORT: Record<PfFinding["key"], Bi> = {
  decide: { en: "Shares to decide on", bn: "সিদ্ধান্তের শেয়ার" },
  warn: { en: "Warnings", bn: "সতর্কসংকেত" },
  add: { en: "Shares to add", bn: "কেনার মতো শেয়ার" },
  weak: { en: "Weak companies", bn: "দুর্বল কোম্পানি" },
  grade: { en: "A higher grade", bn: "গ্রেড বাড়ানো" },
  spread: { en: "Your spread", bn: "টাকার বণ্টন" },
  moves: { en: "Your next steps", bn: "পরের পদক্ষেপ" },
  week: { en: "This week", bn: "এ সপ্তাহে" },
  paid: { en: "Prices you paid", bn: "কেনার দাম" },
  cash: { en: "Dividends coming", bn: "আসছে ডিভিডেন্ড" },
  results: { en: "Results this week", bn: "এ সপ্তাহের ফল" },
  each: { en: "Each share", bn: "প্রতিটি শেয়ার" },
  strong: { en: "Strong companies", bn: "শক্তিশালী কোম্পানি" },
  daily: { en: "Daily check", bn: "প্রতিদিনের যাচাই" },
  loss: { en: "Shares in a loss", bn: "লোকসানের শেয়ার" },
};

const ALSO: { icon: ReactNode; text: Bi }[] = [
  { icon: <IconCheck size={14} />, text: { en: "Checked after every close", bn: "প্রতিদিন বাজার বন্ধের পর যাচাই" } },
  { icon: <IconSun size={14} />, text: { en: "A brief at 9 AM on market days", bn: "লেনদেনের দিনে সকাল 9টায় ব্রিফ" } },
  { icon: <IconBell size={14} />, text: { en: "A notification when something changes", bn: "কিছু বদলালে নোটিফিকেশন" } },
];

const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

/** "28 Oct" / "28 অক্টোবর" from an ISO day. */
const shortDay = (iso: string): Bi => {
  const [, m, d] = iso.split("-").map(Number);
  return { en: `${d} ${MONTH_EN[m - 1]}`, bn: `${d} ${MONTH_BN[m - 1]}` };
};

/** The free answer: one a month per reader, kept in this browser. */
const TASTE_KEY = (uid: string) => `dsex.pf.taste.${uid}`;
type TasteUse = { month: string; finding: PfFinding["key"] };
const readTaste = (uid: string): TasteUse | null => {
  try {
    const raw = localStorage.getItem(TASTE_KEY(uid));
    return raw ? (JSON.parse(raw) as TasteUse) : null;
  } catch {
    return null;
  }
};

const MISSED_DAYS = 4;
const TOP_FINDINGS = 3;

/**
 * THE Premium card on the portfolio page (`#pf-premium`, 2026-11-02, user:
 * "a single premium promo card which tells what kind of analysis and findings
 * waiting for him"). A free reader sees their money, their shares and the
 * detail tabs; the answer, the chapters and the plan sit behind one gate and
 * this card is where they would be. The grade letter is free (the dashboard
 * shows it too). The watcher's teaser push lands on this id.
 *
 * Enriched 2026-11-04 (user: "how can we enrich portfolio premium promo card
 * so more free user feel urge to buy premium?" → "build all"), from what the
 * page already holds (`report.promo`):
 *  1. what Premium would have told them in the last 30 days, by day (kinds,
 *     dates, taka — never which share);
 *  2. a taka headline — the money in shares marked Sell, with a serious
 *     warning or in weak companies — and the four areas as coloured dots;
 *  3. the price against their own money: the broker fee on one trade, and
 *     the share of what they hold;
 *  4. one answer free a month, on their own shares (`PfQuestion` open);
 *  5. the top three findings as short lines, the rest as chips, and "Premium
 *     shows you" said once;
 *  6. the nearest real date (results or a record date within 7 days).
 * GA events carry `variant: "v2"` to compare with the old card.
 */
export default function PortfolioPromo({
  grade,
  findings,
  promo,
  feePct,
  totalValue,
  sampleHref,
}: {
  grade: Grade;
  findings: PfFinding[];
  promo: PfPromo;
  /** The reader's broker fee estimate, % a side (portfolio settings). */
  feePct: number | null;
  /** What their shares are worth today. */
  totalValue: number | null;
  /** A sample portfolio's page: the full check, free. */
  sampleHref: string;
}) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  const first = (user?.display_name ?? "").trim().split(/\s+/)[0] || "";
  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=portfolio#pay" : `${PREMIUM_PATH}#pay`;
  const price = offer ? offer.amount : LOWEST_PRICE;

  const need = promo.areas.filter((t) => t === "bad" || t === "fair").length;
  const top = findings.slice(0, TOP_FINDINGS);
  const rest = findings.slice(TOP_FINDINGS);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", {
          area: "portfolio", lock: "pf-promo", state, stakes: findings.length, job: "watch", variant: VARIANT,
          at_stake: promo.atStake ? 1 : 0, missed: promo.missed.total, soon: promo.soon ? 1 : 0,
        });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, findings.length, promo.atStake, promo.missed.total, promo.soon]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "portfolio", lock: "pf-promo", state, stakes: findings.length, job: "watch", variant: VARIANT });
    const lead = promo.atStake
      ? bn
        ? `আপনার ${takaGroup(promo.atStake.amount)}-এ নজর দেওয়া দরকার`
        : `${takaGroup(promo.atStake.amount)} of your money needs a look`
      : null;
    savePremiumContext({
      from: "portfolio",
      label: bn ? "আপনার পোর্টফোলিওর পূর্ণ যাচাই" : "The full check on your portfolio",
      stakes: [...(lead ? [lead] : []), ...findings.slice(0, lead ? 2 : 3).map((x) => (bn ? x.title.bn : x.title.en))],
    });
  };

  return (
    <section ref={ref} id="pf-premium" className="sp pfp dash-section" aria-labelledby="pfp-t">
      {/* ── The lead: the money that needs a look, the four areas ── */}
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          <T en="Premium · your portfolio check" bn="প্রিমিয়াম · আপনার পোর্টফোলিও যাচাই" />
        </p>
        {promo.atStake ? (
          <h2 id="pfp-t" className="pfp-stake">
            <b className="pv">{takaGroup(promo.atStake.amount)}</b>
            <span>
              <T
                en={`${first ? `${first}, this` : "This"} much of your money needs a look.`}
                bn={`${first ? `${first}, আপনার` : "আপনার"} এতটা টাকায় নজর দেওয়া দরকার।`}
              />
            </span>
          </h2>
        ) : (
          <h2 id="pfp-t" className="sp-title">
            <T
              en={`${first ? `${first}, your` : "Your"} portfolio gets grade ${grade}. Premium tells you why, and what to do.`}
              bn={`${first ? `${first}, আপনার` : "আপনার"} পোর্টফোলিওর গ্রেড ${grade}। কেন, আর এখন কী করবেন, তা জানায় প্রিমিয়াম।`}
            />
          </h2>
        )}
        {promo.atStake && (
          <p className="sp-lead">
            <T
              en={`It sits in ${promo.atStake.shares} of your shares. Premium tells you which, why, and what to do.`}
              bn={`এটি আপনার ${promo.atStake.shares}টি শেয়ারে। কোনগুলো, কেন, আর কী করবেন, তা জানায় প্রিমিয়াম।`}
            />
          </p>
        )}
        <div className="pfp-areas">
          <span className="pfp-dots" aria-hidden="true">
            {promo.areas.map((t, i) => (
              <i key={i} data-tone={t} />
            ))}
          </span>
          <span>
            {need ? (
              <T
                en={`${need} of 4 areas need work · Grade ${grade}`}
                bn={`4টির মধ্যে ${need}টি দিকে কাজ দরকার · গ্রেড ${grade}`}
              />
            ) : (
              <T en={`All 4 areas look fine today · Grade ${grade}`} bn={`আজ 4টি দিকই ঠিক আছে · গ্রেড ${grade}`} />
            )}
          </span>
        </div>
      </div>

      <div className="sp-body">
        {/* ── The nearest real date ── */}
        {promo.soon && (
          <p className={`pfp-soon${promo.soon.en.includes("৳") ? " pv" : ""}`}>
            <span className="pfp-soon-icon" aria-hidden="true">
              <IconCalendar size={18} />
            </span>
            <span>{tx(promo.soon)}</span>
          </p>
        )}

        {/* ── What the check found: three lines, the rest as chips ── */}
        <p className="sp-k">
          <T en="What we found in your portfolio" bn="আপনার পোর্টফোলিওতে আমরা যা পেয়েছি" />
        </p>
        <ul className="pfp-finds">
          {top.map((x, i) => (
            <li key={`${x.key}-${i}`}>
              <span className="sp-icon" aria-hidden="true">{ICON[x.key]}</span>
              <b>{tx(x.title)}</b>
            </li>
          ))}
        </ul>
        {rest.length > 0 && (
          <div className="pfp-more">
            <span className="pfp-more-k">
              <T en={`+${rest.length} more:`} bn={`আরও ${rest.length}টি:`} />
            </span>
            {rest.map((x, i) => (
              <span key={`${x.key}-${i}`} className="pfp-chip">{tx(SHORT[x.key])}</span>
            ))}
          </div>
        )}
        <p className="pfp-shows">
          <IconLock size={14} />
          <T en="Premium shows you which shares, why, and what to do." bn="কোন শেয়ার, কেন, আর কী করবেন, তা দেখায় প্রিমিয়াম।" />
        </p>

        {/* ── What Premium would have told them in the last 30 days ── */}
        {promo.missed.total > 0 && (
          <div className="pfp-missed">
            <p className="sp-k">
              <T
                en={`In the last 30 days, Premium would have told you ${promo.missed.total} thing${promo.missed.total === 1 ? "" : "s"} about your shares`}
                bn={`গত 30 দিনে আপনার শেয়ার নিয়ে প্রিমিয়াম আপনাকে ${promo.missed.total}টি বিষয় জানাত`}
              />
            </p>
            <ol className="pfp-days">
              {promo.missed.days.slice(0, MISSED_DAYS).map((d) => {
                const day = shortDay(d.day);
                return (
                  <li key={d.day} data-tone={d.tone}>
                    <span className="pfp-day">
                      <T en={day.en} bn={day.bn} />
                    </span>
                    <span className={d.text.en.includes("৳") ? "pv" : undefined}>{tx(d.text)}</span>
                  </li>
                );
              })}
            </ol>
            {promo.missed.days.length > MISSED_DAYS && (
              <p className="pfp-days-more">
                <T
                  en={`And ${promo.missed.days.length - MISSED_DAYS} more day${promo.missed.days.length - MISSED_DAYS === 1 ? "" : "s"} with news on your shares.`}
                  bn={`আপনার শেয়ারে খবর ছিল আরও ${promo.missed.days.length - MISSED_DAYS} দিন।`}
                />
              </p>
            )}
          </div>
        )}

        {/* ── One answer free a month, on their own shares ── */}
        {user && promo.tastes.length > 0 && <FreeAnswer uid={user.user_id} tastes={promo.tastes} state={state} />}

        <ul className="sp-also">
          {ALSO.map((a, i) => (
            <li key={i}>
              <span aria-hidden="true">{a.icon}</span>
              <T en={a.text.en} bn={a.text.bn} />
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
          <PriceAgainst price={price} feePct={feePct} totalValue={totalValue} />
        </div>
        <div className="sp-cta">
          <Button href={href} onClick={onTap} size="lg" block>
            {offer ? (
              <T en={`Get your first month for ৳${offer.amount}`} bn={`প্রথম মাস ৳${offer.amount}-এ নিন`} />
            ) : (
              <T en="Get the full check" bn="পূর্ণ যাচাই নিন" />
            )}
          </Button>
        </div>
      </div>

      <p className="sp-fine">
        <T en="Pay by bKash, Nagad or bank transfer. Nothing renews by itself." bn="bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিতে পারবেন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।" />
      </p>

      {/* The free sample, as its own band and button (2026-11-02). */}
      <div className="pfp-sample">
        <span className="pfp-sample-icon" aria-hidden="true">
          <IconBook size={22} />
        </span>
        <span className="pfp-sample-text">
          <b>
            <T en="Not sure yet? See the full check on a sample portfolio." bn="এখনো নিশ্চিত নন? একটি নমুনা পোর্টফোলিওতে পূর্ণ যাচাই দেখুন।" />
          </b>
          <span>
            <T en="Every part is open there, free: the answer, all the chapters and the plan." bn="সেখানে সব অংশ খোলা, ফ্রিতে: উত্তর, সব অধ্যায় আর পরিকল্পনা।" />
          </span>
        </span>
        <Button
          href={sampleHref}
          variant="quiet"
          size="lg"
          className="pfp-sample-btn"
          onClick={() => trackEvent("premium_sample_tap", { area: "portfolio", state, variant: VARIANT })}
        >
          <T en="See a sample check" bn="নমুনা যাচাই দেখুন" /> →
        </Button>
      </div>
    </section>
  );
}

/**
 * ৳199 against the reader's own money: less than the broker fee on one
 * trade of ৳N (their fee setting, N rounded UP to ৳5,000 so the claim holds),
 * and — on a portfolio of ৳50,000 or more — the share of what they hold.
 */
function PriceAgainst({ price, feePct, totalValue }: { price: number; feePct: number | null; totalValue: number | null }) {
  const trade = feePct && feePct > 0 ? Math.ceil(price / (feePct / 100) / 5000) * 5000 : null;
  const share = totalValue && totalValue >= 50_000 ? (price / totalValue) * 100 : null;
  if (!trade && share == null) return null;
  const pctText = share == null ? null : share < 0.1 ? "under 0.1%" : `${share.toFixed(1)}%`;
  const pctBn = share == null ? null : share < 0.1 ? "0.1%-এরও কম" : `${share.toFixed(1)}%`;
  const tradeEn = trade ? `less than the broker fee on one ${takaGroup(trade)} trade` : "";
  const tradeBn = trade ? `${takaGroup(trade)}-এর একটি লেনদেনের ব্রোকার ফি-র চেয়েও কম` : "";
  return (
    <span className="pfp-against">
      {share != null && totalValue ? (
        <T
          en={`That's ${pctText} of the ${takaGroup(totalValue)} in your shares${trade ? `, and ${tradeEn}` : ""}.`}
          bn={`আপনার শেয়ারে থাকা ${takaGroup(totalValue)}-এর ${pctBn}${trade ? `, আর ${tradeBn}` : ""}।`}
        />
      ) : (
        <T en={`${tradeEn[0].toUpperCase()}${tradeEn.slice(1)}.`} bn={`${tradeBn}।`} />
      )}
    </span>
  );
}

/**
 * One answer free a month, on the reader's own shares (2026-11-04, user
 * decision "build all" on idea 4 — it bends the 2026-11-02 rule that every
 * answer on this page is Premium, on purpose). The most important finding's
 * question row opens in full once a month; the opened one stays open for the
 * rest of the month. Kept in this browser (a taste, not an entitlement).
 */
function FreeAnswer({ uid, tastes, state }: { uid: string; tastes: PfTaste[]; state: string }) {
  const month = isoLocal(todayDhaka()).slice(0, 7);
  const [used, setUsed] = useState<TasteUse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = readTaste(uid);
    setUsed(u && u.month === month ? u : null);
    setReady(true);
  }, [uid, month]);

  if (!ready) return null;
  // The 1st of next month (month index m % 12 is next month's, 0-based).
  const m = Number(month.slice(5, 7));
  const next = { en: `1 ${MONTH_EN[m % 12]}`, bn: `1 ${MONTH_BN[m % 12]}` };

  const open = used ? tastes.find((t) => t.finding === used.finding) ?? null : null;

  if (open) {
    return (
      <div className="pfp-taste" data-open="true">
        <p className="pfp-taste-k">
          <T en="Your free answer this month" bn="এ মাসে আপনার ফ্রি উত্তর" />
        </p>
        <div className="pfp-taste-row">
          <PfQuestion row={open.row} />
        </div>
        <p className="pfp-taste-note">
          <T
            en={`Every other answer on your shares is in Premium. Your next free answer opens on ${next.en}.`}
            bn={`আপনার শেয়ারের বাকি সব উত্তর প্রিমিয়ামে। পরের ফ্রি উত্তর খুলবে ${next.bn}।`}
          />
        </p>
      </div>
    );
  }

  if (used) {
    return (
      <div className="pfp-taste">
        <p className="pfp-taste-k">
          <T en="One answer free a month" bn="মাসে একটি উত্তর ফ্রি" />
        </p>
        <p className="pfp-taste-note">
          <T
            en={`You used this month's free answer. The next one opens on ${next.en}.`}
            bn={`এ মাসের ফ্রি উত্তরটি দেখে ফেলেছেন। পরেরটি খুলবে ${next.bn}।`}
          />
        </p>
      </div>
    );
  }

  const pick = tastes[0];
  const onOpen = () => {
    const u: TasteUse = { month, finding: pick.finding };
    try {
      localStorage.setItem(TASTE_KEY(uid), JSON.stringify(u));
    } catch {
      /* private mode: it opens for this visit only */
    }
    setUsed(u);
    trackEvent("premium_taste_open", { area: "portfolio", finding: pick.finding, state, variant: VARIANT });
  };

  return (
    <div className="pfp-taste">
      <p className="pfp-taste-k">
        <T en="One answer free, on your own shares" bn="আপনার নিজের শেয়ারে একটি উত্তর ফ্রি" />
      </p>
      <p className="pfp-taste-q">{tx(pick.title)}</p>
      <div className="pfp-taste-act">
        <Button type="button" variant="quiet" size="md" onClick={onOpen}>
          <T en="Open this answer free" bn="উত্তরটি ফ্রিতে খুলুন" />
        </Button>
        <span>
          <T en="1 free answer a month" bn="মাসে 1টি ফ্রি উত্তর" />
        </span>
      </div>
    </div>
  );
}

