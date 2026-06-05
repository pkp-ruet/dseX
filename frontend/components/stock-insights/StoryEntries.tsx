import Link from "next/link";
import type { StoryEntry } from "@/lib/insight-utils";

function VerdictPill({ verdict }: { verdict: StoryEntry["verdict"] }) {
  if (!verdict) return null;
  return (
    <span
      className="ed-verdict"
      style={{
        color: verdict.colorVar,
        borderColor: `color-mix(in srgb, ${verdict.colorVar} 40%, transparent)`,
        background: `color-mix(in srgb, ${verdict.colorVar} 10%, transparent)`,
      }}
    >
      {verdict.label}
    </span>
  );
}

function ChangeBit({ pct }: { pct?: number | null }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span className={up ? "ed-chg-up" : "ed-chg-dn"}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

/** Top picks — each a flowing editorial mini-feature. */
export function StorySpotlight({ entries }: { entries: StoryEntry[] }) {
  return (
    <div>
      {entries.map((e) => (
        <article key={`${e.rank}-${e.code ?? e.title}`} className="ed-spot">
          <div className="ed-spot-head">
            <span className="ed-rank" aria-hidden="true">
              {e.rank}
            </span>
            <h2 className="ed-spot-title">
              {e.href ? <Link href={e.href}>{e.title}</Link> : e.title}{" "}
              {e.code && e.code !== e.title && <span className="ed-spot-code">{e.code}</span>}
            </h2>
          </div>

          <div className="ed-meta-row">
            <VerdictPill verdict={e.verdict} />
            {e.sector && <span className="ed-sector">{e.sector}</span>}
            {e.stat && (
              <span className="ed-stat">
                {e.stat.label}: <b>{e.stat.value}</b>
              </span>
            )}
            <ChangeBit pct={e.changePct} />
          </div>

          <p className="ed-body">{e.body}</p>

          {e.href && (
            <Link href={e.href} className="ed-readmore">
              Read the full breakdown →
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}

/** The rest of the field — leaner editorial rows. */
export function StoryRundown({ entries }: { entries: StoryEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="ed-rundown">
      {entries.map((e) => (
        <div key={`${e.rank}-${e.code ?? e.title}`} className="ed-run-row">
          <span className="ed-run-rank" aria-hidden="true">
            {e.rank}
          </span>
          <div className="ed-run-main">
            <div className="ed-run-name">
              {e.href ? <Link href={e.href}>{e.title}</Link> : e.title}
              {e.code && e.code !== e.title && <span className="code">{e.code}</span>}
            </div>
            <p className="ed-run-body">{e.body}</p>
          </div>
          {e.stat && (
            <div className="ed-run-side">
              <span className="ed-run-stat-label">{e.stat.label}</span>
              <span className="ed-run-stat">{e.stat.value}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
