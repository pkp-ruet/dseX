"use client";

import type { ReactNode } from "react";
import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import TierPill from "@/components/ui/TierPill";
import { TONE_CLASS, tx } from "@/components/report/chip";
import { IconAlert, IconArrowRight, IconChevronDown, IconCoin } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { money, takaGroup } from "@/lib/formatters";
import type { TierKey } from "@/lib/constants";
import type { Grade } from "@/lib/portfolio-analysis";
import type { LossKind, PfEach, PfPathView, PfWayBack } from "@/lib/portfolio-report";

/**
 * Part 2 of the portfolio check, "Your plan" (`#ch-plan`, 2026-11-11, mockup
 * https://claude.ai/artifact/QJjjrtfUu1ZSJ4rd7wvVeY): what to do, in order.
 * Three cards, one job each:
 * - Your way back (`#ch-loss`, only with shares more than 5% below what was
 *   paid): the money below the price paid, split into only the price, worth a
 *   closer look, and the company has problems, with the price that gives the
 *   money back, the cash while you wait and, for a problem share, a stronger
 *   company the money could move to;
 * - Three changes to an A (`#pf-path`): `gradePath` step by step, with the
 *   trades, the fees and the loss a sale makes real;
 * - Each of your shares (`#pf-each`): the ones to act on, then the rest.
 * The three always name the same company for a share (one decision a share).
 */
export default function PfPlan({
  wayBack,
  path,
  each,
  grade,
  feePct,
  children,
}: {
  wayBack: PfWayBack | null;
  path: PfPathView | null;
  each: PfEach;
  grade: Grade;
  feePct: number;
  children?: ReactNode;
}) {
  return (
    <section id="ch-plan" className="dash-section pf-part" aria-labelledby="ch-plan-h">
      <header className="pf-part-h">
        <p className="pf-part-n">
          <T en="2 · Your plan" bn="2 · আপনার পরিকল্পনা" />
        </p>
        <h2 id="ch-plan-h" className="pf-part-title">
          <T en="What to do, in order" bn="কী করবেন, ক্রম অনুযায়ী" />
        </h2>
        <p className="pf-part-lead">
          <T
            en="Built from the same analysis as every stock page. Ideas, not advice: you decide."
            bn="প্রতিটি শেয়ারের পেজের একই বিশ্লেষণ থেকে তৈরি। এগুলো আইডিয়া, পরামর্শ নয়: সিদ্ধান্ত আপনার।"
          />
        </p>
      </header>
      {wayBack && <WayBack wayBack={wayBack} />}
      {path ? <PathCard path={path} feePct={feePct} /> : <NoPath grade={grade} />}
      <EachShare each={each} />
      {children}
    </section>
  );
}

// ── Your way back ──────────────────────────────────────────────────────────

const KIND_SWATCH: Record<LossKind, string> = { price: "good", mixed: "fair", worse: "bad" };

