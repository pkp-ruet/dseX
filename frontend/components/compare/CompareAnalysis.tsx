"use client";

import Link from "@/components/ui/Link";
import TierPill from "@/components/ui/TierPill";
import { T } from "@/components/i18n/T";
import PremiumCard from "@/components/premium/PremiumCard";
import { IconArrowRight, IconCrown } from "@/components/ui/icons";
import { ShareNum } from "@/components/compare/CompareCards";
import { usePremium } from "@/lib/premium";
import { COMPARE_ANCHOR, MAX_COMPARE, joinBn, joinEn, type Bi, type ComparePayload, type CompareShare, type Tone } from "@/lib/compare";

const TONE_CLASS: Record<Tone, string> = { good: "is-good", fair: "is-fair", bad: "is-bad", neutral: "is-neutral" };

/** "Low for what it earns" — or plain words where the price can't be judged. */
function priceLine(p: Bi): Bi {
  if (p.en === "Can't judge") return { en: "Can't judge: it made a loss", bn: "বলা যায় না: লোকসান হয়েছে" };
  if (p.en === "Not rated") return p;
  return { en: `${p.en} for what it earns`, bn: `আয়ের তুলনায় ${p.bn}` };
}

/** One share's read, in one short block: number, name, group, then the price
 *  word and the safety word, then strong / weak on one line. */
function ShareRead({ s, n }: { s: CompareShare; n: number | undefined }) {
  const a = s.analysis;
  const checks: { k: Bi; cls: string; v: Bi }[] = [];
  if (a.strong) checks.push({ k: { en: "Strong", bn: "শক্তিশালী" }, cls: "is-good", v: a.strong });
  if (a.weak) checks.push({ k: { en: "Weak", bn: "দুর্বল" }, cls: "is-bad", v: a.weak });
  if (!checks.length && a.fair) checks.push({ k: { en: "Fair", bn: "মোটামুটি" }, cls: "is-fair", v: a.fair });
  return (
    <li className="cmp-an-row">
      <div className="cmp-an-top">
        <ShareNum n={n} small />
        <span className="cmp-an-name">{s.short}</span>
        {s.score != null && <TierPill score={s.score} />}
      </div>
      <p className="cmp-an-words">
        {a.price && (
          <span>
            <T en="Price:" bn="দাম:" /> <b className={TONE_CLASS[a.price.tone]}><T en={priceLine(a.price).en} bn={priceLine(a.price).bn} /></b>
          </span>
        )}
        {a.safety && (
          <span>
            <T en="Safety:" bn="নিরাপত্তা:" /> <b className={TONE_CLASS[a.safety.tone]}><T en={a.safety.word.en} bn={a.safety.word.bn} /></b>
          </span>
        )}
      </p>
      {a.safety?.line && (
        <p className="cmp-an-line">
          <T en={a.safety.line.en} bn={a.safety.line.bn} />
        </p>
      )}
      {checks.length > 0 && (
        <p className="cmp-an-line">
          {checks.map((c, i) => (
            <span key={c.k.en}>
              {i > 0 && " · "}
              <b className={c.cls}>
                <T en={`${c.k.en}:`} bn={`${c.k.bn}:`} />
              </b>{" "}
              <T en={c.v.en} bn={c.v.bn} />
            </span>
          ))}
        </p>
      )}
      <Link href={`/stock/${s.code}#ch-analysis`} className="cmp-an-open">
        <T en={`Full analysis of ${s.code}`} bn={`${s.code}-এর পূর্ণ বিশ্লেষণ`} />
        <IconArrowRight size={14} />
      </Link>
    </li>
  );
}

/** What our analysis found across these shares, as counts — never which
 *  share (the portfolio card's pattern). Up to three, most serious first. */
function findings(shares: CompareShare[]): { count: Bi; text: Bi }[] {
  const n = shares.length;
  const count = (k: number, bnTail: string): Bi => ({ en: `${k} of ${n}`, bn: `${n}টির মধ্যে ${k}${bnTail}` });
  const one = (k: number, a: string, b: string) => (k === 1 ? a : b);
  const serious = shares.filter((s) => s.analysis.safety?.tone === "bad").length;
  const weak = shares.filter((s) => Object.values(s.analysis.checks).includes("weak")).length;
  const low = shares.filter((s) => s.analysis.price?.tone === "good").length;
  const high = shares.filter((s) => s.analysis.price?.en === "High").length;
  const smaller = shares.filter((s) => s.analysis.safety?.tone === "fair").length;
  const out: { count: Bi; text: Bi }[] = [];
  if (serious) out.push({ count: count(serious, "টির"), text: { en: `${one(serious, "has", "have")} a serious problem`, bn: "গুরুতর সমস্যা আছে" } });
  if (weak)
    out.push({
      count: count(weak, "টি"),
      text: { en: `${one(weak, "is", "are")} weak on at least one of our four checks`, bn: "আমাদের চারটি যাচাইয়ের অন্তত একটিতে দুর্বল" },
    });
  if (low)
    out.push({
      count: count(low, "টির"),
      text: { en: `${one(low, "is priced low for what it earns", "are priced low for what they earn")}`, bn: "দাম আয়ের তুলনায় কম" },
    });
  if (high)
    out.push({
      count: count(high, "টির"),
      text: { en: `${one(high, "is priced high for what it earns", "are priced high for what they earn")}`, bn: "দাম আয়ের তুলনায় বেশি" },
    });
  if (smaller) out.push({ count: count(smaller, "টিতে"), text: { en: `${one(smaller, "has", "have")} smaller things to check`, bn: "যাচাই করার মতো ছোট বিষয় আছে" } });
  if (!out.length)
    out.push({
      count: { en: `${n}`, bn: `${n}টি` },
      text: {
        en: "companies read on our four checks, with the price and the safety of each",
        bn: "কোম্পানি আমাদের চারটি যাচাইয়ে দেখা হয়েছে, সাথে প্রতিটির দাম আর নিরাপত্তা",
      },
    });
  return out.slice(0, 3);
}

