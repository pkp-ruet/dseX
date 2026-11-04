"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import {
  IconAlert, IconBell, IconBook, IconBriefcase, IconBulb, IconCheck, IconCoin, IconCrown, IconGrid, IconTarget,
} from "@/components/ui/icons";
import ReportKeyButton from "@/components/premium/ReportKeyButton";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { freeReportCode } from "@/lib/free-report";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { Bi } from "@/lib/stock-report";
import { usePortfolioFit } from "./usePortfolioFit";

type Row = { key: string; icon: ReactNode; q: Bi; line: Bi };

const ROWS: Row[] = [
  {
    key: "answer",
    icon: <IconTarget size={18} />,
    q: { en: "Should you buy it today?", bn: "আজ কি শেয়ারটি কেনা উচিত?" },
    line: { en: "A clear answer: buy, wait or stay away, and why.", bn: "পরিষ্কার উত্তর: কিনবেন, অপেক্ষা করবেন, নাকি এড়িয়ে যাবেন, আর তার কারণ।" },
  },
  {
    key: "ch-company",
    icon: <IconBriefcase size={18} />,
    q: { en: "Is it a good company?", bn: "কোম্পানিটি কি ভালো?" },
    line: {
      en: "Its profit, cash, loans and dividends, each explained in plain words.",
      bn: "মুনাফা, নগদ টাকা, ঋণ আর ডিভিডেন্ড, প্রতিটি বিষয় সহজ ভাষায় বুঝিয়ে বলা।",
    },
  },
  {
    key: "ch-price",
    icon: <IconCoin size={18} />,
    q: { en: "Is the price right?", bn: "দাম কি ন্যায্য?" },
    line: {
      en: "What the share is worth by our count, and the price we would buy it under.",
      bn: "আমাদের হিসাবে শেয়ারটির ন্যায্য দাম কত, আর কত দামের নিচে পেলে আমরা কিনতাম।",
    },
  },
  {
    key: "ch-risks",
    icon: <IconAlert size={18} />,
    q: { en: "Could anything go wrong?", bn: "কোনো সমস্যা হতে পারে কি?" },
    line: {
      en: "Warnings in its notices, what the owners are doing, and the main risks.",
      bn: "নোটিশে কোনো সতর্কতা আছে কি না, উদ্যোক্তা-পরিচালকেরা কী করছেন, আর মূল ঝুঁকিগুলো কী।",
    },
  },
  {
    key: "ch-view",
    icon: <IconBulb size={18} />,
    q: { en: "Our view, put together", bn: "সব মিলিয়ে আমাদের মত" },
    line: {
      en: "The case for, the case against, and what would change our answer.",
      bn: "পক্ষে যুক্তি, বিপক্ষে যুক্তি, আর কী হলে আমাদের উত্তর বদলাবে।",
    },
  },
  {
    key: "note",
    icon: <IconBook size={18} />,
    q: { en: "A written analysis", bn: "লিখিত বিশ্লেষণ" },
    line: {
      en: "A longer read on the business, its strengths and its weak spots.",
      bn: "কোম্পানির ব্যবসা, তার শক্তি আর দুর্বল দিক নিয়ে বিস্তারিত লেখা।",
    },
  },
];

const ALSO: Bi[] = [
  { en: "On every DSE share", bn: "ডিএসইর প্রতিটি শেয়ারে" },
  { en: "Updated after every result", bn: "প্রতিটি ফল প্রকাশের পর হালনাগাদ" },
  { en: "A notification when our answer changes", bn: "আমাদের উত্তর বদলালে নোটিফিকেশন" },
];

/**
 * THE Premium card on the stock page (`#ch-premium`, 2026-11-01, user: "there
 * will be one premium promotion card. it will explain what premium does in
 * very simple and plain language … very clean, attractive and premium").
 * A free reader sees the price, the chart and the data room; this card is
 * where the report would be. It names what the full report answers about
 * this share — the questions, never the answers — then the price and one
 * button. Report keys and today's free report are the two ways to try it.
 *
 * `has` = which parts this share's report fills (chapter ids, "answer",
 * "ch-view", "note"); a row shows only when its part exists.
 */
