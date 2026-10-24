"use client";

import { useEffect, useState } from "react";
import Bn from "@/components/i18n/Bn";
import { readPremiumContext, type PremiumContext } from "@/lib/premium-context";
import { usePremium } from "@/lib/premium";
import { LOWEST_PRICE } from "@/lib/premium-plans";
import { trackEvent } from "@/lib/track";

const FROM: Record<string, { en: string; bn: string }> = {
  portfolio: { en: "From your portfolio", bn: "আপনার পোর্টফোলিও থেকে" },
  stock: { en: "From the stock page", bn: "শেয়ারের পাতা থেকে" },
  "stock-analysis": { en: "From the in-depth report", bn: "গভীর রিপোর্ট থেকে" },
  "dividend-calendar": { en: "From the dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার থেকে" },
  "stock-insights": { en: "From the research lists", bn: "গবেষণা তালিকা থেকে" },
  "home-research": { en: "From the research lists on your homepage", bn: "হোমপেজের গবেষণা তালিকা থেকে" },
};

/**
 * /premium opens on the reader's own reason: the lock they tapped and the
 * stakes it showed them (lib/premium-context.ts). Renders nothing when they
 * arrived any other way, or are already premium.
 */
export default function PremiumContextCard() {
  const [ctx, setCtx] = useState<PremiumContext | null>(null);
  const { state } = usePremium();

  useEffect(() => {
    const c = readPremiumContext();
    setCtx(c);
    if (c) trackEvent("premium_page_context", { from: c.from, lock: c.label ?? "premium", stakes: c.stakes?.length ?? 0 });
  }, []);

  if (!ctx || state === "premium") return null;
  const from = FROM[ctx.from] ?? { en: "What you just tried to open", bn: "আপনি যা খুলতে চেয়েছিলেন" };
  const stakes = ctx.stakes ?? [];

  return (
    <div className="premium-card" role="note">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-muted">{from.en}</p>
        <Bn className="text-xs text-text-muted">{from.bn}</Bn>
        {ctx.label && <p className="mt-1 font-semibold text-text-main">{ctx.label}</p>}
        {stakes.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5">
            {stakes.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm font-semibold text-text-main">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span className={/[ঀ-৿]/.test(s) ? "font-bn" : ""} lang={/[ঀ-৿]/.test(s) ? "bn" : undefined}>
                  {s}
                </span>
              </li>
            ))}
          </ul>
        )}
        {state === "ended" ? (
          <>
            <p className="mt-2 text-sm text-text-muted">
              Premium opens all of it — plans from ৳{LOWEST_PRICE}, paid by bKash or Nagad.
            </p>
            <Bn className="text-sm text-text-muted">প্রিমিয়ামে সবটা খোলা — ৳{LOWEST_PRICE} থেকে প্ল্যান, bKash বা Nagad দিয়ে।</Bn>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-text-muted">
              Premium opens all of it. The free month is at the bottom of this page.
            </p>
            <Bn className="text-sm text-text-muted">প্রিমিয়ামে সবটা খোলা। ফ্রি মাসের বোতাম এই পাতার নিচে।</Bn>
          </>
        )}
      </div>
      <div className="premium-card-action">
        {state === "ended" ? (
          <a href="#pay" className="btn-primary btn-sm">Choose a plan</a>
        ) : (
          <a href="#start" className="btn-primary btn-sm">Go to the free month</a>
        )}
      </div>
    </div>
  );
}
