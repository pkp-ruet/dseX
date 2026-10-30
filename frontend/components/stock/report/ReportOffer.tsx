"use client";

import { useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import { IconBell, IconCrown } from "@/components/ui/icons";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { useLockScope } from "@/components/premium/LockScope";
import ReportKeyButton from "@/components/premium/ReportKeyButton";
import { T } from "@/components/i18n/T";
import { tx } from "@/components/stock/report/fmt";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { PAID_PLANS, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { Bi } from "@/lib/stock-report";

const YEARLY = PAID_PLANS.find((p) => p.key === "yearly");
const YEARLY_MONTH = YEARLY ? Math.round(YEARLY.amount / 12) : null;

/**
 * The report's short close (`#ch-premium-end`, 2026-10-30, plan
 * https://claude.ai/artifact/UHZTK5nvUVrtzzmq6c2oSX): for a reader who
 * scrolled to the end, one heading, one line, the price and the button. What
 * the full report holds is said once, in the Premium card under the answer
 * (`NextQuestions`, `#ch-premium`). Premium readers get a short "report
 * alerts" note instead; on an open free report it becomes "get this on every
 * share". `lines` (the backend's `offer`) ride along to /premium as stakes.
 */
export default function ReportOffer({
  code,
  name,
  lines,
}: {
  code: string;
  name: string;
  lines: Bi[];
}) {
  const { bn } = useLang();
  const { state, isPremium } = usePremium();
  const open = usePremiumOpen();
  const freeToday = open && !isPremium;
  // Opened with one of the reader's report keys rather than today's free report.
  const keyed = useLockScope()?.reason === "key";
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || isPremium || freeToday || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "stock", lock: "stock-report", state, stakes: lines.length });
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isPremium, freeToday, state, lines.length]);

  if (isPremium && open) {
    // A paying reader needs no offer: one quiet line on report alerts.
    return (
      <p className="my-8 flex items-start gap-2 text-sm leading-snug text-text-muted">
        <span className="mt-0.5 shrink-0 text-gold-ink"><IconBell size={14} /></span>
        <T
          en="Follow this share to get one push when our answer changes, its results land, a red flag appears or its grade changes."
          bn="এই শেয়ারটি ফলো করুন: আমাদের উত্তর বদলালে, ফল প্রকাশ হলে, নতুন বড় সতর্কতা এলে বা গ্রেড বদলালে একটি নোটিফিকেশন পাবেন।"
        />
      </p>
    );
  }

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "stock", lock: "stock-report", state, stakes: lines.length });
    savePremiumContext({
      from: "stock",
      label: bn ? `${code}-এর পূর্ণ রিপোর্ট` : `The full report on ${code}`,
      stakes: lines.slice(0, 3).map((l) => (bn ? l.bn || l.en : l.en)),
    });
  };

  return (
    <div ref={ref} id="ch-premium-end" className="rp-offer stock-anchor my-8">
      <p className="flex items-center gap-2 text-sm font-semibold text-gold-ink">
        <IconCrown size={16} />
        {freeToday ? (
          keyed ? <T en="Your free full report" bn="আপনার ফ্রি পূর্ণ রিপোর্ট" /> : <T en="Today's free full report" bn="আজকের ফ্রি পূর্ণ রিপোর্ট" />
        ) : (
          <T en="Premium" bn="প্রিমিয়াম" />
        )}
      </p>
      <h3 className="mt-1 text-xl font-bold leading-tight text-text-main sm:text-2xl">
        {freeToday ? (
          keyed ? (
            <T en={`Every part of the report on ${name} is open for you this week`} bn={`এ সপ্তাহে ${name}-এর রিপোর্টের সব অংশ আপনার জন্য খোলা`} />
          ) : (
            <T en={`Every part of the report on ${name} is open today`} bn={`আজ ${name}-এর রিপোর্টের সব অংশ সবার জন্য খোলা`} />
          )
        ) : (
          <T en={`Ready for the full report on ${name}?`} bn={`${name}-এর পূর্ণ রিপোর্ট পড়তে চান?`} />
        )}
      </h3>
      {!freeToday && (
        <p className="mt-2 text-sm text-text-main">
          <T
            en="Every answer above explained, our fair price and buy price, and a notification when our answer changes. On every DSE share."
            bn="ওপরের প্রতিটি উত্তরের ব্যাখ্যা, আমাদের হিসাবে ন্যায্য দাম আর কেনার দাম, আর উত্তর বদলালে নোটিফিকেশন। ডিএসইর প্রতিটি শেয়ারে।"
          />
        </p>
      )}
      {freeToday && (
        <p className="mt-2 text-sm text-text-muted">
          <T en="With Premium, the same report is open on every share, every day." bn="প্রিমিয়ামে প্রতিদিন প্রতিটি শেয়ারের একই রিপোর্ট খোলা থাকে।" />
        </p>
      )}

      <p className="mt-5 text-base text-text-main">
        <T
          en={<><b className="tabular-nums">৳{LOWEST_PRICE}</b> a month</>}
          bn={<>মাসে <b className="tabular-nums">৳{LOWEST_PRICE}</b></>}
        />
        {YEARLY_MONTH != null && (
          <span className="text-text-muted">
            <T
              en={` · about ৳${YEARLY_MONTH} a month on the yearly plan (limited-time offer)`}
              bn={` · বছরের প্ল্যানে মাসে প্রায় ৳${YEARLY_MONTH} (সীমিত সময়ের অফার)`}
            />
          </span>
        )}
      </p>
      <div className="mt-3">
        <Button href={PREMIUM_PATH} onClick={onTap} size="lg" block>
          {freeToday ? <T en="Get this on every share" bn="সব শেয়ারে এটি পান" /> : <T en="Get the full report" bn="পূর্ণ রিপোর্ট নিন" />}
        </Button>
      </div>
      {!freeToday && <ReportKeyButton code={code} className="mt-2" />}
      <p className="mt-3 text-sm text-text-muted">
        {state === "guest" ? (
          <T
            en="Create a free account first, then pay by bKash, Nagad or bank transfer. Nothing renews by itself."
            bn="আগে একটি ফ্রি অ্যাকাউন্ট খুলুন, তারপর bKash, Nagad বা ব্যাংক ট্রান্সফারে পেমেন্ট করুন। নিজে থেকে নবায়ন হয় না।"
          />
        ) : (
          <T
            en="Pay by bKash, Nagad or bank transfer. Nothing renews by itself."
            bn="bKash, Nagad বা ব্যাংক ট্রান্সফারে পেমেন্ট করুন। নিজে থেকে নবায়ন হয় না।"
          />
        )}
      </p>
    </div>
  );
}
