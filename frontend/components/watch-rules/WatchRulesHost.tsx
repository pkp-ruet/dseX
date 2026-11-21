"use client";

import { useEffect, useState } from "react";
import type { WatchRulesState } from "@/lib/api";
import WatchRulesSheet from "@/components/watch-rules/WatchRulesSheet";
import { getWatchRulesState, loadWatchRules, subscribeOpenWatchRules, subscribeWatchRules } from "@/components/watch-rules/store";

/**
 * The rules sheet opened from anywhere (`openWatchRules(code, name)`): the
 * "Watch it" button on a follow / buy toast, the rules page, a stock page's
 * hint line. Mounted once in the root layout.
 */
export default function WatchRulesHost() {
  const [target, setTarget] = useState<{ code: string; name: string } | null>(null);
  const [state, setState] = useState<WatchRulesState | null>(getWatchRulesState());

  useEffect(() => {
    const offOpen = subscribeOpenWatchRules((code, name) => {
      loadWatchRules().then((s) => {
        setState(s);
        setTarget({ code, name });
      });
    });
    const offState = subscribeWatchRules(() => setState(getWatchRulesState()));
    return () => {
      offOpen();
      offState();
    };
  }, []);

  if (!target) return null;
  return (
    <WatchRulesSheet code={target.code} name={target.name} state={state} open onClose={() => setTarget(null)} />
  );
}
