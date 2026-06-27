"use client";
import type { Chip, Message } from "@/lib/assistant/types";
import { PERSONA } from "@/lib/assistant/persona";
import MessageBlockRenderer from "./MessageBlockRenderer";

export default function MessageBubble({
  message,
  onChip,
}: {
  message: Message;
  onChip: (c: Chip) => void;
}) {
  if (message.sender === "user") {
    const text = message.blocks
      .map((b) => (b.type === "text" ? b.text : ""))
      .join(" ")
      .trim();
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-[var(--primary)] px-3.5 py-2 text-[0.88rem] leading-snug text-white">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold text-white"
        style={{ background: "var(--primary)" }}
      >
        {PERSONA.initial}
      </span>
      <div className="min-w-0 flex-1 space-y-1 max-w-[88%]">
        {message.blocks.map((b, i) => (
          <MessageBlockRenderer key={i} block={b} onChip={onChip} />
        ))}
      </div>
    </div>
  );
}
