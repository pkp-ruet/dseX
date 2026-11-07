"use client";

import Button from "@/components/ui/Button";
import { IconCrown } from "@/components/ui/icons";
import { useLockScope } from "@/components/premium/LockScope";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
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
 * on report alerts; a reader on one of their free analyses gets
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
  // Opened with one of the reader's free analyses (report keys).
  const keyed = useLockScope()?.reason === "key";
  const keys = useAuth().user?.report_keys;
  const left = keys?.left ?? null;

  // A member already gets "follow it" in our conclusion (2026-11-05).
  if (isPremium) return null;

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "stock", lock: "stock-report", state, stakes: lines.length });
    savePremiumContext({
      from: "stock",
      label: bn ? `${code}: আমাদের বিশ্লেষণ` : `Our analysis of ${code}`,
      stakes: lines.slice(0, 3).map((l) => (bn ? l.bn || l.en : l.en)),
    });
  };

  return (
    <div id="ch-premium-end" className="rp-offer stock-anchor my-8">
      <p className="flex items-center gap-2 text-sm font-semibold text-gold-ink">
        <IconCrown size={16} />
        <T en="Your free analysis" bn="আপনার ফ্রি বিশ্লেষণ" />
      </p>
      <h3 className="mt-1 text-xl font-bold leading-tight text-text-main sm:text-2xl">
        <T en={`Our analysis of ${name} is open for you until the end of the month`} bn={`${name}-এর বিশ্লেষণটি এ মাসের শেষ পর্যন্ত আপনার জন্য খোলা আছে`} />
      </h3>
      <p className="mt-2 text-sm text-text-main">
        <T en="With Premium, the same analysis is open on every DSE share, every day." bn="প্রিমিয়াম নিলে ডিএসইর প্রতিটি শেয়ারের এমন বিশ্লেষণ প্রতিদিন পড়তে পারবেন।" />
        {keyed && left != null && keys && (
          <>
            {" "}
            {left > 0 ? (
              <T
                en={`You have ${left} free ${left === 1 ? "analysis" : "analyses"} left this month. The next share you open uses one.`}
                bn={`এ মাসে আরও ${left}টি ফ্রি বিশ্লেষণ বাকি। পরের যে শেয়ারটি খুলবেন, তাতে একটি খরচ হবে।`}
              />
            ) : (
              <T
                en={`That was the last of your ${keys.per_month} free analyses this month.`}
                bn={`এ মাসের ${keys.per_month}টি ফ্রি বিশ্লেষণের এটিই ছিল শেষটি।`}
              />
            )}
          </>
        )}
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
          <T en="Get this on every share" bn="সব শেয়ারের বিশ্লেষণ পান" />
        </Button>
      </div>
      <p className="mt-3 text-sm text-text-muted">
        <T en="Pay by bKash, Nagad or bank transfer. Nothing renews by itself." bn="bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিতে পারবেন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।" />
      </p>
    </div>
  );
}
