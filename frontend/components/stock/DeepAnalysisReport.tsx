"use client";
import { useEffect, useState } from "react";
import type { DeepAnalysisReport as Report, DeepAnalysisSection, FairValue } from "@/lib/api";
import Markdown from "@/lib/markdown";
import LangToggle, { type Lang } from "@/components/stock/LangToggle";
import ValueTodayBox from "@/components/stock/ValueTodayBox";

interface Props {
  report: Report;
  fairValue: FairValue | null;
}

const LANG_KEY = "dsex.analysis.lang";

const T = {
  eyebrow: { en: "In-depth analysis", bn: "গভীর বিশ্লেষণ" },
  asOf: { en: "Data as of", bn: "তথ্য যতদিনের" },
} as const;

// Bull case reads positive, bear case negative; everything else uses the brand accent.
function accentFor(key: string): string {
  if (key === "bull_case") return "var(--positive)";
  if (key === "bear_case") return "var(--negative)";
  return "var(--primary)";
}

export default function DeepAnalysisReport({ report, fairValue }: Props) {
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

  const isBn = lang === "bn";
  const pick = (en: string | null | undefined, bn: string | null | undefined) =>
    (isBn ? bn : en) ?? en ?? "";

  const headline = pick(report.headline_en, report.headline_bn);
  const bottomLine = pick(report.bottom_line_en, report.bottom_line_bn);
  const dataNote = pick(report.data_note_en, report.data_note_bn);
  const disclaimer = pick(report.disclaimer_en, report.disclaimer_bn);

  const sectionTitle = (s: DeepAnalysisSection) => pick(s.title_en, s.title_bn);
  const sectionTakeaway = (s: DeepAnalysisSection) => pick(s.takeaway_en, s.takeaway_bn);
  const sectionBody = (s: DeepAnalysisSection) => pick(s.body_en, s.body_bn);

  return (
    <article className={isBn ? "font-bn" : ""} lang={isBn ? "bn" : undefined}>
      {/* Header: eyebrow + language switch */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-base">📊</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--primary)" }}>
            {T.eyebrow[lang]}
          </span>
        </div>
        <LangToggle value={lang} onChange={setAndSave} size="sm" />
      </div>

      {/* Thesis in ~20 seconds: headline + bottom line */}
      <h1 className="text-2xl sm:text-3xl font-bold leading-snug mb-4" style={{ color: "var(--text)" }}>
        {headline}
      </h1>
      <p className="text-base sm:text-lg leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>
        {bottomLine}
      </p>

      {/* Live value box up top on mobile so the price read is never buried;
          it also appears beside the valuation section on wider screens. */}
      {fairValue && (
        <div className="lg:hidden mb-6">
          <ValueTodayBox fairValue={fairValue} lang={lang} />
        </div>
      )}

      {report.as_of_date && (
        <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
          {T.asOf[lang]} {report.as_of_date}
        </p>
      )}

      {dataNote && (
        <div
          className="rounded-2xl p-4 mb-6 text-sm leading-snug"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          {dataNote}
        </div>
      )}

      {/* The 10 durable sections, all expanded, takeaway as the lead line */}
      <div className="space-y-8">
        {report.sections.map((s, i) => {
          const accent = accentFor(s.key);
          const isValuation = s.key === "valuation";
          return (
            <section key={s.key} className="scroll-mt-[112px]" id={`sec-${s.key}`}>
              <div className="flex items-baseline gap-2.5 mb-2">
                <span
                  className="text-xs font-bold tabular-nums shrink-0"
                  style={{ color: "var(--text-muted)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="text-lg sm:text-xl font-bold leading-snug" style={{ color: "var(--text)" }}>
                  {sectionTitle(s)}
                </h2>
              </div>

              {/* Takeaway — the one line a skimmer should remember */}
              <p
                className="text-[15px] sm:text-base font-semibold leading-snug mb-3 pl-3"
                style={{ color: "var(--text)", borderLeft: `3px solid ${accent}` }}
              >
                {sectionTakeaway(s)}
              </p>

              {isValuation ? (
                <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
                  <Markdown
                    text={sectionBody(s)}
                    className="text-[15px] sm:text-base"
                  />
                  {fairValue && (
                    <div className="hidden lg:block lg:sticky lg:top-[112px]">
                      <ValueTodayBox fairValue={fairValue} lang={lang} />
                    </div>
                  )}
                </div>
              ) : (
                <Markdown text={sectionBody(s)} className="text-[15px] sm:text-base" />
              )}
            </section>
          );
        })}
      </div>

      {/* Fine print */}
      {disclaimer && (
        <p className="text-xs leading-snug mt-10 pt-6" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
          {disclaimer}
        </p>
      )}
    </article>
  );
}
