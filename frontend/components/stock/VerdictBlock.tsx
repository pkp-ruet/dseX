"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { verdictHeadline, verdictTone } from "@/lib/plain-language";
import { getTier, TIER_LABELS_BN } from "@/lib/constants";
import SignalChip from "@/components/ui/SignalChip";
import LangToggle, { type Lang } from "@/components/stock/LangToggle";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

const LANG_KEY = "dsex.analysis.lang";

const T = {
  brand: { en: "Analysis", bn: "বিশ্লেষণ" },
  score: { en: "Fundamental Score", bn: "মৌলিক স্কোর" },
  take: { en: "Our take", bn: "এক নজরে" },
  generic: {
    en: "Our take on this stock — combining its financial health with how the market is treating it right now.",
    bn: "এই শেয়ার নিয়ে আমাদের মত — এর আর্থিক অবস্থা আর বাজারের বর্তমান আচরণ মিলিয়ে।",
  },
  eduNote: { en: "Educational information, not investment advice.", bn: "এটি শিক্ষামূলক তথ্য, বিনিয়োগ পরামর্শ নয়।" },
  deepEyebrow: { en: "In-depth analysis", bn: "গভীর বিশ্লেষণ" },
  deepCta: { en: "Read the full analysis", bn: "সম্পূর্ণ বিশ্লেষণ পড়ুন" },
  latest: { en: "Latest Price", bn: "সর্বশেষ দাম" },
} as const;

/**
 * The single "Our Verdict" card — one home for what was previously three
 * stacked blocks (Bengali এক নজরে summary, the TopStockBD score/verdict, and the
 * deep-analysis teaser). A single EN / বাংলা toggle drives the whole card:
 *   • Score ring + verdict word + Buy signal (word + reason flip language)
 *   • The take — English shows the verdict tagline + sentences; Bengali shows
 *     the cached এক নজরে prose. BOTH language blocks are rendered into the
 *     server HTML and toggled by visibility, so crawlers still see the Bengali.
 *   • A distinct in-depth-analysis hook (kept as the premium/conversion surface)
 *     linking to the full /stock/[code]/analysis report.
 */
