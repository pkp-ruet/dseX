"use client";

import { T } from "@/components/i18n/T";
import { trackEvent } from "@/lib/track";
import { openWatchRules, rulesOn } from "@/components/watch-rules/store";

/** The "Watch it" button for the toast that confirms a follow or a buy: the
 *  moment a reader cares most about a share, so the rules are one tap away.
 *  Undefined when the share already has rules (the caller keeps its own). */
export function watchItAction(code: string, name: string | null | undefined, from: "follow" | "buy") {
  if (rulesOn(code) > 0) return undefined;
  return {
    label: <T en="Watch it" bn="নজর রাখুন" />,
    onClick: () => {
      trackEvent("watch_rules_prompt_tap", { from, code });
      openWatchRules(code, name);
    },
  };
}
