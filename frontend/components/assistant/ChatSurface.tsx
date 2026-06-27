"use client";
import { useEffect, useRef } from "react";
import { useAssistant } from "./useAssistant";
import MessageList from "./MessageList";
import ChatComposer from "./ChatComposer";
import QuickActionsBar from "./QuickActionsBar";

/**
 * The shared chat surface used by both the floating panel and the /assistant
 * page. `panel` fills its container; `page` is a self-contained card.
 */
export default function ChatSurface({ variant }: { variant: "panel" | "page" }) {
  const { messages, status, flowActive, sendText, sendChip, cancelFlow } = useAssistant();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (variant === "panel") inputRef.current?.focus();
  }, [variant]);

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
      <QuickActionsBar flowActive={flowActive} onChip={sendChip} onCancel={cancelFlow} />
      <ChatComposer ref={inputRef} onSend={sendText} disabled={status === "thinking"} />
    </div>
  );
}
