"use client";
import { useEffect, useRef } from "react";
import type { Chip, Message } from "@/lib/assistant/types";
import MessageBubble from "./MessageBubble";

export default function MessageList({
  messages,
  onChip,
}: {
  messages: Message[];
  onChip: (c: Chip) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} onChip={onChip} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
