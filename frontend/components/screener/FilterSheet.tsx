"use client";

import { useEffect, useMemo, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { IconCheck, IconCrown } from "@/components/ui/icons";
import type { ScreenerFilter, ScreenerFilterDef } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { countWith, fmt, histogram, typical, type ScreenerRow } from "@/lib/screener";

const toStr = (n: number | null | undefined) => (n == null ? "" : String(n));
const toNum = (s: string): number | null => {
  const t = s.trim().replace(/,/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** What the from / to boxes count in, after the number. */
const UNIT_HINT: Record<string, { en: string; bn: string }> = {
  taka: { en: "৳", bn: "৳" },
  pct: { en: "%", bn: "%" },
  crore: { en: "৳ crore", bn: "৳ কোটি" },
  lakh: { en: "৳ lakh", bn: "৳ লাখ" },
  paid: { en: "years", bn: "বছর" },
  x: { en: "", bn: "" },
};

/**
 * One filter's sheet: what the figure means (its market word small), where
 * most DSE shares sit on it, a bar chart of the whole market with the chosen
 * range lit, ready-made ranges with a live count each, and your own from / to.
 * A set filter (sector, category, our grade …) is a list of choices with a
 * count each. Every count is "with your other filters", so nobody taps into 0.
 * TopStockBD's view filters work for everyone — the count is free — and say
 * up front that which shares pass is Premium.
 */
export default function FilterSheet({
  def,
  current,
  filters,
  rows,
  locked,
  onApply,
  onClose,
  t,
}: {
  def: ScreenerFilterDef | null;
  /** The filter as it stands on the screen, null when it is being added. */
  current: ScreenerFilter | null;
  /** Every filter on the screen. */
  filters: ScreenerFilter[];
  rows: ScreenerRow[];
  /** A view filter for a free reader. */
  locked: boolean;
  onApply: (f: ScreenerFilter | null) => void;
  onClose: () => void;
  t: (en: string, bn: string) => string;
}) {
  const { bn } = useLang();
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  // A fresh draft every time the sheet opens on a filter.
  useEffect(() => {
    if (!def) return;
    setMin(toStr(current?.min));
    setMax(toStr(current?.max));
    setPicked(current?.in ?? []);
  }, [def, current]);

  const key = def?.key ?? "";
  const draft: ScreenerFilter | null = useMemo(() => {
    if (!def) return null;
    if (def.kind === "set") return picked.length ? { key, in: picked } : null;
    let lo = toNum(min), hi = toNum(max);
    if (lo == null && hi == null) return null;
    if (lo != null && hi != null && lo > hi) [lo, hi] = [hi, lo];
    return { key, ...(lo != null ? { min: lo } : {}), ...(hi != null ? { max: hi } : {}) };
  }, [def, key, min, max, picked]);

  const count = useMemo(() => (def ? countWith(rows, filters, key, draft) : 0), [def, rows, filters, key, draft]);
  const mid = useMemo(() => (def?.kind === "range" ? typical(rows, key) : null), [def, rows, key]);
  const bars = useMemo(() => (def?.kind === "range" && def.unit !== "paid" ? histogram(rows, key) : null), [def, rows, key]);

  if (!def) return null;
  const f = (v: number) => fmt(v, def.unit, def.decimals, bn);
  const unit = UNIT_HINT[def.unit] ?? UNIT_HINT.x;
  const lo = draft?.min ?? null, hi = draft?.max ?? null;
  const setOrder = (v: string) =>
    def.options.map((o) => o.value).filter((x) => x === v || picked.includes(x));

  return (
    <Sheet
      open
      onClose={onClose}
      title={
        <span>
          {t(def.name_en, def.name_bn)}
          {def.term && <span className="ml-1.5 text-sm font-normal text-text-muted">({def.term})</span>}
        </span>
      }
      footer={
        <div className="flex w-full gap-2">
          {current && (
            <Button variant="quiet" onClick={() => onApply(null)}>
              {t("Remove", "বাদ দিন")}
            </Button>
          )}
          <Button variant="primary" className="flex-1" disabled={!draft} onClick={() => onApply(draft)}>
            {draft
              ? t(`Show ${count} ${count === 1 ? "share" : "shares"}`, `${count}টি শেয়ার দেখুন`)
              : def.kind === "set" ? t("Pick at least one", "অন্তত একটি বাছুন") : t("Choose a range", "একটি সীমা বাছুন")}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {locked && (
          <p className="scr-view-note">
            <IconCrown size={16} />
            <span>
              {t("This is TopStockBD's view, part of Premium. You see how many shares pass; which ones they are, with Premium.",
                 "এটি টপস্টকবিডির মত, প্রিমিয়ামের অংশ। কতগুলো শেয়ার মেলে তা দেখবেন; কোনগুলো, তা প্রিমিয়ামে।")}
            </span>
          </p>
        )}
        <p className="text-sm text-text-main">{t(def.help_en, def.help_bn)}</p>

        {def.kind === "range" ? (
          <>
            {mid && (
              <div>
                <p className="text-sm text-text-main">
                  {t(`Most DSE shares: ${f(mid.lo)} to ${f(mid.hi)}. The middle one: ${f(mid.mid)}.`,
                     `বেশিরভাগ ডিএসই শেয়ার: ${f(mid.lo)} থেকে ${f(mid.hi)}। ঠিক মাঝেরটি: ${f(mid.mid)}।`)}
                </p>
                {bars && (
                  <div className="scr-hist" aria-hidden>
                    {bars.counts.map((n, i) => {
                      const step = (bars.hi - bars.lo) / bars.counts.length;
                      const a = bars.lo + i * step, b = a + step;
                      const on = draft != null && (lo == null || b > lo) && (hi == null || a <= hi);
                      const top = Math.max(...bars.counts) || 1;
                      return (
                        <span
                          key={i}
                          className={on ? "scr-hist-bar is-on" : "scr-hist-bar"}
                          style={{ height: `${Math.max(4, (n / top) * 100)}%` }}
                        />
                      );
                    })}
                  </div>
                )}
                {bars && (
                  <div className="mt-1 flex justify-between text-xs text-text-muted tabular-nums">
                    <span>{f(bars.lo)}</span>
                    <span>{f(bars.hi)}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold text-text-main">{t("Pick a range", "একটি সীমা বাছুন")}</p>
              <div className="flex flex-wrap gap-2">
                {def.presets.map((p) => {
                  const on = lo === p.min && hi === p.max;
                  const n = countWith(rows, filters, key, { key, ...(p.min != null ? { min: p.min } : {}), ...(p.max != null ? { max: p.max } : {}) });
                  return (
                    <button
                      key={p.en}
                      type="button"
                      aria-pressed={on}
                      onClick={() => { setMin(toStr(p.min)); setMax(toStr(p.max)); }}
                      className={`scr-preset${on ? " is-on" : ""}`}
                    >
                      <span>{t(p.en, p.bn)}</span>
                      <span className={`scr-preset-n${n === 0 ? " is-zero" : ""}`}>{n}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-text-main">{t("Or set your own", "অথবা নিজে ঠিক করুন")}</p>
              <div className="grid grid-cols-2 gap-3">
                <label htmlFor="scr-min" className="block">
                  <span className="mb-1 block text-xs font-semibold text-text-muted">
                    {t("From", "থেকে")}{unit.en && ` (${t(unit.en, unit.bn)})`}
                  </span>
                  <input
                    id="scr-min"
                    className="input-field tabular-nums"
                    inputMode="decimal"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    placeholder={t("No lower limit", "নিচের সীমা নেই")}
                  />
                </label>
                <label htmlFor="scr-max" className="block">
                  <span className="mb-1 block text-xs font-semibold text-text-muted">
                    {t("To", "পর্যন্ত")}{unit.en && ` (${t(unit.en, unit.bn)})`}
                  </span>
                  <input
                    id="scr-max"
                    className="input-field tabular-nums"
                    inputMode="decimal"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                    placeholder={t("No upper limit", "ওপরের সীমা নেই")}
                  />
                </label>
              </div>
              {def.key === "pe" && (
                <p className="mt-2 text-xs text-text-muted">
                  {t("Companies with a loss have no P/E, so they are left out while this filter is on.",
                     "লোকসানি কোম্পানির পিই নেই, তাই এই ফিল্টার চালু থাকলে সেগুলো বাদ থাকে।")}
                </p>
              )}
            </div>
          </>
        ) : (
          <ul className="divide-y divide-border">
            {def.options.map((o) => {
              const on = picked.includes(o.value);
              const n = countWith(rows, filters, key, { key, in: [o.value] });
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => setPicked(on ? picked.filter((x) => x !== o.value) : setOrder(o.value))}
                    className="flex min-h-12 w-full items-center gap-3 py-2 text-left active:bg-surface-2"
                  >
                    <span className={`scr-check${on ? " is-on" : ""}`} aria-hidden>{on && <IconCheck size={14} />}</span>
                    <span className={`flex-1 text-base text-text-main ${on ? "font-semibold" : ""}`}>{t(o.en, o.bn)}</span>
                    <span className={`text-sm tabular-nums ${n === 0 ? "text-negative" : "text-text-muted"}`}>{n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
