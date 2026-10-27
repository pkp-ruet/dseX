import type { CSSProperties } from "react";
import Link from "next/link";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
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
      title={<T en="Which sectors are doing well?" bn="কোন সেক্টর ভালো করছে?" />}
      right={
        <Link href="/sectors" className="mk-link">
          <T en="All sectors →" bn="সব সেক্টর →" />
        </Link>
      }
    >
      {top.length === 0 ? (
        <p className="mk-empty">
          <T en="There is not enough trading to tell yet." bn="বলার মতো যথেষ্ট লেনদেন এখনো হয়নি।" />
        </p>
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
                    <span className="mk-sector-name">
                      <T en={s.name} bn={sectorBn(s.name)} />
                    </span>
                    <span className="mk-sector-sub">
                      <T
                        en={`${s.count} companies${s.ret_1m != null ? ` · month ${s.ret_1m >= 0 ? "+" : ""}${s.ret_1m.toFixed(1)}%` : ""}`}
                        bn={`${s.count}টি কোম্পানি${s.ret_1m != null ? ` · মাসে ${s.ret_1m >= 0 ? "+" : ""}${s.ret_1m.toFixed(1)}%` : ""}`}
                      />
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
              <T en="this week" bn="এ সপ্তাহ" />
            </span>
            <span>
              <i className="k-mark" />
              <T en="this month" bn="এ মাস" />
            </span>
          </p>
          <p className="mk-card-note">
            <T
              en="Tap a sector to see all its companies."
              bn="কোনো সেক্টরে চাপ দিলে তার সব কোম্পানি দেখতে পাবেন।"
            />
          </p>
        </>
      )}
    </MkCard>
  );
}

function Quality({ quality }: { quality: MarketQuality }) {
  const segs = [
    { label: "Excellent", labelBn: "চমৎকার", n: quality.strong, bg: "bg-tier-excellent" },
    { label: "Good", labelBn: "ভালো", n: quality.good, bg: "bg-tier-good" },
    { label: "Average", labelBn: "মাঝারি", n: quality.soso, bg: "bg-tier-average" },
    { label: "Weak", labelBn: "দুর্বল", n: quality.risky, bg: "bg-tier-weak" },
  ];
  const healthy = quality.strong + quality.good;
  const healthyPct = quality.total ? (healthy / quality.total) * 100 : 0;
  const delta = quality.trend?.healthy_delta_1w ?? null;
  const since = quality.trend?.since ?? null;

  let takeaway: string;
  let takeawayBn: string;
  if (healthyPct >= 50) {
    takeaway = "More than half the companies look healthy right now.";
    takeawayBn = "অর্ধেকের বেশি কোম্পানি এখন ভালো অবস্থায় আছে।";
  } else if (healthyPct >= 30) {
    takeaway = "Only some companies look healthy, so it is worth choosing carefully.";
    takeawayBn = "কিছু কোম্পানিই ভালো অবস্থায় আছে, তাই বেছে নেওয়ার সময় সাবধান থাকা ভালো।";
  } else {
    takeaway = "Most companies look weak right now, so it is wise to be extra careful about which one you pick.";
    takeawayBn = "বেশির ভাগ কোম্পানি এখন দুর্বল, তাই কোনটি কিনবেন তা খুব ভেবে ঠিক করুন।";
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
    takeaway += " The number has not changed in a week.";
    takeawayBn += " এক সপ্তাহে সংখ্যাটি বদলায়নি।";
  }

  return (
    <MkCard
      id="mk-quality-title"
      title={<T en="How many companies are healthy?" bn="কতটি কোম্পানি ভালো অবস্থায় আছে?" />}
      right={
        <Link href="/dsestockranking" className="mk-link">
          <T en="Rankings →" bn="র‍্যাঙ্কিং →" />
        </Link>
      }
    >
      {quality.total > 0 ? (
        <>
          <div className="mk-bignum">
            <span className="mk-bignum-n">{healthy}</span>
            <span className="mk-bignum-of">
              <T en={`of ${quality.total} companies look healthy`} bn={`টি কোম্পানি ভালো অবস্থায়, মোট ${quality.total}টির মধ্যে`} />
            </span>
            {delta != null && (
              <span
                className={`mk-delta ${delta > 0 ? "mk-delta--up" : delta < 0 ? "mk-delta--down" : ""}`}
                title={since ? `Compared with ${formatDate(since)}` : undefined}
              >
                <T en={`${delta > 0 ? "+" : ""}${delta} in a week`} bn={`এক সপ্তাহে ${delta > 0 ? "+" : ""}${delta}`} />
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
                  <T en={s.label} bn={s.labelBn} />
                </span>
              </li>
            ))}
          </ul>
          <div className="mk-card-foot">
            <p className="m-0 text-sm text-text-main">
              <T en={takeaway} bn={takeawayBn} />
            </p>
          </div>
        </>
      ) : (
        <p className="mk-empty">
          <T en="Company scores are being prepared." bn="কোম্পানির স্কোর তৈরি হচ্ছে।" />
        </p>
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
