"use client";

import { useEffect, useRef } from "react";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { Locked } from "@/components/premium/AnswerLock";
import { OpenScope, useLockScope } from "@/components/premium/LockScope";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { ToneChip, tx } from "@/components/stock/report/fmt";
import { IconChevronRight, IconCrown, IconLock } from "@/components/ui/icons";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { authHref } from "@/lib/next-path";
import { usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { CONCLUSION_ID, type BuySellSplit, type StockAnswer } from "@/lib/stock-report";
import { trackEvent } from "@/lib/track";

/** The open strip: the answer, Buy N · Sell N, the bar, the one line. */
function OpenStrip({ split, answer }: { split: BuySellSplit; answer: StockAnswer | null }) {
  const { buy, sell } = split;
  return (
    <div className="cv-ln">
      <div className="cv-ln-head">
        <span className="cv-ln-k">
          <T en="Our Buy / Sell split today" bn="আজ আমাদের কেনা / বিক্রির ভাগ" />
        </span>
        {answer && <ToneChip word={answer.word} tone={answer.tone} />}
      </div>
      <div className="cv-ln-nums nums">
        <span className="cv-ln-buy"><T en={`Buy ${buy}`} bn={`কেনা ${buy}`} /></span>
        <span className="cv-ln-sell"><T en={`Sell ${sell}`} bn={`বিক্রি ${sell}`} /></span>
      </div>
      <div className="cv-ln-bar" role="img" aria-label={`Buy ${buy}, Sell ${sell}`}>
        <span className="cv-ln-fill" style={{ width: `${buy}%` }} />
      </div>
      <p className="cv-ln-line">{tx(split.line)}</p>
      <div className="cv-ln-foot">
        <span>
          <T en="Weighs the company, the price and safety" bn="কোম্পানি, দাম আর নিরাপত্তা মিলিয়ে" />
        </span>
        <a href={`#${CONCLUSION_ID}`} className="cv-ln-go">
          <T en="See how we weigh it" bn="কীভাবে মাপি, দেখুন" />
          <IconChevronRight size={14} />
        </a>
      </div>
    </div>
  );
}

/** The locked strip: same shape, no numbers, one button to the Premium card. */
function LockedStrip({ code, name }: { code: string; name: string }) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const keys = user?.report_keys;
  const usedUp = state === "free" && !!keys && keys.left <= 0;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "stock", lock: "stock-split", state, used_up: usedUp ? 1 : 0 });
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, usedUp]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "stock", lock: "stock-split", state, used_up: usedUp ? 1 : 0 });
    savePremiumContext({
      from: "stock",
      label: bn ? `${name}: কেনা / বিক্রির ভাগ` : `Buy / Sell split: ${name}`,
      stakes: [bn ? `${code}-এ আমাদের কেনা / বিক্রির ভাগ` : `Our Buy / Sell split on ${code}`],
    });
  };

  return (
    <div ref={ref} className="cv-ln cv-ln--lock">
      <div className="cv-ln-head">
        <span className="cv-ln-k">
          <T en="Our Buy / Sell split today" bn="আজ আমাদের কেনা / বিক্রির ভাগ" />
        </span>
        <span className="cv-ln-prem">
          <IconCrown size={14} />
          <T en="Premium" bn="প্রিমিয়াম" />
        </span>
      </div>
      <div className="cv-ln-nums nums" aria-hidden="true">
        <span><T en="Buy" bn="কেনা" /> <span className="cv-ln-q" /></span>
        <span><T en="Sell" bn="বিক্রি" /> <span className="cv-ln-q" /></span>
      </div>
      <div className="cv-ln-bar cv-ln-bar--lock" role="img" aria-label="Locked">
        <span className="cv-ln-lock" aria-hidden="true"><IconLock size={12} /></span>
      </div>
      <p className="cv-ln-line">
        <T
          en={`Should you lean towards buying ${code} or selling it? We weigh its company, its price and its safety into one split.`}
          bn={`${code} কেনার দিকে ঝুঁকবেন, না বিক্রির দিকে? কোম্পানি, দাম আর নিরাপত্তা মিলিয়ে আমরা একটি ভাগে তা বলি।`}
        />
      </p>
      <div className="cv-ln-acts">
        <a href="#ch-premium" className="btn-primary" onClick={onTap}>
          <T en="See the split" bn="ভাগটি দেখুন" />
        </a>
        {state === "guest" ? (
          <Link href={authHref("/register", `/stock/${code}`)} className="cv-ln-alt">
            <T en="or sign up free: 10 full analyses a month" bn="অথবা ফ্রি সাইন আপ করুন: মাসে 10টি পূর্ণ বিশ্লেষণ" />
          </Link>
        ) : usedUp ? (
          <span className="cv-ln-alt">
            <T en="Your free analyses this month are used up." bn="এ মাসের ফ্রি বিশ্লেষণ শেষ।" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The Buy / Sell split in the cover card (2026-11-22, user: "move buy/sell
 * percentile to top of stock page … premium and open analysis free readers
 * will see this otherwise a locked view"; mockup
 * https://claude.ai/artifact/LQ7yYqc7xvwnKk7pXjctbD). Open to whoever can see
 * our analysis (Premium, a free analysis, a showcase share); everyone else
 * gets the same strip locked, its button going to the page's Premium card.
 * The open copy is always in the HTML under `Locked` (screen-only, like the
 * report); the locked one never draws a bar of the real width.
 */
export default function SplitStrip({
  split,
  answer,
  code,
  name,
}: {
  split: BuySellSplit;
  answer: StockAnswer | null;
  code: string;
  name: string;
}) {
  const open = usePremiumOpen();
  const opening = !!useLockScope()?.opening;
  return (
    <>
      {!open && !opening && (
        <div className="pl-free">
          <LockedStrip code={code} name={name} />
        </div>
      )}
      <Locked>
        <OpenScope>
          <OpenStrip split={split} answer={answer} />
        </OpenScope>
      </Locked>
    </>
  );
}
