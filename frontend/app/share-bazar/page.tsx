import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import {
  getDseToday,
  getMarketState,
  type MarketMoverItem,
  type MarketSectorRow,
  type MarketStateData,
  type MoodTone,
} from "@/lib/api";
import { money } from "@/lib/formatters";
import { bnCroreTaka, bnDate, bnInt, bnSignedPct, sectorBn } from "@/lib/bn";
import HtmlLang from "@/components/i18n/HtmlLang";
import MarketRow from "@/components/market-analysis/MarketRow";
import ErrorState from "@/components/ui/ErrorState";

export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const PATH = "/share-bazar";
const OG_IMAGE = `${BASE_URL}/api/og/promo/mood`;

/**
 * আজকের শেয়ার বাজার — the whole DSE day in everyday Bengali, generated from the
 * same market-state and DSE-Today bundles the English pages use.
 *
 * Why (2026-09-15): "শেয়ার বাজার" / "আজকের শেয়ার বাজার" / "শেয়ার বাজার খবর" are the
 * largest query cluster for Bangladeshi investors and are answered today by
 * Bengali news sites with hand-written daily articles. This page is a
 * data-driven daily article: title carries the DSEX level and move, body has
 * the mood, four plain answers, gainers/losers/most traded, sectors and the
 * next dividend record dates. Western digits inside Bengali prose by rule
 * (see components/i18n/Bn.tsx). No emoji. Everything is server-rendered.
 */

const MOOD_WORD: Record<MoodTone, string> = {
  up: "চাঙা",
  down: "পড়তির দিকে",
  weak: "কিছুটা দুর্বল",
  steady: "শান্ত",
};
const MOOD_LINE: Record<MoodTone, string> = {
  up: "বেশিরভাগ শেয়ারের দাম বেড়েছে। ভালো দিন, কিন্তু তাড়াহুড়ো করে কিছু কেনার আগে কোম্পানিটা দেখে নিন।",
  down: "বেশিরভাগ শেয়ারের দাম কমেছে। ভয় পেয়ে বিক্রি নয় — ভালো কোম্পানি সস্তায় পাওয়া যায় এমন দিনেই।",
  weak: "বাজারে জোর কম। এমন দিনে শক্ত ব্যবসার কোম্পানি বেছে রাখার সময়।",
  steady: "বড় কোনো ওঠানামা নেই। ধীরে-সুস্থে দেখে নেওয়ার দিন।",
};
const HERO_TONE: Record<MoodTone, string> = { up: "up", down: "down", weak: "down", steady: "steady" };

function idxLine(v: number | null, chg: number | null, chgPct?: number | null): string {
  if (v == null) return "—";
  const move = chgPct != null ? bnSignedPct(chgPct) : chg != null ? `${chg > 0 ? "+" : ""}${chg.toFixed(1)}` : "";
  return move ? `${bnInt(v)} (${move})` : bnInt(v);
}

function moveTone(v: number | null | undefined): "pos" | "neg" | "neutral" {
  if (v == null || v === 0) return "neutral";
  return v > 0 ? "pos" : "neg";
}

