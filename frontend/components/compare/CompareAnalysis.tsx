"use client";

import { useEffect, useRef } from "react";
import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { IconArrowRight, IconCheck, IconCrown } from "@/components/ui/icons";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import { COMPARE_ANCHOR, MAX_COMPARE, type Bi, type ComparePayload, type CompareShare, type Tone } from "@/lib/compare";

const TONE_CLASS: Record<Tone, string> = { good: "is-good", fair: "is-fair", bad: "is-bad", neutral: "is-neutral" };

function joinNames(names: string[], bn: boolean): string {
  if (names.length < 2) return names.join("");
  return names.slice(0, -1).join(", ") + (bn ? " ও " : " and ") + names[names.length - 1];
}

function Line({ k, cls, v }: { k: Bi; cls: string; v: Bi | null }) {
  if (!v) return null;
  return (
    <div className="cmp-an-line">
      <dt className={cls}>
        <T en={k.en} bn={k.bn} />
      </dt>
      <dd>
        <T en={v.en} bn={v.bn} />
      </dd>
    </div>
  );
}

/** "Low for what it earns" — or plain words where the price can't be judged. */
function priceLine(p: Bi): Bi {
  if (p.en === "Can't judge") return { en: "Can't judge: it made a loss", bn: "বলা যায় না: লোকসান হয়েছে" };
  if (p.en === "Not rated") return p;
  return { en: `${p.en} for what it earns`, bn: `আয়ের তুলনায় ${p.bn}` };
}

function ShareRead({ s }: { s: CompareShare }) {
  const a = s.analysis;
  return (
    <li className="cmp-an-row">
      <div className="cmp-an-top">
        <span className="cmp-an-name">{s.short}</span>
        <span className="cmp-an-grp">
          <T en={s.group.en} bn={s.group.bn} />
        </span>
        {s.score != null && (
          <span className="cmp-an-score">
            <T en={`Grade ${s.score}`} bn={`গ্রেড ${s.score}`} />
          </span>
        )}
      </div>
      <dl className="cmp-an-lines">
        <Line k={{ en: "Strong", bn: "শক্তিশালী" }} cls="is-good" v={a.strong} />
        <Line k={{ en: "Fair", bn: "মোটামুটি" }} cls="is-fair" v={a.fair} />
        <Line k={{ en: "Weak", bn: "দুর্বল" }} cls="is-bad" v={a.weak} />
        {a.price && <Line k={{ en: "Price", bn: "দাম" }} cls={TONE_CLASS[a.price.tone]} v={priceLine(a.price)} />}
        {a.safety && (
          <Line
            k={{ en: "Safety", bn: "নিরাপত্তা" }}
            cls={TONE_CLASS[a.safety.tone]}
            v={
              a.safety.line
                ? { en: `${a.safety.word.en}. ${a.safety.line.en}`, bn: `${a.safety.word.bn}। ${a.safety.line.bn}` }
                : a.safety.word
            }
          />
        )}
      </dl>
      <Link href={`/stock/${s.code}#ch-analysis`} className="cmp-an-open">
        <T en={`Full analysis of ${s.code}`} bn={`${s.code}-এর পূর্ণ বিশ্লেষণ`} />
        <IconArrowRight size={14} />
      </Link>
    </li>
  );
}

const GETS: Bi[] = [
  { en: "Where each company is strong, and where it is weak", bn: "প্রতিটি কোম্পানি কোথায় শক্তিশালী, কোথায় দুর্বল" },
  { en: "Whether today's price is low, fair or high for each", bn: "আজকের দাম প্রতিটির জন্য কম, ন্যায্য না বেশি" },
  { en: "Any serious problem, named", bn: "কোনো গুরুতর সমস্যা থাকলে তার নাম" },
  { en: "How they differ, in a few plain sentences", bn: "কোথায় তারা আলাদা, কয়েকটি সহজ বাক্যে" },
  { en: `Up to ${MAX_COMPARE} shares at once`, bn: `একসাথে ${MAX_COMPARE}টি পর্যন্ত শেয়ার` },
];

