"use client";

import type { ReactNode } from "react";
import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { IconBell, IconCheck, IconCrown, IconRedo } from "@/components/ui/icons";
import { dayShort } from "@/components/dividend-calendar/dates";
import {
  JOB_WORDS,
  LEAVE_WORDS,
  LIKE_WORDS,
  PURPOSE_WORDS,
  taka,
  unitPrice,
  type BuilderPlan as Plan,
  type PlanChange,
  type PlanItem,
  type PlanSummary,
} from "@/lib/portfolio-builder";

type Grade = "A" | "B" | "C" | "D" | "F";

/**
 * One plan (2026-11-23): Build again at the top (outlined) and the bottom
 * (full-width ink), the summary (shares, cash a year after tax, our
 * portfolio check's grade, money by job), then the shares to buy now and the
 * ones that wait for a better price. On a computer the summary sits beside
 * the list and stays in view. `crown` marks Build again as Premium for a
 * free reader who has used the free plan.
 */
export default function BuilderPlan({
  plan,
  changes = {},
  freePlan,
  crown,
  grade,
  plans,
  currentId,
  building,
  onBuildAgain,
  onNotForMe,
  onBought,
  onFollowAll,
  onAlert,
  onOpenPlan,
}: {
  plan: Plan;
  /** What the plan watch noticed since the plan was built ({code: change}). */
  changes?: Record<string, PlanChange>;
  /** This is the reader's free plan (a free reader). */
  freePlan: boolean;
  crown: boolean;
  /** Our portfolio check: before (their shares alone, "start from my shares") and after. */
  grade: { before: Grade | null; after: Grade | null } | null;
  plans: PlanSummary[];
  currentId: string | null;
  building: boolean;
  onBuildAgain: () => void;
  onNotForMe: (code: string) => void;
  onBought: () => void;
  onFollowAll: () => void;
  onAlert: (item: PlanItem) => void;
  onOpenPlan: (id: string) => void;
}) {
  const a = plan.answers;
  const t = plan.totals;
  const mine = a.start === "mine" && !!plan.held?.length;
  const now = plan.items.filter((i) => i.state === "now");
  const wait = plan.items.filter((i) => i.state === "wait");
  const built = dayShort(plan.as_of, true);
  const changed = Object.entries(changes).filter(([code]) => plan.items.some((i) => i.code === code));
  const again = (
    <>
      <IconRedo size={16} />
      <T en="Build again" bn="আবার বানান" />
      {crown && (
        <span className="pb-crown" aria-label="Premium">
          <IconCrown size={14} />
        </span>
      )}
    </>
  );

  return (
    <section className="pb" aria-labelledby="pb-title">
      <div className="pb-head">
        <div className="pb-headrow">
          {freePlan ? (
            <span className="pb-badge">
              <IconCheck size={12} />
              <T en="Your free plan" bn="আপনার ফ্রি পরিকল্পনা" />
            </span>
          ) : (
            <span />
          )}
          <button type="button" className="pb-again" onClick={onBuildAgain} disabled={building}>
            {again}
          </button>
        </div>
        {plan.as_of && (
          <p className="pb-eye">
            <T en={`At the closing prices of ${built.en}`} bn={`${built.bn}-এর ক্লোজিং দামে`} />
          </p>
        )}
        <h2 id="pb-title" className="pb-title">
          {mine ? (
            <T en={`${taka(a.amount)} added to your shares`} bn={`আপনার শেয়ারে ${taka(a.amount)} যোগ`} />
          ) : (
            <T en={`Your ${taka(a.amount)} portfolio`} bn={`আপনার ${taka(a.amount)}-এর পোর্টফোলিও`} />
          )}
        </h2>
        <div className="pb-answers">
          {mine && (
            <span className="pb-ans">
              <T en="Added to my shares" bn="আমার শেয়ারে যোগ" />
            </span>
          )}
          <span className="pb-ans">
            <T en={PURPOSE_WORDS[a.purpose].chip.en} bn={PURPOSE_WORDS[a.purpose].chip.bn} />
          </span>
          {a.likes.map((k) => (
            <span key={k} className="pb-ans">
              <T en={LIKE_WORDS[k].en} bn={LIKE_WORDS[k].bn} />
            </span>
          ))}
          {a.leave_out.map((k) => (
            <span key={k} className="pb-ans">
              <T en={`No ${LEAVE_WORDS[k].en.toLowerCase()}`} bn={`${LEAVE_WORDS[k].bn} বাদ`} />
            </span>
          ))}
        </div>
      </div>

      {changed.length > 0 && (
        <section className="pb-changes" aria-labelledby="pb-changes-t">
          <h3 id="pb-changes-t" className="pb-k">
            <T en="Since you built this plan" bn="পরিকল্পনা বানানোর পর থেকে" />
          </h3>
          <ul>
            {changed.map(([code, c]) => (
              <li key={code} data-level={c.level}>
                <a href={`#pb-${code}`} className="pb-change-code">
                  {code}
                </a>
                <span className="min-w-0">
                  <b>
                    <T en={c.en} bn={c.bn} />
                  </b>
                  {c.body_en && (
                    <span>
                      <T en={c.body_en} bn={c.body_bn || c.body_en} />
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.notes.length > 0 && (
        <ul className="pb-notes">
          {plan.notes.map((n) => (
            <li key={n.key} className="pb-note" data-key={n.key}>
              <T en={n.en} bn={n.bn} />
            </li>
          ))}
        </ul>
      )}

      <div className="pb-layout">
        <aside className="pb-side">
          <div className="pb-card">
            <dl className="pb-stats">
              {mine ? (
                <div>
                  <dt>
                    <T
                      en={`in ${t.businesses_after ?? t.businesses} businesses, after this`}
                      bn={`এরপর ${t.businesses_after ?? t.businesses}টি ব্যবসায়`}
                    />
                  </dt>
                  <dd>
                    <T en={`${t.shares_after ?? t.shares} shares`} bn={`${t.shares_after ?? t.shares}টি শেয়ার`} />
                  </dd>
                </div>
              ) : (
                <div>
                  <dt>
                    <T en={`in ${t.businesses} businesses`} bn={`${t.businesses}টি ব্যবসায়`} />
                  </dt>
                  <dd>
                    <T en={`${t.shares} shares`} bn={`${t.shares}টি শেয়ার`} />
                  </dd>
                </div>
              )}
              <div>
                <dt>
                  {mine ? (
                    <T en="more cash a year, after tax" bn="বছরে আরও নগদ, কর বাদে" />
                  ) : (
                    <T en="cash a year, after tax" bn="বছরে নগদ, কর বাদে" />
                  )}
                </dt>
                <dd className="num">{taka(t.cash_year)}</dd>
              </div>
              <div>
                <dt>
                  {mine ? (
                    <T en="our portfolio check, before → after" bn="পোর্টফোলিও যাচাই, আগে → পরে" />
                  ) : (
                    <T en="on our portfolio check" bn="আমাদের পোর্টফোলিও যাচাইয়ে" />
                  )}
                </dt>
                <dd className="pb-grades">
                  {mine && grade?.before && (
                    <>
                      <span className="pb-grade" data-g={grade.before}>
                        {grade.before}
                      </span>
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                  {grade?.after ? (
                    <span className="pb-grade" data-g={grade.after}>
                      {grade.after}
                    </span>
                  ) : (
                    "–"
                  )}
                </dd>
              </div>
              <div>
                <dt>
                  {t.wait_count > 0 ? (
                    <T
                      en={`${t.wait_count} ${t.wait_count === 1 ? "waits" : "wait"} for a better price`}
                      bn={`${t.wait_count}টির ভালো দামের অপেক্ষা`}
                    />
                  ) : (
                    <T en="all at today's price" bn="সবই আজকের দামে" />
                  )}
                </dt>
                <dd>
                  <T en={`${t.now_count} now`} bn={`এখন ${t.now_count}টি`} />
                </dd>
              </div>
            </dl>

            <div className="pb-jobs">
              <p className="pb-k">
                <T en="What each part of your money does" bn="টাকার কোন অংশ কী কাজ করবে" />
              </p>
              <div className="pb-split" aria-hidden="true">
                {plan.jobs.map((j) => (
                  <i key={j.job} data-job={j.job} style={{ width: `${Math.max(2, j.pct)}%` }} />
                ))}
              </div>
              <ul className="pb-legend">
                {plan.jobs.map((j) => (
                  <li key={j.job}>
                    <i data-job={j.job} aria-hidden="true" />
                    <T en={JOB_WORDS[j.job].en} bn={JOB_WORDS[j.job].bn} />
                    <span className="num">{taka(j.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <dl className="pb-totals num">
              <div>
                <dt>
                  <T en="Buy now" bn="এখন কিনবেন" />
                </dt>
                <dd>{taka(t.now)}</dd>
              </div>
              {t.kept > 0 && (
                <div>
                  <dt>
                    <T en="Kept for a better price" bn="ভালো দামের জন্য রাখা" />
                  </dt>
                  <dd>{taka(t.kept)}</dd>
                </div>
              )}
              <div>
                <dt>
                  <T en="Broker fee, about 0.4%" bn="ব্রোকার ফি, প্রায় 0.4%" />
                </dt>
                <dd>{taka(t.fee)}</dd>
              </div>
              <div>
                <dt>
                  <T en="Left over" bn="বাকি থাকবে" />
                </dt>
                <dd>{taka(t.left)}</dd>
              </div>
              <div className="pb-sum">
                <dt>
                  <T en="Total" bn="মোট" />
                </dt>
                <dd>{taka(t.amount)}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className="pb-main">
          {now.length > 0 && (
            <Group
              title={{ en: "Buy now", bn: "এখন কিনুন" }}
              count={{ en: `${now.length} ${now.length === 1 ? "share" : "shares"}`, bn: `${now.length}টি শেয়ার` }}
            >
              {now.map((i) => (
                <Row key={i.code} item={i} change={changes[i.code]} onNotForMe={onNotForMe} onAlert={onAlert} building={building} />
              ))}
            </Group>
          )}
          {wait.length > 0 && (
            <Group
              title={{ en: "Wait for a better price", bn: "ভালো দামের অপেক্ষা" }}
              count={{ en: `${wait.length} ${wait.length === 1 ? "share" : "shares"}`, bn: `${wait.length}টি শেয়ার` }}
            >
              {wait.map((i) => (
                <Row key={i.code} item={i} change={changes[i.code]} onNotForMe={onNotForMe} onAlert={onAlert} building={building} />
              ))}
            </Group>
          )}

          {plan.items.length > 0 && (
            <div className="pb-actions">
              <Button size="lg" block onClick={onBought}>
                <T en="I bought these: add to my portfolio" bn="কিনেছি, পোর্টফোলিওতে যোগ করুন" />
              </Button>
              <Button variant="quiet" size="lg" block onClick={onFollowAll}>
                <T en={`Follow all ${plan.items.length}`} bn={`${plan.items.length}টিই ফলো করুন`} />
              </Button>
            </div>
          )}
          {mine && plan.held && (
            <details className="pb-how">
              <summary>
                <T en={`The shares you already own · ${plan.held.length}`} bn={`আপনার আগের শেয়ার · ${plan.held.length}টি`} />
              </summary>
              <ul className="pb-held">
                {plan.held.map((h) => (
                  <li key={h.code}>
                    <Link href={`/stock/${h.code}`} className="pb-name">
                      {h.code}
                    </Link>
                    <span>{h.sector ? <T en={h.sector} bn={h.sector_bn || h.sector} /> : null}</span>
                    <span className="num">{taka(h.value)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <button type="button" className="pb-again-big" onClick={onBuildAgain} disabled={building}>
            {again}
          </button>
          <p className="pb-again-note">
            <T en="Try another amount, purpose or kind of company." bn="অন্য টাকা, অন্য লক্ষ্য বা অন্য ধরনের কোম্পানি দিয়ে দেখুন।" />
          </p>

          <details className="pb-how">
            <summary>
              <T en="How we built this plan" bn="আমরা কীভাবে বানিয়েছি" />
            </summary>
            <ol>
              <li>
                <T
                  en={`We started from the ${plan.pool.strong} companies our analysis rates strong today: a profit in the latest results, no serious warnings, loans under what they have saved, and traded enough. ${plan.pool.fit} of them fit your answers and your amount.`}
                  bn={`আজ আমাদের বিশ্লেষণে শক্তিশালী ${plan.pool.strong}টি কোম্পানি থেকে শুরু করেছি: সর্বশেষ ফলাফলে মুনাফা, গুরুতর কোনো সতর্কতা নেই, ঋণ জমানো টাকার চেয়ে কম, আর যথেষ্ট লেনদেন হয়। এর মধ্যে ${plan.pool.fit}টি আপনার উত্তর আর টাকার সাথে মেলে।`}
                />
              </li>
              <li>
                <T
                  en="Each share has a job: hold steady (big, steady companies), pay cash (cash every year), grow (profit rising) or low price (under our fair price). What the money is for sets how much goes to each job."
                  bn="প্রতিটি শেয়ারের একটি কাজ: স্থির ভিত্তি (বড়, স্থির কোম্পানি), নগদ দেওয়া (প্রতি বছর নগদ), বাড়া (মুনাফা বাড়ছে) বা কম দামে (আমাদের ন্যায্য দামের নিচে)। টাকার লক্ষ্য ঠিক করে কোন কাজে কতটা যাবে।"
                />
              </li>
              <li>
                <T
                  en="No share gets more than 20% of the money, no business more than 30%, and banks, finance companies and insurers together stay under 30%."
                  bn="কোনো শেয়ারে টাকার 20%-এর বেশি নয়, কোনো ব্যবসায় 30%-এর বেশি নয়, আর ব্যাংক, আর্থিক প্রতিষ্ঠান ও বিমা মিলে 30%-এর কম।"
                />
              </li>
              <li>
                <T
                  en="A share is bought now when its price is under the middle of our fair price. A strong company whose price is a little high waits, with the price to buy it at."
                  bn="দাম আমাদের ন্যায্য দামের মাঝামাঝির নিচে থাকলে শেয়ারটি এখনই কেনা। শক্তিশালী কোম্পানির দাম একটু বেশি হলে অপেক্ষা, সঙ্গে কোন দামে কিনবেন তা।"
                />
              </li>
              <li>
                <T
                  en="Whole shares only, with the broker's fee set aside first, so the plan never costs more than your amount."
                  bn="শুধু পূর্ণ শেয়ার, আর ব্রোকারের ফি আগে আলাদা রাখা, তাই পরিকল্পনা কখনো আপনার টাকার বেশি খরচ করে না।"
                />
              </li>
            </ol>
          </details>

          {plans.length > 1 && (
            <div className="pb-kept">
              <p className="pb-k">
                <T en={`Your plans · ${plans.length}`} bn={`আপনার পরিকল্পনা · ${plans.length}টি`} />
              </p>
              <ul>
                {plans.map((p) => {
                  const d = dayShort(p.created_at?.slice(0, 10));
                  const on = p.id === currentId;
                  return (
                    <li key={p.id}>
                      <button type="button" aria-current={on ? "true" : undefined} onClick={() => onOpenPlan(p.id)}>
                        <span className="num">{taka(p.answers.amount)}</span>
                        <span>
                          <T en={PURPOSE_WORDS[p.answers.purpose].chip.en} bn={PURPOSE_WORDS[p.answers.purpose].chip.bn} />
                        </span>
                        <span>
                          <T en={`${p.shares} shares · ${d.en}`} bn={`${p.shares}টি শেয়ার · ${d.bn}`} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p className="pb-fine">
            <T
              en="A plan from our analysis, not investment advice. Read each share's analysis before you buy."
              bn="আমাদের বিশ্লেষণ থেকে বানানো পরিকল্পনা, বিনিয়োগ পরামর্শ নয়। কেনার আগে প্রতিটি শেয়ারের বিশ্লেষণ পড়ে নিন।"
            />
          </p>
        </div>
      </div>
    </section>
  );
}

function Group({ title, count, children }: { title: { en: string; bn: string }; count: { en: string; bn: string }; children: ReactNode }) {
  return (
    <div className="pb-group">
      <h3 className="pb-gh">
        <T en={title.en} bn={title.bn} />
        <span>
          <T en={count.en} bn={count.bn} />
        </span>
      </h3>
      <ul className="pb-rows">{children}</ul>
    </div>
  );
}

function Row({
  item,
  change,
  onNotForMe,
  onAlert,
  building,
}: {
  item: PlanItem;
  change?: PlanChange;
  onNotForMe: (code: string) => void;
  onAlert: (item: PlanItem) => void;
  building: boolean;
}) {
  const wait = item.state === "wait";
  return (
    <li className="pb-row" id={`pb-${item.code}`}>
      <div className="pb-row-top">
        <div className="min-w-0">
          <span className="pb-tags">
            <span className="pb-job" data-job={item.job}>
              <i aria-hidden="true" />
              <T en={JOB_WORDS[item.job].en} bn={JOB_WORDS[item.job].bn} />
            </span>
            {item.adds_to && (
              <span className="pb-tag">
                <T en="Adds to yours" bn="আপনার শেয়ারে যোগ" />
              </span>
            )}
            {change && (
              <span className="pb-tag" data-level={change.level}>
                <T en={change.en} bn={change.bn} />
              </span>
            )}
          </span>
          <Link href={`/stock/${item.code}`} className="pb-name">
            {item.name}
          </Link>
          <span className="pb-code">
            {item.code}
            {item.sector ? (
              <>
                {" · "}
                <T en={item.sector} bn={item.sector_bn || item.sector} />
              </>
            ) : null}
          </span>
        </div>
        <div className="pb-amt num">
          <b>{taka(item.amount)}</b>
          <span>
            {wait ? (
              <T en={`kept for ${item.qty}`} bn={`${item.qty}টির জন্য রাখা`} />
            ) : (
              <T
                en={`${item.qty} ${item.qty === 1 ? "share" : "shares"} × ${unitPrice(item.price)}`}
                bn={`${item.qty}টি শেয়ার × ${unitPrice(item.price)}`}
              />
            )}
          </span>
        </div>
      </div>

      {wait && item.wait_under != null && (
        <div className="pb-wait num">
          <b>
            <T en={`Buy under ${unitPrice(item.wait_under)}`} bn={`${unitPrice(item.wait_under)}-এর নিচে কিনুন`} />
          </b>
          <span>
            <T
              en={`Today ${unitPrice(item.price)}. ${item.wait_why?.en ?? ""}`}
              bn={`আজ ${unitPrice(item.price)}। ${item.wait_why?.bn ?? ""}`}
            />
          </span>
        </div>
      )}

      <p className="pb-why">
        <T en={item.why.en} bn={item.why.bn} />
      </p>
      {item.watch && (
        <p className="pb-watch" data-level={item.watch.level || "amber"}>
          <T en={item.watch.en} bn={item.watch.bn} />
        </p>
      )}

      <div className="pb-row-foot">
        <button type="button" className="pb-not" onClick={() => onNotForMe(item.code)} disabled={building}>
          <T en="Not for me" bn="পছন্দ নয়" />
        </button>
        {wait && item.wait_under != null && (
          <button type="button" className="pb-alert" onClick={() => onAlert(item)}>
            <IconBell size={14} />
            <T en={`Alert me at ${unitPrice(item.wait_under)}`} bn={`${unitPrice(item.wait_under)} হলে জানান`} />
          </button>
        )}
        <Link href={`/stock/${item.code}#ch-analysis`} className="pb-read">
          <T en="Read our analysis ›" bn="আমাদের বিশ্লেষণ ›" />
        </Link>
      </div>
    </li>
  );
}
