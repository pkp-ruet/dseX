"use client";
import { useState } from "react";
import { pillarHealthCheck, HEALTH_PILLAR_ORDER, type HealthCheckRow, type HealthStatus } from "@/lib/plain-language";

interface Props {
  scoreRow: Record<string, number | string | boolean | null>;
}

const STATUS_TONE: Record<HealthStatus, { color: string; bg: string; border: string; icon: string }> = {
  strong: { color: "var(--positive)", bg: "rgba(21,128,61,0.08)",  border: "rgba(21,128,61,0.25)",  icon: "✓" },
  fair:   { color: "var(--watch)",    bg: "rgba(180,83,9,0.07)",   border: "rgba(180,83,9,0.2)",    icon: "•" },
  weak:   { color: "var(--negative)", bg: "rgba(220,38,38,0.07)",  border: "rgba(220,38,38,0.22)",  icon: "⚠" },
};

export default function HealthCheck({ scoreRow }: Props) {
  const rows = HEALTH_PILLAR_ORDER
    .map((key) => pillarHealthCheck(key, scoreRow[key] as number | null))
    .filter((r): r is HealthCheckRow => r != null);

  if (rows.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        The Health Check
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        Five quick checks that tell you whether this company is healthy, fairly priced, and worth holding.
      </p>

      <div className="space-y-2.5">
        {rows.map((row) => (
          <HealthRow key={row.pillarKey} row={row} />
        ))}
      </div>
    </section>
  );
}

function HealthRow({ row }: { row: HealthCheckRow }) {
  const [open, setOpen] = useState(false);
  const tone = STATUS_TONE[row.status];

  return (
    <div
      className="rounded-2xl transition-colors"
      style={{
        background: tone.bg,
        border: `1px solid ${tone.border}`,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center gap-4 p-4 sm:p-5"
        aria-expanded={open}
      >
        <div
          className="shrink-0 flex items-center justify-center rounded-full"
          style={{
            width: 44, height: 44,
            background: tone.bg,
            border: `1.5px solid ${tone.border}`,
            color: tone.color,
            fontSize: 22, fontWeight: 800,
          }}
          aria-hidden="true"
        >
          {tone.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base sm:text-lg font-bold leading-tight" style={{ color: "var(--text)" }}>
            {row.headline}
          </p>
          <p className="text-sm leading-snug mt-0.5" style={{ color: "var(--text-muted)" }}>
            {row.oneLine}
          </p>
        </div>
        <span
          className="shrink-0 transition-transform text-lg"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          <div
            className="rounded-xl p-4 text-sm leading-relaxed"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
          >
            {row.learnMore}
          </div>
        </div>
      )}
    </div>
  );
}
