"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import {
  IconBell, IconBook, IconBriefcase, IconCheck, IconCheckCircle, IconCrown, IconList, IconSun, IconTarget,
} from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { isoLocal, todayDhaka } from "@/lib/dividend-dates";
import { takaGroup } from "@/lib/formatters";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { LossKind, PfFinding, PfOutline, PfPromo, PfTaste } from "@/lib/portfolio-report";
import { PfQuestion } from "./PfArea";

/** Which version of the card a GA event came from (old card = no variant). */
const VARIANT = "v5";

/** The free answer: one a month per reader, kept in this browser. */
const TASTE_KEY = (uid: string) => `dsex.pf.taste.${uid}`;
type TasteUse = { month: string; finding: PfFinding["key"] };
const readTaste = (uid: string): TasteUse | null => {
  try {
    const raw = localStorage.getItem(TASTE_KEY(uid));
    return raw ? (JSON.parse(raw) as TasteUse) : null;
  } catch {
    return null;
  }
};

type Bi = { en: string; bn: string };
const B = (en: string, bn: string): Bi => ({ en, bn });
const s = (n: number) => (n === 1 ? "" : "s");

const GROUP_WORD: Record<LossKind, { en: (n: number) => string; bn: (n: number) => string; tone: string }> = {
  price: { en: (n) => `${n} share${s(n)}: only the price fell`, bn: (n) => `${n}টি শেয়ার: শুধু দাম কমেছে`, tone: "good" },
  mixed: { en: (n) => `${n} share${s(n)}: worth a closer look`, bn: (n) => `${n}টি শেয়ার: ভালো করে দেখা দরকার`, tone: "fair" },
  worse: { en: (n) => `${n} share${s(n)}: the company has problems`, bn: (n) => `${n}টি শেয়ার: কোম্পানিতেও সমস্যা`, tone: "bad" },
};

/** What a free reader has today, and what Premium adds (the four parts below, in order). */
const FREE_HAS: Bi[] = [
  B("Your money: what it is worth, today's move, what it made", "আপনার টাকা: এখন কত, আজ কত বদলাল, কত আয় হলো"),
  B("Every share with its price and its group", "প্রতিটি শেয়ার, তার দাম আর গ্রুপ"),
  B("Your grade letter", "আপনার গ্রেডের অক্ষর"),
];
const PREMIUM_ADDS: Bi[] = [
  B("What your grade means, area by area", "আপনার গ্রেডের মানে, প্রতিটি দিক ধরে"),
  B("A plan: what to do with each share", "একটি পরিকল্পনা: প্রতিটি শেয়ার নিয়ে কী করবেন"),
  B("The reasons, with the figures", "কারণগুলো, হিসাবসহ"),
  B("A watch on your shares every day", "প্রতিদিন আপনার শেয়ারের ওপর নজর"),
];

/**
 * THE Premium card on the portfolio page (`#pf-premium`). A free reader sees
 * their money, their shares and the detail tabs; the check (verdict, plan,
 * why) sits behind one gate and this card is where it would be. The
 * watcher's teaser push lands on this id.
 *
 * Richer since 2026-11-12 (user: "make free user premium card more rich with
 * easy explanation so user understand clearly what premium has"), on the
 * 2026-11-11 outline of the reader's own check:
 * - the band: who it is for and, in one plain sentence, what Premium does;
 * - "You have now" against "Premium adds", four short lines that are the
 *   four parts below, in order;
 * - four numbered parts — the verdict, your plan, why we say this, every day —
 *   each with the plain question it answers, one sentence on what it is, what
 *   it found on these shares (counted, free; never a share's name, never what
 *   to do) and a short made-up example of what a Premium reader sees there
 *   (marked "Example", no ticker; the /premium page's rule);
 * - the price and one button (sticky beside the parts from 900px);
 * - "Not sure yet?" (a sample check, and one answer free a month).
 */
