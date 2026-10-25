import type { CSSProperties } from "react";
import Link from "next/link";
import Bn from "@/components/i18n/Bn";
import type { MarketSectorRow, MarketQuality } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import MkCard from "./MkCard";

/** Bar + marker scale: ±5% fills the half-track. */
const SCALE_PCT = 5;

function halfWidth(pct: number): number {
  return Math.min(Math.abs(pct) / SCALE_PCT, 1) * 50;
}

function Sectors({ sectors }: { sectors: MarketSectorRow[] }) {
  const top = sectors.slice(0, 8);
  return (
    <MkCard
      id="mk-sectors-title"
      title="Which businesses are doing well?"
      bn="কোন ব্যবসা ভালো করছে"
      right={<Link href="/sectors" className="mk-link">All sectors →</Link>}
    >
      {top.length === 0 ? (
        <p className="mk-empty">Not enough trading to tell yet.</p>
      ) : (
        <>
          <div>
            {top.map((s) => {
              const pos = s.ret_1w >= 0;
              const fill: CSSProperties = pos
                ? { left: "50%", width: `${halfWidth(s.ret_1w)}%` }
                : { right: "50%", width: `${halfWidth(s.ret_1w)}%` };
              const mark =
                s.ret_1m != null
                  ? { left: `${Math.min(99, Math.max(1, 50 + Math.max(-1, Math.min(1, s.ret_1m / SCALE_PCT)) * 50))}%` }
                  : null;
              const body = (
                <>
                  <span className="min-w-0">
                    <span className="mk-sector-name">{s.name}</span>
                    <span className="mk-sector-sub">
                      {s.count} companies
                      {s.ret_1m != null ? ` · month ${s.ret_1m >= 0 ? "+" : ""}${s.ret_1m.toFixed(1)}%` : ""}
                    </span>
                  </span>
                  <span className="mk-track" aria-hidden="true">
                    <span className={`mk-track-fill ${pos ? "bg-positive" : "bg-negative"}`} style={fill} />
                    {mark && <span className="mk-track-mark" style={mark} />}
                  </span>
                  <span className={`mk-sector-val ${pos ? "text-positive" : "text-negative"}`}>
                    {pos ? "+" : ""}
                    {s.ret_1w.toFixed(1)}%
                  </span>
                </>
              );
              return s.slug ? (
                <Link className="mk-sector" href={`/sector/${s.slug}`} key={s.name}>
                  {body}
                </Link>
              ) : (
                <div className="mk-sector" key={s.name}>
                  {body}
                </div>
              );
            })}
          </div>
          <p className="mk-legend">
            <span>
              <i className="k-bar" />
              this week
            </span>
            <span>
              <i className="k-mark" />
              this month
            </span>
          </p>
          <Bn className="mk-card-bn">বার = এই সপ্তাহ, দাগ = এই মাস। কোনো খাতে চাপ দিলে তার সব কোম্পানি দেখবেন।</Bn>
        </>
      )}
    </MkCard>
  );
}

function Quality({ quality }: { quality: MarketQuality }) {
  const segs = [
    { label: "Strong", n: quality.strong, bg: "bg-tier-excellent" },
    { label: "Good", n: quality.good, bg: "bg-tier-good" },
    { label: "So-so", n: quality.soso, bg: "bg-tier-average" },
    { label: "Weak", n: quality.risky, bg: "bg-tier-weak" },
  ];
  const healthy = quality.strong + quality.good;
  const healthyPct = quality.total ? (healthy / quality.total) * 100 : 0;
  const delta = quality.trend?.healthy_delta_1w ?? null;
  const since = quality.trend?.since ?? null;

  let takeaway: string;
  let takeawayBn: string;
  if (healthyPct >= 50) {
    takeaway = "Good news — more than half the companies here look healthy.";
    takeawayBn = "ভালো খবর — অর্ধেকের বেশি কোম্পানি এখন ভালো অবস্থায় আছে।";
  } else if (healthyPct >= 30) {
    takeaway = "Only some companies look healthy, so it's worth choosing carefully.";
    takeawayBn = "অল্প কিছু কোম্পানিই ভালো অবস্থায় আছে — বেছে নেওয়ার সময় একটু সাবধান।";
  } else {
    takeaway = "Most companies look weak right now, so be extra careful which one you pick.";
    takeawayBn = "বেশিরভাগ কোম্পানিই এখন দুর্বল — কোনটা কিনবেন, খুব ভেবে ঠিক করুন।";
  }
  // The trend clause is what keeps this card from saying the same sentence
  // every day while the median score sits in the 30s.
  if (delta != null && delta !== 0) {
    const n = Math.abs(delta);
    takeaway += delta > 0
      ? ` The list is growing: ${n} more than a week ago.`
      : ` The list is shrinking: ${n} fewer than a week ago.`;
    takeawayBn += delta > 0
      ? ` এক সপ্তাহ আগের চেয়ে ${n}টি বেড়েছে।`
      : ` এক সপ্তাহ আগের চেয়ে ${n}টি কমেছে।`;
  } else if (delta === 0) {
    takeaway += " The number hasn't changed in a week.";
    takeawayBn += " এক সপ্তাহে সংখ্যাটা বদলায়নি।";
  }

  return (
    <MkCard
      id="mk-quality-title"
      title="How many companies are healthy?"
      bn="কতটি কোম্পানি ভালো অবস্থায় আছে"
      right={<Link href="/dsestockranking" className="mk-link">Ranking →</Link>}
    >
      {quality.total > 0 ? (
        <>
          <div className="mk-bignum">
            <span className="mk-bignum-n">{healthy}</span>
            <span className="mk-bignum-of">of {quality.total} companies look healthy</span>
            {delta != null && (
              <span
                className={`mk-delta ${delta > 0 ? "mk-delta--up" : delta < 0 ? "mk-delta--down" : ""}`}
                title={since ? `Compared with ${formatDate(since)}` : undefined}
              >
                {delta > 0 ? "+" : ""}
                {delta} in a week
              </span>
            )}
          </div>
          <div className="mk-tierbar" role="img" aria-label={segs.map((s) => `${s.label} ${s.n}`).join(", ")}>
            {segs
              .filter((s) => s.n > 0)
              .map((s) => (
                <span key={s.label} className={s.bg} style={{ flexGrow: s.n }} />
              ))}
          </div>
          <ul className="mk-tier-legend">
            {segs.map((s) => (
              <li key={s.label}>
                <b>{s.n}</b>
                <span>
                  <i className={s.bg} />
                  {s.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="mk-card-foot">
            <p className="m-0 text-sm text-text-main">{takeaway}</p>
            <Bn className="mk-card-bn">{takeawayBn}</Bn>
          </div>
        </>
      ) : (
        <p className="mk-empty">Company scores are being prepared.</p>
      )}
    </MkCard>
  );
}

/** Section 1 body: sector bars (linked) + the quality bar with its weekly trend. */
export default function WhatsHappeningNow({
  sectors,
  quality,
}: {
  sectors: MarketSectorRow[];
  quality: MarketQuality;
}) {
  return (
    <div className="mk-pair">
      <Sectors sectors={sectors} />
      <Quality quality={quality} />
    </div>
  );
}
