"use client";
import { useLang } from "@/context/LangContext";
import { COPY } from "@/lib/assistant/copy";

/** Three-dot typing indicator (animation defined in globals.css as .disha-typing). */
export default function LoadingBlock() {
  const { lang } = useLang();
  return (
    <div
      className="disha-typing inline-flex items-center gap-1 py-1.5"
      role="status"
      aria-label={lang === "bn" ? COPY.thinking.bn : COPY.thinking.text}
    >
      <span />
      <span />
      <span />
    </div>
  );
}
