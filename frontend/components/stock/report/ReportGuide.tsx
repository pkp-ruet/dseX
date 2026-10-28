"use client";

import { Fragment } from "react";
import { usePremiumOpen } from "@/components/premium/PremiumMask";
import { IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { tx } from "@/components/stock/report/fmt";
import type { Bi } from "@/lib/stock-report";

/**
 * The map at the top of the report for a free reader (2026-10-29): what is
 * free, what Premium adds, and which sections are open in full so they can
 * see a whole Premium answer. Nothing for a reader who sees everything.
 */
export default function ReportGuide({ samples }: { samples: { key: string; label: Bi }[] }) {
  const open = usePremiumOpen();
  if (open) return null;
  return (
    <div className="rp-guide">
      <div className="rp-guide-row">
        <span className="rp-guide-k"><T en="Free" bn="ফ্রি" /></span>
        <p className="text-sm leading-snug text-text-main">
          <T
            en="What we found: the grade, the Buy or Sell signal, the verdict on every check, every serious red flag and all the figures in the data below."
            bn="আমরা যা পেয়েছি: গ্রেড, কেনা বা বেচার সংকেত, প্রতিটি যাচাইয়ের রায়, প্রতিটি বড় সতর্কতা, আর নিচের ডেটার সব সংখ্যা।"
          />
        </p>
      </div>
      <div className="rp-guide-row">
        <span className="rp-guide-k" data-premium="true">
          <IconCrown size={12} /> <T en="Premium" bn="প্রিমিয়াম" />
        </span>
        <p className="text-sm leading-snug text-text-main">
          <T
            en="Why, and what to do: the fair price and the price to buy below, three prices for the next 12 months, insider trades, the risks and what to watch."
            bn="কেন, আর কী করবেন: ন্যায্য দাম আর কোন দামের নিচে কেনা ভালো, আগামী 12 মাসের তিনটি দাম, ভেতরের লোকদের কেনাবেচা, ঝুঁকি আর যা খেয়াল রাখবেন।"
          />
        </p>
      </div>
      <p className="mt-3 border-t border-border pt-3 text-sm leading-snug text-text-muted">
        <T
          en="Each section ends in a gold panel with the Premium answer."
          bn="প্রতিটি অংশের শেষে সোনালি প্যানেলে থাকে প্রিমিয়ামের উত্তর।"
        />
        {samples.length > 0 && (
          <>
            {" "}
            <T
              en={`${samples.length === 1 ? "One is" : `${samples.length} are`} open on every share, so you can see what you get: `}
              bn={`কী পাবেন তা দেখতে প্রতিটি শেয়ারে ${samples.length}টি খোলা রাখা আছে: `}
            />
            {samples.map((s, i) => (
              <Fragment key={s.key}>
                {i > 0 && " · "}
                <a href={`#rp-${s.key}`} className="font-semibold text-primary-ink hover:underline active:opacity-70">
                  {tx(s.label)}
                </a>
              </Fragment>
            ))}
            <T en="." bn="।" />
          </>
        )}
      </p>
    </div>
  );
}
