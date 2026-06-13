"use client";

import Card from "@/components/ui/Card";

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
        <Card key={c.label} padding="none" className="rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums nums" style={{ color: c.accent ?? "var(--text)" }}>
            {c.value}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1 leading-tight">{c.label}</p>
        </Card>
      ))}
    </div>
  );
}