export default function PremiumPromo({ code, name, has }: { code: string; name: string; has: string[] }) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(freeReportCode()), []);

  const rows = ROWS.filter((r) => has.includes(r.key));
  // For a reader with shares (2026-11-04): what buying it would do to their own
  // portfolio, counted — the count is free, which things and how much is Premium.
  const { fit } = usePortfolioFit(code, null);
  const fitRow: Row | null = fit
    ? {
        key: "fit",
        icon: <IconGrid size={18} />,
        q: { en: "What would it do to your portfolio?", bn: "কিনলে আপনার পোর্টফোলিওর কী হবে?" },
        line:
          fit.changed > 1
            ? {
                en: `Buying it would change ${fit.changed} things in your portfolio. The full report shows which, worked out on your own ${fit.n} share${fit.n === 1 ? "" : "s"}.`,
                bn: `কিনলে আপনার পোর্টফোলিওতে ${fit.changed}টি বিষয় বদলাবে। কোনগুলো, তা পূর্ণ রিপোর্টে দেখাবে, আপনার নিজের ${fit.n}টি শেয়ার ধরে হিসাব করে।`,
              }
            : {
                en: `Your grade, your spread and your dividends if you buy it, worked out on your own ${fit.n} share${fit.n === 1 ? "" : "s"}.`,
                bn: `কিনলে আপনার গ্রেড, টাকার বণ্টন আর ডিভিডেন্ডের কী হবে, আপনার নিজের ${fit.n}টি শেয়ার ধরে হিসাব করে।`,
              },
      }
    : null;
  const shown = fitRow ? [...rows.slice(0, 1), fitRow, ...rows.slice(1)] : rows;
  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=stock#pay" : user ? `${PREMIUM_PATH}#pay` : PREMIUM_PATH;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "stock", lock: "stock-promo", state, stakes: rows.length });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, rows.length]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "stock", lock: "stock-promo", state, stakes: rows.length });
    savePremiumContext({
      from: "stock",
      label: bn ? `${code}-এর পূর্ণ রিপোর্ট` : `The full report on ${code}`,
      stakes: rows.slice(0, 3).map((r) => (bn ? r.q.bn : r.q.en)),
    });
  };

  return (
    <section ref={ref} id="ch-premium" className="sp stock-anchor" aria-labelledby="sp-t">
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          <T en="Premium" bn="প্রিমিয়াম" />
        </p>
        <h2 id="sp-t" className="sp-title">
          <T en={`Should you buy ${name}? Premium tells you, and why.`} bn={`${name} কি কিনবেন? প্রিমিয়াম কারণসহ তা জানায়।`} />
        </h2>
        <p className="sp-lead">
          <T
            en="The price and every number on this page are free. Premium reads those numbers for you and tells you what they mean, in plain words."
            bn="এই পেজের দাম আর সব সংখ্যা ফ্রিতেই দেখতে পারেন। প্রিমিয়াম আপনার হয়ে সংখ্যাগুলো বিশ্লেষণ করে, আর সহজ ভাষায় বলে দেয় এগুলোর মানে কী।"
          />
        </p>
      </div>

      <div className="sp-body">
        <p className="sp-k">
          <T en={`What the full report tells you about ${code}`} bn={`${code} নিয়ে পূর্ণ রিপোর্টে যা জানবেন`} />
        </p>
        <ul className="sp-rows">
          {shown.map((r) => (
            <li key={r.key} className="sp-row">
              <span className="sp-icon" aria-hidden="true">{r.icon}</span>
              <span className="min-w-0">
                <b>
                  <T en={r.q.en} bn={r.q.bn} />
                </b>
                <span>
                  <T en={r.line.en} bn={r.line.bn} />
                </span>
              </span>
            </li>
          ))}
        </ul>

        <ul className="sp-also">
          {ALSO.map((a, i) => (
            <li key={i}>
              <span aria-hidden="true">{i === 2 ? <IconBell size={14} /> : <IconCheck size={14} />}</span>
              <T en={a.en} bn={a.bn} />
            </li>
          ))}
        </ul>
      </div>

      <div className="sp-foot">
        <div className="sp-price">
          {offer ? (
            <>
              <b>
                <T en={`Your first month: ৳${offer.amount}`} bn={`আপনার প্রথম মাস: ৳${offer.amount}`} />
              </b>
              <span>
                <T en={`Instead of ৳${offer.list_amount}, once.`} bn={`৳${offer.list_amount}-এর বদলে, একবারই।`} />
              </span>
            </>
          ) : (
            <>
              <b>
                <T en={`৳${LOWEST_PRICE} a month`} bn={`মাসে ৳${LOWEST_PRICE}`} />
              </b>
              <span>
                <T en={`About ৳${FROM_MONTH} a month on the yearly plan.`} bn={`বছরের প্ল্যানে মাসে প্রায় ৳${FROM_MONTH}।`} />
              </span>
            </>
          )}
        </div>
        <div className="sp-cta">
          <Button href={href} onClick={onTap} size="lg" block>
            {offer ? (
              <T en={`Get your first month for ৳${offer.amount}`} bn={`প্রথম মাস ৳${offer.amount}-এ নিন`} />
            ) : (
              <T en="Get Premium" bn="প্রিমিয়াম নিন" />
            )}
          </Button>
          <ReportKeyButton code={code} />
        </div>
      </div>

      <p className="sp-fine">
        {state === "guest" ? (
          <T
            en="Create a free account, then pay by bKash, Nagad or bank transfer. Nothing renews by itself."
            bn="একটি ফ্রি অ্যাকাউন্ট খুলুন, তারপর bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।"
          />
        ) : (
          <T en="Pay by bKash, Nagad or bank transfer. Nothing renews by itself." bn="bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিতে পারবেন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।" />
        )}
        {today && today !== code.toUpperCase() && (
          <>
            {" "}
            <Link href={`/stock/${today}#ch-answer`} prefetch={false} className="font-semibold text-primary-ink hover:underline active:opacity-70">
              <T en={`See one first: the full report on ${today} is free today.`} bn={`আগে একটি দেখে নিন: আজ ${today}-এর পূর্ণ রিপোর্ট ফ্রি।`} />
            </Link>
          </>
        )}
      </p>
    </section>
  );
}
