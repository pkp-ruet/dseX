import Bn from "@/components/i18n/Bn";
import { takaGroup } from "@/lib/formatters";
import type { NextMove } from "@/lib/portfolio-next";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

/**
 * "Your next move" (2026-10-26) — the top of the analysis chapter: the ONE
 * thing to act on first, ranked by the taka at stake (`buildNextMove`), then
 * up to two more as quiet lines. Free: it names only what the page already
 * shows for free (stocks marked Sell, the biggest stock) and counts the rest.
 */
export default function NextMoveCard({
  first,
  more,
  lang,
}: {
  first: NextMove;
  more: NextMove[];
  lang: AnalysisLang;
}) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const bnCls = bn ? "font-bn" : "";
  const dot = (k: NextMove["kind"]) =>
    k === "sell" || k === "weak" ? "pf-dot--bad" : k === "none" ? "pf-dot--good" : "pf-dot--watch";

  return (
    <section className="soft-card pf-card" data-card="next-move" aria-labelledby="pf-next-h">
      <div className={bnCls} lang={bn ? "bn" : undefined}>
        <p className="flex items-center gap-2 text-sm font-semibold text-primary-ink">
          <span className={`pf-dot ${dot(first.kind)}`} aria-hidden />
          {L("Your next move", "আপনার পরের পদক্ষেপ")}
        </p>
        {!bn && <Bn className="pf-card-bn">আপনার পরের পদক্ষেপ</Bn>}
        <h3 id="pf-next-h" className="mt-2 text-xl font-bold leading-tight text-text-main sm:text-2xl">
          {first.title}
        </h3>
        <p className="mt-2 max-w-prose text-base leading-relaxed text-text-main">{first.line}</p>
        {first.amount != null && (
          <p className="mt-3 text-sm text-text-muted">
            {L("Money this is about: ", "যত টাকা নিয়ে: ")}
            <b className="pv pf-num text-text-main">{takaGroup(first.amount)}</b>
          </p>
        )}
        {first.href && first.cta && (
          <a href={first.href} className="pf-link mt-1">
            {first.cta} →
          </a>
        )}

        {more.length > 0 && (
          <div className="pf-card-foot">
            <p className="text-xs font-semibold text-text-muted">{L("After that", "তারপর")}</p>
            <ul className="pf-rows mt-1">
              {more.map((m) => (
                <li key={m.kind} className="flex items-start gap-3 py-2.5">
                  <span className={`pf-dot ${dot(m.kind)} mt-2`} aria-hidden />
                  <span className="min-w-0 flex-1 text-sm text-text-main">
                    <span className="font-semibold">{m.title}</span>
                    {m.amount != null && (
                      <span className="pv pf-num text-text-muted"> · {takaGroup(m.amount)}</span>
                    )}
                  </span>
                  {m.href && (
                    <a href={m.href} className="pf-link shrink-0 -my-2">
                      {L("See", "দেখুন")}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
