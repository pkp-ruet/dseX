interface Stat {
  value: string;
  label: string;
}

export default function DataScaleStats({ totalCount, sectorCount }: { totalCount: number; sectorCount: number }) {
  const stats: Stat[] = [
    { value: `${totalCount}+`, label: "Stocks scored" },
    { value: "5", label: "Fundamental pillars" },
    { value: sectorCount > 0 ? `${sectorCount}` : "All", label: "DSE sectors covered" },
    { value: "Daily", label: "Data updates" },
  ];

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_4px_16px_rgba(15,23,42,0.05)] px-4 sm:px-6 py-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-2xl sm:text-3xl font-extrabold tabular-nums text-[var(--primary)] leading-none">
              {s.value}
            </div>
            <div className="mt-1.5 text-[0.7rem] sm:text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