export default function PortfolioPromo({
  findings,
  promo,
  outline,
  sampleHref,
}: {
  findings: PfFinding[];
  promo: PfPromo;
  outline: PfOutline;
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
  const o = outline;
  const wb = o.wayBack;
  const steps = o.path ? o.path.grades.length - 1 : 0;
  const last = o.path ? o.path.grades[steps] : null;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", {
          area: "portfolio", lock: "pf-outline", state, job: "watch", variant: VARIANT,
          loss: wb ? 1 : 0, path: steps, act: o.act, flagged: o.flagged,
        });
        io.disconnect();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, wb, steps, o.act, o.flagged]);

  const onTap = (where: string) => {
    trackEvent("premium_lock_tap", { area: "portfolio", lock: "pf-outline", state, job: "watch", variant: VARIANT, where });
    savePremiumContext({
      from: "portfolio",
      label: bn ? "আপনার পোর্টফোলিওর পূর্ণ যাচাই" : "The full check on your portfolio",
      stakes: findings.slice(0, 3).map((x) => (bn ? x.title.bn : x.title.en)),
    });
  };

  return (
    <section ref={ref} id="pf-premium" className="pfo dash-section" aria-labelledby="pfo-t">
      {/* ── Who it is for, and what Premium does ── */}
      <div className="pfo-band">
        <p className="pfo-k">
          <IconCrown size={15} />
          <T en="Premium · Your portfolio check" bn="প্রিমিয়াম · আপনার পোর্টফোলিও যাচাই" />
        </p>
        <h2 id="pfo-t" className="pfo-title">
          <T
            en={`${first ? `${first}, your` : "Your"} check on ${o.n} share${s(o.n)} is ready`}
            bn={`${first ? `${first}, ` : ""}আপনার ${o.n}টি শেয়ারের যাচাই তৈরি`}
          />
        </h2>
        <p className="pfo-lead">
          <T
            en="Free shows you your money and your shares. Premium reads them for you: is your portfolio in good shape, what should you do, and why. Then it keeps watching them every day."
            bn="ফ্রিতে দেখেন আপনার টাকা আর শেয়ার। প্রিমিয়াম সেগুলো আপনার হয়ে পড়ে দেয়: পোর্টফোলিও ভালো অবস্থায় আছে কি না, কী করবেন, আর কেন। তারপর প্রতিদিন নজর রাখে।"
          />
        </p>
      </div>

      {/* ── You have now / Premium adds ── */}
      <div className="pfo-compare">
        <div className="pfo-col">
          <p className="pfo-col-k">
            <T en="You have now, free" bn="এখন ফ্রিতে আছে" />
          </p>
          <ul>
            {FREE_HAS.map((x) => (
              <li key={x.en}>
                <IconCheck size={14} />
                <T en={x.en} bn={x.bn} />
              </li>
            ))}
          </ul>
        </div>
        <div className="pfo-col pfo-col--pm">
          <p className="pfo-col-k">
            <IconCrown size={14} />
            <T en="Premium adds" bn="প্রিমিয়ামে যোগ হয়" />
          </p>
          <ol>
            {PREMIUM_ADDS.map((x, i) => (
              <li key={x.en}>
                <span className="pfo-mini-n" aria-hidden="true">{i + 1}</span>
                <T en={x.en} bn={x.bn} />
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="pfo-main">
        <ol className="pfo-parts">
          {/* 1 · The verdict */}
          <Part
            n={1}
            icon={<IconTarget size={18} />}
            name={B("The verdict", "রায়")}
            ask={B("Is my portfolio in good shape?", "আমার পোর্টফোলিও কি ভালো অবস্থায় আছে?")}
            what={B(
              "We look at four things: how strong your companies are, how your money is spread, whether today's prices are fair, and any warnings. You get one answer, and what your grade means.",
              "আমরা চারটি জিনিস দেখি: কোম্পানিগুলো কতটা শক্তিশালী, টাকা কীভাবে ভাগ করা, আজকের দাম ন্যায্য কি না, আর কোনো সতর্কসংকেত আছে কি না। আপনি পান একটি উত্তর, আর আপনার গ্রেডের মানে।",
            )}
            found={
              <p className="pfo-free">
                <span className={`pf-gbox pf-g-${o.grade}`} data-size="sm">{o.grade}</span>
                {o.toLook === 0 ? (
                  <T en="All 4 areas look good." bn="4টি দিকই ভালো দেখাচ্ছে।" />
                ) : (
                  <T en={`${o.toLook} of the 4 areas need a look.`} bn={`4টি দিকের ${o.toLook}টি দেখা দরকার।`} />
                )}
              </p>
            }
            example={
              <>
                <p className="pfo-ex-row">
                  <span className="pfo-ex-chip" data-tone="fair">
                    <T en="Needs work" bn="কাজ দরকার" />
                  </span>
                  <span className="pf-gbox pf-g-C" data-size="sm">C</span>
                </p>
                <p>
                  <T
                    en="Your companies are mostly strong, but a third of your money sits in one share."
                    bn="আপনার কোম্পানিগুলো বেশিরভাগ শক্তিশালী, কিন্তু টাকার এক-তৃতীয়াংশ একটি শেয়ারে।"
                  />
                </p>
              </>
            }
          />

          {/* 2 · Your plan */}
          <Part
            n={2}
            icon={<IconList size={18} />}
            name={B("Your plan", "আপনার পরিকল্পনা")}
            ask={B("What should I do?", "আমার কী করা উচিত?")}
            what={B(
              "Plain steps for your own shares: which to keep, which to switch for a stronger company, how many to buy or sell, and what it costs in fees.",
              "আপনার নিজের শেয়ারের জন্য সহজ ধাপ: কোনটি রাখবেন, কোনটি বদলে শক্তিশালী কোম্পানিতে যাবেন, কয়টি কিনবেন বা বেচবেন, আর তাতে ফি কত।",
            )}
            found={
              <>
                {wb && (
                  <div className="pfo-wb">
                    <p className="pfo-free pv">
                      <T
                        en={`${takaGroup(wb.down)} of your money is below what you paid.`}
                        bn={`আপনার ${takaGroup(wb.down)} কেনা দামের নিচে।`}
                      />
                    </p>
                    {wb.groups.length > 1 && (
                      <div className="pfw-bar" aria-hidden="true">
                        {wb.groups.map((g) => (
                          <i key={g.kind} data-tone={GROUP_WORD[g.kind].tone} style={{ flexGrow: Math.max(g.down, 1) }} />
                        ))}
                      </div>
                    )}
                    <ul className="pfw-key">
                      {wb.groups.map((g) => (
                        <li key={g.kind}>
                          <i data-tone={GROUP_WORD[g.kind].tone} aria-hidden="true" />
                          <T en={GROUP_WORD[g.kind].en(g.count)} bn={GROUP_WORD[g.kind].bn(g.count)} />
                          {" · "}
                          <span className="pv">{takaGroup(g.down)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {o.path && last && (
                  <p className="pfo-free">
                    <T
                      en={`${steps} change${s(steps)} take${steps === 1 ? "s" : ""} your grade to ${last}:`}
                      bn={`${steps}টি বদলে আপনার গ্রেড হয় ${last}:`}
                    />
                    <span className="pfo-ladder" aria-hidden="true">
                      {o.path.grades.map((g, i) => (
                        <span key={i} className="pfo-ladder-step">
                          {i > 0 && <span className="pfo-ar">→</span>}
                          <span className={`pf-gbox pf-g-${g}`} data-size="sm">{g}</span>
                        </span>
                      ))}
                    </span>
                  </p>
                )}
                <p className="pfo-free">
                  {o.act === 0 ? (
                    <T en={`None of your ${o.n} shares needs action today.`} bn={`আজ আপনার ${o.n}টি শেয়ারের কোনোটিতে কিছু করার নেই।`} />
                  ) : (
                    <T en={`${o.act} of your ${o.n} shares need${o.act === 1 ? "s" : ""} action.`} bn={`আপনার ${o.n}টি শেয়ারের ${o.act}টিতে কিছু করার আছে।`} />
                  )}
                </p>
              </>
            }
            example={
              <>
                <p>
                  <b><T en="Step 1:" bn="ধাপ 1:" /></b>{" "}
                  <T
                    en="Sell all 800 shares of a company in Z category, about ৳20,720. Your grade goes from C to B."
                    bn="Z ক্যাটাগরির একটি কোম্পানির সব 800টি শেয়ার বিক্রি, প্রায় ৳20,720। আপনার গ্রেড C থেকে B হয়।"
                  />
                </p>
                <p>
                  <T
                    en="A strong company whose price fell: your money is back at ৳264 (+17%), and it pays you ৳3,850 a year while you wait."
                    bn="দাম কমা একটি শক্তিশালী কোম্পানি: ৳264 (+17%) দামে আপনার টাকা ফিরবে, আর অপেক্ষার সময় বছরে ৳3,850 দেয়।"
                  />
                </p>
              </>
            }
          />

          {/* 3 · Why we say this */}
          <Part
            n={3}
            icon={<IconBook size={18} />}
            name={B("Why we say this", "কেন বলছি")}
            ask={B("Why? Show me the figures.", "কেন? হিসাবটা দেখান।")}
            what={B(
              "Every answer comes with its reason in plain words and the figures behind it: profit, dividends, loans, prices, and what is coming up on your shares.",
              "প্রতিটি উত্তরের সঙ্গে সহজ ভাষায় কারণ আর পেছনের হিসাব: মুনাফা, ডিভিডেন্ড, ঋণ, দাম, আর আপনার শেয়ারে সামনে কী আসছে।",
            )}
            found={
              <p className="pfo-free">
                <T en={`${o.answers} answers about your shares.`} bn={`আপনার শেয়ার নিয়ে ${o.answers}টি উত্তর।`} />
                {o.warnings > 0 && (
                  <>
                    {" "}
                    <T
                      en={`${o.warnings} share${s(o.warnings)} with a serious warning.`}
                      bn={`${o.warnings}টি শেয়ারে গুরুতর সতর্কসংকেত।`}
                    />
                  </>
                )}
              </p>
            }
            example={
              <>
                <p>
                  <b><T en="Will they keep paying you?" bn="তারা কি ডিভিডেন্ড দিয়ে যাবে?" /></b>{" "}
                  <T en="Mostly: 5 of your 7 cash dividends look safe." bn="বেশিরভাগ: আপনার 7টির 5টি নগদ ডিভিডেন্ড নিরাপদ মনে হচ্ছে।" />
                </p>
                <p>
                  <b><T en="Is one business too big?" bn="একটি ব্যবসায় কি বেশি টাকা?" /></b>{" "}
                  <T en="Yes: food companies hold 43% of your money." bn="হ্যাঁ: খাদ্য কোম্পানিতে আপনার 43% টাকা।" />
                </p>
              </>
            }
          />

          {/* 4 · Every day */}
          <Part
            n={4}
            icon={<IconBell size={18} />}
            name={B("Every day, on your shares", "প্রতিদিন, আপনার শেয়ারে")}
            ask={B("Will I hear when something changes?", "কিছু বদলালে কি জানতে পারব?")}
            what={B(
              "We check your shares again after every close, and tell you the same evening when something matters.",
              "প্রতিদিন বাজার বন্ধের পর আবার যাচাই করি, আর জরুরি কিছু হলে সেদিন সন্ধ্যাতেই জানাই।",
            )}
            found={
              o.flagged > 0 || o.dates > 0 ? (
                <p className="pfo-free">
                  {o.flagged > 0 && (
                    <T
                      en={`We flagged ${o.flagged} thing${s(o.flagged)} on your shares in the last 30 days.`}
                      bn={`গত 30 দিনে আপনার শেয়ারে ${o.flagged}টি বিষয় চিহ্নিত করেছি।`}
                    />
                  )}
                  {o.flagged > 0 && o.dates > 0 && " "}
                  {o.dates > 0 && (
                    <T
                      en={`${o.dates} date${s(o.dates)} coming up: results, record dates or meetings.`}
                      bn={`সামনে ${o.dates}টি তারিখ: আর্থিক ফল, রেকর্ড ডেট বা সভা।`}
                    />
                  )}
                </p>
              ) : null
            }
            list={[
              { icon: <IconBell size={16} />, text: B("A notification the same evening when results, a warning or a record date land on your shares.", "আপনার শেয়ারে আর্থিক ফল, সতর্কসংকেত বা রেকর্ড ডেট এলে সেদিন সন্ধ্যাতেই নোটিফিকেশন।") },
              { icon: <IconSun size={16} />, text: B("A short brief at 9 AM on trading days, before the market opens, when something matters for your shares that day.", "লেনদেনের দিনে সকাল 9টায়, বাজার খোলার আগে, সেদিন আপনার শেয়ারে জরুরি কিছু থাকলে ছোট একটি সারাংশ।") },
              { icon: <IconCheckCircle size={16} />, text: B("A check before every buy: what it does to your grade, before you save it.", "প্রতিটি কেনার আগে যাচাই: সেভ করার আগেই দেখুন আপনার গ্রেডে কী হয়।") },
              { icon: <IconBriefcase size={16} />, text: B("Up to 6 portfolios, and a yearly statement of everything you bought, sold and received.", "6টি পর্যন্ত পোর্টফোলিও, আর কেনা, বেচা ও পাওয়া সবকিছুর বছরের হিসাব।") },
            ]}
          />
        </ol>

        {/* ── The price and one button ── */}
        <div className="pfo-buy">
          <div className="pfo-buy-in">
            <p className="pfo-buy-k">
              <T en="Open all four parts" bn="চারটি অংশই খুলুন" />
            </p>
            <div className="pfo-price">
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
            <Button href={href} onClick={() => onTap("buy")} size="lg" block>
              {offer ? (
                <T en={`Open your full check for ৳${offer.amount}`} bn={`৳${offer.amount}-এ পূর্ণ যাচাই খুলুন`} />
              ) : (
                <T en="Open your full check" bn="পূর্ণ যাচাই খুলুন" />
              )}
            </Button>
            <ul className="pfo-promise">
              <li>
                <IconCheck size={14} />
                <T en="Pay by bKash, Nagad or bank" bn="bKash, Nagad বা ব্যাংকে পেমেন্ট" />
              </li>
              <li>
                <IconCheck size={14} />
                <T en="Nothing renews by itself" bn="নিজে থেকে নবায়ন হয় না" />
              </li>
              <li>
                <IconCheck size={14} />
                <T en="The same Premium works on every stock page" bn="একই প্রিমিয়াম প্রতিটি শেয়ারের পেজেও কাজ করে" />
              </li>
            </ul>
          </div>
        </div>
      </div>

      <TryFirst uid={user?.user_id ?? null} tastes={promo.tastes} sampleHref={sampleHref} state={state} />
    </section>
  );
}

/** One part of the check: the question it answers, what it is in one plain
 *  sentence, what it found on these shares (free), and a made-up example of
 *  what a Premium reader sees there (or, for "every day", what arrives). */
function Part({
  n,
  icon,
  name,
  ask,
  what,
  found,
  example,
  list,
}: {
  n: number;
  icon: ReactNode;
  name: Bi;
  ask: Bi;
  what: Bi;
  found: ReactNode;
  example?: ReactNode;
  list?: { icon: ReactNode; text: Bi }[];
}) {
  return (
    <li className="pfo-part">
      <span className="pfo-n" aria-hidden="true">{n}</span>
      <div className="pfo-t">
        <p className="pfo-name">
          <span className="pfo-icon" aria-hidden="true">{icon}</span>
          <T en={name.en} bn={name.bn} />
        </p>
        <p className="pfo-ask">
          <T en={`“${ask.en}”`} bn={`“${ask.bn}”`} />
        </p>
        <p className="pfo-what">
          <T en={what.en} bn={what.bn} />
        </p>
        {found && (
          <div className="pfo-found">
            <p className="pfo-found-k">
              <T en="On your shares" bn="আপনার শেয়ারে" />
            </p>
            {found}
          </div>
        )}
        {example && (
          <div className="pfo-ex">
            <p className="pfo-ex-k">
              <IconCrown size={13} />
              <T en="Example of what you see with Premium" bn="প্রিমিয়ামে যা দেখবেন, তার উদাহরণ" />
            </p>
            <div className="pfo-ex-body">{example}</div>
          </div>
        )}
        {list && (
          <ul className="pfo-list">
            {list.map((x) => (
              <li key={x.text.en}>
                <span className="pfo-list-icon" aria-hidden="true">{x.icon}</span>
                <T en={x.text.en} bn={x.text.bn} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

/**
 * "Not sure yet?": a sample portfolio's full check, and one answer free a
 * month on the reader's own shares (2026-11-04 — it bends the rule that every
 * answer on this page is Premium, on purpose). The opened answer stays open
 * for the rest of the Dhaka month, kept in this browser (a taste, not an
 * entitlement).
 */
function TryFirst({
  uid,
  tastes,
  sampleHref,
  state,
}: {
  uid: string | null;
  tastes: PfTaste[];
  sampleHref: string;
  state: string;
}) {
  const month = isoLocal(todayDhaka()).slice(0, 7);
  const [used, setUsed] = useState<TasteUse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const u = readTaste(uid);
    setUsed(u && u.month === month ? u : null);
    setReady(true);
  }, [uid, month]);

  const canTaste = !!uid && ready && tastes.length > 0;
  const open = used ? tastes.find((t) => t.finding === used.finding) ?? null : null;

  const onOpen = () => {
    if (!uid) return;
    const pick = tastes[0];
    const u: TasteUse = { month, finding: pick.finding };
    try {
      localStorage.setItem(TASTE_KEY(uid), JSON.stringify(u));
    } catch {
      /* private mode: it opens for this visit only */
    }
    setUsed(u);
    trackEvent("premium_taste_open", { area: "portfolio", finding: pick.finding, state, variant: VARIANT });
  };

  return (
    <div className="pfx-try">
      <p className="pfx-try-k">
        <T en="Not sure yet? Try it first." bn="এখনো নিশ্চিত নন? আগে দেখে নিন।" />
      </p>
      <div className="pfx-try-acts">
        <Button
          href={sampleHref}
          variant="quiet"
          size="md"
          onClick={() => trackEvent("premium_sample_tap", { area: "portfolio", state, variant: VARIANT })}
        >
          <T en="See a sample check" bn="নমুনা যাচাই দেখুন" />
        </Button>
        {canTaste && !used && (
          <Button type="button" variant="quiet" size="md" onClick={onOpen}>
            <T en="Open 1 answer free" bn="1টি উত্তর ফ্রিতে খুলুন" />
          </Button>
        )}
      </div>
      {canTaste && !used && (
        <p className="pfx-try-note">
          <T en="One free answer a month, on your own shares." bn="মাসে একটি উত্তর ফ্রি, আপনার নিজের শেয়ারে।" />
        </p>
      )}
      {open && (
        <div className="pfx-taste">
          <p className="pfx-try-k">
            <T en="Your free answer this month" bn="এ মাসে আপনার ফ্রি উত্তর" />
          </p>
          <PfQuestion row={open.row} />
        </div>
      )}
    </div>
  );
}
