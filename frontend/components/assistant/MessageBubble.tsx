"use client";
import type { Chip, Message } from "@/lib/assistant/types";
import { PERSONA } from "@/lib/assistant/persona";
import { T } from "@/components/i18n/T";
import MessageBlockRenderer from "./MessageBlockRenderer";

export default function MessageBubble({
  message,
  onChip,
}: {
  message: Message;
  onChip: (c: Chip) => void;
}) {
  if (message.sender === "user") {
    // A typed message is shown as typed; a tapped chip carries its label in both languages.
    const text = message.blocks
      .map((b) => (b.type === "text" ? b.text : ""))
      .join(" ")
      .trim();
    const bn = message.blocks
      .map((b) => (b.type === "text" ? b.bn || b.text : ""))
      .join(" ")
      .trim();
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-xl rounded-br-sm bg-primary px-3.5 py-2 text-sm leading-snug text-surface">
          <T en={text} bn={bn} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-surface"
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
