"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import type { WatchRulesState } from "@/lib/api";
import { FREE_LIMITS, PREMIUM_PATH, usePremium } from "@/lib/premium";
import { dhakaDay, shortDayWords } from "@/lib/renewal";
import { trackEvent } from "@/lib/track";
import { getWatchRulesState, loadWatchRules, subscribeWatchRules } from "@/components/watch-rules/store";

/**
 * The watchlist's one line on what a free reader has used of what we tell
 * them (2026-11-25: moved from the Watch rules page when that page folded
 * into the watchlist). Free: "using 2 of 3 free rules, price alerts
 * included", and how many are paused; the 7-day taste: no limit until when;
 * Premium, or a free reader with nothing set: nothing.
 */
export default function WatchPlanLine() {
  const { isPremium, taste } = usePremium();
  const [state, setState] = useState<WatchRulesState | null>(getWatchRulesState());

  useEffect(() => {
    loadWatchRules().then((s) => s && setState(s));
    return subscribeWatchRules(() => setState(getWatchRulesState()));
  }, []);

  if (isPremium || !state) return null;
  const limit = state.limit;
  const used = state.used;
  const paused = state.rules.filter((r) => r.paused).length;
  const freeCap = FREE_LIMITS.alerts ?? 3;

  if (limit == null) {
    if (!taste?.active || !taste.until || used === 0) return null;
    const end = shortDayWords(dhakaDay(taste.until));
    return (
      <div className="wrp-plan">
        <p>
          <strong>
            <T en={`No limit on what we tell you during your free week, until ${end.en}.`} bn={`আপনার ফ্রি সপ্তাহে কী জানাব তার কোনো সীমা নেই, ${end.bn} পর্যন্ত।`} />
          </strong>{" "}
          <T
            en={`After that, your first ${freeCap} rules stay on, price alerts included, and the rest pause.`}
            bn={`এরপর প্রথম ${freeCap}টি নিয়ম চালু থাকবে, প্রাইস অ্যালার্টসহ, বাকিগুলো থেমে যাবে।`}
          />
        </p>
      </div>
    );
  }
  if (used === 0) return null;

  return (
    <div className={`wrp-plan${used > limit ? " wrp-plan--over" : ""}`}>
      <p>
        <strong>
          <T en={`You're using ${used} of ${limit} free rules`} bn={`ফ্রিতে ${limit}টি নিয়মের ${used}টি ব্যবহার করছেন`} />
        </strong>
        <T en=", price alerts included." bn=", প্রাইস অ্যালার্টসহ।" />
        {paused > 0 && (
          <T
            en={` ${paused} ${paused === 1 ? "rule is" : "rules are"} paused: open a share's Watching button to keep the ones you want on.`}
            bn={` ${paused}টি নিয়ম থেমে আছে: যেগুলো চালু রাখতে চান, সেই শেয়ারের নজরে বোতাম খুলে চালু রাখুন।`}
          />
        )}
      </p>
      <p>
        <T
          en="Premium keeps every rule on and tells you the same evening."
          bn="প্রিমিয়ামে সব নিয়ম চালু থাকে, আর সেদিন সন্ধ্যায়ই জানায়।"
        />{" "}
        <Link
          href={`${PREMIUM_PATH}?src=watchlist-rules#pay`}
          className="font-semibold text-primary-ink hover:underline"
          onClick={() => trackEvent("premium_lock_tap", { area: "watchlist", lock: "watch-rules" })}
        >
          <T en="See Premium" bn="প্রিমিয়াম দেখুন" />
        </Link>
      </p>
    </div>
  );
}
