"use client";
import { useEffect, useRef, useState } from "react";
import { useAssistant } from "./useAssistant";
import MessageList from "./MessageList";
import ChatComposer from "./ChatComposer";
import QuickActionsBar from "./QuickActionsBar";

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
  const { messages, status, flowActive, sendText, sendChip, cancelFlow } = useAssistant();
  const inputRef = useRef<HTMLInputElement>(null);
  const [seedUsed, setSeedUsed] = useState(false);

  useEffect(() => {
    if (variant === "panel") inputRef.current?.focus();
  }, [variant]);

  const showSeed = !!seedCode && !seedUsed && !flowActive;

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
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2">
          <button
            type="button"
            onClick={() => {
              sendChip({
                label: `About ${seedCode}`,
                action: { intentId: "stock_detail", entities: { code: seedCode } },
              });
              setSeedUsed(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)] bg-[var(--surface)] px-3 py-1.5 text-[0.78rem] font-semibold text-[var(--primary)] transition active:scale-95"
          >
            💡 Ask about {seedCode}
          </button>
        </div>
      )}
      <QuickActionsBar flowActive={flowActive} onChip={sendChip} onCancel={cancelFlow} />
      <ChatComposer ref={inputRef} onSend={sendText} disabled={status === "thinking"} />
    </div>
  );
}
