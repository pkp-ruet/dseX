"use client";

import { Fragment, type ReactNode } from "react";
import Link from "@/components/ui/Link";
import { TONE_CLASS, ToneChip, tx } from "@/components/report/chip";
import { IconChevronDown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { takaGroup } from "@/lib/formatters";
import type { Grade } from "@/lib/portfolio-analysis";
import type { PfPlan, PfPlanItem } from "@/lib/portfolio-report";
import type { Bi, Tone } from "@/lib/stock-report";

/**
 * "Your plan" (`#ch-plan`, 2026-10-30) — the stock report's "Our view" for
 * your money, Premium: what to do first (ranked by the taka involved, the
 * same `buildNextMove` as before), what would lift the grade (`gradeLifts`),
 * what to buy next (the recommendation engine's ideas for this portfolio),
 * and what to do with each share, then the try-a-change tool. All Premium
 * since 2026-11-02 (the page hides it from a free reader under one `Locked`).
 *
 * Clean pass 2026-11-04 (user: "too much text"): one card like the chapters,
 * four short blocks with plain headings; a grade lift is just "C → B" and the
 * change; the shares with nothing to act on sit on one line, their reasons folded.
 */
export default function PfPlanSection({ plan, grade, children }: { plan: PfPlan; grade: Grade; children?: ReactNode }) {
  const lift = plan.lifts[0]?.tag ?? null;
  const act = plan.each.filter((m) => m.tone && m.tone !== "neutral");
  const hold = plan.each.filter((m) => !m.tone || m.tone === "neutral");

  return (
    <section id="ch-plan" className="dash-section pf-chapter pfc-wrap" aria-labelledby="ch-plan-h">
      <div className="soft-card pfc">
        <header className="pfc-head">
          <h2 id="ch-plan-h" className="pfc-title">
            <T en="Your plan" bn="আপনার পরিকল্পনা" />
          </h2>
          <p className="pfc-sub">
            <T en="In the order of the money involved. Ideas, not advice." bn="জড়িত টাকার ক্রমে সাজানো। আইডিয়া, পরামর্শ নয়।" />
          </p>
        </header>

        <Block
          id="first"
          title={{ en: "Do this first", bn: "আগে এটি করুন" }}
          word={
            plan.moves.length
              ? { en: `${plan.moves.length} step${plan.moves.length === 1 ? "" : "s"}`, bn: `${plan.moves.length}টি পদক্ষেপ` }
              : { en: "Nothing urgent", bn: "জরুরি কিছু নেই" }
          }
          tone={plan.moves.length ? plan.moves[0].tone ?? "fair" : "good"}
        >
          {plan.moves.length ? (
            <ol className="pfp-list pfp-list--num">
              {plan.moves.map((m) => (
                <li key={m.key} className="pfp-item">
                  <div className="pfp-item-top">
                    <span className="pfp-item-t">{tx(m.title)}</span>
                    {m.amount != null && (
                      <span className="pfp-amt">
                        <b className="pv">{takaGroup(m.amount)}</b>
                        <T en="involved" bn="জড়িত" />
                      </span>
                    )}
                  </div>
                  <p className="pfp-item-l">{tx(m.line)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="pfq-answer">
              <T en="Nothing needs you today. Look again after your companies' next results." bn="আজ কিছু করার নেই। কোম্পানিগুলোর পরের ফল বের হলে আবার দেখুন।" />
            </p>
          )}
        </Block>

        <Block
          id="lift"
          title={{ en: "Lift your grade", bn: "গ্রেড বাড়ানোর উপায়" }}
          word={lift ?? (grade === "A" ? { en: "Already A", bn: "এখনই A" } : { en: "No quick lift", bn: "সহজ উপায় নেই" })}
          tone={lift ? "good" : "neutral"}
        >
          {plan.lifts.length ? (
            <ul className="pfp-list">
              {plan.lifts.map((m) => (
                <li key={m.key} className="pfp-lift">
                  {m.tag && <b className="pfp-lift-tag">{tx(m.tag)}</b>}
                  <span className="pfp-item-t">{tx(m.title)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pfq-answer">
              {grade === "A" ? (
                <T en="Your grade is already the highest. Keep it there by checking each new result." bn="আপনার গ্রেড এখনই সবচেয়ে ভালো। প্রতিটি নতুন ফল দেখে সেটি ধরে রাখুন।" />
              ) : (
                <T en="No single change lifts your grade today. The steps above add up." bn="আজ একটি বদলে গ্রেড বাড়ে না। ওপরের পদক্ষেপগুলো মিলে কাজ করে।" />
              )}
            </p>
          )}
        </Block>

        <Block
          id="buy"
          title={{ en: "What to buy next", bn: "এরপর কী কিনবেন" }}
          word={
            plan.buys.length
              ? { en: `${plan.buys.length} idea${plan.buys.length === 1 ? "" : "s"}`, bn: `${plan.buys.length}টি আইডিয়া` }
              : { en: "None today", bn: "আজ নেই" }
          }
          tone={plan.buys.length ? "good" : "neutral"}
        >
          {plan.buys.length ? (
            <ul className="pfp-list">
              {plan.buys.map((m) => (
                <li key={m.key} className="pfp-item">
                  <div className="pfp-item-top">
                    <ItemName item={m} />
                    {m.tag && <b className={`pfp-tag ${m.tone ? TONE_CLASS[m.tone] : ""}`}>{tx(m.tag)}</b>}
                  </div>
                  <p className="pfp-item-l">{tx(m.line)}</p>
                  {m.amount != null && (
                    <p className="pfp-item-a">
                      <T en="For example " bn="যেমন " />
                      <b className="pv">{takaGroup(m.amount)}</b>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="pfq-answer">
              {plan.buyNone ? tx(plan.buyNone) : <T en="No share passes all our checks for you today." bn="আজ আপনার জন্য কোনো শেয়ার আমাদের সব যাচাই পেরোয়নি।" />}
            </p>
          )}
        </Block>

        {plan.each.length > 0 && (
          <Block
            id="each"
            title={{ en: "Each of your shares", bn: "প্রতিটি শেয়ার নিয়ে" }}
            word={
              act.length
                ? { en: `${act.length} to act on`, bn: `${act.length}টিতে কিছু করার আছে` }
                : { en: "Nothing to act on", bn: "কিছু করার নেই" }
            }
            tone={act.some((m) => m.tone === "bad") ? "bad" : act.length ? "fair" : "good"}
          >
            <ul className="pfp-list">
              {act.map((m) => (
                <li key={m.key} className="pfp-item">
                  <div className="pfp-item-top">
                    <ItemName item={m} />
                    {m.tag && <b className={`pfp-tag ${m.tone ? TONE_CLASS[m.tone] : ""}`}>{tx(m.tag)}</b>}
                  </div>
                  <p className="pfp-item-l">{tx(m.line)}</p>
                </li>
              ))}
              {hold.length > 0 && (
                <li className="pfp-item">
                  <div className="pfp-item-top">
                    <span className="pfp-hold-names">
                      {hold.map((m, i) => (
                        <Fragment key={m.key}>
                          {i > 0 && ", "}
                          <ItemName item={m} plain />
                        </Fragment>
                      ))}
                    </span>
                    {hold[0].tag && <b className="pfp-tag rp-tone-neutral">{tx(hold[0].tag)}</b>}
                  </div>
                  <details className="pfq-more pfq-more--tight">
                    <summary>
                      <span>
                        {hold.length === 1 ? (
                          <T en="What we see on it" bn="এটি নিয়ে আমরা যা দেখছি" />
                        ) : (
                          <T en={`What we see on these ${hold.length}`} bn={`এই ${hold.length}টি নিয়ে আমরা যা দেখছি`} />
                        )}
                      </span>
                      <span className="pfq-more-icon" aria-hidden="true">
                        <IconChevronDown size={16} />
                      </span>
                    </summary>
                    <ul className="pfr-figs pfq-more-body">
                      {hold.map((m) => (
                        <li key={m.key} className="pfp-hold-why">
                          <span className="pfr-figs-k">{tx(m.title)}</span>
                          <span>{tx(m.line)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              )}
            </ul>
          </Block>
        )}
      </div>
      {children}
    </section>
  );
}

/** One block of the plan: a plain heading, its answer chip, then its list. */
function Block({ id, title, word, tone, children }: { id: string; title: Bi; word: Bi; tone: Tone; children: ReactNode }) {
  return (
    <section id={`pf-plan-${id}`} className="pfq dash-section" aria-labelledby={`pf-plan-${id}-t`}>
      <div className="pfq-head">
        <h3 id={`pf-plan-${id}-t`}>
          <T en={title.en} bn={title.bn} />
        </h3>
        <ToneChip word={word} tone={tone} />
      </div>
      {children}
    </section>
  );
}

function ItemName({ item, plain = false }: { item: PfPlanItem; plain?: boolean }) {
  const cls = plain ? "pfp-hold-name" : "pfp-item-t";
  return item.code ? (
    <Link prefetch={false} href={`/stock/${item.code}`} className={cls}>
      {tx(item.title)}
    </Link>
  ) : (
    <span className={cls}>{tx(item.title)}</span>
  );
}
