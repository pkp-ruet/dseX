"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import {
  IconAlert, IconBell, IconBook, IconBriefcase, IconCalendar, IconCheck, IconCoin, IconCrown, IconGrid,
  IconList, IconNews, IconPlus, IconSun, IconTarget, IconTrendDown, IconTrendUp,
} from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { tx } from "@/components/report/chip";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { Grade } from "@/lib/portfolio-analysis";
import type { PfFinding } from "@/lib/portfolio-report";
import type { Bi } from "@/lib/stock-report";

const ICON: Record<PfFinding["key"], ReactNode> = {
  decide: <IconTarget size={18} />,
  warn: <IconAlert size={18} />,
  add: <IconPlus size={18} />,
  weak: <IconBriefcase size={18} />,
  grade: <IconTrendUp size={18} />,
  spread: <IconGrid size={18} />,
  moves: <IconList size={18} />,
  week: <IconNews size={18} />,
  paid: <IconCoin size={18} />,
  cash: <IconCoin size={18} />,
  results: <IconCalendar size={18} />,
  each: <IconBook size={18} />,
  strong: <IconCheck size={18} />,
  daily: <IconBell size={18} />,
  loss: <IconTrendDown size={18} />,
};

const ALSO: { icon: ReactNode; text: Bi }[] = [
  { icon: <IconCheck size={14} />, text: { en: "Checked after every close", bn: "প্রতিদিন বাজার বন্ধের পর যাচাই" } },
  { icon: <IconSun size={14} />, text: { en: "A brief at 9 AM on market days", bn: "লেনদেনের দিনে সকাল 9টায় ব্রিফ" } },
  { icon: <IconBell size={14} />, text: { en: "A notification when something changes", bn: "কিছু বদলালে নোটিফিকেশন" } },
];

/**
 * THE Premium card on the portfolio page (`#pf-premium`, 2026-11-02, user:
 * "the recent change we did to stock page apply same change to portfolio. a
 * single premium promo card which tells what kind of analysis and findings
 * waiting for him"). A free reader sees their money, their shares and the
 * detail tabs; the answer, the four chapters and the plan sit behind one gate
 * (`ReportGate`) and this card is where they would be. It says what the full
 * check found on THEIR portfolio as counts ("We found 4 shares you can add to
 * make your portfolio stronger", `buildFindings`), never which share or what
 * to do, then the price and one button. The grade letter is free (the
 * dashboard shows it too). The watcher's teaser push lands on this id.
 */
export default function PortfolioPromo({
  grade,
  findings,
  sampleHref,
}: {
  grade: Grade;
  findings: PfFinding[];
  /** A sample portfolio's page: the full check, free. */
  sampleHref: string;
}) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  const first = (user?.display_name ?? "").trim().split(/\s+/)[0] || "";
  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=portfolio#pay" : `${PREMIUM_PATH}#pay`;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "portfolio", lock: "pf-promo", state, stakes: findings.length, job: "watch" });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, findings.length]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "portfolio", lock: "pf-promo", state, stakes: findings.length, job: "watch" });
    savePremiumContext({
      from: "portfolio",
      label: bn ? "আপনার পোর্টফোলিওর পূর্ণ যাচাই" : "The full check on your portfolio",
      stakes: findings.slice(0, 3).map((x) => (bn ? x.title.bn : x.title.en)),
    });
  };

  return (
    <section ref={ref} id="pf-premium" className="sp dash-section" aria-labelledby="pfp-t">
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          <T en="Premium" bn="প্রিমিয়াম" />
        </p>
        <h2 id="pfp-t" className="sp-title">
          <T
            en={`${first ? `${first}, your` : "Your"} portfolio gets grade ${grade}. Premium tells you why, and what to do.`}
            bn={`${first ? `${first}, আপনার` : "আপনার"} পোর্টফোলিওর গ্রেড ${grade}। কেন, আর এখন কী করবেন, তা জানায় প্রিমিয়াম।`}
          />
        </h2>
        <p className="sp-lead">
          <T
            en="Your money, your shares and every number on this page are free. Premium reads them for you and tells you what to do, in plain words."
            bn="আপনার টাকা, শেয়ার আর এই পেজের সব সংখ্যা ফ্রিতেই দেখতে পারেন। প্রিমিয়াম আপনার হয়ে সেগুলো বিশ্লেষণ করে, আর সহজ ভাষায় বলে দেয় কী করবেন।"
          />
        </p>
      </div>

      <div className="sp-body">
        <p className="sp-k">
          <T en="What we found in your portfolio" bn="আপনার পোর্টফোলিওতে আমরা যা পেয়েছি" />
        </p>
        <ul className="sp-rows">
          {findings.map((x, i) => (
            <li key={`${x.key}-${i}`} className="sp-row">
              <span className="sp-icon" aria-hidden="true">{ICON[x.key]}</span>
              <span className="min-w-0">
                <b>{tx(x.title)}</b>
                <span>
                  <T en={`Premium shows you: ${lowerFirst(x.line.en)}`} bn={`প্রিমিয়ামে দেখবেন: ${x.line.bn}`} />
                </span>
              </span>
            </li>
          ))}
        </ul>

        <ul className="sp-also">
          {ALSO.map((a, i) => (
            <li key={i}>
              <span aria-hidden="true">{a.icon}</span>
              <T en={a.text.en} bn={a.text.bn} />
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
              <T en="Get the full check" bn="পূর্ণ যাচাই নিন" />
            )}
          </Button>
        </div>
      </div>

      <p className="sp-fine">
        <T en="Pay by bKash, Nagad or bank transfer. Nothing renews by itself." bn="bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিতে পারবেন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।" />
      </p>

      {/* The free sample, as its own band and button (2026-11-02, user: "make a
          separate button for sample portfolio to catch more attention"). */}
      <div className="pfp-sample">
        <span className="pfp-sample-icon" aria-hidden="true">
          <IconBook size={22} />
        </span>
        <span className="pfp-sample-text">
          <b>
            <T en="Not sure yet? See the full check on a sample portfolio." bn="এখনো নিশ্চিত নন? একটি নমুনা পোর্টফোলিওতে পূর্ণ যাচাই দেখুন।" />
          </b>
          <span>
            <T en="Every part is open there, free: the answer, all four chapters and the plan." bn="সেখানে সব অংশ খোলা, ফ্রিতে: উত্তর, চারটি অধ্যায় আর পরিকল্পনা।" />
          </span>
        </span>
        <Button
          href={sampleHref}
          variant="quiet"
          size="lg"
          className="pfp-sample-btn"
          onClick={() => trackEvent("premium_sample_tap", { area: "portfolio", state })}
        >
          <T en="See a sample check" bn="নমুনা যাচাই দেখুন" /> →
        </Button>
      </div>
    </section>
  );
}

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