function WayBack({ wayBack }: { wayBack: PfWayBack }) {
  const n = wayBack.n;
  const split = wayBack.groups.length > 1;
  return (
    <section id="ch-loss" className="soft-card pfw dash-section" aria-labelledby="pfw-t">
      <p className="pf-card-k">
        <T en="Your way back" bn="টাকা ফেরানোর পথ" />
      </p>
      <h3 id="pfw-t" className="pf-card-title">
        <T
          en={`${takaGroup(wayBack.down)} of your money is below what you paid, in ${n} share${n === 1 ? "" : "s"}`}
          bn={`আপনার ${takaGroup(wayBack.down)} কেনা দামের নিচে, ${n}টি শেয়ারে`}
        />
      </h3>
      {split && (
        <p className="pf-card-lead">
          <T en="Some of it is only the price. Some of it is the company." bn="কিছুটা শুধু দামের কারণে, কিছুটা কোম্পানির কারণে।" />
        </p>
      )}
      {split && (
        <div className="pfw-split">
          <div className="pfw-bar" aria-hidden="true">
            {wayBack.groups.map((g) => (
              <i key={g.kind} data-tone={KIND_SWATCH[g.kind]} style={{ flexGrow: Math.max(g.down, 1) }} />
            ))}
          </div>
          <ul className="pfw-key">
            {wayBack.groups.map((g) => (
              <li key={g.kind}>
                <i data-tone={KIND_SWATCH[g.kind]} aria-hidden="true" />
                {tx(g.title)} · <span className="pv">{takaGroup(g.down)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pfw-groups">
        {wayBack.groups.map((g) => (
          <div key={g.kind} className="pfw-group" data-tone={KIND_SWATCH[g.kind]}>
            <div className="pfw-gh">
              <div className="pfw-gh-top">
                <h4>{tx(g.title)}</h4>
                <span className="pfw-count">
                  <T en={`${g.items.length} share${g.items.length === 1 ? "" : "s"}`} bn={`${g.items.length}টি শেয়ার`} />
                </span>
                <b className="pfw-amt pv">{takaGroup(g.down)}</b>
              </div>
              <p>{tx(g.line)}</p>
            </div>
            {g.items.map((it) => (
              <div key={it.code} className="pfw-item">
                <div className="pfw-it-top">
                  <Link href={`/stock/${it.code}`} className="pfw-code">{it.code}</Link>
                  {it.tierKey !== "unscored" && <TierPill tier={it.tierKey as TierKey} />}
                  {it.z && <span className="pfw-z">Z</span>}
                  <span className="pfw-pct pf-down">−{Math.round(it.downPct)}%</span>
                </div>
                <p className="pfw-why">{tx(it.why)}</p>
                <dl className="pfw-cells">
                  <div>
                    <dt><T en="Money back at" bn="টাকা ফিরবে" /></dt>
                    <dd>
                      {money(it.even)} <span className="pfw-rise">(+{Math.max(0, Math.round(it.rise))}%)</span>
                    </dd>
                  </div>
                  <div>
                    <dt><T en="Pays you a year" bn="বছরে দেয়" /></dt>
                    <dd className="pv">{it.cash >= 1 ? takaGroup(it.cash) : <T en="Nothing" bn="কিছুই না" />}</dd>
                  </div>
                  {it.reached != null && (
                    <div>
                      <dt><T en="This past year" bn="গত এক বছরে" /></dt>
                      <dd>
                        {it.reached ? (
                          <T en="It traded above it" bn="এর ওপরে লেনদেন হয়েছে" />
                        ) : (
                          <T en="It stayed below it" bn="এর নিচেই ছিল" />
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
                {it.more && <p className="pfw-more">{tx(it.more)}</p>}
                {it.move && (
                  <div className="pfw-move">
                    <IconArrowRight size={16} />
                    <span>
                      <b>
                        <T en="A stronger choice:" bn="আরও শক্তিশালী বিকল্প:" />
                      </b>{" "}
                      {tx(it.move.line)}
                      {it.move.step != null && (
                        <>
                          {" "}
                          <a href="#pf-path" className="pf-inline-link">
                            <T en={`Step ${it.move.step} of your path`} bn={`আপনার পথের ধাপ ${it.move.step}`} />
                          </a>
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {g.note && (
              <p className="pfw-note">
                <IconCoin size={16} />
                <span>{tx(g.note)}</span>
              </p>
            )}
          </div>
        ))}
      </div>

      {wayBack.watch && (
        <p className="pfq-watch">
          <span className="pfq-watch-icon" aria-hidden="true">
            <IconAlert size={16} />
          </span>
          <span>{tx(wayBack.watch)}</span>
        </p>
      )}
    </section>
  );
}

// ── Three changes to an A ──────────────────────────────────────────────────

function GradeBox({ g, size = "md" }: { g: Grade; size?: "sm" | "md" }) {
  return (
    <span className={`pf-gbox pf-g-${g}`} data-size={size}>
      {g}
    </span>
  );
}

function PathCard({ path, feePct }: { path: PfPathView; feePct: number }) {
  const t = path.totals;
  return (
    <section id="pf-path" className="soft-card pfpath dash-section" aria-labelledby="pfpath-t">
      <p className="pf-card-k">{tx(path.title)}</p>
      <h3 id="pfpath-t" className="pf-card-title">{tx(path.line)}</h3>
      <p className="pf-card-lead">
        <T
          en="Tried on your own shares at today's prices, in the order you would act: problem shares first, buys last."
          bn="আজকের দামে আপনার নিজের শেয়ারে চেষ্টা করা, যে ক্রমে আপনি করবেন: আগে সমস্যার শেয়ার, শেষে কেনা।"
        />
      </p>

      <ol className="pfpath-ladder">
        <li>
          <GradeBox g={path.from} />
          <span><T en="Now" bn="এখন" /></span>
        </li>
        {path.steps.map((s) => (
          <li key={s.n}>
            <GradeBox g={s.to} />
            <span><T en={`Step ${s.n}`} bn={`ধাপ ${s.n}`} /></span>
          </li>
        ))}
      </ol>

      <ol className="pfpath-steps">
        {path.steps.map((s) => (
          <li key={s.n} className="pfpath-step">
            <div className="pfpath-top">
              <span className="pfpath-n" aria-hidden="true">{s.n}</span>
              <h4>{tx(s.title)}</h4>
              <span className="pfpath-g">
                <GradeBox g={s.from} size="sm" />
                <span aria-hidden="true">→</span>
                <GradeBox g={s.to} size="sm" />
              </span>
            </div>
            <ul className="pfpath-trades">
              {s.trades.map((tr, i) => (
                <li key={i}>
                  <span className="pfpath-tk" data-side={tr.side}>
                    {tr.side === "sell" ? <T en="Sell" bn="বিক্রি" /> : <T en="Buy" bn="কেনা" />}
                  </span>
                  <span className="pv">{tx(tr.text)}</span>
                </li>
              ))}
            </ul>
            <p className="pfpath-why">{tx(s.why)}</p>
            {s.note && <p className={`pfpath-note ${TONE_CLASS[s.note.tone]}`}>{tx(s.note.text)}</p>}
          </li>
        ))}
      </ol>

      <dl className="pfpath-totals pv">
        <div>
          <dt><T en="You sell" bn="বিক্রি" /></dt>
          <dd>{takaGroup(t.sold)}</dd>
        </div>
        <div>
          <dt><T en="You buy" bn="কেনা" /></dt>
          <dd>{takaGroup(t.bought)}</dd>
        </div>
        <div>
          <dt><T en="Broker fees" bn="ব্রোকার ফি" /></dt>
          <dd>
            <T en={`about ${takaGroup(t.fees)}`} bn={`প্রায় ${takaGroup(t.fees)}`} />
          </dd>
        </div>
      </dl>
      {Math.abs(t.left) >= 1 && (
        <p className="pfpath-left pv">
          {t.left > 0 ? (
            <T en={`About ${takaGroup(t.left)} is left over.`} bn={`প্রায় ${takaGroup(t.left)} হাতে থাকে।`} />
          ) : (
            <T en={`You would need about ${takaGroup(-t.left)} more.`} bn={`আরও প্রায় ${takaGroup(-t.left)} লাগবে।`} />
          )}
        </p>
      )}

      <div className="pfpath-acts">
        <Button href="#pf-whatif" variant="quiet" size="sm">
          <T en="Try a change yourself" bn="নিজে একটি বদল চেষ্টা করুন" />
        </Button>
      </div>

      {path.more.length > 0 && (
        <details className="pf-fold">
          <summary>
            <T
              en={`${path.more.length} more share${path.more.length === 1 ? "" : "s"} that would fit your portfolio`}
              bn={`আপনার পোর্টফোলিওতে মানাবে এমন আরও ${path.more.length}টি শেয়ার`}
            />
            <IconChevronDown size={16} />
          </summary>
          <ul className="pf-fold-list">
            {path.more.map((m) => (
              <li key={m.key}>
                <div className="pf-fold-top">
                  {m.code ? (
                    <Link href={`/stock/${m.code}`} className="pf-fold-name">{tx(m.title)}</Link>
                  ) : (
                    <b className="pf-fold-name">{tx(m.title)}</b>
                  )}
                  {m.tag && <span className="pf-fold-tag">{tx(m.tag)}</span>}
                </div>
                <p>{tx(m.line)}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="pfpath-fine">
        <T
          en={`At today's prices. Fees are our estimate at ${feePct}% each way; your broker's may differ.`}
          bn={`আজকের দামে। ফি আমাদের হিসাবে প্রতি দিকে ${feePct}%; আপনার ব্রোকারের ফি আলাদা হতে পারে।`}
        />
      </p>
    </section>
  );
}

function NoPath({ grade }: { grade: Grade }) {
  return (
    <section id="pf-path" className="soft-card pfpath pfpath--none dash-section">
      <p className="pf-card-k">
        <T en="Your grade" bn="আপনার গ্রেড" />
      </p>
      <p className="pf-card-title">
        {grade === "A" ? (
          <T en="Your grade is A. Nothing in the plan would lift it further." bn="আপনার গ্রেড A। পরিকল্পনার কিছুতে এটি আরও বাড়বে না।" />
        ) : (
          <T
            en={`Your grade is ${grade}. No change we can stand behind lifts it today. Look at each share below.`}
            bn={`আপনার গ্রেড ${grade}। আজ আমাদের যাচাই করা কোনো বদলে এটি বাড়ে না। নিচে প্রতিটি শেয়ার দেখুন।`}
          />
        )}
      </p>
    </section>
  );
}

// ── Each of your shares ────────────────────────────────────────────────────

function EachShare({ each }: { each: PfEach }) {
  const n = each.act.length;
  const r = each.rest.length;
  return (
    <section id="pf-each" className="soft-card pfe dash-section" aria-labelledby="pfe-t">
      <p className="pf-card-k">
        <T en="Each of your shares" bn="আপনার প্রতিটি শেয়ার" />
      </p>
      <h3 id="pfe-t" className="pf-card-title">
        {n === 0 ? (
          <T en="Nothing to act on today" bn="আজ কিছু করার নেই" />
        ) : (
          <T
            en={`${n} to act on${r ? `, ${r} with nothing to do` : ""}`}
            bn={`${n}টিতে কিছু করার আছে${r ? `, ${r}টিতে কিছু নয়` : ""}`}
          />
        )}
      </h3>
      {n > 0 && (
        <ul className="pfe-list">
          {each.act.map((a) => (
            <li key={a.code} className="pfe-row">
              <div className="pfe-who">
                <Link href={`/stock/${a.code}`} className="pfe-code">{a.code}</Link>
                <span className="pf-act" data-act={a.action}>{tx(a.label)}</span>
              </div>
              <p className="pfe-line">{tx(a.line)}</p>
            </li>
          ))}
        </ul>
      )}
      {r > 0 && (
        <details className="pf-fold">
          <summary>
            <span>
              <b>
                <T en="Nothing to act on:" bn="কিছু করার নেই:" />
              </b>{" "}
              {each.rest.map((x) => x.code).join(", ")}
            </span>
            <IconChevronDown size={16} />
          </summary>
          <ul className="pf-fold-list">
            {each.rest.map((x) => (
              <li key={x.code}>
                <div className="pf-fold-top">
                  <Link href={`/stock/${x.code}`} className="pf-fold-name">{x.code}</Link>
                </div>
                <p>{tx(x.line)}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