export default function VerdictBlock({ detail }: Props) {
  const { score_row, profile, verdict, signal, latest_price, bengali_summary, deep_analysis } = detail;

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

  const ltp = latest_price?.ltp;
  const score = (score_row?.score as number | null) ?? null;
  const tone = verdictTone(score);
  const word = isBn ? TIER_LABELS_BN[getTier(score)] : verdictHeadline(score);
  const companyName = profile.company_name || profile.trading_code;
  const code = profile.trading_code;

  const tagline = verdict?.tagline ?? null;
  const sentences = (verdict?.sentences ?? []).filter(Boolean);

  // Bengali "এক নজরে" prose — split blank-line-separated paragraphs.
  const bnSummary = bengali_summary?.trim() || "";
  const bnParas = bnSummary ? bnSummary.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [];

  // Only the Buy action reason is surfaced (Sell is hidden from the UI for now).
  const showReason = !!signal && signal.signal === "buy";
  const reason = isBn ? signal?.reason_bn : signal?.reason_en;

  const hasDeep = !!deep_analysis?.available;
  const deepHeadline = (isBn ? deep_analysis?.headline_bn : deep_analysis?.headline_en) ?? deep_analysis?.headline_en ?? "";
  const deepBottom = (isBn ? deep_analysis?.bottom_line_bn : deep_analysis?.bottom_line_en) ?? deep_analysis?.bottom_line_en ?? "";

  // Ring geometry
  const size = 140;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillPct = score != null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const targetOffset = circumference * (1 - fillPct);
  const animName = `vb_ring_${code.toLowerCase()}`;

  const eyebrowCls = (bn: boolean) =>
    `text-[11px] font-bold tracking-[0.22em] ${bn ? "font-bn" : "uppercase"}`;

  return (
    <section
      className="relative rounded-3xl overflow-hidden mb-8"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-soft)" }}
    >
      <style>{`
        @keyframes ${animName} {
          from { stroke-dashoffset: ${circumference}; }
          to   { stroke-dashoffset: ${targetOffset}; }
        }
      `}</style>

      {/* Thin tone accent on the left edge */}
      <div aria-hidden style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "3px", background: tone.color }} />

      <div className="relative p-5 sm:p-7">
        {/* Brand strip + single language toggle */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: tone.color }} />
            <span style={{ color: "var(--text)" }}>TopStockBD</span>
            <span className={isBn ? "font-bn normal-case tracking-normal" : ""} style={{ color: "var(--text-muted)" }}>
              {T.brand[lang]}
            </span>
          </span>
          <LangToggle value={lang} onChange={setAndSave} size="sm" />
        </div>

        {/* Company identity */}
        <div className="mb-4">
          <h2 className="font-black tracking-tight leading-[1.05]" style={{ color: "var(--text)", fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}>
            {companyName}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className="inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums"
              style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}
            >
              {code}
            </span>
            {profile.sector && (
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{ color: "var(--np-cautious)", background: "rgba(180,83,9,0.1)", border: "1px solid rgba(180,83,9,0.3)" }}
              >
                {profile.sector}
              </span>
            )}
            {ltp != null && (
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full tabular-nums ${isBn ? "font-bn" : ""}`}
                style={{ color: "var(--watch)", background: "rgba(180,83,9,0.1)", border: "1px solid rgba(180,83,9,0.3)" }}
              >
                {T.latest[lang]}: ৳{ltp.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Score ring + verdict word + signal */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-7">
          <div className="flex flex-col items-center shrink-0">
            <span className={`${eyebrowCls(isBn)} mb-2`} style={{ color: "var(--text-muted)" }}>
              {T.score[lang]}
            </span>
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={tone.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={targetOffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ animation: `${animName} 1.2s cubic-bezier(0.4, 0, 0.2, 1)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-black tabular-nums leading-none" style={{ color: tone.color, fontSize: "2.5rem" }}>
                  {score != null ? score.toFixed(0) : "--"}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  / 100
                </span>
              </div>
            </div>
          </div>

          <div className="text-left flex-1 w-full">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <p
                className={`font-black leading-none tracking-tight ${isBn ? "font-bn" : ""}`}
                style={{ color: tone.color, fontSize: "clamp(1.75rem, 5vw, 2.75rem)" }}
              >
                {word}
              </p>
              {signal && <SignalChip signal={signal.signal} strength={signal.strength} size="md" lang={lang} />}
            </div>
            {showReason && reason && (
              <p className={`text-sm sm:text-base font-semibold mt-2.5 leading-snug ${isBn ? "font-bn" : ""}`} style={{ color: "var(--text)" }}>
                {reason}
              </p>
            )}

            {/* The take — language-aware. Both blocks live in the DOM (SEO); one is hidden. */}
            <div className="mt-4">
              <p className={`${eyebrowCls(isBn)} mb-2`} style={{ color: "var(--text-muted)" }}>
                {T.take[lang]}
              </p>

              {/* English take: verdict tagline + sentences */}
              <div className={isBn ? "hidden" : "block"}>
                {tagline && (
                  <p className="text-sm sm:text-base font-semibold leading-snug" style={{ color: "var(--text)" }}>
                    {tagline}
                  </p>
                )}
                {sentences.length > 0 ? (
                  <ul className="mt-2.5 space-y-1.5">
                    {sentences.map((line, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] sm:text-sm leading-snug" style={{ color: "var(--text)" }}>
                        <span aria-hidden className="mt-[6px] h-1.5 w-1.5 rounded-full shrink-0" style={{ background: tone.color }} />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : !tagline ? (
                  <p className="text-[15px] sm:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {T.generic.en}
                  </p>
                ) : null}
              </div>

              {/* Bengali take: cached এক নজরে prose (falls back to a generic line) */}
              <div className={`font-bn ${isBn ? "block" : "hidden"}`} lang="bn">
                {bnParas.length > 0 ? (
                  <>
                    <div className="space-y-3 leading-relaxed" style={{ color: "var(--text)" }}>
                      {bnParas.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                    <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
                      {T.eduNote.bn}
                    </p>
                  </>
                ) : (
                  <p className="text-[15px] sm:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {T.generic.bn}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* In-depth analysis hook — distinct premium panel → full report sub-page */}
        {hasDeep && (
          <div
            className="mt-6 rounded-2xl overflow-hidden"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, var(--primary), var(--accent, var(--primary)))" }} />
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <span aria-hidden className="text-base">📊</span>
                <span className={eyebrowCls(isBn)} style={{ color: "var(--primary)" }}>
                  {T.deepEyebrow[lang]}
                </span>
              </div>
              <div className={isBn ? "font-bn" : ""} lang={isBn ? "bn" : undefined}>
                <h3 className="text-base sm:text-xl font-bold leading-snug mb-1.5" style={{ color: "var(--text)" }}>
                  {deepHeadline}
                </h3>
                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--text-muted)" }}>
                  {deepBottom}
                </p>
              </div>
              <Link
                href={`/stock/${code}/analysis`}
                className={`inline-flex items-center gap-1.5 mt-4 rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${isBn ? "font-bn" : ""}`}
                style={{ background: "var(--primary)", color: "#fff" }}
              >
                {T.deepCta[lang]}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        )}

        {/* Footer watermark — for shared screenshots */}
        <div
          className="mt-5 pt-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span style={{ color: "var(--text-muted)" }}>topstockbd.com</span>
          <span style={{ color: "var(--text-muted)" }}>DSE Stock Analysis</span>
        </div>
      </div>
    </section>
  );
}
