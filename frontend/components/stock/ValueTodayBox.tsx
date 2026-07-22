import type { FairValue } from "@/lib/api";
import type { Lang } from "@/components/stock/LangToggle";

interface Props {
  fairValue: FairValue | null | undefined;
  lang?: Lang;
  className?: string;
}

const T = {
  title: { en: "Value today", bn: "আজকের মূল্য" },
  today: { en: "Today", bn: "আজ" },
  estimate: { en: "Rough estimate", bn: "আনুমানিক মূল্য" },
  range: { en: "Fair range", bn: "ন্যায্য সীমা" },
  based: { en: "How we judge it", bn: "যেভাবে বিচার করি" },
  note: {
    en: "A rough, educational estimate from the figures we have — not a price target or advice.",
    bn: "আমাদের কাছে থাকা তথ্য থেকে একটি আনুমানিক, শিক্ষামূলক ধারণা — কোনো দামের লক্ষ্য বা পরামর্শ নয়।",
  },
  conf: {
    en: { low: "low confidence", medium: "medium confidence", high: "high confidence" },
    bn: { low: "কম আস্থা", medium: "মাঝারি আস্থা", high: "উচ্চ আস্থা" },
  },
  stance: {
    en: { cheap: "Looks cheap", fair: "Around fair value", expensive: "Looks pricey", none: "Not enough to say" },
    bn: { cheap: "সস্তা মনে হচ্ছে", fair: "মোটামুটি ন্যায্য দাম", expensive: "দামি মনে হচ্ছে", none: "বলার মতো যথেষ্ট নয়" },
  },
} as const;

function stanceColor(stance: string | null | undefined): string {
  if (stance === "cheap") return "var(--positive)";
  if (stance === "expensive") return "var(--negative)";
  if (stance === "fair") return "var(--primary)";
  return "var(--text-muted)";
}

function money(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "--";
  const abs = Math.abs(v);
  if (abs >= 100) return `৳${Math.round(v).toLocaleString("en-US")}`;
  if (abs >= 10) return `৳${v.toFixed(1)}`;
  return `৳${v.toFixed(2)}`;
}

export default function ValueTodayBox({ fairValue, lang = "en", className = "" }: Props) {
  if (!fairValue || fairValue.center == null) return null;
  const { low, high, center, today, stance, confidence, methods, basis_en, basis_bn } = fairValue;
  const isBn = lang === "bn";
  const color = stanceColor(stance);
  const stanceLabel = T.stance[lang][(stance ?? "none") as keyof typeof T.stance.en];
  const basis = isBn ? basis_bn : basis_en;

  // Range bar geometry — widen the domain so an outside-the-band "today" marker
  // (cheap = below low, pricey = above high) still shows within the track.
  const haveBand = low != null && high != null && high > low;
  let bandLeft = 0, bandWidth = 0, todayPos: number | null = null;
  if (haveBand) {
    const anchors = [low as number, high as number];
    if (today != null) anchors.push(today);
    const rawMin = Math.min(...anchors);
    const rawMax = Math.max(...anchors);
    const padPx = (rawMax - rawMin) * 0.08 || (center as number) * 0.05;
    const domMin = rawMin - padPx;
    const domMax = rawMax + padPx;
    const span = domMax - domMin || 1;
    const pos = (v: number) => ((v - domMin) / span) * 100;
    bandLeft = pos(low as number);
    bandWidth = pos(high as number) - bandLeft;
    if (today != null) todayPos = pos(today);
  }

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 ${isBn ? "font-bn" : ""} ${className}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-soft)" }}
      lang={isBn ? "bn" : undefined}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--text-muted)" }}>
          {T.title[lang]}
        </p>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
          style={{ background: color, color: "#fff" }}
        >
          {stanceLabel}
        </span>
      </div>

      {/* Headline figures: today's price + our rough estimate */}
      <div className="flex items-end gap-5 mb-4">
        {today != null && (
          <div>
            <p className="text-[11px] mb-0.5" style={{ color: "var(--text-muted)" }}>{T.today[lang]}</p>
            <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: "var(--text)" }}>
              {money(today)}
            </p>
          </div>
        )}
        <div>
          <p className="text-[11px] mb-0.5" style={{ color: "var(--text-muted)" }}>{T.estimate[lang]}</p>
          <p className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>
            {money(center)}
          </p>
        </div>
      </div>

      {/* Range bar */}
      {haveBand && (
        <div className="mb-4">
          <div className="relative h-2.5 rounded-full" style={{ background: "var(--surface-2)" }}>
            <div
              className="absolute top-0 h-2.5 rounded-full"
              style={{ left: `${bandLeft}%`, width: `${bandWidth}%`, background: color, opacity: 0.28 }}
            />
            {todayPos != null && (
              <div
                className="absolute -top-1 h-4.5 w-[3px] rounded-full"
                style={{ left: `calc(${Math.max(0, Math.min(100, todayPos))}% - 1.5px)`, height: "1.125rem", background: "var(--text)" }}
                aria-hidden
              />
            )}
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
            <span>{money(low)}</span>
            <span>{T.range[lang]}</span>
            <span>{money(high)}</span>
          </div>
        </div>
      )}

      {/* Basis + confidence */}
      {basis && (
        <p className="text-xs leading-snug mb-2" style={{ color: "var(--text-muted)" }}>
          {basis}
          {confidence && (
            <> · {T.conf[lang][confidence]}</>
          )}
        </p>
      )}

      {/* Methods used */}
      {methods && methods.length > 0 && (
        <ul className="space-y-1 mb-3">
          {methods.map((m) => (
            <li key={m.name} className="flex items-center justify-between gap-3 text-xs">
              <span style={{ color: "var(--text-muted)" }}>{isBn ? m.label_bn : m.label_en}</span>
              <span className="tabular-nums font-semibold shrink-0" style={{ color: "var(--text)" }}>{money(m.price)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
        {T.note[lang]}
      </p>
    </div>
  );
}
