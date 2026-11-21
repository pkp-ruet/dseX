"use client";

import { useEffect, useState } from "react";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { isLoggedIn } from "@/lib/auth";
import { trackEvent } from "@/lib/track";
import { isWatched, loadWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { heldQty, loadMainHoldings } from "@/lib/main-holdings";
import { loadWatchRules, openWatchRules, rulesOn, subscribeWatchRules } from "@/components/watch-rules/store";

const hideKey = (code: string) => `dsex.wrHint.${code}`;

/**
 * One quiet line under the stock page's cover (2026-11-22): a reader who owns
 * or follows this share and has set no rules on it hears that they can choose
 * what we tell them. ✕ hides it for this share on this device.
 */
export default function WatchRulesHint({ code, name }: { code: string; name: string }) {
  const { bn } = useLang();
  const [why, setWhy] = useState<"own" | "follow" | null>(null);
  const [hasRules, setHasRules] = useState(true);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) return;
    try {
      setHidden(!!localStorage.getItem(hideKey(code)));
    } catch {
      setHidden(false);
    }
    let alive = true;
    const check = () => setHasRules(rulesOn(code) > 0);
    loadWatchRules().then((s) => alive && s && check());
    Promise.all([loadMainHoldings().catch(() => []), loadWatchlist().catch(() => [])]).then(([holdings]) => {
      if (!alive) return;
      if ((heldQty(holdings).get(code) ?? 0) > 0) setWhy("own");
      else if (isWatched(code)) setWhy("follow");
    });
    const offRules = subscribeWatchRules(check);
    const offWatch = subscribeWatchlist(() => setWhy((w) => (w === "own" ? w : isWatched(code) ? "follow" : null)));
    return () => {
      alive = false;
      offRules();
      offWatch();
    };
  }, [code]);

  useEffect(() => {
    if (why && !hasRules && !hidden) trackEvent("watch_rules_hint_view", { code, why });
  }, [why, hasRules, hidden, code]);

  if (!why || hasRules || hidden) return null;

  function hide() {
    try {
      localStorage.setItem(hideKey(code), "1");
    } catch {}
    setHidden(true);
    trackEvent("watch_rules_hint_hide", { code });
  }

  return (
    <div className="wr-hint" role="note">
      <svg className="wr-hint-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <p className="wr-hint-text">
        {why === "own" ? (
          <T en={`You own ${code}. `} bn={`${code} আপনার আছে। `} />
        ) : (
          <T en={`You follow ${code}. `} bn={`আপনি ${code} ফলো করছেন। `} />
        )}
        <T
          en="We can tell you when its grade drops, results come out or a dividend is declared."
          bn="এর গ্রেড নামলে, আর্থিক ফল এলে বা ডিভিডেন্ড ঘোষণা হলে আমরা আপনাকে জানাতে পারি।"
        />{" "}
        <button
          type="button"
          className="wr-hint-link"
          onClick={() => {
            trackEvent("watch_rules_prompt_tap", { from: "stock-hint", code });
            openWatchRules(code, name);
          }}
        >
          <T en="Choose what to hear" bn="কী জানতে চান বেছে নিন" />
        </button>
      </p>
      <button type="button" className="wr-hint-x" onClick={hide} aria-label={bn ? "এটি লুকান" : "Hide this"}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
