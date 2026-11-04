"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import PriceAgainst from "@/components/premium/PriceAgainst";
import {
  IconAlert, IconBell, IconCalendar, IconCheck, IconCoin, IconCrown, IconList, IconLock, IconTarget, IconTrendUp,
} from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { dayShort } from "@/components/dividend-calendar/dates";
import DividendDays from "@/components/dividend-calendar/DividendDays";
import { CALENDAR_PREMIUM_ANCHOR } from "@/components/dividend-calendar/RemindButton";
import { DIVIDEND_TAX } from "@/components/dividend-calendar/IncomeCard";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { takaGroup } from "@/lib/formatters";
import { heldQty, loadMainHoldings } from "@/lib/main-holdings";
import { DEFAULT_PORTFOLIO_SETTINGS } from "@/lib/portfolio-ledger";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { CalendarPromo } from "@/lib/dividend-promo";
import type { Bi } from "@/lib/stock-report";

const TOP_LINES = 3;
const DAYS_SHOWN = 4;

type Find = { key: string; icon: ReactNode; text: Bi; short: Bi };

const ALSO: { icon: ReactNode; text: Bi }[] = [
  { icon: <IconCheck size={14} />, text: { en: "Every DSE company", bn: "ডিএসইর প্রতিটি কোম্পানি" } },
  { icon: <IconCheck size={14} />, text: { en: "Rebuilt every trading day", bn: "প্রতি লেনদেনের দিনে নতুন করে" } },
  { icon: <IconBell size={14} />, text: { en: "A reminder on the last day to buy", bn: "কেনার শেষ দিনে মনে করিয়ে দেওয়া" } },
];

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * THE Premium card on the dividend calendar (`#dc-premium`, 2026-11-04, user:
 * "make the whole dividend calendar page premium. free user will see a promo
 * card like stock and portfolio page"). The calendar itself sits behind the
 * page's one gate; this card is where it would be. Same look as the stock
 * page's and the portfolio's cards (`.sp` + `spx-*`).
 *
 * From `promo` (`lib/dividend-promo.ts`, built on the server) and the reader's
 * own shares:
 *  1. a holder's headline is the cash coming to their shares from dividends
 *     already declared (after 10% tax); a holder with only expected ones gets
 *     their count; everyone else the number of companies about to pay;
 *  2. "Is it safe?" across every cash dividend ahead, counted by word;
 *  3. a holder's nearest record date with the cash on their shares;
 *  4. what the calendar shows, counted: three lines, the rest as chips;
 *  5. the next two weeks as a short timeline — how many pay each day and up
 *     to how much, how many are theirs or at risk.
 * Counts and dates only: never a company the reader doesn't hold.
 */
export default function DividendPromo({ promo }: { promo: CalendarPromo }) {
  const { user, isLoggedIn } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  const [qty, setQty] = useState<Map<string, number> | null>(null);
  useEffect(() => {
    if (!isLoggedIn) {
      setQty(null);
      return;
    }
    let live = true;
    loadMainHoldings()
      .then((hs) => {
        if (live) setQty(heldQty(hs));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [isLoggedIn]);

  // The reader's own: declared cash on their shares, and the ones we expect.
  const mine = useMemo(() => {
    if (!qty || qty.size === 0) return null;
    const declared = promo.records
      .filter((r) => (qty.get(r.code) ?? 0) > 0)
      .map((r) => ({ ...r, qty: qty.get(r.code) as number, net: (qty.get(r.code) as number) * r.cash * (1 - DIVIDEND_TAX) }));
    const paying = new Set(declared.map((r) => r.code));
    const expected = promo.expected.filter((x) => (qty.get(x.code) ?? 0) > 0 && !paying.has(x.code));
    const codes = new Set([...paying, ...expected.map((x) => x.code)]);
    return {
      declared,
      total: declared.reduce((a, r) => a + r.net, 0),
      shares: paying.size,
      expected: new Set(expected.map((x) => x.code)).size,
      paying: codes.size,
    };
  }, [qty, promo.records, promo.expected]);
  const myDay = (date: string) => mine?.declared.filter((r) => r.date === date).length ?? 0;
  const nearest = mine?.declared[0] ?? null;

  const first = (user?.display_name ?? "").trim().split(/\s+/)[0] || "";
  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=dividend-calendar#pay" : user ? `${PREMIUM_PATH}#pay` : PREMIUM_PATH;
  const price = offer ? offer.amount : LOWEST_PRICE;

  const sf = promo.safety;
  const rated = sf.safe + sf.watch + sf.risk;

  const finds: Find[] = [];
  if (mine && mine.paying > 0) {
    finds.push({
      key: "income",
      icon: <IconCoin size={18} />,
      text: {
        en: `Your dividend income month by month: the cash on your ${mine.paying} paying share${s(mine.paying, "", "s")}, declared and expected, after tax`,
        bn: `মাস অনুযায়ী আপনার ডিভিডেন্ড আয়: আপনার ${mine.paying}টি শেয়ারের ঘোষিত আর আনুমানিক নগদ, কর কাটার পর`,
      },
      short: { en: "Your income by month", bn: "মাসে মাসে আপনার আয়" },
    });
  }
  if (promo.cash > 0) {
    finds.push({
      key: "dates",
      icon: <IconCalendar size={18} />,
      text: promo.thisWeek > 0
        ? {
            en: `${promo.cash} cash record date${s(promo.cash, "", "s")} ahead, ${promo.thisWeek} this week, each with the cash a share and the last day to buy`,
            bn: `সামনে ${promo.cash}টি নগদ ডিভিডেন্ডের রেকর্ড ডেট, এ সপ্তাহেই ${promo.thisWeek}টি, প্রতিটির শেয়ারপ্রতি নগদ আর কেনার শেষ দিনসহ`,
          }
        : {
            en: `${promo.cash} cash record date${s(promo.cash, "", "s")} ahead, each with the cash a share and the last day to buy`,
            bn: `সামনে ${promo.cash}টি নগদ ডিভিডেন্ডের রেকর্ড ডেট, প্রতিটির শেয়ারপ্রতি নগদ আর কেনার শেষ দিনসহ`,
          },
      short: { en: "Record dates", bn: "রেকর্ড ডেট" },
    });
  }
  if (rated > 0) {
    finds.push({
      key: "safe",
      icon: <IconAlert size={18} />,
      text: sf.risk > 0
        ? {
            en: `"Is it safe?" under every cash dividend: ${sf.risk} look${s(sf.risk, "s", "")} at risk today, and why`,
            bn: `প্রতিটি নগদ ডিভিডেন্ডের নিচে "নিরাপদ কি?": আজ ${sf.risk}টি ঝুঁকিতে, আর কেন`,
          }
        : {
            en: `"Is it safe?" under every cash dividend: how much of its profit each one pays out`,
            bn: `প্রতিটি নগদ ডিভিডেন্ডের নিচে "নিরাপদ কি?": প্রতিটি মুনাফার কত অংশ দিচ্ছে`,
          },
      short: { en: "Is it safe?", bn: "নিরাপদ কি?" },
    });
  }
  if (promo.comingNext > 0) {
    finds.push({
      key: "next",
      icon: <IconTrendUp size={18} />,
      text: {
        en: `${promo.comingNext} compan${s(promo.comingNext, "y hasn't", "ies haven't")} declared for this year yet: when we expect each one, and about how much`,
        bn: `${promo.comingNext}টি কোম্পানি এ বছরের ডিভিডেন্ড এখনো ঘোষণা করেনি: কে কবে দিতে পারে, আর প্রায় কত`,
      },
      short: { en: "Coming next", bn: "সামনে আসছে" },
    });
  }
  if (promo.bestYield != null && promo.bestYield > 0) {
    const y = promo.bestYield.toFixed(1);
    finds.push({
      key: "yield",
      icon: <IconTarget size={18} />,
      text: {
        en: `The best cash yield ahead is ${y}% at today's price, and which company pays it`,
        bn: `সামনের সর্বোচ্চ নগদ ইল্ড আজকের দামে ${y}%, আর কোন কোম্পানি তা দিচ্ছে`,
      },
      short: { en: "The best yield", bn: "সর্বোচ্চ ইল্ড" },
    });
  }
  if (promo.capture > 0) {
    finds.push({
      key: "capture",
      icon: <IconCoin size={18} />,
      text: {
        en: "Worth buying for it? What the price did after each company's last record dates, and what you keep after tax",
        bn: "এর জন্য কেনা কি লাভের? আগের রেকর্ড ডেটগুলোর পর দামের কী হয়েছিল, আর কর কাটার পর কত থাকে",
      },
      short: { en: "Worth buying for?", bn: "কেনা কি লাভের?" },
    });
  }
  if (promo.agms + promo.declared + promo.topPayers > 0) {
    finds.push({
      key: "lists",
      icon: <IconList size={18} />,
      text: {
        en: `${promo.agms} AGM${s(promo.agms, "", "s")} ahead, ${promo.declared} dividend${s(promo.declared, "", "s")} just declared, and the year's biggest payers`,
        bn: `সামনে ${promo.agms}টি এজিএম, সদ্য ঘোষিত ${promo.declared}টি ডিভিডেন্ড, আর বছরের সবচেয়ে বড় ডিভিডেন্ড`,
      },
      short: { en: "AGMs and new dividends", bn: "এজিএম আর নতুন ঘোষণা" },
    });
  }
  const top = finds.slice(0, TOP_LINES);
  const rest = finds.slice(TOP_LINES);
  const dayTotal = promo.days.reduce((a, d) => a + d.n, 0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", {
          area: "dividend-calendar", lock: "dc-promo", state, stakes: finds.length,
          holder: mine && mine.paying > 0 ? 1 : 0, soon: nearest ? 1 : 0, days: promo.days.length,
        });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, finds.length, mine, nearest, promo.days.length]);

  const onTap = () => {
    trackEvent("premium_lock_tap", {
      area: "dividend-calendar", lock: "dc-promo", state, stakes: finds.length, holder: mine && mine.paying > 0 ? 1 : 0,
    });
    const stake = mine && mine.total > 0
      ? bn ? `আপনার শেয়ারে আসছে ${takaGroup(mine.total)}` : `${takaGroup(mine.total)} coming to your shares`
      : null;
    savePremiumContext({
      from: "dividend-calendar",
      label: bn ? "পুরো ডিভিডেন্ড ক্যালেন্ডার" : "The full dividend calendar",
      stakes: [...(stake ? [stake] : []), ...finds.slice(0, stake ? 2 : 3).map((f) => (bn ? f.short.bn : f.short.en))],
    });
  };

  return (
    <section ref={ref} id={CALENDAR_PREMIUM_ANCHOR} className="sp dc-promo" aria-labelledby="dcp-t">
      {/* ── The lead: cash coming to their shares, or the companies about to pay ── */}
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          <T en="Premium · the dividend calendar" bn="প্রিমিয়াম · ডিভিডেন্ড ক্যালেন্ডার" />
        </p>
        {mine && mine.total > 0 ? (
          <>
            <h2 id="dcp-t" className="spx-stake">
              <b className="pv">{takaGroup(mine.total)}</b>
              <span>
                <T
                  en={`${first ? `${first}, this` : "This"} much cash is coming to your shares from dividends already declared.`}
                  bn={`${first ? `${first}, ` : ""}ঘোষিত ডিভিডেন্ড থেকে আপনার শেয়ারে এতটা নগদ টাকা আসছে।`}
                />
              </span>
            </h2>
            <p className="sp-lead">
              <T
                en={`It comes on ${mine.shares} of your shares, after 10% tax.${mine.expected ? ` We expect ${mine.expected} more of your shares to declare soon.` : ""} Premium shows when each one pays, and whether it looks safe.`}
                bn={`এটি আসছে আপনার ${mine.shares}টি শেয়ারে, 10% কর কাটার পর।${mine.expected ? ` আমাদের ধারণা, আপনার আরও ${mine.expected}টি শেয়ার শিগগিরই ঘোষণা দেবে।` : ""} কোনটি কবে দেবে, আর তা নিরাপদ কি না, তা দেখায় প্রিমিয়াম।`}
              />
            </p>
          </>
        ) : mine && mine.expected > 0 ? (
          <>
            <h2 id="dcp-t" className="sp-title">
              <T
                en={`${first ? `${first}, we` : "We"} expect ${mine.expected} of your shares to declare a dividend in the coming months.`}
                bn={`${first ? `${first}, ` : ""}আমাদের ধারণা, সামনের মাসগুলোতে আপনার ${mine.expected}টি শেয়ার ডিভিডেন্ড ঘোষণা করবে।`}
              />
            </h2>
            <p className="sp-lead">
              <T
                en="Premium shows when, and about how much cash it brings you after tax."
                bn="কবে, আর কর কাটার পর আপনার কাছে প্রায় কত টাকা আসবে, তা দেখায় প্রিমিয়াম।"
              />
            </p>
          </>
        ) : (
          <>
            <h2 id="dcp-t" className="sp-title">
              {promo.companies > 0 ? (
                <T
                  en={`${promo.companies} DSE compan${s(promo.companies, "y is", "ies are")} about to pay a cash dividend. Which are worth buying for?`}
                  bn={`ডিএসইর ${promo.companies}টি কোম্পানি শিগগিরই নগদ ডিভিডেন্ড দেবে। কোনগুলোর জন্য কেনা যায়?`}
                />
              ) : (
                <T
                  en="Every DSE dividend in one calendar, and whether it is worth buying for."
                  bn="ডিএসইর সব ডিভিডেন্ড এক ক্যালেন্ডারে, আর তার জন্য কেনা যায় কি না।"
                />
              )}
            </h2>
            <p className="sp-lead">
              <T
                en="Every record date, AGM and new dividend on the DSE in one calendar, with the cash a share and the last day to buy. Premium also tells you which dividends look safe."
                bn="ডিএসইর প্রতিটি রেকর্ড ডেট, এজিএম আর নতুন ডিভিডেন্ড এক ক্যালেন্ডারে, শেয়ারপ্রতি নগদ আর কেনার শেষ দিনসহ। কোন ডিভিডেন্ড নিরাপদ, তাও জানায় প্রিমিয়াম।"
              />
            </p>
          </>
        )}

        {/* "Is it safe?" across every cash dividend ahead, counted */}
        {rated > 0 && (
          <div className="spx-areas dcp-mix">
            <span>
              <T
                en={`Is it safe? Of the ${rated} cash dividend${s(rated, "", "s")} coming up:`}
                bn={`নিরাপদ কি? সামনের ${rated}টি নগদ ডিভিডেন্ডের মধ্যে:`}
              />
            </span>
            {sf.safe > 0 && (
              <MixItem tone="good">
                <T en={`${sf.safe} look${s(sf.safe, "s", "")} steady`} bn={`${sf.safe}টি স্থিতিশীল`} />
              </MixItem>
            )}
            {sf.watch > 0 && (
              <MixItem tone="fair">
                <T en={`${sf.watch} need${s(sf.watch, "s", "")} a check`} bn={`${sf.watch}টি যাচাই করা দরকার`} />
              </MixItem>
            )}
            {sf.risk > 0 && (
              <MixItem tone="bad">
                <T en={`${sf.risk} ${s(sf.risk, "is", "are")} at risk`} bn={`${sf.risk}টি ঝুঁকিতে`} />
              </MixItem>
            )}
          </div>
        )}
      </div>

      <div className="sp-body">
        {/* ── Their nearest record date, with the cash on their shares ── */}
        {nearest && (
          <p className="spx-soon">
            <span className="spx-soon-icon" aria-hidden="true">
              <IconCalendar size={18} />
            </span>
            <span>
              <T
                en={`${nearest.code}'s record date is ${dayShort(nearest.date).en}: `}
                bn={`${nearest.code}-এর রেকর্ড ডেট ${dayShort(nearest.date).bn}: `}
              />
              <span className="pv">
                <T
                  en={`${takaGroup(nearest.net)} is coming on your ${nearest.qty} shares, after tax.`}
                  bn={`আপনার ${nearest.qty}টি শেয়ারে কর কাটার পর আসছে ${takaGroup(nearest.net)}।`}
                />
              </span>{" "}
              <T
                en="Whether it can keep paying is in Premium."
                bn="কোম্পানিটি এভাবে দিয়ে যেতে পারবে কি না, তা প্রিমিয়ামে।"
              />
            </span>
          </p>
        )}

        {/* ── What the calendar shows: three lines, the rest as chips ── */}
        <p className="sp-k">
          <T en="What the full calendar shows you" bn="পুরো ক্যালেন্ডারে যা দেখবেন" />
        </p>
        {top.length > 0 && (
          <ul className="spx-finds">
            {top.map((f) => (
              <li key={f.key}>
                <span className="sp-icon" aria-hidden="true">{f.icon}</span>
                <b>
                  <T en={f.text.en} bn={f.text.bn} />
                </b>
              </li>
            ))}
          </ul>
        )}
        {rest.length > 0 && (
          <div className="spx-more">
            <span className="spx-more-k">
              <T en="It also shows:" bn="আরও দেখায়:" />
            </span>
            {rest.map((f) => (
              <span key={f.key} className="spx-chip">
                <T en={f.short.en} bn={f.short.bn} />
              </span>
            ))}
          </div>
        )}
        <p className="spx-shows">
          <IconLock size={14} />
          <T
            en="Premium shows every company, date and taka, in one calendar."
            bn="প্রতিটি কোম্পানি, তারিখ আর টাকা, এক ক্যালেন্ডারে দেখায় প্রিমিয়াম।"
          />
        </p>

        {/* ── The next two weeks, by day: counts only ── */}
        {promo.days.length > 0 && (
          <div className="spx-missed">
            <p className="sp-k">
              <T
                en={`${dayTotal} cash record date${s(dayTotal, "", "s")} in the next 2 weeks`}
                bn={`আগামী 2 সপ্তাহে ${dayTotal}টি নগদ ডিভিডেন্ডের রেকর্ড ডেট`}
              />
            </p>
            <DividendDays days={promo.days} shown={DAYS_SHOWN} mine={myDay} />
            <p className="spx-days-more">
              {promo.days.length > DAYS_SHOWN && (
                <T
                  en={`And ${promo.days.length - DAYS_SHOWN} more day${s(promo.days.length - DAYS_SHOWN, "", "s")}. `}
                  bn={`আরও ${promo.days.length - DAYS_SHOWN} দিন। `}
                />
              )}
              <T
                en="Premium names every company, its cash, the last day to buy and whether it looks safe."
                bn="প্রতিটি কোম্পানির নাম, নগদ, কেনার শেষ দিন আর তা নিরাপদ কি না, তা দেখায় প্রিমিয়াম।"
              />
            </p>
          </div>
        )}

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
          <PriceAgainst
            price={price}
            feePct={DEFAULT_PORTFOLIO_SETTINGS.fee_pct}
            usualFee
            held={null}
            minHeld={0}
            of={(a) => ({ en: a, bn: a })}
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

function MixItem({ tone, children }: { tone: "good" | "fair" | "bad"; children: ReactNode }) {
  return (
    <span className="dcp-mix-i">
      <span className="spx-dots" aria-hidden="true">
        <i data-tone={tone} />
      </span>
      {children}
    </span>
  );
}
