"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGetAdminSurvey, type AdminSurveyResponse, type AdminSurveyText } from "@/lib/api";
import { LABELS, priceLabel, questionText } from "@/lib/survey";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { isAfter } from "@/components/admin/FeedbackUnseen";

/**
 * The admin Survey tab (/admin/feedback#survey, 2026-11-24): the reader
 * survey's funnel, the price picture, the renewal answers, every question's
 * split by plan, the written answers and a CSV. Names and emails only for
 * readers who agreed to be contacted. Data: GET /api/admin/survey.
 */

const SEGS = ["free", "premium", "ending", "ended"] as const;
const SEG_NAME: Record<string, string> = { free: "Free", premium: "Premium", ending: "Premium ending ≤14 days", ended: "Premium ended" };
const SEG_SHORT: Record<string, string> = { free: "Free", premium: "Premium", ending: "Ending", ended: "Ended" };
const STATE_PLACEHOLDER = { segment: "ending" as const, ends_on: null, ended_on: null };

/** The questions in survey order, with their parts. */
const ORDER: { part: string; ids: string[] }[] = [
  { part: "About you", ids: ["years"] },
  { part: "Experience", ids: ["miss", "use", "problems"] },
  { part: "Premium · free readers", ids: ["thought", "worth_for"] },
  { part: "Premium · members", ids: ["worth", "continue", "next_plan", "stay"] },
  { part: "Premium · ended", ids: ["ended_why", "back"] },
  { part: "Price", ids: ["spend_on", "spend_amount", "price_good", "price_high"] },
];

function choiceName(qid: string, key: string | number): string {
  if (qid === "price_good" || qid === "price_high") return priceLabel(Number(key)).en;
  return LABELS[qid]?.[String(key)]?.en ?? String(key);
}

function fmtDay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Dhaka" });
}

function pct(v: number | null | undefined): string {
  return v == null ? "—" : `${Math.round(v)}%`;
}

function Bar({ value, tone = "primary" }: { value: number | null; tone?: "primary" | "negative" | "positive" }) {
  const cls = tone === "negative" ? "bg-negative" : tone === "positive" ? "bg-positive" : "bg-primary";
  return (
    <span className="block h-2 w-full rounded-full bg-surface-2 overflow-hidden">
      <span className={`block h-full rounded-full ${cls}`} style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    </span>
  );
}

