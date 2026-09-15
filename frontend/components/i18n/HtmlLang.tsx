"use client";

import { useEffect } from "react";

/**
 * Sets `<html lang>` for a route whose whole page is in another language.
 * Next.js has one root layout (`lang="en"`), so this flips the attribute on
 * the client after mount and restores it on the way out. Crawlers that run
 * JavaScript (Google) see the corrected value; the raw HTML keeps `en`.
 */
export default function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.lang;
    root.lang = lang;
    return () => {
      root.lang = previous;
    };
  }, [lang]);
  return null;
}
