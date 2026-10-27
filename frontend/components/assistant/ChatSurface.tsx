"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAssistant } from "./useAssistant";
import MessageList from "./MessageList";
import ChatComposer from "./ChatComposer";
import QuickActionsBar from "./QuickActionsBar";
import { COPY } from "@/lib/assistant/copy";
import { useAuth } from "@/context/AuthContext";
import { T } from "@/components/i18n/T";

/**
 * The shared chat surface used by both the floating panel and the /assistant
 * page. `panel` fills its container; `page` is a self-contained card.
 *
 * `seedCode` (passed when the launcher is opened on a /stock/[code] page) shows
 * a one-tap "Ask about CODE" bar so the user starts pointed at that stock —
 * never auto-sent, so they stay in control.
 */
export default function ChatSurface({
  variant,
  seedCode,
}: {
  variant: "panel" | "page";
  seedCode?: string;
}) {
  const { messages, status, flowActive, limited, sendText, sendChip, cancelFlow } = useAssistant();
  const signedIn = useAuth().isLoggedIn;
  const inputRef = useRef<HTMLInputElement>(null);
  const [seedUsed, setSeedUsed] = useState(false);

  useEffect(() => {
    if (variant === "panel") inputRef.current?.focus();
  }, [variant]);

  const showSeed = !!seedCode && !seedUsed && !flowActive && !limited;

  return (
    <div
      className={
        variant === "panel"
          ? "flex h-full flex-col"
          : "flex h-[72vh] flex-col overflow-hidden soft-card sm:h-[640px]"
      }
    >
      <div className="disha-scroll min-h-0 flex-1 overflow-y-auto">
        <MessageList messages={messages} onChip={sendChip} />
      </div>
      {showSeed && (
        <div className="border-t border-border bg-surface-2 px-2.5 py-2">
          <button
            type="button"
            onClick={() => {
              sendChip({
                label: `About ${seedCode}`,
                labelBn: `${seedCode} সম্পর্কে`,
                action: { intentId: "stock_detail", entities: { code: seedCode } },
              });
              setSeedUsed(true);
            }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-primary bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition active:scale-95"
          >
            <T en={`Ask about ${seedCode}`} bn={`${seedCode} নিয়ে জিজ্ঞেস করুন`} />
          </button>
        </div>
      )}
      {limited && !flowActive ? (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-2 px-3.5 py-3">
          <p className="min-w-0 text-sm font-medium text-text-main">
            {signedIn ? (
              <T en={COPY.freeLimit.bar} bn={COPY.freeLimit.barBn} />
            ) : (
              <T en={COPY.guestLimit.bar} bn={COPY.guestLimit.barBn} />
            )}
          </p>
          <Link
            href={signedIn ? "/premium" : "/register"}
            className="btn-primary btn-sm shrink-0"
          >
            {signedIn ? (
              <T en={COPY.freeLimit.cta} bn={COPY.freeLimit.ctaBn} />
            ) : (
              <T en={COPY.guestLimit.cta} bn={COPY.guestLimit.ctaBn} />
            )}
          </Link>
        </div>
      ) : (
        <>
          <QuickActionsBar flowActive={flowActive} onChip={sendChip} onCancel={cancelFlow} />
          <ChatComposer ref={inputRef} onSend={sendText} disabled={status === "thinking" || limited} />
        </>
      )}
    </div>
  );
}
