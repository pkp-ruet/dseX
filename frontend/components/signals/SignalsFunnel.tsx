import type { ReactNode } from "react";
import type { SignalsToday } from "@/lib/api";
import { T } from "@/components/i18n/T";

/**
 * How today's list was made (2026-10-31): every company we grade, the good
 * ones, the ones that passed every check — and, folded, why the other good
 * companies were left out, by reason. Free: counts are facts, and showing the
 * companies we turned down is what makes the list believable.
 */
export default function SignalsFunnel({ funnel }: { funnel: SignalsToday["funnel"] }) {
  const { graded, good, buys, left_out } = funnel;
  const out = good - buys;
  const pct = (n: number) => (graded > 0 ? `${(n / graded) * 100}%` : "0%");
  return (
    <section aria-labelledby="sg-funnel-h" className="soft-card sg-funnel">
      <h2 id="sg-funnel-h" className="sr-only">
        <T en="How today's list was made" bn="আজকের তালিকা কীভাবে তৈরি" />
      </h2>
      <div className="sg-funnel-grid">
        <Step value={graded} label={<T en="companies graded" bn="কোম্পানির গ্রেড দেওয়া হয়েছে" />} />
        <Step value={good} label={<T en="good or excellent" bn="ভালো বা চমৎকার" />} />
        <Step value={buys} tone="positive" label={<T en="passed every check" bn="সব যাচাইয়ে উতরেছে" />} />
      </div>
      <div className="sg-funnel-bar" aria-hidden="true">
        <i className="bg-positive" style={{ width: pct(buys) }} />
        <i className="bg-watch" style={{ width: pct(out) }} />
      </div>
      {out > 0 && left_out.length > 0 && (
        <details className="sg-why">
          <summary>
            <T
              en={`Why ${out} good ${out === 1 ? "company is" : "companies are"} not here`}
              bn={`কেন ${out}টি ভালো কোম্পানি এখানে নেই`}
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <ul className="sg-out">
            {left_out.map((g) => (
              <li key={g.key}>
                <span>
                  <T en={g.en} bn={g.bn} />
                </span>
                <strong>{g.n}</strong>
              </li>
            ))}
          </ul>
          <p className="sg-out-note">
            <T
              en="The ones held back by price or by one other thing are listed under Almost on the list."
              bn="দাম বা অন্য একটি কারণে যেগুলো বাদ পড়েছে, সেগুলো নিচে তালিকায় প্রায় ঢুকে যাওয়া অংশে আছে।"
            />
          </p>
        </details>
      )}
    </section>
  );
}

function Step({ value, label, tone }: { value: number; label: ReactNode; tone?: "positive" }) {
  return (
    <div className="sg-step">
      <p className={`sg-step-v ${tone === "positive" ? "text-positive" : "text-text-main"}`}>{value}</p>
      <p className="sg-step-k">{label}</p>
    </div>
  );
}
