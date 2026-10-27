import type { ResearchFunnelStep } from "@/lib/api";
import { T } from "@/components/i18n/T";

/**
 * The tests, in order, with how many companies are still in after each one.
 * Free for everyone — it is the method, and the reason to trust the list.
 */
export default function ResearchFunnel({ universe, steps }: { universe: number; steps: ResearchFunnelStep[] }) {
  const width = (n: number) => `${universe > 0 ? Math.max(2, (n / universe) * 100) : 0}%`;
  const last = steps.length - 1;

  return (
    <ol className="rl-funnel">
      <li className="rl-step">
        <span className="rl-step-n" aria-hidden>0</span>
        <div className="rl-step-body">
          <div className="rl-step-row">
            <span>
              <T en="Every rated company" bn="রেটিং পাওয়া সব কোম্পানি" />
            </span>
            <span className="rl-step-count nums">{universe}</span>
          </div>
          <span className="rl-bar"><span className="rl-bar-fill" style={{ width: "100%" }} /></span>
        </div>
      </li>
      {steps.map((s, i) => (
        <li key={s.key} className={`rl-step${i === last ? " rl-step--last" : ""}`}>
          <span className="rl-step-n" aria-hidden>{i + 1}</span>
          <div className="rl-step-body">
            <div className="rl-step-row">
              <span>
                <T en={s.label_en} bn={s.label_bn} />
              </span>
              <span className="rl-step-count nums">
                {s.left}
                <span className="sr-only">
                  <T en=" companies left" bn="টি কোম্পানি বাকি" />
                </span>
              </span>
            </div>
            <span className="rl-bar"><span className="rl-bar-fill" style={{ width: width(s.left) }} /></span>
          </div>
        </li>
      ))}
    </ol>
  );
}
