"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { DeepAnalysisTeaser as Teaser } from "@/lib/api";
import LangToggle, { type Lang } from "@/components/stock/LangToggle";

interface Props {
  teaser: Teaser | null | undefined;
  code: string;
}

const LANG_KEY = "dsex.analysis.lang";

const T = {
  eyebrow: { en: "In-depth analysis", bn: "গভীর বিশ্লেষণ" },
  cta: { en: "Read the full analysis", bn: "সম্পূর্ণ বিশ্লেষণ পড়ুন" },
  sub: {
    en: "A plain-language deep dive into the business, its earnings, safety, dividend and risks.",
    bn: "ব্যবসা, আয়, নিরাপত্তা, ডিভিডেন্ড ও ঝুঁকি নিয়ে সহজ ভাষায় বিস্তারিত আলোচনা।",
  },
} as const;

/**
 * Free hook on the main stock page for the durable deep-analysis report. Shows
 * the headline + bottom line and links to the full /stock/[code]/analysis
 * sub-page. When the report becomes a premium feature, this teaser stays free —
 * it's the conversion surface — and only the sub-page gets gated.
 */
export default function DeepAnalysisTeaser({ teaser, code }: Props) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "bn" || saved === "en") setLang(saved);
    } catch {}
  }, []);

  const setAndSave = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem(LANG_KEY, l); } catch {}
  };

  if (!teaser?.available) return null;
  const isBn = lang === "bn";
  const headline = (isBn ? teaser.headline_bn : teaser.headline_en) ?? teaser.headline_en;
  const bottomLine = (isBn ? teaser.bottom_line_bn : teaser.bottom_line_en) ?? teaser.bottom_line_en;

  return (
    <section id="deep-dive" className="mb-8 scroll-mt-[112px]">
      <div
        className="rounded-3xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-soft)" }}
      >
        {/* Accent strip — signals this is the premium/marquee read */}
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, var(--primary), var(--accent, var(--primary)))" }} />

        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-base">📊</span>
              <span
                className={`text-[10px] font-bold uppercase tracking-[0.15em] ${isBn ? "font-bn" : ""}`}
                style={{ color: "var(--primary)" }}
              >
                {T.eyebrow[lang]}
              </span>
            </div>
            <LangToggle value={lang} onChange={setAndSave} size="sm" />
          </div>

          <div className={isBn ? "font-bn" : ""} lang={isBn ? "bn" : undefined}>
            <h2 className="text-lg sm:text-2xl font-bold leading-snug mb-3" style={{ color: "var(--text)" }}>
              {headline}
            </h2>
            <p className="text-sm sm:text-base leading-relaxed line-clamp-3" style={{ color: "var(--text-muted)" }}>
              {bottomLine}
            </p>
          </div>

          <Link
            href={`/stock/${code}/analysis`}
            className={`inline-flex items-center gap-1.5 mt-5 rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${isBn ? "font-bn" : ""}`}
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            {T.cta[lang]}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