/** The four plain answers, built from the mood bands + raw stats. */
function answers(data: MarketStateData) {
  const s = data.stats;
  const b = data.mood.bands;
  const traded = s.up + s.down + s.neutral;
  const out: { q: string; a: string; extra: string; tone: "pos" | "neg" | "neutral"; accent: string }[] = [];

  if (traded > 0) {
    const word = b?.breadth === "up" ? "বেশিরভাগ বেড়েছে" : b?.breadth === "down" ? "বেশিরভাগ কমেছে" : "মিশ্র";
    out.push({
      q: "আজ দাম বেড়েছে না কমেছে?",
      a: word,
      extra: `${s.up}টি বেড়েছে · ${s.down}টি কমেছে · ${s.neutral}টি অপরিবর্তিত`,
      tone: b?.breadth === "up" ? "pos" : b?.breadth === "down" ? "neg" : "neutral",
      accent: "var(--warm)",
    });
  }
  if (s.dsex != null && s.year_low != null && s.year_high != null) {
    const word = b?.price === "low" ? "বছরের নিচের দিকে" : b?.price === "high" ? "বছরের উপরের দিকে" : "বছরের মাঝামাঝি";
    out.push({
      q: "সূচক এ বছর কোথায় দাঁড়িয়ে?",
      a: word,
      extra: `DSEX ${bnInt(s.dsex)} · এ বছরের সীমা ${bnInt(s.year_low)}–${bnInt(s.year_high)}`,
      tone: b?.price === "low" ? "neg" : b?.price === "high" ? "pos" : "neutral",
      accent: "var(--primary)",
    });
  }
  if (s.cheap_pct != null && s.cheap_total > 0) {
    const word = b?.value === "cheap" ? "বেশিরভাগ শেয়ার সস্তা" : b?.value === "expensive" ? "বেশিরভাগ শেয়ার দামি" : "স্বাভাবিক দামে";
    out.push({
      q: "শেয়ার এখন সস্তা না দামি?",
      a: word,
      extra: `${s.cheap_total}টির মধ্যে ${s.cheap_n}টি নিজের স্বাভাবিক দামের নিচে (${Math.round(s.cheap_pct)}%)`,
      tone: b?.value === "cheap" ? "pos" : b?.value === "expensive" ? "neg" : "neutral",
      accent: "var(--positive)",
    });
  }
  if (s.turnover_mn != null) {
    const word = s.turnover_band === "busy" ? "স্বাভাবিকের চেয়ে বেশি" : s.turnover_band === "quiet" ? "স্বাভাবিকের চেয়ে কম" : "স্বাভাবিক";
    out.push({
      q: "লেনদেন কেমন হলো?",
      a: word,
      extra:
        s.turnover_avg_mn != null
          ? `${bnCroreTaka(s.turnover_mn)} · সাধারণত ${bnCroreTaka(s.turnover_avg_mn)}`
          : bnCroreTaka(s.turnover_mn),
      tone: "neutral",
      accent: "#6D28D9",
    });
  }
  return out;
}

