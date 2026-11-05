"use client";

import { useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import { IconCalendar, IconCheck, IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { dayShort, daysWords } from "@/components/dividend-calendar/dates";
import DividendDays from "@/components/dividend-calendar/DividendDays";
import { perShareTk } from "@/components/dividend-calendar/DividendRow";
import { CALENDAR_PREMIUM_ANCHOR } from "@/components/dividend-calendar/RemindButton";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import { SOON_DAYS, type CalendarPromo } from "@/lib/dividend-promo";

const DAYS_SHOWN = 3;

const TYPE_BN: Record<string, string> = { Final: "চূড়ান্ত", Interim: "অন্তর্বর্তী" };

/** What a Premium reader sees, in four plain lines. */
const GETS: { en: string; bn: string }[] = [
  { en: "Every company paying a dividend, and how much a share", bn: "কোন কোম্পানি ডিভিডেন্ড দিচ্ছে, আর শেয়ারপ্রতি কত" },
  { en: "The last day to buy to get it", bn: "পেতে হলে কেনার শেষ দিন" },
  { en: "Who will declare next, and roughly when", bn: "এরপর কে ঘোষণা দেবে, আর মোটামুটি কবে" },
  { en: "A reminder before the last day to buy", bn: "কেনার শেষ দিনের আগে মনে করিয়ে দেওয়া" },
];

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * THE Premium card on the dividend calendar (`#dc-premium`). Made simple
 * 2026-11-05 (user: the old card was "mainly telling personalized things",
 * the page is for "finding dividends that are coming next", "more simple and
 * easy to understand"; no risk check). Four parts, nothing personal:
 *  1. the promise ("Never miss a dividend.") and how many companies pay cash
 *     in the next 30 days;
 *  2. ONE free example — the next cash record date in full (company, cash a
 *     share, yield, last day to buy), so the reader sees what the calendar is;
 *  3. the next two weeks as counts by day (`DividendDays`);
 *  4. what Premium shows, four ticks, then the price and one button.
 */
export default function DividendPromo({ promo }: { promo: CalendarPromo }) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=dividend-calendar#pay" : user ? `${PREMIUM_PATH}#pay` : PREMIUM_PATH;

  const ex = promo.sample;
  const dayTotal = promo.days.reduce((a, d) => a + d.n, 0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", {
          area: "dividend-calendar", lock: "dc-promo", variant: "v3", state, soon: promo.soon, days: promo.days.length,
        });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, promo.soon, promo.days.length]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "dividend-calendar", lock: "dc-promo", variant: "v3", state });
    savePremiumContext({
      from: "dividend-calendar",
      label: bn ? "পুরো ডিভিডেন্ড ক্যালেন্ডার" : "The full dividend calendar",
      stakes: GETS.slice(0, 3).map((g) => (bn ? g.bn : g.en)),
    });
  };

  return (
    <section ref={ref} id={CALENDAR_PREMIUM_ANCHOR} className="sp dc-promo" aria-labelledby="dcp-t">
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          <T en="Premium · Dividend calendar" bn="প্রিমিয়াম · ডিভিডেন্ড ক্যালেন্ডার" />
        </p>
        <h2 id="dcp-t" className="sp-title">
          <T en="Never miss a dividend." bn="কোনো ডিভিডেন্ড আর মিস করবেন না।" />
        </h2>
        <p className="sp-lead">
          {promo.soon > 0 ? (
            <T
              en={`${promo.soon} DSE compan${s(promo.soon, "y pays", "ies pay")} a cash dividend in the next ${SOON_DAYS} days. See every one, how much it pays, and the last day to buy to get it.`}
              bn={`আগামী ${SOON_DAYS} দিনে ডিএসইর ${promo.soon}টি কোম্পানি নগদ ডিভিডেন্ড দেবে। প্রতিটি, কত দেবে, আর পেতে হলে কবের মধ্যে কিনতে হবে, সব এক জায়গায়।`}
            />
          ) : (
            <T
              en="Every DSE dividend coming up in one calendar: how much it pays, and the last day to buy to get it."
              bn="ডিএসইর সামনের সব ডিভিডেন্ড এক ক্যালেন্ডারে: কত দেবে, আর পেতে হলে কবের মধ্যে কিনতে হবে।"
            />
          )}
        </p>
      </div>

      <div className="sp-body">
        {/* ── One free example: the next record date, in full ── */}
        {ex && <Sample ex={ex} />}

        {/* ── The next two weeks, by day: counts only ── */}
        {promo.days.length > 0 && (
          <div className="dcp-days">
            <p className="sp-k">
              <T
                en={`${dayTotal} cash dividend${s(dayTotal, "", "s")} in the next 2 weeks`}
                bn={`আগামী 2 সপ্তাহে ${dayTotal}টি নগদ ডিভিডেন্ড`}
              />
            </p>
            <DividendDays days={promo.days} shown={DAYS_SHOWN} />
            {promo.days.length > DAYS_SHOWN && (
              <p className="spx-days-more">
                <T
                  en={`And ${promo.days.length - DAYS_SHOWN} more day${s(promo.days.length - DAYS_SHOWN, "", "s")}.`}
                  bn={`আরও ${promo.days.length - DAYS_SHOWN} দিন।`}
                />
              </p>
            )}
          </div>
        )}

        {/* ── What Premium shows ── */}
        <p className="sp-k dcp-gets-k">
          <T en="With Premium you see" bn="প্রিমিয়ামে দেখবেন" />
        </p>
        <ul className="dcp-gets">
          {GETS.map((g) => (
            <li key={g.en}>
              <span className="dcp-tick" aria-hidden="true">
                <IconCheck size={16} />
              </span>
              <span className="min-w-0">
                <T en={g.en} bn={g.bn} />
              </span>
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

/** The free example: one record date as the calendar shows it. */
function Sample({ ex }: { ex: NonNullable<CalendarPromo["sample"]> }) {
  const rec = dayShort(ex.date);
  const recIn = daysWords(ex.daysLeft);
  const buy = ex.buyBy ? dayShort(ex.buyBy) : null;
  const buyIn = daysWords(ex.buyDaysLeft);
  const open = ex.buyDaysLeft == null || ex.buyDaysLeft >= 0;
  const y = ex.yieldPct != null ? ex.yieldPct.toFixed(1) : null;
  return (
    <div className="dcp-sample">
      <p className="dcp-sample-k">
        <T en="Next up · a free example" bn="সামনে যা আসছে · একটি ফ্রি উদাহরণ" />
      </p>
      <div className="dcp-sample-row">
        <span className="min-w-0">
          <span className="dc-name">{ex.name}</span>
          <span className="dc-meta">
            <span className="dc-code">{ex.code}</span>
            {ex.type && (
              <>
                <span className="dc-sep" aria-hidden="true">·</span>
                <T en={ex.type} bn={TYPE_BN[ex.type] ?? ex.type} />
              </>
            )}
          </span>
        </span>
        <span className="dc-fig">
          <span className="dc-amt">{perShareTk(ex.cash)}</span>
          <span className="dc-amt-x">
            <T
              en={y != null ? `a share · ${y}% yield` : "a share"}
              bn={y != null ? `শেয়ারপ্রতি · ${y}% ইল্ড` : "শেয়ারপ্রতি"}
            />
          </span>
        </span>
      </div>
      <dl className="dcp-sample-dates">
        <div>
          <dt>
            <T en="Record date" bn="রেকর্ড ডেট" />
          </dt>
          <dd>
            <T en={rec.en} bn={rec.bn} />
            {recIn && (
              <span className="dcp-in">
                {" "}
                <T en={`(${recIn.en})`} bn={`(${recIn.bn})`} />
              </span>
            )}
          </dd>
        </div>
        {buy && (
          <div>
            <dt>
              <IconCalendar size={14} />
              <T en="Last day to buy" bn="কেনার শেষ দিন" />
            </dt>
            <dd className={open ? "dcp-buy" : undefined}>
              <T en={buy.en} bn={buy.bn} />
              {open && buyIn && (
                <span className="dcp-in">
                  {" "}
                  <T en={`(${buyIn.en})`} bn={`(${buyIn.bn})`} />
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
