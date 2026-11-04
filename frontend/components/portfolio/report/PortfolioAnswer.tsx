"use client";

import { TONE_CLASS, tx } from "@/components/report/chip";
import { IconCheck, IconChevronRight } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { takaGroup } from "@/lib/formatters";
import type { PfAnswer, PfLight } from "@/lib/portfolio-report";
import type { Tone } from "@/lib/stock-report";

const MARK: Record<Tone, string> = { good: "", fair: "!", bad: "✕", neutral: "–" };

/**
 * THE answer of the portfolio report (2026-10-30, plan
 * https://claude.ai/artifact/F7UfEY97wVpR89f5GQVUdg): is your portfolio in
 * good shape? One answer (In good shape · Mostly fine · Needs work · At
 * risk), the grade letter beside it, one plain line, and the four lights it
 * is made from — your companies, your spread, the prices you paid, what to
 * watch — each a link to its chapter; the light that decided a not-good
 * answer is outlined. Then the first move with the taka involved.
 *
 * Clean pass 2026-11-04 (user: "too much text"): the list of why each light
 * is what it is went (each chapter opens with the same sentence), and so did
 * the "tap a light" hint — the lights read as links.
 *
 * Premium since 2026-11-02 (the page hides it from a free reader under one
 * `Locked`, like the stock page's answer card).
 */
export default function PortfolioAnswer({ answer }: { answer: PfAnswer }) {
  return (
    <section id="ch-answer" className="ac pfa soft-card dash-section p-5 sm:p-8" aria-labelledby="pfa-t">
      <p className="ac-ask">
        <T en="Is your portfolio in good shape?" bn="আপনার পোর্টফোলিও কি ভালো অবস্থায় আছে?" />
      </p>
      <div className="pfa-wordrow">
        <h2 id="pfa-t" className={`ac-word ${TONE_CLASS[answer.tone]}`}>
          {tx(answer.word)}
        </h2>
        <span className={`pfa-grade pf-g-${answer.grade}`}>
          <T en={`Grade ${answer.grade}`} bn={`গ্রেড ${answer.grade}`} />
        </span>
      </div>
      <p className="ac-line">{tx(answer.line)}</p>

      <div className="pfa-lights">
        {answer.lights.map((l) => (
          <LightCell key={l.key} light={l} blocker={answer.blocker === l.key} />
        ))}
      </div>

      {answer.first && (
        <div className="pfa-move">
          <div className="pfa-move-top">
            <p className="pfa-move-k">
              <T en="Do this first" bn="আগে এটি করুন" />
            </p>
            {answer.first.amount != null && (
              <p className="pfa-move-amt">
                <b className="pv">{takaGroup(answer.first.amount)}</b>
                <span>
                  <T en="involved" bn="জড়িত" />
                </span>
              </p>
            )}
          </div>
          <p className="pfa-move-t">{tx(answer.first.title)}</p>
          <p className="pfa-move-l">{tx(answer.first.line)}</p>
          <a href="#ch-plan" className="pfa-move-link">
            <T en="See your whole plan" bn="পুরো পরিকল্পনা দেখুন" />
            <IconChevronRight size={14} />
          </a>
        </div>
      )}
    </section>
  );
}

function LightCell({ light, blocker }: { light: PfLight; blocker: boolean }) {
  return (
    <a href={light.href} className="ac-light" data-tone={light.tone} data-blocker={blocker ? "true" : undefined}>
      <span className="ac-dot" aria-hidden="true">
        {light.tone === "good" ? <IconCheck size={12} /> : MARK[light.tone]}
      </span>
      <span className="ac-label">{tx(light.label)}</span>
      <span className="ac-lword">{tx(light.word)}</span>
    </a>
  );
}
