"use client";

import { useEffect, useState } from "react";
import { T } from "@/components/i18n/T";
import { IconBell, IconCheck } from "@/components/ui/icons";
import { useLang } from "@/context/LangContext";
import { apiAddDividendReminder, apiGetDividendReminders, apiRemoveDividendReminder } from "@/lib/api";
import { isLimitError, usePremium } from "@/lib/premium";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";

/** The page's Premium card — where a free reader's tap points. */
export const CALENDAR_PREMIUM_ANCHOR = "dc-premium";

/* One shared copy of the reader's reminders per page: every row's bell reads
   it, one request fills it. */
let codes: Set<string> | null = null;
let loading: Promise<void> | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function load(): Promise<void> {
  if (codes) return Promise.resolve();
  loading ??= apiGetDividendReminders()
    .then((r) => {
      codes = new Set(r.codes.map((c) => c.toUpperCase()));
      emit();
    })
    .catch(() => {
      loading = null;
    });
  return loading;
}

function goToPremium() {
  document.getElementById(CALENDAR_PREMIUM_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * "Remind me" on a cash record date (2026-10-31, the Premium Desk plan): on
 * the last day to buy, the morning brief says "Last day to buy X to get its
 * ৳N dividend" — on any share, not only the ones you hold or follow. Premium;
 * a free reader's tap says so in a toast and points at the page's card.
 */
export default function RemindButton({ code }: { code: string }) {
  const { isPremium, state } = usePremium();
  const { bn } = useLang();
  const [, force] = useState(0);
  const [busy, setBusy] = useState(false);
  const up = code.toUpperCase();

  useEffect(() => {
    const f = () => force((n) => n + 1);
    subs.add(f);
    if (isPremium) void load();
    return () => {
      subs.delete(f);
    };
  }, [isPremium]);

  const on = isPremium && !!codes?.has(up);

  const tap = async () => {
    if (!isPremium) {
      trackEvent("premium_lock_tap", { area: "dividend-calendar", lock: "dividend-reminder", state });
      toast({
        message: (
          <T
            en="Reminders on any share are part of Premium."
            bn="যেকোনো শেয়ারে রিমাইন্ডার প্রিমিয়ামের অংশ।"
          />
        ),
        action: { label: <T en="See what it adds" bn="কী যোগ হয় দেখুন" />, onClick: goToPremium },
      });
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const r = on ? await apiRemoveDividendReminder(up) : await apiAddDividendReminder(up);
      codes = new Set(r.codes.map((c) => c.toUpperCase()));
      emit();
      trackEvent("dividend_reminder", { code: up, on: on ? "off" : "on" });
      toast({
        tone: "success",
        message: on ? (
          <T en={`Reminder for ${up} removed`} bn={`${up}-এর রিমাইন্ডার বাদ দেওয়া হয়েছে`} />
        ) : (
          <T
            en={`We'll tell you on the last day to buy ${up}`}
            bn={`${up} কেনার শেষ দিনে আমরা জানাব`}
          />
        ),
      });
    } catch (err) {
      toast({
        tone: "error",
        message: isLimitError(err) ? (
          <T en="You have 50 reminders, the most we keep." bn="আপনার 50টি রিমাইন্ডার আছে, এর বেশি রাখা যায় না।" />
        ) : (
          <T en="That didn't save. Please try again." bn="সংরক্ষণ হয়নি। আবার চেষ্টা করুন।" />
        ),
      });
    } finally {
      setBusy(false);
    }
  };

  const label = on
    ? bn ? `${up}: রিমাইন্ডার চালু, বন্ধ করুন` : `${up}: reminder on, tap to remove`
    : bn ? `${up} কেনার শেষ দিনে মনে করিয়ে দিন` : `Remind me on the last day to buy ${up}`;
  return (
    <button
      type="button"
      className="dc-remind"
      data-on={on ? "true" : "false"}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={tap}
      disabled={busy}
    >
      {on ? <IconCheck size={16} /> : <IconBell size={16} />}
    </button>
  );
}
