"use client";

import type { ElementType } from "react";
import { useLang } from "@/context/LangContext";

/**
 * One piece of research-list copy in the reader's language (the app-wide
 * English / বাংলা switch). The server renders English; a Bengali reader gets
 * the Bengali line right after mount, with `lang="bn"` + `.font-bn` so the
 * glyphs don't render as boxes.
 */
export function Txt({ en, bn, as: Tag = "span", className = "" }: {
  en: string;
  bn: string;
  as?: ElementType;
  className?: string;
}) {
  const { bn: isBn } = useLang();
  return isBn ? (
    <Tag lang="bn" className={`font-bn ${className}`.trim()}>{bn}</Tag>
  ) : (
    <Tag className={className || undefined}>{en}</Tag>
  );
}
