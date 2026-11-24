"use client";

import { T } from "@/components/i18n/T";
import { trackEvent } from "@/lib/track";
import { isWatched } from "@/lib/watchlist";
import { openWatchRules, rulesOn } from "@/components/watch-rules/store";

/** The toast button after a follow or a buy: the moment a reader cares most
 *  about a share, so the Watch sheet is one tap away. After a follow (a star
 *  in a list) it offers what we tell them; after a buy, to watch the share.
 *  Undefined when the share already has rules, or a bought share is already
 *  watched (the caller keeps its own button). */
export function watchItAction(code: string, name: string | null | undefined, from: "follow" | "buy") {
  if (rulesOn(code) > 0 || (from === "buy" && isWatched(code))) return undefined;
  return {
    label: from === "follow" ? <T en="What we tell you" bn="কী জানাব" /> : <T en="Watch it" bn="নজর রাখুন" />,
    onClick: () => {
      trackEvent("watch_rules_prompt_tap", { from, code });
      openWatchRules(code, name);
    },
  };
}
