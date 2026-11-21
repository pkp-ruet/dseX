"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { isLoggedIn } from "@/lib/auth";
import type { WatchRulesState } from "@/lib/api";
import WatchRulesSheet from "@/components/watch-rules/WatchRulesSheet";
import { getWatchRulesState, loadWatchRules, subscribeWatchRules } from "@/components/watch-rules/store";

/**
 * "Watch this share" (THE Premium line, step 4): opens the share's rules.
 * Shows how many rules the share has once there are any. Signed-out readers
 * are sent to sign up and come back here.
 */
export default function WatchRulesButton({
  code,
  name,
  size = "sm",
  className = "",
}: {
  code: string;
  name?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { bn } = useLang();
  const [state, setState] = useState<WatchRulesState | null>(getWatchRulesState());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadWatchRules().then((s) => s && setState(s));
    return subscribeWatchRules(() => setState(getWatchRulesState()));
  }, []);

  const n = (state?.rules ?? []).filter((r) => r.code === code).length;

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn()) {
      router.push(`/register?next=${encodeURIComponent(pathname || `/stock/${code}`)}`);
      return;
    }
    loadWatchRules().then((s) => s && setState(s));
    setOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        variant="quiet"
        size={size}
        active={n > 0}
        onClick={onClick}
        className={className}
        aria-label={bn ? `${code}-এ নজরের নিয়ম` : `Watch rules for ${code}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>
          {n > 0 ? (
            <T en={`Watching · ${n} ${n === 1 ? "rule" : "rules"}`} bn={`নজরে · ${n}টি নিয়ম`} />
          ) : (
            <T en="Watch this share" bn="নজর রাখুন" />
          )}
        </span>
      </Button>
      {open && (
        <WatchRulesSheet code={code} name={name || code} state={state} open={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
