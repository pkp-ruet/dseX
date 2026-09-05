/** Static, illustrative mockup of the Market Analysis page — the market mood,
 *  plain up/down + cheap/pricey read-out, and an "unusual buying" flag. */
export default function MarketAnalysisMockup() {
  return (
    <div className="soft-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          📊 The market right now
        </span>
        <span className="text-[0.68rem] text-[var(--text-muted)]">in plain words</span>
      </div>

      <div className="px-4 pt-3">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.68rem] font-extrabold"
          style={{ background: "color-mix(in srgb, var(--warm) 15%, var(--surface))", color: "var(--warm-ink)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
          Right now: quiet &amp; weak
        </span>
        <p className="mt-2 text-[0.8rem] font-semibold leading-snug text-[var(--text)]">
          More shares fell than rose — but most look cheaper than usual.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        <div
          className="rounded-lg p-2.5"
          style={{
            background: "color-mix(in srgb, var(--negative) 8%, var(--surface))",
            border: "1px solid color-mix(in srgb, var(--negative) 20%, var(--border))",
          }}
        >
          <p className="text-[0.68rem] font-bold text-[var(--text-muted)]">Up or down today?</p>
          <p className="text-[0.95rem] font-extrabold" style={{ color: "var(--negative)" }}>Down</p>
        </div>
        <div
          className="rounded-lg p-2.5"
          style={{
            background: "color-mix(in srgb, var(--positive) 9%, var(--surface))",
            border: "1px solid color-mix(in srgb, var(--positive) 22%, var(--border))",
          }}
        >
          <p className="text-[0.68rem] font-bold text-[var(--text-muted)]">Cheap or pricey?</p>
          <p className="text-[0.95rem] font-extrabold" style={{ color: "var(--positive)" }}>Cheap</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-4 py-3 mt-2 border-t border-[var(--cell-rule)]">
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[0.8rem] shrink-0"
          style={{ background: "color-mix(in srgb, var(--warm) 16%, var(--surface))", color: "var(--warm-ink)" }}
          aria-hidden="true"
        >
          ⚡
        </span>
        <span className="min-w-0 flex-1">
          <span className="ticker-tag ticker-tag--static text-[0.78rem]">RENATA</span>
          <span className="block text-[0.68rem] text-[var(--text-muted)]">unusual buying today</span>
        </span>
        <span className="text-[0.7rem] font-bold" style={{ color: "var(--positive)" }}>4× usual</span>
      </div>
    </div>
  );
}
