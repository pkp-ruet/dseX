"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { IconBlocks } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { dayParts } from "@/components/dividend-calendar/dates";
import { apiGetBuilderPlans } from "@/lib/api";
import { BUILDER_PATH, taka, type KeptPlan, type PlanChange } from "@/lib/portfolio-builder";

/** The plan watch follows a plan for 90 days (backend `plan_watch.WATCH_DAYS`). */
const WATCH_DAYS = 90;

const LEVEL_ORDER: Record<PlanChange["level"], number> = { good: 0, bad: 1, watch: 2 };

/** "23 Nov" / "23 নভে." on the Dhaka day the plan was built. */
function dayWord(iso: string): { en: string; bn: string } {
  const t = new Date(iso).getTime();
  const p = Number.isNaN(t) ? null : dayParts(new Date(t + 6 * 3_600_000).toISOString().slice(0, 10));
  return p ? { en: `${p.day} ${p.month.en}`, bn: `${p.day} ${p.month.bn}` } : { en: "", bn: "" };
}

/**
 * The portfolio builder under the reader's shares on Portfolio (2026-11-25,
 * "Compare and Builder Homes"; it was one line of text). Without a recent
 * plan: "Have new money to add?" and one button that starts the builder from
 * their shares. With a plan built in the last 90 days: "Your plan from 23
 * Nov", how many of its new shares they bought, and up to two things the plan
 * watch noticed on the ones they haven't (`changes`), then Open my plan.
 * Main portfolio only.
 */
export default function PlanCard({ heldCodes }: { heldCodes: Set<string> }) {
  const { user, isLoggedIn } = useAuth();
  const [plan, setPlan] = useState<KeptPlan | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    apiGetBuilderPlans()
      .then((r) => !cancelled && setPlan(r.latest ?? null))
      .catch(() => !cancelled && setPlan(null));
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  if (plan === undefined) return null;
  const firstFree = !user?.builder?.free_used;
  const fresh = plan && Date.now() - new Date(plan.created_at).getTime() < WATCH_DAYS * 86_400_000;
  const newMoney = `${BUILDER_PATH}?start=mine&src=portfolio`;

  if (!plan || !fresh) {
    return (
      <section className="pf-plan" aria-labelledby="pf-plan-h" data-card="pf-plan-new">
        <span className="pf-start-ic" aria-hidden="true">
          <IconBlocks size={18} />
        </span>
        <div className="pf-plan-main">
          <h3 className="pf-plan-t" id="pf-plan-h">
            <T en="Have new money to add?" bn="নতুন টাকা যোগ করবেন?" />
          </h3>
          <p className="pf-plan-d">
            <T
              en="We split it across strong companies without making any of your shares or businesses too big."
              bn="আপনার কোনো শেয়ার বা ব্যবসা বেশি বড় না করে আমরা তা শক্তিশালী কোম্পানিতে ভাগ করে দেব।"
            />
            {firstFree && (
              <>
                {" "}
                <T en="Your first plan is free." bn="প্রথম প্ল্যানটি ফ্রি।" />
              </>
            )}
          </p>
        </div>
        <Button href={newMoney} variant="quiet" size="md">
          <T en="Plan new money" bn="নতুন টাকার প্ল্যান" />
        </Button>
      </section>
    );
  }

  const items = plan.plan.items ?? [];
  const fresh_ = items.filter((it) => !it.adds_to);
  const bought = fresh_.filter((it) => heldCodes.has(it.code.toUpperCase())).length;
  const amount = plan.plan.answers?.amount ?? plan.plan.totals?.amount ?? 0;
  const changes = Object.entries(plan.changes ?? {})
    .filter(([code]) => !heldCodes.has(code.toUpperCase()))
    .sort((a, b) => LEVEL_ORDER[a[1].level] - LEVEL_ORDER[b[1].level])
    .slice(0, 2);
  const day = dayWord(plan.created_at);

  return (
    <section className="pf-plan pf-plan--kept" aria-labelledby="pf-plan-h" data-card="pf-plan">
      <span className="pf-start-ic" aria-hidden="true">
        <IconBlocks size={18} />
      </span>
      <div className="pf-plan-main">
        <h3 className="pf-plan-t" id="pf-plan-h">
          <T en={`Your plan from ${day.en}`} bn={`${day.bn}-এর প্ল্যান`} />
        </h3>
        <p className="pf-plan-d">
          <T
            en={`${taka(amount)} across ${items.length} ${items.length === 1 ? "share" : "shares"}.`}
            bn={`${taka(amount)}, ${items.length}টি শেয়ারে।`}
          />
          {fresh_.length > 0 && (
            <>
              {" "}
              {bought === 0 ? (
                <T en="You haven't bought any of them yet." bn="এখনো কোনোটি কেনেননি।" />
              ) : bought >= fresh_.length ? (
                <T en="You bought all of them." bn="সবগুলোই কিনেছেন।" />
              ) : (
                <T
                  en={`You bought ${bought} of the ${fresh_.length} new ones.`}
                  bn={`নতুন ${fresh_.length}টির মধ্যে ${bought}টি কিনেছেন।`}
                />
              )}
            </>
          )}
        </p>
        {changes.length > 0 && (
          <ul className="pf-plan-changes">
            {changes.map(([code, c]) => (
              <li key={code} className={`pf-plan-change pf-plan-change--${c.level}`}>
                <T en={c.en} bn={c.bn} />
              </li>
            ))}
          </ul>
        )}
        <div className="pf-plan-acts">
          <Button href={`${BUILDER_PATH}?plan=${encodeURIComponent(plan.id)}&src=portfolio`} variant="primary" size="md">
            <T en="Open my plan" bn="আমার প্ল্যান খুলুন" />
          </Button>
          <Button href={newMoney} variant="quiet" size="md">
            <T en="New plan" bn="নতুন প্ল্যান" />
          </Button>
        </div>
      </div>
    </section>
  );
}
