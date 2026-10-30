"use client";

import { Locked } from "@/components/premium/AnswerLock";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import YourPosition from "@/components/stock/YourPosition";
import BuyBelowAlert from "@/components/stock/report/BuyBelowAlert";
import NextQuestions from "@/components/stock/report/NextQuestions";
import { TONE_CLASS, money, tx } from "@/components/stock/report/fmt";
import { IconCheck } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import type { NextQuestion, StockAnswer, Tone } from "@/lib/stock-report";

const MARK: Record<Tone, string> = { good: "", fair: "!", bad: "✕", neutral: "–" };

/**
 * THE answer card (2026-10-30 rebuild) — first thing under the price: should
 * you buy it today? One answer (Buy / Not yet / No reason to buy / Avoid),
 * one plain line, and the three lights it is made from — the company, the
 * price, anything wrong — each a link to its chapter. The backend builds it
 * from the Buy signal's own reason (`stock_report.build_answer`), so it never
 * disagrees with the Buy / Sell chip; the light that decided a "not yet" is
 * outlined.
 *
 * Free: the answer, its line, the three light words. Premium: why each light
 * is what it is, and our buy price (with an alert). The reader's own shares
 * follow (`YourPosition`, signed-in holders and followers only), then — for
 * a reader who can't see the full report — the page's one Premium card
 * (`NextQuestions`, `#ch-premium`): the question each free answer leaves.
 * It replaced the scorecard (score ring, grade, take, three-line summary,
 * eight checks).
 */
export default function AnswerCard({
  answer,
  code,
  ltp,
  w52High,
  w52Low,
  questions = [],
}: {
  answer: StockAnswer;
  questions?: NextQuestion[];
  code: string;
  ltp: number | null;
  w52High?: number | null;
  w52Low?: number | null;
}) {
  const open = usePremiumOpen();
  const whys = answer.lights.filter((l) => l.why);
  const premiumPart = (
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
      {answer.buy_price != null && (
        <div className="ac-buyprice">
          <span className="font-bold text-text-main">
            <T en={`Our buy price: under ${money(answer.buy_price)}`} bn={`আমাদের কেনার দাম: ${money(answer.buy_price)}-এর নিচে`} />
          </span>
          <BuyBelowAlert code={code} target={answer.buy_price} ltp={ltp} w52High={w52High} w52Low={w52Low} />
        </div>
      )}
    </>
  );

  return (
    <section id="ch-answer" className="ac soft-card stock-anchor p-5 sm:p-7" aria-labelledby="ac-t">
      <p className="ac-ask">
        <T en="Should you buy it today?" bn="আজ কি এটি কেনা উচিত?" />
      </p>
      <h2 id="ac-t" className={`ac-word ${TONE_CLASS[answer.tone]}`}>
        {tx(answer.word)}
      </h2>
      <p className="ac-line">{tx(answer.line)}</p>

      <div className="ac-lights">
        {answer.lights.map((l, i) => (
          <LightCell key={l.key} light={l} blocker={answer.blocker === l.key} plus={i > 0} />
        ))}
      </div>

      {(whys.length > 0 || answer.buy_price != null) &&
        (open ? premiumPart : <Locked>{premiumPart}</Locked>)}

      <div className="ac-foot">
        <span className="text-text-muted">
          <T en="Tap a light to read that part of the report." bn="রিপোর্টের সেই অংশ পড়তে যেকোনো আলোয় চাপুন।" />
        </span>
      </div>

      <div className="ac-pos">
        <YourPosition code={code} ltp={ltp} />
      </div>

      <NextQuestions code={code} rows={questions} />
    </section>
  );
}

function LightCell({ light, blocker, plus }: { light: StockAnswer["lights"][number]; blocker: boolean; plus: boolean }) {
  return (
    <>
      {plus && <span className="ac-plus" aria-hidden="true">+</span>}
      <a href={light.href} className="ac-light" data-tone={light.tone} data-blocker={blocker ? "true" : undefined}>
        <span className="ac-dot" aria-hidden="true">
          {light.tone === "good" ? <IconCheck size={12} /> : MARK[light.tone]}
        </span>
        <span className="ac-label">{tx(light.label)}</span>
        <span className="ac-lword">{tx(light.word)}</span>
      </a>
    </>
  );
}
