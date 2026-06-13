import type { ReactNode } from "react";
import Card from "@/components/ui/Card";

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
    <Card padding="none" className="rounded-2xl p-5">
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
            background: "color-mix(in srgb, var(--positive) 10%, transparent)",
            color: "var(--positive)",
            border: "1px solid color-mix(in srgb, var(--positive) 30%, transparent)",
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
    </Card>
  );
}
