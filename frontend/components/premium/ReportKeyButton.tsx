"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { useLockScope } from "@/components/premium/LockScope";
import { apiOpenReportKey } from "@/lib/api";
import { isLimitError, usePremium } from "@/lib/premium";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";

/** "1 Nov" — when the month's keys come back (Dhaka calendar). */
function nextMonth(month: string | undefined): { en: string; bn: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(month ?? "");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const bnNames = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const i = m ? Number(m[2]) % 12 : 0;
  return { en: `1 ${names[i]}`, bn: `1 ${bnNames[i]}` };
}

/**
 * Open this share's whole report with one of the month's free keys
 * (2026-10-29, the Free vs Premium plan, step 6 — backend/services/report_keys.py).
 * Since 2026-11-08 the stock page spends them by itself (10 a month), so this
 * button is the fallback when that call failed; it mostly asks a guest to
 * sign up and says when the month's analyses come back.
 * Shown on the stock report to a reader who can't see it yet: a guest is
 * asked to sign up, a free reader spends a key (the page opens through
 * `StockLockScope` once `/me` is re-read), and with none left it says when
 * they come back. Nothing for Premium readers or an open report.
 */
export default function ReportKeyButton({ code, className = "" }: { code: string; className?: string }) {
  const { user, refreshUser } = useAuth();
  const { state, isPremium } = usePremium();
  const scope = useLockScope();
  const [busy, setBusy] = useState(false);
  if (isPremium || scope?.unlocked) return null;

  if (state === "guest") {
    return (
      <div className={className}>
        <Button href="/register" variant="quiet" block>
          <T en="Sign up free and read 10 full analyses a month" bn="ফ্রি সাইন আপ করে মাসে 10টি পূর্ণ বিশ্লেষণ পড়ুন" />
        </Button>
      </div>
    );
  }

  const keys = user?.report_keys;
  const per = keys?.per_month ?? 10;
  const left = keys?.left ?? per;
  if (left <= 0) {
    const back = nextMonth(keys?.month);
    return (
      <p className={`text-sm text-text-muted ${className}`.trim()}>
        <T
          en={`You have read this month's ${per} free analyses. ${per} more come on ${back.en}.`}
          bn={`এ মাসের ${per}টি ফ্রি বিশ্লেষণ পড়া হয়ে গেছে। ${back.bn} আবার ${per}টি পাবেন।`}
        />
      </p>
    );
  }

  const open = async () => {
    if (busy) return;
    setBusy(true);
    trackEvent("report_key_open", { code, left });
    try {
      await apiOpenReportKey(code);
      await refreshUser();
      toast({
        tone: "success",
        message: (
          <T
            en={`Our analysis of ${code} is open until the end of the month.`}
            bn={`${code}-এর বিশ্লেষণ এ মাসের শেষ পর্যন্ত খোলা।`}
          />
        ),
      });
    } catch (err) {
      await refreshUser().catch(() => undefined);
      toast({
        tone: "neutral",
        message: isLimitError(err) ? (
          <T en="This month's free analyses are used up." bn="এ মাসের ফ্রি বিশ্লেষণ শেষ।" />
        ) : (
          <T en="That didn't work. Please try again." bn="হয়নি। আবার চেষ্টা করুন।" />
        ),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <Button variant="quiet" block onClick={open} disabled={busy}>
        <T
          en={`Open this analysis free · ${left} of ${per} left this month`}
          bn={`এই বিশ্লেষণটি ফ্রি খুলুন · এ মাসে ${per}টির ${left}টি বাকি`}
        />
      </Button>
      <p className="mt-1 text-xs text-text-muted">
        <T
          en={`Every free account reads ${per} full analyses a month. The first ${per} shares you open each month open by themselves.`}
          bn={`প্রতিটি ফ্রি অ্যাকাউন্টে মাসে ${per}টি পূর্ণ বিশ্লেষণ পড়া যায়। মাসে প্রথম যে ${per}টি শেয়ার খুলবেন, সেগুলো নিজে থেকেই খুলে যায়।`}
        />
      </p>
    </div>
  );
}