function toCsv(columns: string[], rows: Record<string, string | number | boolean>[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n");
}

export default function AdminSurvey({ newSince = null }: { newSince?: string | null }) {
  const [data, setData] = useState<AdminSurveyResponse | null>(null);
  const [error, setError] = useState("");
  const [textSeg, setTextSeg] = useState<string>("all");

  const load = useCallback(() => {
    setError("");
    apiGetAdminSurvey()
      .then(setData)
      .catch((e: Error) => setError(e?.message ?? "Failed to load"));
  }, []);

  useEffect(load, [load]);

  const texts: AdminSurveyText[] = useMemo(
    () => (data?.texts ?? []).filter((t) => textSeg === "all" || t.segment === textSeg),
    [data, textSeg],
  );

  // Answers finished since this admin last opened the tab (marked "New").
  const newFinished = useMemo(
    () => (newSince && data ? data.rows.filter((r) => isAfter(String(r.finished || ""), newSince)).length : 0),
    [data, newSince],
  );

  function downloadCsv() {
    if (!data) return;
    const blob = new Blob(["﻿" + toCsv(data.columns, data.rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `survey-${data.round}.csv`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  if (error) {
    return <p className="text-sm text-negative py-6">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-text-muted py-10 text-center">Loading…</p>;
  }

  const f = data.funnel;
  const p = data.price;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          Round {data.round} · Premium ending and ended first · everyone from {fmtDay(data.everyone_from)} ·
          the pop-up stops after {fmtDay(data.closes_on)}
          {newFinished > 0 && (
            <span className="block text-text-main">
              <span className="font-semibold">{newFinished} new</span> finished since you last looked.
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="quiet" size="sm" onClick={load}>Reload</Button>
          <Button type="button" variant="quiet" size="sm" onClick={downloadCsv} disabled={!data.rows.length}>
            Download CSV
          </Button>
        </div>
      </div>

      {/* Funnel */}
      <Card as="section" padding="none" className="rounded-xl p-4 sm:p-5">
        <h2 className="text-base font-semibold text-text-main mb-3">Who answered</h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            ["Shown", f.shown],
            ["Started", f.started],
            ["Finished", f.finished],
          ].map(([label, n]) => (
            <div key={label as string}>
              <p className="text-2xl font-bold text-text-main nums">{n as number}</p>
              <p className="text-xs text-text-muted">{label as string}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-muted text-left">
                <th className="py-1 pr-3 font-normal">Reader</th>
                <th className="py-1 pr-3 font-normal text-right">Shown</th>
                <th className="py-1 pr-3 font-normal text-right">Started</th>
                <th className="py-1 font-normal text-right">Finished</th>
              </tr>
            </thead>
            <tbody>
              {SEGS.map((s) => (
                <tr key={s} className="border-t border-border">
                  <td className="py-1.5 pr-3 text-text-main">{SEG_NAME[s]}</td>
                  <td className="py-1.5 pr-3 text-right nums">{f.by[s]?.shown ?? 0}</td>
                  <td className="py-1.5 pr-3 text-right nums">{f.by[s]?.started ?? 0}</td>
                  <td className="py-1.5 text-right nums">{f.by[s]?.finished ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {Object.keys(data.stops).length > 0 && (
          <p className="text-xs text-text-muted mt-3">
            Stopped before finishing, by the last screen reached:{" "}
            {Object.entries(data.stops).map(([s, n]) => `screen ${s}: ${n}`).join(" · ")}
          </p>
        )}
        <p className="text-sm text-text-main mt-3">
          Would be <span className="font-semibold">very disappointed</span> if TopStockBD closed:{" "}
          <span className="font-semibold nums">{pct(data.very_disappointed_pct)}</span>
          <span className="text-text-muted"> of {data.questions.miss?.n ?? 0} who answered</span>
        </p>
      </Card>

      {/* Price */}
      <Card as="section" padding="none" className="rounded-xl p-4 sm:p-5">
        <h2 className="text-base font-semibold text-text-main">What it is worth a month</h2>
        <p className="text-xs text-text-muted mt-1 mb-3">
          At each price: the share who still call it good value, and the share for whom it is too much. Where both are
          low, most readers are comfortable. Read it next to who actually paid and renewed.
        </p>
        <div className="flex flex-col gap-2">
          {p.rows.map((r) => (
            <div key={r.price} className="grid grid-cols-[4.5rem_1fr_1fr] items-center gap-3 text-sm">
              <span className="text-text-main nums">{priceLabel(r.price).en}</span>
              <span className="flex items-center gap-2">
                <Bar value={r.good_pct} tone="positive" />
                <span className="w-10 text-right text-xs text-text-muted nums">{pct(r.good_pct)}</span>
              </span>
              <span className="flex items-center gap-2">
                <Bar value={r.too_pct} tone="negative" />
                <span className="w-10 text-right text-xs text-text-muted nums">{pct(r.too_pct)}</span>
              </span>
            </div>
          ))}
          <div className="grid grid-cols-[4.5rem_1fr_1fr] gap-3 text-xs text-text-muted">
            <span />
            <span>Good value at this price or more ({p.n_good})</span>
            <span>Too much at this price or less ({p.n_high})</span>
          </div>
        </div>
        <p className="text-sm text-text-main mt-3">
          Middle answer: good value at {p.good_mid != null ? priceLabel(p.good_mid).en : "—"}, too much at{" "}
          {p.high_mid != null ? priceLabel(p.high_mid).en : "—"}. {p.wont_pay} wouldn&apos;t pay at all.
        </p>
        <p className="text-xs text-text-muted mt-1">
          {SEGS.map((s) => {
            const b = p.by_segment[s];
            if (!b || !b.n) return null;
            return `${SEG_SHORT[s]}: good ${b.good_mid != null ? priceLabel(b.good_mid).en : "—"}, too much ${b.high_mid != null ? priceLabel(b.high_mid).en : "—"} (${b.n})`;
          }).filter(Boolean).join(" · ")}
        </p>
      </Card>

      {/* Renewals */}
      <Card as="section" padding="none" className="rounded-xl p-4 sm:p-5">
        <h2 className="text-base font-semibold text-text-main">Will they continue?</h2>
        <p className="text-xs text-text-muted mt-1 mb-3">
          {data.said_yes} said yes or probably; {data.said_yes_renewed} of them have renewed since. Names only for readers
          who agreed to be contacted.
        </p>
        {data.renew.length === 0 ? (
          <p className="text-sm text-text-muted">No answers yet.</p>
        ) : (
          <div className="flex flex-col">
            {data.renew.map((r, i) => (
              <div key={i} className="border-t border-border py-2.5 flex flex-col gap-0.5 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="font-semibold text-text-main">
                    {r.continue ? LABELS.continue[r.continue]?.en : r.ended_why ? LABELS.ended_why[r.ended_why]?.en : "—"}
                  </span>
                  <span className="text-xs text-text-muted">
                    {SEG_SHORT[r.segment] ?? r.segment} · {r.segment === "ended" ? "ended" : "ends"} {fmtDay(r.ends_on)}
                    {r.plan ? ` · ${r.plan}` : ""}
                    {r.worth ? ` · worth it: ${LABELS.worth[r.worth]?.en}` : ""}
                  </span>
                  {r.renewed && <span className="text-xs font-semibold text-positive">Renewed</span>}
                </div>
                {(r.next_plan || r.stay.length > 0) && (
                  <span className="text-xs text-text-main">
                    {r.next_plan ? `Next plan: ${LABELS.next_plan[r.next_plan]?.en}` : ""}
                    {r.stay.length > 0
                      ? `${r.next_plan ? " · " : ""}${r.segment === "ended" ? "Would come back for" : "Would stay for"}: ${r.stay
                          .map((k) => (r.segment === "ended" ? LABELS.back : LABELS.stay)[k]?.en ?? k)
                          .join(", ")}`
                      : ""}
                  </span>
                )}
                {r.contact && (
                  <span className="text-xs text-text-muted">
                    {[r.name, r.email, r.phone].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Every question */}
      {ORDER.map((group) => (
        <section key={group.part} className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-text-main">{group.part}</h2>
          {group.ids.map((qid) => {
            const q = data.questions[qid];
            if (!q) return null;
            return (
              <Card key={qid} padding="none" className="rounded-xl p-4">
                <p className="text-sm font-semibold text-text-main">{questionText(qid, STATE_PLACEHOLDER).en}</p>
                <p className="text-xs text-text-muted mb-2">
                  {q.n} answered
                  {q.n > 0 && ` · ${SEGS.filter((s) => q.n_by[s]).map((s) => `${SEG_SHORT[s]} ${q.n_by[s]}`).join(", ")}`}
                </p>
                {q.n > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {q.choices.map((c) => (
                      <div key={String(c.key)} className="grid grid-cols-[minmax(0,12rem)_1fr_3rem] items-center gap-3 text-sm">
                        <span className="text-text-main truncate" title={choiceName(qid, c.key)}>{choiceName(qid, c.key)}</span>
                        <Bar value={c.pct} />
                        <span className="text-right text-xs text-text-muted nums" title={SEGS.filter((s) => c.by[s]).map((s) => `${SEG_SHORT[s]} ${c.by[s]}`).join(", ")}>
                          {c.n}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </section>
      ))}

      {/* Written answers */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text-main">In their own words ({texts.length})</h2>
          <div className="flex flex-wrap gap-1.5">
            {["all", ...SEGS].map((s) => (
              <Button key={s} type="button" variant="tab" size="sm" active={textSeg === s} onClick={() => setTextSeg(s)}>
                {s === "all" ? "All" : SEG_SHORT[s]}
              </Button>
            ))}
          </div>
        </div>
        {texts.length === 0 ? (
          <p className="text-sm text-text-muted">Nothing written yet.</p>
        ) : (
          texts.map((t, i) => (
            <Card key={i} padding="none" className="rounded-xl px-4 py-3 flex flex-col gap-1.5">
              <p className="text-xs text-text-muted">
                {newSince && isAfter(t.at, newSince) && (
                  <span className="mr-2 rounded-full bg-primary px-2 font-semibold text-on-fill">New</span>
                )}
                {SEG_SHORT[t.segment] ?? t.segment}
                {t.years ? ` · buying shares ${LABELS.years[t.years]?.en.toLowerCase()}` : ""}
                {` · ${t.device?.mobile ? "phone" : "computer"}${t.device?.browser ? `, ${t.device.browser}` : ""}${t.device?.standalone ? ", installed app" : ""}`}
                {t.lang ? ` · ${t.lang === "bn" ? "Bangla" : "English"}` : ""}
                {` · ${fmtDay(t.at)}`}
              </p>
              {t.problems.length > 0 && (
                <p className="text-xs text-text-main">
                  Problems: {t.problems.map((k) => LABELS.problems[k]?.en ?? k).join(", ")}
                </p>
              )}
              {t.like_text && <p className="text-sm text-text-main whitespace-pre-wrap break-words"><span className="text-text-muted">Likes: </span>{t.like_text}</p>}
              {t.problem_text && <p className="text-sm text-text-main whitespace-pre-wrap break-words"><span className="text-text-muted">Problem: </span>{t.problem_text}</p>}
              {t.wish_text && <p className="text-sm text-text-main whitespace-pre-wrap break-words"><span className="text-text-muted">Wish: </span>{t.wish_text}</p>}
              {t.contact && (
                <p className="text-xs text-text-muted">{[t.name, t.email, t.phone].filter(Boolean).join(" · ")}</p>
              )}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
