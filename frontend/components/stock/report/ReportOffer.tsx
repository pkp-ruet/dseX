"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { IconBell, IconCheck, IconCrown } from "@/components/ui/icons";
import { usePremiumOpen } from "@/components/premium/PremiumMask";
import { T } from "@/components/i18n/T";
import { tx } from "@/components/stock/report/fmt";
import { useLang } from "@/context/LangContext";
import { freeReportCode } from "@/lib/free-report";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { PAID_PLANS, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { Bi } from "@/lib/stock-report";

const YEARLY = PAID_PLANS.find((p) => p.key === "yearly");
const YEARLY_MONTH = YEARLY ? Math.round(YEARLY.amount / 12) : null;

/**
 * The report's ONE offer (`#ch-premium`, 2026-10-28). Its lines come from the
 * backend and name what Premium shows on THIS share, counted from the locked
 * sections ("Who made the 3 insider buys, and what they paid") — never the
 * answers. Premium readers get a short "report alerts" note instead; on the
 * free report of the day the offer becomes "get this on every share".
 */
export default function ReportOffer({ code, name, lines }: { code: string; name: string; lines: Bi[] }) {
  const { bn } = useLang();
  const { state, isPremium } = usePremium();
  const open = usePremiumOpen();
  const freeToday = open && !isPremium;
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const [sample, setSample] = useState<string | null>(null);
  useEffect(() => setSample(freeReportCode()), []);

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
      <p id="ch-premium" className="stock-anchor my-8 flex items-start gap-2 text-sm leading-snug text-text-muted">
        <span className="mt-0.5 shrink-0 text-gold-ink"><IconBell size={14} /></span>
        <T
          en="Follow this share to get one push when its results land, a red flag appears or its grade changes."
          bn="এই শেয়ারটি ফলো করুন: ফল প্রকাশ হলে, নতুন রেড ফ্ল্যাগ এলে বা গ্রেড বদলালে একটি নোটিফিকেশন পাবেন।"
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
    <div ref={ref} id="ch-premium" className="rp-offer stock-anchor my-8">
      <p className="flex items-center gap-2 text-sm font-semibold text-gold-ink">
        <IconCrown size={16} />
        {freeToday ? <T en="Today's free full report" bn="আজকের ফ্রি পূর্ণ রিপোর্ট" /> : <T en="Premium" bn="প্রিমিয়াম" />}
      </p>
      <h3 className="mt-1 text-xl font-bold leading-tight text-text-main sm:text-2xl">
        {freeToday ? (
          <T en={`Every part of the report on ${name} is open today`} bn={`আজ ${name}-এর রিপোর্টের সব অংশ সবার জন্য খোলা`} />
        ) : (
          <T en={`The full report on ${name}, and on every other DSE share`} bn={`${name}-এর পূর্ণ রিপোর্ট, আর ডিএসই-র প্রতিটি শেয়ারের`} />
        )}
      </h3>
      {!freeToday && lines.length > 0 && (
        <>
          <p className="mt-2 text-sm text-text-muted">
            <T en="On this share, Premium shows you:" bn="এই শেয়ারে প্রিমিয়ামে দেখবেন:" />
          </p>
          <ul className="mt-3 space-y-2">
            {lines.map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-main">
                <span className="mt-0.5 shrink-0 text-positive"><IconCheck size={14} /></span>
                <span>{tx(l)}</span>
              </li>
            ))}
          </ul>
        </>
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
          {freeToday ? <T en="Get this on every share" bn="সব শেয়ারে এটি পান" /> : <T en="See Premium plans" bn="প্রিমিয়াম প্ল্যান দেখুন" />}
        </Button>
      </div>
      <p className="mt-3 text-sm text-text-muted">
        {state === "guest" ? (
          <T
            en="Create a free account first, then pay by bKash, Nagad or bank transfer. Nothing renews by itself, and you can get a refund within 7 days."
            bn="আগে একটি ফ্রি অ্যাকাউন্ট খুলুন, তারপর bKash, Nagad বা ব্যাংক ট্রান্সফারে পেমেন্ট করুন। নিজে থেকে নবায়ন হয় না, আর 7 দিনের মধ্যে টাকা ফেরত নিতে পারবেন।"
          />
        ) : (
          <T
            en="Pay by bKash, Nagad or bank transfer. Nothing renews by itself, and you can get a refund within 7 days."
            bn="bKash, Nagad বা ব্যাংক ট্রান্সফারে পেমেন্ট করুন। নিজে থেকে নবায়ন হয় না, আর 7 দিনের মধ্যে টাকা ফেরত নিতে পারবেন।"
          />
        )}
      </p>
      {!freeToday && sample && sample !== code && (
        <p className="mt-2 text-sm text-text-muted">
          <T en="Not sure yet? " bn="এখনো ঠিক করেননি? " />
          <Link href={`/stock/${sample}#ch-report`} className="font-semibold text-primary-ink hover:underline">
            <T en={`Read today's free full report: ${sample}`} bn={`আজকের ফ্রি পূর্ণ রিপোর্ট পড়ুন: ${sample}`} />
          </Link>
        </p>
      )}
    </div>
  );
}