/** The page's one Premium card, for a reader without Premium: what our
 *  analysis found across these shares, counted, and one button. Never an
 *  answer, never which share. */
function ComparePromo({ shares }: { shares: CompareShare[] }) {
  const names = shares.map((s) => s.short);
  const found = findings(shares);
  const n = shares.length;

  return (
    <PremiumCard
      anchor={COMPARE_ANCHOR}
      area="compare-stocks"
      lock="compare"
      src="compare"
      track={{ variant: "v2", count: n }}
      className="cmp-promo-card"
      tag={{ en: "Our analysis, side by side", bn: "পাশাপাশি আমাদের বিশ্লেষণ" }}
      title={
        n === 2 ? (
          <T en="We read both companies. Here is what we found." bn="দুটি কোম্পানিই আমরা খুঁটিয়ে দেখেছি। যা পেয়েছি:" />
        ) : (
          <T en={`We read all ${n} companies. Here is what we found.`} bn={`${n}টি কোম্পানিই আমরা খুঁটিয়ে দেখেছি। যা পেয়েছি:`} />
        )
      }
      lead={
        <T
          en="Premium shows which share, and why, in the same words as each company's own page."
          bn="কোন শেয়ার, আর কেন, প্রিমিয়ামে দেখবেন, প্রতিটি কোম্পানির নিজের পেজের একই ভাষায়।"
        />
      }
      cta={{ en: "See our analysis", bn: "আমাদের বিশ্লেষণ দেখুন" }}
      fine={{
        en: `Premium also compares up to ${MAX_COMPARE} shares at once.`,
        bn: `প্রিমিয়ামে একসাথে ${MAX_COMPARE}টি পর্যন্ত শেয়ার তুলনা করা যায়।`,
      }}
      context={{
        label: { en: "Compare stocks", bn: "শেয়ার তুলনা" },
        stakes: [{ en: `Our analysis of ${joinEn(names)}`, bn: `${joinBn(names)}-এর ওপর আমাদের বিশ্লেষণ` }],
      }}
    >
      <ul className="cmp-finds">
        {found.map((f) => (
          <li key={f.text.en}>
            <b>
              <T en={f.count.en} bn={f.count.bn} />
            </b>
            <span>
              <T en={f.text.en} bn={f.text.bn} />
            </span>
          </li>
        ))}
      </ul>
    </PremiumCard>
  );
}

/** Our analysis of each company, side by side, after "The company" part:
 *  Premium readers get one short block per share (group, price word, safety,
 *  strong / weak); everyone else gets the one card. "In plain words" sits at
 *  the top of the page for Premium (`PlainWords`). */
export default function CompareAnalysis({ data, nums }: { data: ComparePayload; nums: Record<string, number> }) {
  const { isPremium } = usePremium();
  if (!isPremium) return <ComparePromo shares={data.shares} />;
  const rows = [...data.shares].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return (
    <section className="cmp-part" aria-labelledby="cmp-an-t">
      <div className="cmp-part-h">
        <h2 id="cmp-an-t">
          <T en="Our analysis, side by side" bn="পাশাপাশি আমাদের বিশ্লেষণ" />
          <span className="cmp-prem-tag">
            <IconCrown size={13} />
            <T en="Premium" bn="প্রিমিয়াম" />
          </span>
        </h2>
        <p>
          <T
            en="Where each company is strong and where it is weak, in the same words as its own page."
            bn="প্রতিটি কোম্পানি কোথায় শক্তিশালী আর কোথায় দুর্বল, তার নিজের পেজের একই ভাষায়।"
          />
        </p>
      </div>
      <div className="cmp-card">
        <ul className="cmp-an">
          {rows.map((s) => (
            <ShareRead key={s.code} s={s} n={nums[s.code]} />
          ))}
        </ul>
      </div>
    </section>
  );
}
