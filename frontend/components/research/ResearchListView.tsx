import Link from "next/link";
import type { ResearchListDetail } from "@/lib/api";
import type { ResearchListDef } from "@/lib/research-lists";
import { formatDate } from "@/lib/formatters";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import Chip from "@/components/ui/Chip";
import { IconLock } from "@/components/ui/icons";
import { StockLangToggle } from "@/components/stock/LangToggle";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import ResearchFunnel from "./ResearchFunnel";
import ResearchCard from "./ResearchCard";
import ResearchCompare from "./ResearchCompare";
import ResearchChanges from "./ResearchChanges";
import ResearchLock from "./ResearchLock";
import { Txt } from "./ResearchText";

/**
 * One research list (`/stock-insights/[slug]` for the six research slugs).
 * Free: the idea and the tests as a funnel — what the list is and how it is
 * built. Premium, all of it (screen-only lock — the HTML keeps everything):
 * every stock's research card, the side-by-side table and who joined / left.
 */
export default function ResearchListView({ data, def }: { data: ResearchListDetail; def: ResearchListDef }) {
  const checks = data.funnel.length;

  return (
    <PersonalCodesProvider>
      <nav aria-label="breadcrumb" className="ed-crumbs">
        <Link href="/">Home</Link>
        <span className="sep" aria-hidden="true">/</span>
        <Link href="/stock-insights">Stock Lists</Link>
        <span className="sep" aria-hidden="true">/</span>
        <span className="here">{def.shortName}</span>
      </nav>

      <PageHeader
        eyebrow="Research list"
        title={data.title_en}
        bn={data.title_bn}
        lead={<Txt en={data.idea_en} bn={data.idea_bn} />}
        actions={<StockLangToggle size="sm" />}
      />

      <div className="ed-byline">
        <span className="live">Live</span>
        {data.as_of && <span className="b-item">Prices of {formatDate(data.as_of)}</span>}
        <span className="b-dot" aria-hidden="true" />
        <span className="b-item">{data.universe} companies tested</span>
        <span className="b-dot" aria-hidden="true" />
        <span className="b-item">{data.passed} passed every check</span>
        <span className="b-dot" aria-hidden="true" />
        <Chip tone="info" icon={<IconLock size={12} />}>Premium</Chip>
      </div>

      <section className="rl-section" aria-labelledby="rl-tests">
        <SectionHeader
          id="rl-tests"
          title="How we picked them"
          bn="যেভাবে বাছাই করেছি"
          lead={`Every rated company goes through these ${checks} checks, in this order. The number is how many are still in after each one.`}
        />
        <div className="soft-card rl-funnel-card">
          <ResearchFunnel universe={data.universe} steps={data.funnel} />
        </div>
      </section>

      <section className="rl-section" aria-labelledby="rl-stocks">
        <SectionHeader
          id="rl-stocks"
          title={data.passed === 1 ? "The one that passed" : `The ${data.stocks.length} that passed${data.passed > data.stocks.length ? ` (best ${data.stocks.length} of ${data.passed})` : ""}`}
          bn="যারা সব যাচাইয়ে পাস করেছে"
          lead="Each card shows why the company is here, its own number on every check, and the one thing that could go wrong."
        />

        {data.stocks.length === 0 ? (
          <EmptyState
            title="No company passes every check today"
            message="That happens when prices are high or results are weak. The list is checked again after every trading day."
            bn="আজ কোনো কোম্পানি সব যাচাইয়ে পাস করেনি। প্রতিটি কার্যদিবসের পর আবার যাচাই হয়।"
            actions={[{ href: "/stock-insights", label: "Other lists" }]}
          />
        ) : (
          <ResearchLock passed={data.passed} codes={data.stocks.map((s) => s.code)} checks={checks}>
            <div className="rl-cards">
              {data.stocks.map((s) => (
                <ResearchCard key={s.code} s={s} />
              ))}
            </div>

            <div className="rl-subsection">
              <SectionHeader
                as="h3"
                title="Side by side"
                bn="সব শেয়ার পাশাপাশি"
                lead="Tap a column to sort."
              />
              <ResearchCompare columns={data.columns} stocks={data.stocks} />
            </div>

            <div className="rl-subsection">
              <SectionHeader as="h3" title="What changed this month" bn="এ মাসে কী বদলেছে" />
              <ResearchChanges changes={data.changes} />
            </div>
          </ResearchLock>
        )}
      </section>

      <section className="ed-closer">
        <h2>How to read this list</h2>
        <p className="first">
          The checks are the same for every company and use only official Dhaka Stock Exchange filings and prices. A
          company on this list passed every check today; it is not a buy call. Read the risk on each card and the full
          stock page before you decide.
        </p>
      </section>

      <section className="ed-faq">
        <h2>Common questions</h2>
        <dl>
          {def.faqs.map((faq) => (
            <div key={faq.q} className="ed-faq-item">
              <dt>{faq.q}</dt>
              <dd>{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="ed-nav">
        <Link href="/stock-insights" className="btn-quiet">
          ← All stock lists
        </Link>
        <Link href="/dsestockranking" className="btn-primary">
          See full rankings
        </Link>
      </div>
    </PersonalCodesProvider>
  );
}
