"use client";

import { useEffect, useState } from "react";
import type { WatchRulesState } from "@/lib/api";
import WatchRulesSheet from "@/components/watch-rules/WatchRulesSheet";
import {
  getWatchRulesState,
  loadWatchRules,
  subscribeOpenWatchRules,
  subscribeWatchRules,
  type WatchOpenOpts,
} from "@/components/watch-rules/store";

/**
 * The Watch sheet opened from anywhere (`openWatchRules(code, name, opts)`):
 * a follow or buy toast, a screener row, the calendar's "Remind me".
 * Mounted once in the root layout.
 */
export default function WatchRulesHost() {
  const [target, setTarget] = useState<{ code: string; name: string; opts: WatchOpenOpts } | null>(null);
  const [state, setState] = useState<WatchRulesState | null>(getWatchRulesState());

  useEffect(() => {
    const offOpen = subscribeOpenWatchRules((code, name, opts) => {
      loadWatchRules().then((s) => {
        setState(s);
        setTarget({ code, name, opts });
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
    <WatchRulesSheet
      code={target.code}
      name={target.name}
      state={state}
      open
      ltp={target.opts.ltp ?? null}
      tick={target.opts.tick}
      onClose={() => setTarget(null)}
    />
  );
}
