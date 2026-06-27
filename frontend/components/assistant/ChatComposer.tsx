"use client";
import { forwardRef, useState, type FormEvent } from "react";
import { COPY } from "@/lib/assistant/copy";
import { PERSONA } from "@/lib/assistant/persona";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

const ChatComposer = forwardRef<HTMLInputElement, Props>(function ChatComposer(
  { onSend, disabled },
  ref,
) {
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (!t) return;
    onSend(t);
    setValue("");
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--surface)] p-2.5"
    >
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={COPY.composerPlaceholder}
        aria-label={`Message ${PERSONA.name}`}
        enterKeyHint="send"
        className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-[0.88rem] text-[var(--text)] outline-none focus:border-[var(--primary)]"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40"
        style={{ background: "var(--primary)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
        </svg>
      </button>
    </form>
  );
});

export default ChatComposer;
