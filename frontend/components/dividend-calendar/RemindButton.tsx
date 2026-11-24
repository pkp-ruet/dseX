"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { T } from "@/components/i18n/T";
import { IconBell, IconCheck } from "@/components/ui/icons";
import { useLang } from "@/context/LangContext";
import { isLoggedIn } from "@/lib/auth";
import { trackEvent } from "@/lib/track";
import { getWatchRulesState, loadWatchRules, openWatchRules, subscribeWatchRules } from "@/components/watch-rules/store";

/** The page's Premium card — where a free reader's tap on a locked part points. */
export const CALENDAR_PREMIUM_ANCHOR = "dc-premium";

/** True when the reader already has the "last day to buy" rule on this share. */
function hasLastDay(code: string): boolean {
  return (getWatchRulesState()?.rules ?? []).some((r) => r.code === code && r.kind === "last_day");
}

/**
 * "Remind me on the last day to buy" on a cash record date. Since 2026-11-25
 * (one Watch button) it opens the share's Watch sheet with "Tomorrow is the
 * last day to buy for a dividend" ticked: one way to ask for news on a share,
 * on every page. It was its own Premium list of reminders read by the morning
 * brief (2026-10-31); the few set before stay read there.
 */
export default function RemindButton({
  code,
  name,
  ltp = null,
  labeled = false,
}: {
  code: string;
  name?: string | null;
  ltp?: number | null;
  labeled?: boolean;
}) {
  const { bn } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const up = code.toUpperCase();
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) loadWatchRules().then(() => setOn(hasLastDay(up)));
    return subscribeWatchRules(() => setOn(hasLastDay(up)));
  }, [up]);

  const tap = () => {
    if (!isLoggedIn()) {
      router.push(`/register?next=${encodeURIComponent(pathname || "/dividend-calendar")}`);
      return;
    }
    trackEvent("dividend_reminder", { code: up, on: on ? "edit" : "open" });
    openWatchRules(up, name, { ltp, tick: ["last_day"] });
  };

  const label = on
    ? bn ? `${up}: রিমাইন্ডার চালু, বদলান` : `${up}: reminder on, tap to change`
    : bn ? `${up} কেনার শেষ দিনে মনে করিয়ে দিন` : `Remind me on the last day to buy ${up}`;
  if (labeled) {
    // Inside an opened calendar row: the row's first action since 2026-11-05
    // (a reminder is what tracking dividends is for), filled until it is set.
    return (
      <button
        type="button"
        className={`${on ? "btn-quiet" : "btn-primary"} btn-sm dc-remind-l`}
        data-on={on ? "true" : "false"}
        aria-pressed={on}
        onClick={tap}
      >
        {on ? <IconCheck size={16} /> : <IconBell size={16} />}
        {on ? (
          <T en="Reminder on" bn="রিমাইন্ডার চালু" />
        ) : (
          <T en="Remind me on the last day to buy" bn="কেনার শেষ দিনে মনে করিয়ে দিন" />
        )}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="dc-remind"
      data-on={on ? "true" : "false"}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={tap}
    >
      {on ? <IconCheck size={16} /> : <IconBell size={16} />}
    </button>
  );
}
