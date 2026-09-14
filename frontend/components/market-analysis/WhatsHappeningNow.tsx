import type { CSSProperties } from "react";
import Link from "next/link";
import Bn from "@/components/i18n/Bn";
import { IconArrowDown, IconArrowUp } from "@/components/home/personalized/DashIcons";
import type { MarketSectorRow, MarketQuality } from "@/lib/api";
import { formatDate } from "@/lib/formatters";

/** Bar + marker scale: ±5% fills the half-track. */
const SCALE_PCT = 5;

function halfWidth(pct: number): number {
  return Math.min(Math.abs(pct) / SCALE_PCT, 1) * 50;
}

function Sectors({ sectors }: { sectors: MarketSectorRow[] }) {
  const top = sectors.slice(0, 8);
  return (
    <div className="ms-card">
      <p className="ms-card-title">Which businesses are doing well?</p>
      {top.length === 0 ? (
        <p className="ms-empty">Not enough trading to tell yet.</p>
      ) : (
        <>
          {top.map((s) => {
            const pos = s.ret_1w >= 0;
            const fill: CSSProperties = pos
              ? { left: "50%", width: `${halfWidth(s.ret_1w)}%`, background: "var(--positive)" }
              : { right: "50%", width: `${halfWidth(s.ret_1w)}%`, background: "var(--negative)" };
            const mark =
              s.ret_1m != null
                ? // 4–96%: the 8px dot has a 4px half-width, so at 0% / 100% it poked past the track
                  { left: `${Math.min(96, Math.max(4, 50 + Math.max(-1, Math.min(1, s.ret_1m / SCALE_PCT)) * 50))}%` }
                : null;
            const body = (
              <>
                <span className="ms-sector-name">
                  {s.name}
                  <small>
                    {s.count} companies
                    {s.ret_1m != null ? ` · month ${s.ret_1m >= 0 ? "+" : ""}${s.ret_1m.toFixed(1)}%` : ""}
                  </small>
                </span>
                <span className="ms-sector-track">
                  <span className="ms-sector-fill" style={fill} />
                  {mark && <span className="ms-sector-mark" style={mark} aria-hidden="true" />}
                </span>
                <span className={`ms-sector-val ${pos ? "ms-pos" : "ms-neg"}`}>
                  {pos ? "+" : ""}
                  {s.ret_1w.toFixed(1)}%
                </span>
              </>
            );
            return s.slug ? (
              <Link className="ms-sector ms-sector--link" href={`/sector/${s.slug}`} key={s.name}>
                {body}
              </Link>
            ) : (
              <div className="ms-sector" key={s.name}>
                {body}
              </div>
            );
          })}
          <p className="ms-sector-legend">
            <span>
              <i className="i-bar" />
              this week
            </span>
            <span>
              <i className="i-dot" />
              this month
            </span>
            <span>Tap a sector to see every company in it.</span>
          </p>
          <Bn className="ms-note-bn">বার = এই সপ্তাহ, ছোট বিন্দু = এই মাস। কোনো খাতে চাপ দিলে তার সব কোম্পানি দেখবেন।</Bn>
          <Link href="/sectors" className="ms-bloglink">
            See all sectors →
          </Link>
        </>
      )}
    </div>
  );
}

function Quality({ quality }: { quality: MarketQuality }) {
  const segs = [
    { label: "Strong", n: quality.strong, bg: "var(--tier-excellent)" },
    { label: "Good", n: quality.good, bg: "var(--tier-good)" },
    { label: "So-so", n: quality.soso, bg: "var(--tier-average)" },
    { label: "Weak", n: quality.risky, bg: "var(--tier-weak)" },
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
    <div className="ms-card">
      <p className="ms-card-title">How many companies are healthy?</p>
      {quality.total > 0 ? (
        <>
          <p className="ms-quality-lead">
            <b>{healthy}</b> of {quality.total} companies look healthy.
            {delta != null && (
              <span
                className={`ms-trend-pill ${delta > 0 ? "ms-trend-pill--up" : delta < 0 ? "ms-trend-pill--down" : ""}`}
                title={since ? `Compared with ${formatDate(since)}` : undefined}
              >
                {delta > 0 ? <IconArrowUp size={11} /> : delta < 0 ? <IconArrowDown size={11} /> : null}
                {delta > 0 ? "+" : ""}
                {delta} in a week
              </span>
            )}
          </p>
          <div className="ms-tierbar">
            {segs
              .filter((s) => s.n > 0)
              .map((s) => (
                <div key={s.label} style={{ flexGrow: s.n, background: s.bg }}>
                  {s.n}
                </div>
              ))}
          </div>
          <div className="ms-tier-legend">
            {segs.map((s) => (
              <span key={s.label}>
                <span
                  style={{ width: 9, height: 9, borderRadius: 999, background: s.bg, display: "inline-block" }}
                />
                {s.label}
              </span>
            ))}
          </div>
          <p className="ms-card-note" style={{ marginTop: 12, marginBottom: 0 }}>
            {takeaway}
          </p>
          <p lang="bn" className="font-bn ms-note-bn">
            {takeawayBn}
          </p>
          <Link href="/dsestockranking" className="ms-bloglink">
            See every company ranked →
          </Link>
        </>
      ) : (
        <p className="ms-empty">Company scores are being prepared.</p>
      )}
    </div>
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
    <div className="intel-grid">
      <Sectors sectors={sectors} />
      <Quality quality={quality} />
    </div>
  );
}
