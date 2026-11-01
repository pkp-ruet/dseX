"use client";

import Button from "@/components/ui/Button";
import { IconBell, IconCrown } from "@/components/ui/icons";
import { useLockScope } from "@/components/premium/LockScope";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { Bi } from "@/lib/stock-report";

/**
 * The report's close (`#ch-premium-end`). The report only shows when it is
 * open (2026-11-01, `ReportGate`), so this is never the sales pitch — that is
 * the one Premium card (`PremiumPromo`). A Premium reader gets one quiet line
 * on report alerts; a reader on today's free report or a report key gets
 * "the same report on every share". `lines` (the backend's `offer`) ride
 * along to /premium as stakes.
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
  // Opened with one of the reader's report keys rather than today's free report.
  const keyed = useLockScope()?.reason === "key";

  if (isPremium) {
    return (
      <p className="my-8 flex items-start gap-2 text-sm leading-snug text-text-muted">
        <span className="mt-0.5 shrink-0 text-gold-ink"><IconBell size={14} /></span>
        <T
          en="Follow this share to get one push when our answer changes, its results land, a red flag appears or its grade changes."
          bn="শেয়ারটি ফলো করলে আমাদের উত্তর বদলালে, ফল প্রকাশ হলে, নতুন বড় সতর্কতা এলে বা গ্রেড বদলালে আপনি একটি নোটিফিকেশন পাবেন।"
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
    <div id="ch-premium-end" className="rp-offer stock-anchor my-8">
      <p className="flex items-center gap-2 text-sm font-semibold text-gold-ink">
        <IconCrown size={16} />
        {keyed ? <T en="Your free full report" bn="আপনার ফ্রি পূর্ণ রিপোর্ট" /> : <T en="Today's free full report" bn="আজকের ফ্রি পূর্ণ রিপোর্ট" />}
      </p>
      <h3 className="mt-1 text-xl font-bold leading-tight text-text-main sm:text-2xl">
        {keyed ? (
          <T en={`The report on ${name} is open for you this week`} bn={`${name}-এর রিপোর্টটি এ সপ্তাহে আপনার জন্য খোলা আছে`} />
        ) : (
          <T en={`The report on ${name} is open for everyone today`} bn={`আজ ${name}-এর রিপোর্টটি সবার জন্য খোলা আছে`} />
        )}
      </h3>
      <p className="mt-2 text-sm text-text-main">
        <T en="With Premium, the same report is open on every DSE share, every day." bn="প্রিমিয়াম নিলে ডিএসইর প্রতিটি শেয়ারের এমন রিপোর্ট প্রতিদিন পড়তে পারবেন।" />
      </p>
      <p className="mt-5 text-base text-text-main">
        <T
          en={<><b className="tabular-nums">৳{LOWEST_PRICE}</b> a month</>}
          bn={<>মাসে <b className="tabular-nums">৳{LOWEST_PRICE}</b></>}
        />
        <span className="text-text-muted">
          <T en={` · about ৳${FROM_MONTH} a month on the yearly plan`} bn={` · বছরের প্ল্যানে মাসে প্রায় ৳${FROM_MONTH}`} />
        </span>
      </p>
      <div className="mt-3">
        <Button href={PREMIUM_PATH} onClick={onTap} size="lg" block>
          <T en="Get this on every share" bn="সব শেয়ারের রিপোর্ট পান" />
        </Button>
      </div>
      <p className="mt-3 text-sm text-text-muted">
        <T en="Pay by bKash, Nagad or bank transfer. Nothing renews by itself." bn="bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিতে পারবেন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।" />
      </p>
    </div>
  );
}
