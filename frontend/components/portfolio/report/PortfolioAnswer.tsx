"use client";

import { TONE_CLASS, tx } from "@/components/report/chip";
import { IconCheck } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { takaGroup } from "@/lib/formatters";
import type { PfAnswer, PfLight } from "@/lib/portfolio-report";
import type { Tone } from "@/lib/stock-report";

const MARK: Record<Tone, string> = { good: "", fair: "!", bad: "✕", neutral: "–" };

/**
 * THE answer of the portfolio report (2026-10-30, plan
 * https://claude.ai/artifact/F7UfEY97wVpR89f5GQVUdg) — first thing under the
 * money: is your portfolio in good shape? One answer (In good shape · Mostly
 * fine · Needs work · At risk), the grade letter beside it, one plain line,
 * and the four lights it is made from — your companies, your spread, the
 * prices you paid, what to watch — each a link to its chapter. Built from
 * the same analysis as the grade (`lib/portfolio-report.ts`), so the answer
 * never sits above the letter; the light that decided a not-good answer is
 * outlined.
 *
 * Premium since 2026-11-02 (the page hides it from a free reader under one
 * `Locked`, like the stock page's answer card): the answer, the four lights,
 * why each light is what it is, and the first move with the taka at stake.
 */
export default function PortfolioAnswer({ answer }: { answer: PfAnswer }) {
  const whys = answer.lights.filter((l) => l.why);
  const why = (
    <>
      {whys.length > 0 && (
        <ul className="ac-why">
          {whys.map((l) => (
            <li key={l.key}>
              <b>{tx(l.label)}</b>
              {tx(l.why)}
            </li>
          ))}
        </ul>
      )}
      {answer.first && (
        <div className="pfa-move">
          <p className="pfa-move-k">
            <T en="Your first move" bn="আপনার প্রথম পদক্ষেপ" />
          </p>
          <p className="pfa-move-t">{tx(answer.first.title)}</p>
          <p className="pfa-move-l">{tx(answer.first.line)}</p>
          <p className="pfa-move-foot">
            {answer.first.amount != null && (
              <span>
                <T en="Money this is about: " bn="যত টাকা নিয়ে: " />
                <b className="pv">{takaGroup(answer.first.amount)}</b>
              </span>
            )}
            <a href="#ch-plan" className="pf-link">
              <T en="See your plan" bn="আপনার পরিকল্পনা দেখুন" /> →
            </a>
          </p>
        </div>
      )}
    </>
  );

  return (
    <section id="ch-answer" className="ac pfa soft-card dash-section p-5 sm:p-7" aria-labelledby="pfa-t">
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

      {why}

      <div className="ac-foot">
        <span>
          <T en="Tap a light to read that part." bn="সেই অংশ পড়তে যেকোনো আলোয় চাপুন।" />
        </span>
      </div>

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
