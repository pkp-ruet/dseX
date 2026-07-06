import type { CSSProperties } from "react";
import type { MarketQuestion, MarketSectorRow, MarketQuality } from "@/lib/api";

function Answers({ questions }: { questions: MarketQuestion[] }) {
  return (
    <div className="ms-card">
      <p className="ms-card-title">A quick look at the market today</p>
      <div className="ms-answers">
        {questions.map((it) => (
          <div className={`ms-answer ms-answer--${it.tone}`} key={it.q}>
            <p className="ms-answer-q">{it.q}</p>
            <p className="ms-answer-a">{it.a}</p>
            {it.extra ? <p className="ms-answer-x">{it.extra}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Sectors({ sectors }: { sectors: MarketSectorRow[] }) {
  const top = sectors.slice(0, 8);
  return (
    <div className="ms-card">
      <p className="ms-card-title">Which businesses are doing well?</p>
      {top.length === 0 ? (
        <p className="ms-empty">Not enough trading to tell yet.</p>
      ) : (
        top.map((s) => {
          const pos = s.ret_1w >= 0;
          const width = Math.min(Math.abs(s.ret_1w) / 5, 1) * 50;
          const fill: CSSProperties = pos
            ? { left: "50%", width: `${width}%`, background: "var(--positive)" }
            : { right: "50%", width: `${width}%`, background: "var(--negative)" };
          return (
            <div className="ms-sector" key={s.name}>
              <span className="ms-sector-name">{s.name}</span>
              <span className="ms-sector-track">
                <span className="ms-sector-fill" style={fill} />
              </span>
              <span className={`ms-sector-val ${pos ? "ms-pos" : "ms-neg"}`}>
                {pos ? "+" : ""}
                {s.ret_1w.toFixed(1)}%
              </span>
            </div>
          );
        })
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
  const takeaway =
    healthyPct >= 50
      ? "Good news — more than half the companies here look healthy."
      : healthyPct >= 30
        ? "Only some companies look healthy, so it's worth choosing carefully."
        : "Most companies look weak right now, so be extra careful which one you pick.";
  const takeawayBn =
    healthyPct >= 50
      ? "ভালো খবর — অর্ধেকের বেশি কোম্পানি এখন ভালো অবস্থায় আছে।"
      : healthyPct >= 30
        ? "অল্প কিছু কোম্পানিই ভালো অবস্থায় আছে — বেছে নেওয়ার সময় একটু সাবধান।"
        : "বেশিরভাগ কোম্পানিই এখন দুর্বল — কোনটা কিনবেন, খুব ভেবে ঠিক করুন।";
  return (
    <div className="ms-card">
      <p className="ms-card-title">How many companies are healthy?</p>
      {quality.total > 0 ? (
        <>
          <p className="ms-quality-lead">
            <b>{healthy}</b> of {quality.total} companies look healthy.
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
        </>
      ) : (
        <p className="ms-empty">Company scores are being prepared.</p>
      )}
    </div>
  );
}

export default function WhatsHappeningNow({
  questions,
  sectors,
  quality,
}: {
  questions: MarketQuestion[];
  sectors: MarketSectorRow[];
  quality: MarketQuality;
}) {
  return (
    <>
      <Answers questions={questions} />
      <div className="intel-grid" style={{ marginTop: 16 }}>
        <Sectors sectors={sectors} />
        <Quality quality={quality} />
      </div>
    </>
  );
}
