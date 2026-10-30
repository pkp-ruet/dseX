"use client";

import { useEffect } from "react";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { usePremium } from "@/lib/premium";
import { trackEvent } from "@/lib/track";

/**
 * `report_depth` (2026-10-30, the full report plan, step 7): one GA event per
 * chapter the reader scrolls to, with whether the report was open for them,
 * so free and full readers' depth can be compared. Renders nothing.
 */
export default function ReportDepth({ code, chapters }: { code: string; chapters: string[] }) {
  const open = usePremiumOpen();
  const { state } = usePremium();
  const key = chapters.join(",");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id;
          if (!e.isIntersecting || seen.has(id)) continue;
          seen.add(id);
          trackEvent("report_depth", { code, chapter: id, depth: chapters.indexOf(id) + 1, open: open ? "yes" : "no", plan: state });
          io.unobserve(e.target);
        }
      },
      { threshold: 0.15 },
    );
    for (const id of chapters) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
    // `chapters` is keyed by its joined ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, key, open, state]);

  return null;
}
