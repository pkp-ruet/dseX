"use client";

import { ToneChip, tx } from "@/components/report/chip";
import { IconArrowRight, IconCheck } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import type { PfAnswer, PfLight, PortfolioReport } from "@/lib/portfolio-report";
import type { Tone } from "@/lib/stock-report";

const MARK: Record<Tone, string> = { good: "", fair: "!", bad: "✕", neutral: "–" };

/** Where each area tile jumps: its card in "Why we say this". */
const AREA_ID: Record<PfLight["key"], string> = {
  companies: "#ch-companies",
  spread: "#ch-spread",
  prices: "#ch-prices",
  watch: "#ch-watch",
};

/**
 * Part 1 of the portfolio check, the verdict (2026-11-11, was `PortfolioAnswer`;
 * mockup https://claude.ai/artifact/QJjjrtfUu1ZSJ4rd7wvVeY): "Is your portfolio
 * in good shape?" — the answer and the grade letter, one plain line built only
 * from the area words, the four areas as tiles (each jumps to its card in
 * "Why we say this"), and ONE "Start here" link: the first step of the path
 * to a better grade, else the first move. Keeps the `#ch-answer` id the
 * watcher's pushes open.
 */
export default function PfVerdict({ answer, start }: { answer: PfAnswer; start: PortfolioReport["start"] }) {
  return (
    <section id="ch-answer" className="soft-card pfv dash-section" aria-labelledby="pfv-t">
      <div className="pfv-grid">
        <div className="pfv-main">
          <p className="pfv-q">
            <T en="1 · Is your portfolio in good shape?" bn="1 · আপনার পোর্টফোলিও কি ভালো অবস্থায় আছে?" />
          </p>
          <div className="pfv-word">
            <h2 id="pfv-t" className="pfv-h">
              <ToneChip word={answer.word} tone={answer.tone} size="lg" />
            </h2>
            <span className={`pfv-grade pf-g-${answer.grade}`} aria-label={`Grade ${answer.grade}`}>
              {answer.grade}
            </span>
          </div>
          <p className="pfv-line">{tx(answer.line)}</p>
        </div>
        <div className="pfv-areas">
          {answer.lights.map((l) => (
            <a key={l.key} href={AREA_ID[l.key]} className="pfv-area" data-tone={l.tone} data-blocker={answer.blocker === l.key ? "true" : undefined}>
              <span className="pfv-area-k">{tx(l.label)}</span>
              <span className="pfv-area-w">
                <span className="pfv-dot" aria-hidden="true">
                  {l.tone === "good" ? <IconCheck size={11} /> : MARK[l.tone]}
                </span>
                {tx(l.word)}
              </span>
            </a>
          ))}
        </div>
      </div>
      {start && (
        <a href={start.href} className="pfv-start">
          <span className="pfv-start-t">
            <span className="pfv-start-k">
              <T en="Start here" bn="এখান থেকে শুরু করুন" />
            </span>
            <b>{tx(start.title)}</b>
          </span>
          <IconArrowRight size={18} />
        </a>
      )}
    </section>
  );
}
