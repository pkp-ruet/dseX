"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import QuestionRow from "@/components/report/QuestionRow";
import Signpost from "@/components/report/Signpost";
import { TONE_CLASS, tx } from "@/components/report/chip";
import { T } from "@/components/i18n/T";
import { takaGroup } from "@/lib/formatters";
import type { Grade } from "@/lib/portfolio-analysis";
import type { PfPlan, PfPlanItem } from "@/lib/portfolio-report";
import { PfChapterHead } from "../PfCard";

/**
 * "Your plan" (`#ch-plan`, 2026-10-30) — the stock report's "Our view" for
 * your money, Premium: what to do first (ranked by the taka at stake, the
 * same `buildNextMove` as before), what would lift the grade (`gradeLifts`),
 * what to buy next (the recommendation engine's ideas for this portfolio),
 * and what to do with each share. A free reader sees the questions with a
 * lock and one gold line up to the Premium card; the try-a-change tool sits
 * under the card for everyone (its result is Premium, `WhatIfCard`).
 */
export default function PfPlanSection({ plan, grade, children }: { plan: PfPlan; grade: Grade; children?: ReactNode }) {
  const open = usePremiumOpen();
  const lift = plan.lifts[0]?.tag ?? null;
  const rows: { key: string; title: { en: string; bn: string }; word: { en: string; bn: string } | null; tone: "good" | "fair" | "bad" | "neutral"; body: ReactNode }[] = [
    {
      key: "first",
      title: { en: "What should you do first?", bn: "প্রথমে কী করবেন?" },
      word: plan.moves.length
        ? { en: `${plan.moves.length} step${plan.moves.length === 1 ? "" : "s"}`, bn: `${plan.moves.length}টি পদক্ষেপ` }
        : { en: "Nothing urgent", bn: "জরুরি কিছু নেই" },
      tone: plan.moves.length ? plan.moves[0].tone ?? "fair" : "good",
      body: plan.moves.length ? (
        <ol className="pfp-list pfp-list--num">
          {plan.moves.map((m) => (
            <Item key={m.key} item={m} />
          ))}
        </ol>
      ) : (
        <p className="rq-answer">
          <T en="Nothing needs you today. Look again when your companies post their next results." bn="আজ কিছু করার নেই। কোম্পানিগুলোর পরের ফল বের হলে আবার দেখুন।" />
        </p>
      ),
    },
    {
      key: "lift",
      title: { en: "What would lift your grade?", bn: "কীসে আপনার গ্রেড বাড়বে?" },
      word: lift ?? (grade === "A" ? { en: "Already A", bn: "এখনই A" } : { en: "No quick lift", bn: "সহজ উপায় নেই" }),
      tone: lift ? "good" : "neutral",
      body: plan.lifts.length ? (
        <ul className="pfp-list">
          {plan.lifts.map((m) => (
            <Item key={m.key} item={m} />
          ))}
        </ul>
      ) : (
        <p className="rq-answer">
          {grade === "A" ? (
            <T en="Your grade is already the highest. Keep it there by checking each new result." bn="আপনার গ্রেড এখনই সবচেয়ে ভালো। প্রতিটি নতুন ফল দেখে সেটি ধরে রাখুন।" />
          ) : (
            <T en="No single change lifts your grade today. Small steps in the plan above add up." bn="আজ একটি বদলে গ্রেড বাড়ে না। ওপরের ছোট পদক্ষেপগুলো মিলে কাজ করে।" />
          )}
        </p>
      ),
    },
    {
      key: "buy",
      title: { en: "What should you buy next?", bn: "এরপর কী কিনবেন?" },
      word: plan.buys.length ? { en: `${plan.buys.length} idea${plan.buys.length === 1 ? "" : "s"}`, bn: `${plan.buys.length}টি আইডিয়া` } : { en: "None today", bn: "আজ নেই" },
      tone: plan.buys.length ? "good" : "neutral",
      body: plan.buys.length ? (
        <ul className="pfp-list">
          {plan.buys.map((m) => (
            <Item key={m.key} item={m} />
          ))}
        </ul>
      ) : (
        <p className="rq-answer">{plan.buyNone ? tx(plan.buyNone) : <T en="No share passes all our checks for you today." bn="আজ আপনার জন্য কোনো শেয়ার আমাদের সব যাচাই পেরোয়নি।" />}</p>
      ),
    },
    {
      key: "each",
      title: { en: "What to do with each share?", bn: "প্রতিটি শেয়ার নিয়ে কী করবেন?" },
      word: plan.each.length ? { en: `${plan.each.length} shares`, bn: `${plan.each.length}টি শেয়ার` } : null,
      tone: "neutral",
      body: (
        <ul className="pfp-list">
          {plan.each.map((m) => (
            <Item key={m.key} item={m} />
          ))}
        </ul>
      ),
    },
  ];

  return (
    <section id="ch-plan" className="dash-section pf-chapter" aria-labelledby="ch-plan-h">
      <PfChapterHead
        id="ch-plan-h"
        title={<T en="Your plan" bn="আপনার পরিকল্পনা" />}
        lead={
          <T
            en="What we would look at first, in the order of the money at stake. Ideas, not advice."
            bn="টাকার পরিমাণ অনুযায়ী আগে কী দেখব। পরামর্শ নয়, আইডিয়া।"
          />
        }
      />
      <div className="rp-sheet rc">
        {rows.map((r) => (
          <QuestionRow
            key={r.key}
            id={`pf-plan-${r.key}`}
            anchorClass="dash-section"
            title={<T en={r.title.en} bn={r.title.bn} />}
            word={r.word}
            tone={r.tone}
            premiumPicture={r.body}
            headline={null}
            teaser="lock"
          />
        ))}
        {!open && (
          <Signpost
            text={{ en: "Your plan ranks every move by the taka at stake.", bn: "আপনার পরিকল্পনা প্রতিটি পদক্ষেপ টাকার পরিমাণ ধরে সাজায়।" }}
            href="#pf-premium"
            area="portfolio"
            lock="pf-plan"
            foot
          />
        )}
      </div>
      {children}
    </section>
  );
}

function Item({ item }: { item: PfPlanItem }) {
  return (
    <li className="pfp-item">
      <div className="pfp-item-top">
        {item.code ? (
          <Link prefetch={false} href={`/stock/${item.code}`} className="pfp-item-t">
            {tx(item.title)}
          </Link>
        ) : (
          <span className="pfp-item-t">{tx(item.title)}</span>
        )}
        {item.tag && <b className={`pfp-tag ${item.tone ? TONE_CLASS[item.tone] : ""}`}>{tx(item.tag)}</b>}
      </div>
      <p className="pfp-item-l">{tx(item.line)}</p>
      {item.amount != null && (
        <p className="pfp-item-a">
          <T en="Money this is about: " bn="যত টাকা নিয়ে: " />
          <b className="pv">{takaGroup(item.amount)}</b>
        </p>
      )}
    </li>
  );
}