function sectorLine(r: MarketSectorRow): string {
  const name = sectorBn(r.name);
  const dir = r.ret_1w > 0.05 ? "বেড়েছে" : r.ret_1w < -0.05 ? "কমেছে" : "একই রকম";
  const pctTxt = Math.abs(r.ret_1w) >= 0.05 ? ` ${Math.abs(r.ret_1w).toFixed(1)}%` : "";
  return `${name} খাতের শেয়ার এই সপ্তাহে গড়ে${pctTxt} ${dir} (${r.count}টি কোম্পানি)।`;
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await getMarketState().catch(() => null);
  const s = data?.stats;
  const day = bnDate(data?.date);
  const level = s?.dsex != null ? ` — ডিএসইএক্স ${bnInt(s.dsex)}${s.dsex_change_pct != null ? ` (${bnSignedPct(s.dsex_change_pct)})` : ""}` : "";
  const title = `আজকের শেয়ার বাজার${level}`;
  const description = data
    ? `${day ? `${day}: ` : ""}আজ ডিএসই-তে ${s?.up ?? "—"}টি শেয়ারের দাম বেড়েছে, ${s?.down ?? "—"}টি কমেছে। বাজার ${MOOD_WORD[data.mood.tone]}। সূচক, লেনদেন, আজকের সেরা ও সবচেয়ে পড়া শেয়ার, খাতভিত্তিক অবস্থা আর সামনের ডিভিডেন্ড রেকর্ড ডেট — সহজ বাংলায়।`
    : "ঢাকা স্টক এক্সচেঞ্জের আজকের বাজার সহজ বাংলায়: সূচক, কোন শেয়ারের দাম বেড়েছে-কমেছে, লেনদেন, খাত আর ডিভিডেন্ড রেকর্ড ডেট।";
  return {
    title,
    description,
    keywords: [
      "আজকের শেয়ার বাজার", "শেয়ার বাজার", "শেয়ার বাজার খবর", "শেয়ার বাজার আজ কেমন",
      "ডিএসই", "ডিএসইএক্স সূচক", "আজকের শেয়ারের দাম", "ঢাকা স্টক এক্সচেঞ্জ", "শেয়ার বাজারের সর্বশেষ খবর",
      "ajker share bazar", "share bazar today", "DSE bangla", "share bazar news",
    ],
    alternates: { canonical: PATH, languages: { bn: PATH, en: "/market-analysis", "x-default": "/market-analysis" } },
    openGraph: {
      title,
      description,
      url: PATH,
      type: "website",
      locale: "bn_BD",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "আজকের ডিএসই বাজার" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}

function MoverList({ title, items, metric }: { title: string; items: MarketMoverItem[]; metric: "change" | "value" }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="ms-card-title" style={{ marginBottom: 8 }}>{title}</h3>
      <div className="ms-srow-list">
        {items.slice(0, 5).map((m) => (
          <MarketRow
            key={m.trading_code}
            code={m.trading_code}
            name={m.company_name}
            price={m.ltp}
            meta={metric === "change" ? bnSignedPct(m.change_pct) : bnCroreTaka(m.value_mn)}
            tone={metric === "change" ? moveTone(m.change_pct) : "accent"}
            accent={metric === "change" ? (m.change_pct != null && m.change_pct < 0 ? "var(--negative)" : "var(--positive)") : "var(--primary)"}
          />
        ))}
      </div>
    </div>
  );
}

export default async function ShareBazarPage() {
  const [state, today] = await Promise.all([
    getMarketState().catch(() => null),
    getDseToday().catch(() => null),
  ]);

  if (!state) {
    return (
      <div lang="bn" className="font-bn">
        <HtmlLang lang="bn" />
        <header className="ms-pagehead">
          <h1 className="ms-page-h1">
            <span className="ms-page-kicker">ঢাকা স্টক এক্সচেঞ্জ</span>
            <span className="ms-page-h1-main">আজকের শেয়ার বাজার</span>
          </h1>
        </header>
        <ErrorState
          size="inline"
          title="আজকের বাজারের তথ্য আনা যাচ্ছে না"
          message="ডেটা সার্ভার সাড়া দিতে একটু দেরি করছে। কিছুক্ষণ পর আবার চেষ্টা করুন।"
          bn="সাধারণত এটা কয়েক সেকেন্ডের ব্যাপার।"
          reload
          links={[{ href: "/market-analysis", label: "Market analysis (English)" }]}
        />
      </div>
    );
  }

  const s = state.stats;
  const tone = state.mood.tone;
  const day = bnDate(state.date, true);
  const hdr = today?.header;
  const movers = today?.movers;
  const tiles = answers(state);
  const sectors = [...(state.now?.sectors ?? [])].sort((a, b) => b.ret_1w - a.ret_1w);
  const upSectors = sectors.filter((r) => r.ret_1w > 0.05);
  const downSectors = sectors.filter((r) => r.ret_1w < -0.05).reverse();
  const dividends = (state.next?.dividends ?? []).filter((d) => d.kind === "record").slice(0, 4);
  const traded = s.up + s.down + s.neutral;

  const headline =
    s.dsex != null && s.dsex_change_pct != null
      ? `ডিএসইএক্স ${bnInt(s.dsex)} — আজ ${Math.abs(s.dsex_change_pct).toFixed(1)}% ${s.dsex_change_pct >= 0 ? "বেড়েছে" : "কমেছে"}`
      : `আজ বাজার ${MOOD_WORD[tone]}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}${PATH}`,
        url: `${BASE_URL}${PATH}`,
        name: `আজকের শেয়ার বাজার${day ? ` — ${day}` : ""}`,
        description: "ঢাকা স্টক এক্সচেঞ্জের আজকের বাজার সহজ বাংলায়: সূচক, দাম বাড়া-কমা, লেনদেন, খাত আর ডিভিডেন্ড রেকর্ড ডেট।",
        inLanguage: "bn",
        isPartOf: { "@id": BASE_URL },
        ...(state.date ? { dateModified: state.date } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "আজকের শেয়ার বাজার", item: `${BASE_URL}${PATH}` },
        ],
      },
    ],
  };

  return (
    <div lang="bn" className="font-bn">
      <HtmlLang lang="bn" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="ms-pagehead">
        <h1 className="ms-page-h1">
          <span className="ms-page-kicker">ঢাকা স্টক এক্সচেঞ্জ</span>
          <span className="ms-page-h1-main">আজকের শেয়ার বাজার</span>
        </h1>
        {day && <span className="ms-page-date">{day} · বাজার বন্ধের পর আপডেট</span>}
      </header>

      {/* The day in one look */}
      <section className={`ms-hero ms-hero--${HERO_TONE[tone]}`}>
        <span className="ms-hero-eyebrow">এক নজরে</span>
        <div>
          <span className={`ms-mood-pill ms-mood-pill--${tone}`}>
            <span className="ms-dot" aria-hidden="true" />
            আজ বাজার {MOOD_WORD[tone]}
          </span>
        </div>
        <h2 className="ms-hero-headline">{headline}</h2>
        <p className="ms-hero-sub">{MOOD_LINE[tone]}</p>
        {state.summary_bn && <p className="ms-bn-text" style={{ marginBottom: 18 }}>{state.summary_bn}</p>}
        <div className="ms-hero-stats">
          <div className="ms-stat" style={{ "--ms-accent": "var(--primary)" } as CSSProperties}>
            <p className="ms-stat-label">ডিএসইএক্স (DSEX)</p>
            <p className="ms-stat-value">{idxLine(hdr?.dsex ?? s.dsex, hdr?.dsex_change ?? null, hdr?.dsex_change_pct ?? s.dsex_change_pct)}</p>
          </div>
          {hdr?.dses != null && (
            <div className="ms-stat" style={{ "--ms-accent": "var(--positive)" } as CSSProperties}>
              <p className="ms-stat-label">ডিএসইএস (DSES)</p>
              <p className="ms-stat-value">{idxLine(hdr.dses, hdr.dses_change)}</p>
            </div>
          )}
          {hdr?.ds30 != null && (
            <div className="ms-stat" style={{ "--ms-accent": "var(--warm)" } as CSSProperties}>
              <p className="ms-stat-label">ডিএস৩০ (DS30)</p>
              <p className="ms-stat-value">{idxLine(hdr.ds30, hdr.ds30_change)}</p>
            </div>
          )}
          {s.turnover_mn != null && (
            <div className="ms-stat" style={{ "--ms-accent": "#6D28D9" } as CSSProperties}>
              <p className="ms-stat-label">আজকের লেনদেন</p>
              <p className="ms-stat-value">{bnCroreTaka(s.turnover_mn)}</p>
            </div>
          )}
        </div>
      </section>

      {/* Four plain answers */}
      {tiles.length > 0 && (
        <section className="ms-card" style={{ marginTop: 16 }}>
          <p className="ms-card-title">চারটি সহজ প্রশ্নের উত্তর</p>
          <div className="ms-hero-stats" style={{ marginTop: 10 }}>
            {tiles.map((t) => (
              <div key={t.q} className="ms-stat" style={{ "--ms-accent": t.accent } as CSSProperties}>
                <p className="ms-stat-label">{t.q}</p>
                <p className={`ms-stat-value ms-${t.tone}`}>{t.a}</p>
                <p className="ms-card-note" style={{ marginTop: 6 }}>{t.extra}</p>
              </div>
            ))}
          </div>
          {traded > 0 && (
            <p className="ms-bn-note" style={{ marginTop: 12 }}>
              আজ মোট {traded}টি শেয়ারে লেনদেন হয়েছে। &ldquo;সস্তা&rdquo; মানে আজকের দাম-আয় অনুপাত কোম্পানির নিজের কয়েক বছরের গড়ের নিচে।
            </p>
          )}
        </section>
      )}

      {/* Movers */}
      {movers && (movers.gainers.length > 0 || movers.losers.length > 0) && (
        <section className="ms-card" style={{ marginTop: 16 }}>
          <h2 className="ms-section-title" style={{ marginBottom: 12 }}>আজ কোন শেয়ারের দাম বেড়েছে, কোনটার কমেছে</h2>
          <div style={{ display: "grid", gap: 18 }}>
            <MoverList title="আজ যাদের দাম সবচেয়ে বেড়েছে" items={movers.gainers} metric="change" />
            <MoverList title="আজ যাদের দাম সবচেয়ে কমেছে" items={movers.losers} metric="change" />
            <MoverList title="আজ সবচেয়ে বেশি লেনদেন" items={movers.most_traded} metric="value" />
          </div>
          <p className="ms-bn-note" style={{ marginTop: 12 }}>
            একদিনের ওঠানামা দেখে সিদ্ধান্ত নেবেন না — যে শেয়ার আজ সবচেয়ে বেড়েছে, সেটার ব্যবসা দুর্বলও হতে পারে। কোড-এ চাপ দিলে কোম্পানির স্কোর ও স্বাস্থ্য পরীক্ষা দেখা যাবে।
          </p>
        </section>
      )}

      {/* Sectors */}
      {sectors.length > 0 && (
        <section className="ms-card" style={{ marginTop: 16 }}>
          <h2 className="ms-section-title" style={{ marginBottom: 12 }}>কোন খাত এগিয়ে, কোন খাত পিছিয়ে</h2>
          {upSectors.length > 0 && (
            <>
              <p className="ms-card-title">এই সপ্তাহে এগিয়ে</p>
              <ul className="ms-why-list" style={{ margin: "6px 0 14px" }}>
                {upSectors.slice(0, 6).map((r) => (
                  <li key={r.name} className="ms-why-row">
                    <span className="ms-why-k">
                      {r.slug ? <Link href={`/sector/${r.slug}`} className="ms-sector--link">{sectorBn(r.name)}</Link> : sectorBn(r.name)}
                    </span>
                    <span className="ms-why-v ms-pos">{bnSignedPct(r.ret_1w)} · {r.count}টি কোম্পানি</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {downSectors.length > 0 && (
            <>
              <p className="ms-card-title">এই সপ্তাহে পিছিয়ে</p>
              <ul className="ms-why-list" style={{ margin: "6px 0 14px" }}>
                {downSectors.slice(0, 6).map((r) => (
                  <li key={r.name} className="ms-why-row">
                    <span className="ms-why-k">
                      {r.slug ? <Link href={`/sector/${r.slug}`} className="ms-sector--link">{sectorBn(r.name)}</Link> : sectorBn(r.name)}
                    </span>
                    <span className="ms-why-v ms-neg">{bnSignedPct(r.ret_1w)} · {r.count}টি কোম্পানি</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="ms-bn-text">
            {sectors.slice(0, 3).map(sectorLine).join(" ")}
          </p>
        </section>
      )}

      {/* Upcoming dividends */}
      {dividends.length > 0 && (
        <section className="ms-card" style={{ marginTop: 16 }}>
          <h2 className="ms-section-title" style={{ marginBottom: 12 }}>সামনে যাদের ডিভিডেন্ড রেকর্ড ডেট</h2>
          <div className="ms-srow-list">
            {dividends.map((d) => (
              <MarketRow
                key={`${d.trading_code}-${d.date}`}
                code={d.trading_code}
                name={d.company_name}
                sector={d.sector}
                price={d.last_price}
                meta={d.dividend_pct != null ? `নগদ ${d.dividend_pct}%` : d.stock_pct != null ? `বোনাস ${d.stock_pct}%` : "ডিভিডেন্ড"}
                tone="accent"
                accent="var(--gold)"
                sub={
                  <>
                    রেকর্ড ডেট {bnDate(d.date)}
                    {d.buy_by ? <> · শেষ কেনার দিন {bnDate(d.buy_by)}</> : null}
                    {d.cash_per_share != null ? <> · শেয়ারপ্রতি {money(d.cash_per_share)}</> : null}
                  </>
                }
              />
            ))}
          </div>
          <p className="ms-bn-note" style={{ marginTop: 12 }}>
            রেকর্ড ডেটে যার কাছে শেয়ার থাকবে, ডিভিডেন্ড সে-ই পাবে। সাধারণ বাজারে কেনা শেয়ার বিও অ্যাকাউন্টে আসতে দুই কর্মদিবস লাগে — তাই &ldquo;শেষ কেনার দিন&rdquo; রেকর্ড ডেটের আগে।{" "}
            <Link href="/dividend-calendar" className="ms-sector--link">পুরো ডিভিডেন্ড ক্যালেন্ডার</Link>
          </p>
        </section>
      )}

      {/* Where next */}
      <section className="ms-card ms-card--tint" style={{ marginTop: 16, "--card-accent": "var(--primary)" } as CSSProperties}>
        <p className="ms-card-title">আরও দেখুন</p>
        <ul className="ms-links" style={{ marginTop: 8 }}>
          <li><Link href="/market-analysis">বাজারের বিস্তারিত বিশ্লেষণ (ইংরেজিতে, সংখ্যাসহ)</Link></li>
          <li><Link href="/stocks">সব শেয়ারের আজকের দাম</Link></li>
          <li><Link href="/dsestockranking">কোন কোম্পানির ব্যবসা সবচেয়ে শক্ত — র‍্যাঙ্কিং</Link></li>
          <li><Link href="/blog">শেয়ার বাজার শেখার বাংলা ব্লগ</Link></li>
        </ul>
        <p className="ms-bn-note" style={{ marginTop: 12 }}>
          এই পাতাটি প্রতিটি লেনদেনের দিন বাজার বন্ধের পর ডিএসই-র প্রকাশিত দাম থেকে স্বয়ংক্রিয়ভাবে তৈরি হয়। এটি শিক্ষামূলক তথ্য, বিনিয়োগ পরামর্শ নয়।
        </p>
      </section>
    </div>
  );
}
