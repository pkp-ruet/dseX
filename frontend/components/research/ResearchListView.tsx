import Link from "next/link";
import type { ResearchListDetail } from "@/lib/api";
import type { ResearchListDef } from "@/lib/research-lists";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import Chip from "@/components/ui/Chip";
import { IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import ResearchFunnel from "./ResearchFunnel";
import ResearchCard from "./ResearchCard";
import ResearchCompare from "./ResearchCompare";
import ResearchChanges from "./ResearchChanges";
import ResearchLock from "./ResearchLock";

/**
 * One research list (`/stock-insights/[slug]` for the six research slugs).
 * Free: the idea and the tests as a funnel — what the list is and how it is
 * built. Premium, all of it (screen-only lock — the HTML keeps everything):
 * every stock's research card, the side-by-side table and who joined / left.
 * One language per page: every line is a `<T>` pair.
 */
export default function ResearchListView({ data, def }: { data: ResearchListDetail; def: ResearchListDef }) {
  const checks = data.funnel.length;
  const shown = data.stocks.length;
  const passedTitle =
    data.passed === 1
      ? { en: "The one that passed", bn: "যে একটি পাস করেছে" }
      : data.passed > shown
        ? { en: `The best ${shown} of the ${data.passed} that passed`, bn: `পাস করা ${data.passed}টির মধ্যে সেরা ${shown}টি` }
        : { en: `The ${shown} that passed`, bn: `যে ${shown}টি পাস করেছে` };

  return (
    <PersonalCodesProvider>
      <nav aria-label="breadcrumb" className="ed-crumbs">
        <Link href="/">
          <T en="Home" bn="হোম" />
        </Link>
        <span className="sep" aria-hidden="true">/</span>
        <Link href="/stock-insights">
          <T en="Stock lists" bn="শেয়ারের তালিকা" />
        </Link>
        <span className="sep" aria-hidden="true">/</span>
        <span className="here">
          <T en={def.shortName} bn={def.shortNameBn} />
        </span>
      </nav>

      <PageHeader
        eyebrow={<T en="Research list" bn="গবেষণা তালিকা" />}
        title={<T en={data.title_en} bn={data.title_bn} />}
        lead={<T en={data.idea_en} bn={data.idea_bn} />}
      />

      <div className="ed-byline">
        <span className="live">
          <T en="Live" bn="লাইভ" />
        </span>
        {data.as_of && (
          <span className="b-item">
            <T en={`Prices of ${formatDate(data.as_of)}`} bn={`${bnDate(data.as_of)}-এর দাম`} />
          </span>
        )}
        <span className="b-dot" aria-hidden="true" />
        <span className="b-item">
          <T en={`${data.universe} companies tested`} bn={`${data.universe}টি কোম্পানি যাচাই করা হয়েছে`} />
        </span>
        <span className="b-dot" aria-hidden="true" />
        <span className="b-item">
          <T en={`${data.passed} passed every check`} bn={`${data.passed}টি সব যাচাইয়ে পাস করেছে`} />
        </span>
        <span className="b-dot" aria-hidden="true" />
        <Chip tone="info" icon={<IconLock size={12} />}>
          <T en="Premium" bn="প্রিমিয়াম" />
        </Chip>
      </div>

      <section className="rl-section" aria-labelledby="rl-tests">
        <SectionHeader
          id="rl-tests"
          title={<T en="How we picked them" bn="যেভাবে বাছাই করেছি" />}
          lead={
            <T
              en={`Every rated company goes through these ${checks} checks, in this order. The number shows how many are still in after each one.`}
              bn={`রেটিং পাওয়া প্রতিটি কোম্পানি এই ${checks}টি যাচাইয়ের মধ্য দিয়ে যায়, এই ক্রমে। সংখ্যাটি দেখায়, প্রতিটি যাচাইয়ের পর কতগুলো বাকি থাকে।`}
            />
          }
        />
        <div className="soft-card rl-funnel-card">
          <ResearchFunnel universe={data.universe} steps={data.funnel} />
        </div>
      </section>

      <section className="rl-section" aria-labelledby="rl-stocks">
        <SectionHeader
          id="rl-stocks"
          title={<T en={passedTitle.en} bn={passedTitle.bn} />}
          lead={
            <T
              en="Each card shows why the company is here, its own number on every check, and the one thing that could go wrong."
              bn="প্রতিটি কার্ড দেখায় কোম্পানিটি কেন এখানে, প্রতিটি যাচাইয়ে তার নিজের সংখ্যা, আর যে একটি বিষয়ে ঝুঁকি আছে।"
            />
          }
        />

        {data.stocks.length === 0 ? (
          <EmptyState
            title={<T en="No company passes every check today" bn="আজ কোনো কোম্পানি সব যাচাইয়ে পাস করেনি" />}
            message={
              <T
                en="That happens when prices are high or results are weak. The list is checked again after every trading day."
                bn="দাম বেশি হলে বা ফলাফল দুর্বল হলে এমন হয়। প্রতিটি কার্যদিবসের পর তালিকা আবার যাচাই করা হয়।"
              />
            }
            actions={[{ href: "/stock-insights", label: <T en="Other lists" bn="অন্য তালিকা" /> }]}
          />
        ) : (
          <ResearchLock
            passed={data.passed}
            stocks={data.stocks}
            checks={checks}
            preview={
              <div className="rl-cards">
                <ResearchCard s={data.stocks[0]} masked />
              </div>
            }
          >
            <div className="rl-cards">
              {data.stocks.map((s) => (
                <ResearchCard key={s.code} s={s} />
              ))}
            </div>

            <div className="rl-subsection">
              <SectionHeader
                as="h3"
                title={<T en="Side by side" bn="সব শেয়ার পাশাপাশি" />}
                lead={<T en="Tap a column to sort." bn="সাজাতে কোনো কলামে চাপ দিন।" />}
              />
              <ResearchCompare columns={data.columns} stocks={data.stocks} />
            </div>

            <div className="rl-subsection">
              <SectionHeader as="h3" title={<T en="What changed this month" bn="এ মাসে কী বদলেছে" />} />
              <ResearchChanges changes={data.changes} />
            </div>
          </ResearchLock>
        )}
      </section>

      <section className="ed-closer">
        <h2>
          <T en="How to read this list" bn="এই তালিকা কীভাবে পড়বেন" />
        </h2>
        <p className="first">
          <T
            en="The checks are the same for every company and use only official Dhaka Stock Exchange filings and prices. A company on this list passed every check today; that is not a call to buy. Please read the risk on each card and the full stock page before you decide."
            bn="যাচাইগুলো প্রতিটি কোম্পানির জন্য একই, আর শুধু ঢাকা স্টক এক্সচেঞ্জের অফিসিয়াল প্রতিবেদন ও দাম ব্যবহার করে। এই তালিকার কোম্পানি আজ সব যাচাইয়ে পাস করেছে; এটি কেনার পরামর্শ নয়। সিদ্ধান্তের আগে প্রতিটি কার্ডের ঝুঁকি আর শেয়ারের পুরো পেজ পড়ে নিন।"
          />
        </p>
        <p>
          <T
            en={
              <>
                Want different checks? <Link href="/screener">Build your own in the screener</Link>. You choose the
                checks and settings, and we tell you on the day a new share passes them.
              </>
            }
            bn={
              <>
                অন্য যাচাই চান? <Link href="/screener">স্ক্রিনারে নিজের তালিকা বানান</Link>। যাচাই আর সেটিং আপনি
                বেছে নেবেন, আর নতুন কোনো শেয়ার পাস করলে সেদিনই আমরা জানাব।
              </>
            }
          />
        </p>
      </section>

      <section className="ed-faq">
        <h2>
          <T en="Common questions" bn="সাধারণ প্রশ্ন" />
        </h2>
        <dl>
          {def.faqs.map((faq) => (
            <div key={faq.q} className="ed-faq-item">
              <dt>
                <T en={faq.q} bn={faq.qBn} />
              </dt>
              <dd>
                <T en={faq.a} bn={faq.aBn} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="ed-nav">
        <Link href="/stock-insights" className="btn-quiet">
          <T en="← All stock lists" bn="← সব তালিকা" />
        </Link>
        <Link href="/dsestockranking" className="btn-primary">
          <T en="See the full rankings" bn="পুরো র‍্যাঙ্কিং দেখুন" />
        </Link>
      </div>
    </PersonalCodesProvider>
  );
}
