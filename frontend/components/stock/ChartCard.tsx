import type { ReactNode } from "react";

/** Shared chart wrapper card — title/subtitle header, optional pill, chart, optional caption. */
export default function ChartCard({
  title, subtitle, caption, pill, children,
}: {
  title: string;
  subtitle?: string;
  caption?: string | null;
  pill?: string | null;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3 mb-1">
        <p className="text-base font-bold" style={{ color: "var(--text)" }}>{title}</p>
        {subtitle && (
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
        )}
      </div>
      {pill && (
        <p
          className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full mt-2 mb-1"
          style={{
            background: "rgba(21,128,61,0.1)",
            color: "var(--positive)",
            border: "1px solid rgba(21,128,61,0.3)",
          }}
        >
          📢 {pill}
        </p>
      )}
      <div className="mt-3">{children}</div>
      {caption && (
        <p className="text-sm mt-3 leading-snug" style={{ color: "var(--text-muted)" }}>
          {caption}
        </p>
      )}
    </div>
  );
}
