"use client";

export interface StatCard {
  label: string;
  value: number;
  hint?: string;
  accent?: string;
}

export default function StatCards({ cards }: { cards: StatCard[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center"
        >
          <p className="text-2xl font-bold tabular-nums" style={{ color: c.accent ?? "var(--text)" }}>
            {c.value}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1 leading-tight">{c.label}</p>
        </div>
      ))}
    </div>
  );
}
