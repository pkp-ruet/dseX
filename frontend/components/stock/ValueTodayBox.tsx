"use client";
import type { ReactNode } from "react";
import type { FairValue } from "@/lib/api";
import type { Lang } from "@/lib/lang";
import { useLang } from "@/context/LangContext";
import PremiumGate from "@/components/premium/PremiumGate";
import { T } from "@/components/i18n/T";

interface Props {
  fairValue: FairValue | null | undefined;
  /** Ignored — the box follows the page language (`<T>`). Kept so old callers compile. */
  lang?: Lang;
  /** false = no lock of its own (the stock page's full verdict masks the whole answer). */
  gated?: boolean;
  className?: string;
}

const STANCE: Record<string, { en: string; bn: string }> = {
  cheap: { en: "Price looks low", bn: "দাম কম মনে হচ্ছে" },
  fair: { en: "Close to a fair price", bn: "ন্যায্য দামের কাছাকাছি" },
  expensive: { en: "Price looks high", bn: "দাম বেশি মনে হচ্ছে" },
  none: { en: "Not enough information", bn: "যথেষ্ট তথ্য নেই" },
};

const CONF: Record<"low" | "medium" | "high", { en: string; bn: string }> = {
  low: { en: "low confidence", bn: "আস্থা কম" },
  medium: { en: "medium confidence", bn: "আস্থা মাঝারি" },
  high: { en: "high confidence", bn: "আস্থা বেশি" },
};

function Gate({ on, label, children }: { on: boolean; label: { en: string; bn: string }; children: ReactNode }) {
  return on ? <PremiumGate label={label} preview="blur">{children}</PremiumGate> : <>{children}</>;
}

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

export default function ValueTodayBox({ fairValue, gated = true, className = "" }: Props) {
  const { bn } = useLang();
  if (!fairValue || fairValue.center == null) return null;
  const { low, high, center, today, stance, confidence, methods, basis_en, basis_bn } = fairValue;
  // The badge is the page's one verdict; when the rough estimate points the other
  // way, printing it beside the badge would contradict it — show the yardsticks only.
  const disagree = fairValue.estimates_disagree === true;
  const color = stanceColor(stance);
  const stanceLabel = STANCE[stance ?? "none"] ?? STANCE.none;

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
      className={`rounded-2xl p-4 sm:p-5 ${className}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-soft)" }}
    >
      <p className="text-xs font-semibold mb-3 text-text-muted">
        <T en="Fair price today" bn="আজকের ন্যায্য দাম" />
      </p>

      {/* Everything below the title is Premium (screen-only lock, blurred preview). */}
      <Gate on={gated} label={{ en: "The fair price estimate", bn: "ন্যায্য দামের হিসাব" }}>
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold mb-3 text-surface"
        style={{ background: color }}
      >
        <T en={stanceLabel.en} bn={stanceLabel.bn} />
      </span>

      {/* Headline figures: today's price + our rough estimate */}
      <div className="flex items-end gap-5 mb-4">
        {today != null && (
          <div>
            <p className="text-xs mb-0.5 text-text-muted">
              <T en="Price today" bn="আজকের দাম" />
            </p>
            <p className="text-2xl font-bold tabular-nums leading-none text-text-main">{money(today)}</p>
          </div>
        )}
        {!disagree && (
          <div>
            <p className="text-xs mb-0.5 text-text-muted">
              <T en="Our estimate" bn="আমাদের হিসাব" />
            </p>
            <p className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>
              {money(center)}
            </p>
          </div>
        )}
      </div>

      {disagree && (
        <p className="text-sm leading-snug mb-3 text-text-muted">
          <T
            en="Our measures point in different directions here, so we do not show a single estimate. The verdict above is the one used across this page. Each measure is listed below on its own."
            bn="এখানে আমাদের মাপকাঠিগুলো ভিন্ন দিকে ইঙ্গিত দিচ্ছে, তাই একটি হিসাব দেখাচ্ছি না। ওপরের মূল্যায়নটিই পুরো পেজে ব্যবহার হয়। নিচে প্রতিটি মাপকাঠির হিসাব আলাদা করে দেওয়া হলো।"
          />
        </p>
      )}

      {/* Range bar */}
      {haveBand && !disagree && (
        <div className="mb-4">
          <div className="relative h-2.5 rounded-full bg-surface-2">
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
          <div className="flex justify-between mt-1.5 text-xs tabular-nums text-text-muted">
            <span>{money(low)}</span>
            <span>
              <T en="Fair range" bn="ন্যায্য দামের সীমা" />
            </span>
            <span>{money(high)}</span>
          </div>
        </div>
      )}

      {/* Basis + confidence */}
      {(basis_en || basis_bn) && (
        <p className="text-xs leading-snug mb-2 text-text-muted">
          <T
            en={`${basis_en ?? basis_bn}${confidence ? ` · ${CONF[confidence].en}` : ""}`}
            bn={`${basis_bn ?? basis_en}${confidence ? ` · ${CONF[confidence].bn}` : ""}`}
          />
        </p>
      )}

      {/* Methods used */}
      {methods && methods.length > 0 && (
        <ul className="space-y-1 mb-3">
          {methods.map((m) => (
            <li key={m.name} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-text-muted">
                <T en={m.label_en} bn={m.label_bn} />
              </span>
              <span className="tabular-nums font-semibold shrink-0 text-text-main">{money(m.price)}</span>
            </li>
          ))}
        </ul>
      )}

      </Gate>

      <p className="text-xs leading-snug mt-3 text-text-muted">
        <T
          en="This is a rough estimate from the figures we have, to help you understand the price. It is not a price target or advice."
          bn="আমাদের কাছে থাকা তথ্য থেকে করা একটি আনুমানিক হিসাব, দাম বুঝতে সাহায্য করার জন্য। এটি দামের লক্ষ্য বা পরামর্শ নয়।"
        />
      </p>
    </div>
  );
}