/** The page's one Premium card, for a reader without Premium. Never an answer. */
function ComparePromo({ shares }: { shares: CompareShare[] }) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);
  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=compare#pay" : user ? `${PREMIUM_PATH}#pay` : PREMIUM_PATH;
  const names = shares.map((s) => s.short);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "compare-stocks", lock: "compare", state, count: shares.length });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, shares.length]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "compare-stocks", lock: "compare", state, count: shares.length });
    savePremiumContext({
      from: "compare-stocks",
      label: bn ? "শেয়ার তুলনা" : "Compare stocks",
      stakes: [bn ? `${joinNames(names, true)}-এর ওপর আমাদের বিশ্লেষণ` : `Our analysis of ${joinNames(names, false)}`],
    });
  };

  return (
    <section ref={ref} id={COMPARE_ANCHOR} className="sp cmp-promo" aria-labelledby="cmp-promo-t">
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          <T en="Premium · Our analysis, side by side" bn="প্রিমিয়াম · পাশাপাশি আমাদের বিশ্লেষণ" />
        </p>
        <h3 id="cmp-promo-t" className="sp-title">
          <T en={`See why ${joinNames(names, false)} got their grades.`} bn={`${joinNames(names, true)} কেন এই গ্রেড পেল, দেখুন।`} />
        </h3>
        <p className="sp-lead">
          <T
            en="The grades are free. Premium puts our analysis of each company next to the others, and says in plain words how they differ."
            bn="গ্রেড ফ্রি। প্রিমিয়ামে প্রতিটি কোম্পানির ওপর আমাদের বিশ্লেষণ পাশাপাশি দেখবেন, আর সহজ ভাষায় জানবেন কোথায় তারা আলাদা।"
          />
        </p>
      </div>
      <div className="sp-body">
        <ul className="rr-gets">
          {GETS.map((g) => (
            <li key={g.en}>
              <span className="rr-tick" aria-hidden="true">
                <IconCheck size={16} />
              </span>
              <span className="min-w-0">
                <T en={g.en} bn={g.bn} />
              </span>
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
              <T en="See our analysis side by side" bn="পাশাপাশি বিশ্লেষণ দেখুন" />
            )}
          </Button>
        </div>
      </div>
      <p className="sp-fine">
        <T
          en="Pay by bKash, Nagad or bank transfer. Nothing renews by itself."
          bn="bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।"
        />
      </p>
    </section>
  );
}

/** Our analysis of each company, side by side: Premium readers get each
 *  share's strong / fair / weak checks, price word and safety count, then a
 *  few plain sentences on how they differ; everyone else gets the one card. */
export default function CompareAnalysis({ data }: { data: ComparePayload }) {
  const { isPremium } = usePremium();
  const rows = [...data.shares].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return (
    <section className="cmp-sec" aria-labelledby="cmp-an-t">
      <div className="cmp-sec-h">
        <h2 id="cmp-an-t">
          <T en="Our analysis, side by side" bn="পাশাপাশি আমাদের বিশ্লেষণ" />
          {isPremium && (
            <span className="cmp-prem-tag">
              <IconCrown size={13} />
              <T en="Premium" bn="প্রিমিয়াম" />
            </span>
          )}
        </h2>
        <p>
          {isPremium ? (
            <T
              en="Where each company is strong and where it is weak, in the same words as its stock page."
              bn="প্রতিটি কোম্পানি কোথায় শক্তিশালী আর কোথায় দুর্বল, শেয়ারের পেজের একই ভাষায়।"
            />
          ) : (
            <T en="Why each company got its grade, and how they differ." bn="প্রতিটি কোম্পানি কেন এই গ্রেড পেল, আর কোথায় তারা আলাদা।" />
          )}
        </p>
      </div>
      {isPremium ? (
        <div className="cmp-card">
          <ul className="cmp-an">
            {rows.map((s) => (
              <ShareRead key={s.code} s={s} />
            ))}
          </ul>
          {data.plain && (
            <div className="cmp-plain">
              <h3>
                <T en="In plain words" bn="সহজ ভাষায়" />
              </h3>
              <p>
                <T en={data.plain.en} bn={data.plain.bn} />
              </p>
            </div>
          )}
        </div>
      ) : (
        <ComparePromo shares={data.shares} />
      )}
    </section>
  );
}
