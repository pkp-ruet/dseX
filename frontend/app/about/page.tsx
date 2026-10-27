import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

export const metadata: Metadata = {
  title: "About",
  description:
    "TopStockBD makes fundamental stock analysis accessible to every investor in Bangladesh. No annual reports, no spreadsheets — just clear scores based on real financials.",
  alternates: { canonical: "/about" },
};

/** The five checks, with the same plain names the rest of the site uses. */
const PILLARS = [
  {
    label: "Profit",
    labelBn: "মুনাফা",
    desc: "Is the company making money, and has it done so year after year? We look at earnings per share over five years, how profit has grown, and the return on shareholders' money.",
    descBn: "কোম্পানি কি মুনাফা করছে, আর বছরের পর বছর তা ধরে রাখতে পারছে? আমরা পাঁচ বছরের ইপিএস, মুনাফা কতটা বেড়েছে, আর শেয়ারহোল্ডারদের টাকায় কতটা মুনাফা হচ্ছে তা দেখি।",
  },
  {
    label: "Finances",
    labelBn: "আর্থিক অবস্থা",
    desc: "Does the company carry too much debt, and can it pay its bills? We check its loans, the cash its business brings in, and how easily it meets short-term costs. For banks we look at how much of their own capital stands behind their loans.",
    descBn: "কোম্পানির কি ঋণ বেশি, আর খরচ মেটাতে পারছে কি না? আমরা দেখি ঋণ কত, ব্যবসা থেকে কত নগদ আসে, আর স্বল্পমেয়াদি খরচ কত সহজে মেটায়। ব্যাংকের বেলায় দেখি, ঋণের পেছনে ব্যাংকের নিজের মূলধন কতটা আছে।",
  },
  {
    label: "Business",
    labelBn: "ব্যবসার শক্তি",
    desc: "Can the company hold its place against rivals? We measure its profit margins, how steady its sales are from year to year, and how it ranks by size in its sector.",
    descBn: "কোম্পানি কি প্রতিযোগীদের মধ্যে নিজের জায়গা ধরে রাখতে পারে? আমরা দেখি মুনাফার মার্জিন, বছরে বছরে বিক্রি কতটা স্থির, আর সেক্টরের মধ্যে আকারে কোম্পানিটি কোথায়।",
  },
  {
    label: "Price",
    labelBn: "দাম",
    desc: "Is the share fairly priced today? We compare today's P/E and price-to-book with the company's own usual levels over five years, and with similar companies.",
    descBn: "আজকের দাম কি ন্যায্য? আমরা আজকের পিই আর বুক ভ্যালুর তুলনায় দাম মিলিয়ে দেখি কোম্পানির নিজের পাঁচ বছরের স্বাভাবিক মাত্রা আর একই ধরনের কোম্পানির সঙ্গে।",
  },
  {
    label: "Dividend",
    labelBn: "ডিভিডেন্ড",
    desc: "Does the company share its profit with shareholders, and can it afford to? We track how regularly it pays a cash dividend, how much of its profit that takes, the yield at today's price, and whether the dividend has grown.",
    descBn: "কোম্পানি কি শেয়ারহোল্ডারদের সঙ্গে মুনাফা ভাগ করে, আর তা দেওয়ার সামর্থ্য আছে কি না? আমরা দেখি কত নিয়মিত নগদ ডিভিডেন্ড দেয়, তাতে মুনাফার কত অংশ যায়, আজকের দামে ডিভিডেন্ড ইল্ড কত, আর ডিভিডেন্ড বেড়েছে কি না।",
  },
];

const NOT_LIST = [
  {
    en: "We are not financial advisers. Nothing on this site is investment advice.",
    bn: "আমরা বিনিয়োগ পরামর্শক নই। এই সাইটের কিছুই বিনিয়োগ পরামর্শ নয়।",
  },
  {
    en: "We are not a broker. We do not carry out trades or earn commissions.",
    bn: "আমরা ব্রোকার নই। আমরা লেনদেন করি না, কমিশনও নিই না।",
  },
  {
    en: "We do not predict prices. A score describes the company's published figures, not the future.",
    bn: "আমরা দামের পূর্বাভাস দিই না। স্কোর কোম্পানির প্রকাশিত হিসাব বোঝায়, ভবিষ্যৎ নয়।",
  },
  {
    en: "A high score does not mean the price will rise. Please always check a share yourself before you buy.",
    bn: "বেশি স্কোর মানেই দাম বাড়বে, এমন নয়। কেনার আগে সব সময় নিজে যাচাই করে নিন।",
  },
];

const P = "text-lg leading-[1.78] text-text-muted";
const H2 = "text-xl sm:text-2xl font-bold tracking-tight text-text-main";

export default function AboutPage() {
  return (
    <div className="page-narrow space-y-12">
      <PageHeader
        eyebrow={<T en="About TopStockBD" bn="TopStockBD সম্পর্কে" />}
        title={<T en="We read the accounts, so you don't have to." bn="কোম্পানির হিসাব আমরা পড়ি, যাতে আপনাকে পড়তে না হয়।" />}
        lead={
          <T
            en="TopStockBD studies the finances of every company listed on the Dhaka Stock Exchange (DSE) and gives each one a score. You can make better decisions without reading a single annual report."
            bn="ঢাকা স্টক এক্সচেঞ্জে (ডিএসই) তালিকাভুক্ত প্রতিটি কোম্পানির আর্থিক হিসাব TopStockBD বিশ্লেষণ করে, আর প্রতিটিকে একটি স্কোর দেয়। একটিও বার্ষিক প্রতিবেদন না পড়ে আপনি ভালো সিদ্ধান্ত নিতে পারেন।"
          />
        }
      />

      {/* The problem */}
      <section className="space-y-3.5">
        <h2 className={H2}>
          <T en="The problem we are solving" bn="আমরা যে সমস্যার সমাধান করছি" />
        </h2>
        <p className={P}>
          <T
            en="Many investors in Bangladesh buy shares on tips from friends, brokers or social media. This is not because they don't care about a company's finances. It is because proper research is hard."
            bn="বাংলাদেশের অনেক বিনিয়োগকারী বন্ধু, ব্রোকার বা সোশ্যাল মিডিয়ার টিপস শুনে শেয়ার কেনেন। কোম্পানির আর্থিক অবস্থা নিয়ে তাঁরা ভাবেন না, তা নয়। আসলে ঠিকমতো খোঁজখবর নেওয়া কঠিন।"
          />
        </p>
        <p className={P}>
          <T
            en="Reading an annual report takes hours. You need to understand accounts, compare figures across years, and know what a sensible P/E is for a textile company compared with a medicine maker. Most people don't have the time or the training."
            bn="একটি বার্ষিক প্রতিবেদন পড়তে কয়েক ঘণ্টা লাগে। হিসাব বুঝতে হয়, কয়েক বছরের সংখ্যা মেলাতে হয়, আর জানতে হয় একটি বস্ত্র কোম্পানি আর একটি ওষুধ কোম্পানির জন্য কোন পিই যুক্তিসংগত। বেশির ভাগ মানুষের সেই সময় বা প্রশিক্ষণ থাকে না।"
          />
        </p>
        <p className={P}>
          <T en="That is where TopStockBD helps." bn="এখানেই TopStockBD কাজে আসে।" />
        </p>
      </section>

      {/* What we do */}
      <section className="space-y-3.5">
        <h2 className={H2}>
          <T en="What we do" bn="আমরা যা করি" />
        </h2>
        <p className={P}>
          <T
            en={
              <>
                We collect the public financial figures of every DSE-listed company: profit, loans, margins,
                dividends and price. We run them through the same set of rules and sum everything up in one{" "}
                <strong className="text-text-main">score from 0 to 100</strong>.
              </>
            }
            bn={
              <>
                ডিএসইতে তালিকাভুক্ত প্রতিটি কোম্পানির প্রকাশিত আর্থিক তথ্য আমরা সংগ্রহ করি: মুনাফা, ঋণ, মার্জিন,
                ডিভিডেন্ড আর দাম। সব কোম্পানিকে একই নিয়মে যাচাই করে সব মিলিয়ে একটি{" "}
                <strong className="text-text-main">0 থেকে 100-এর স্কোর</strong> দিই।
              </>
            }
          />
        </p>
        <p className={P}>
          <T
            en={
              <>
                The score shows how strong a company looks across five checks. Higher is better. Companies are
                then grouped into grades, <strong className="text-text-main">Excellent, Good, Average</strong> and{" "}
                <strong className="text-text-main">Weak</strong>, so you can sort them quickly.
              </>
            }
            bn={
              <>
                স্কোর দেখায় পাঁচটি যাচাইয়ে কোম্পানিটি কতটা শক্তিশালী। স্কোর যত বেশি, তত ভালো। এরপর কোম্পানিগুলো
                গ্রেডে ভাগ হয়: <strong className="text-text-main">চমৎকার, ভালো, মাঝারি</strong> আর{" "}
                <strong className="text-text-main">দুর্বল</strong>, যাতে দ্রুত বাছাই করতে পারেন।
              </>
            }
          />
        </p>
        <p className={P}>
          <T
            en={
              <>
                Separately, a share can carry a simple <strong className="text-text-main">Buy or Sell signal</strong>.
                The grade tells you how strong the company is. The signal tells you whether now looks like a sensible
                time to act, because it also weighs today&apos;s price and how much the share trades. When neither
                applies, no signal is shown.
              </>
            }
            bn={
              <>
                এর বাইরে, একটি শেয়ারে সহজ একটি <strong className="text-text-main">কেনা বা বিক্রির সংকেত</strong> থাকতে
                পারে। গ্রেড বলে কোম্পানিটি কতটা শক্তিশালী। সংকেত বলে এখন কিছু করার সময় কি না, কারণ এটি আজকের দাম আর
                শেয়ারটির লেনদেন কতটা হয়, তা-ও দেখে। কোনোটিই না খাটলে কোনো সংকেত দেখানো হয় না।
              </>
            }
          />
        </p>
        <p className={P}>
          <T
            en="We make no predictions and set no price targets. We give you a clear, orderly view of what the figures say."
            bn="আমরা কোনো পূর্বাভাস দিই না, দামের লক্ষ্যও ঠিক করি না। সংখ্যাগুলো কী বলছে, তা গুছিয়ে পরিষ্কারভাবে দেখাই।"
          />
        </p>
      </section>

      {/* The five checks */}
      <section className="space-y-5">
        <h2 className={H2}>
          <T en="The five things we check" bn="আমরা যে পাঁচটি বিষয় যাচাই করি" />
        </h2>
        <p className={P}>
          <T
            en="Every company is scored on five checks. Each one answers a question a careful analyst would ask when reading the accounts."
            bn="প্রতিটি কোম্পানির স্কোর পাঁচটি যাচাইয়ে হয়। প্রতিটি যাচাই এমন একটি প্রশ্নের উত্তর দেয়, যা একজন মনোযোগী বিশ্লেষক হিসাব পড়ার সময় করতেন।"
          />
        </p>
        <div className="space-y-3.5">
          {PILLARS.map((p, i) => (
            <div key={p.label} className="soft-card flex gap-4 p-5">
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary-ink tabular-nums"
              >
                {i + 1}
              </span>
              <div>
                <div className="font-bold text-text-main text-base mb-1">
                  <T en={p.label} bn={p.labelBn} />
                </div>
                <div className="text-base text-text-muted leading-[1.7]">
                  <T en={p.desc} bn={p.descBn} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Our goal */}
      <section className="space-y-3.5">
        <h2 className={H2}>
          <T en="Our goal" bn="আমাদের লক্ষ্য" />
        </h2>
        <p className={P}>
          <T
            en="We want every investor in Bangladesh, whether a student, a small saver or an experienced trader, to have the kind of understanding that used to need a financial analyst or hours of spreadsheet work."
            bn="আমরা চাই বাংলাদেশের প্রত্যেক বিনিয়োগকারী, শিক্ষার্থী হোন, ছোট সঞ্চয়কারী হোন বা অভিজ্ঞ বিনিয়োগকারী, এমন ধারণা পান যার জন্য আগে একজন বিশ্লেষক বা কয়েক ঘণ্টার হিসাব লাগত।"
          />
        </p>
        <p className={P}>
          <T
            en="Understanding a company's finances should not be hard to reach. The data is public and the maths can be learned. We do it for you, the same way, across the whole market."
            bn="কোম্পানির আর্থিক অবস্থা বোঝা কঠিন হওয়ার কথা নয়। তথ্য প্রকাশিত, হিসাবও শেখা যায়। আমরা পুরো বাজারের জন্য একই নিয়মে কাজটি করে দিই।"
          />
        </p>
        <p className={P}>
          <T
            en="The scores, grades and market data are free. Premium adds the full reasoning on every share, for readers who want it."
            bn="স্কোর, গ্রেড আর বাজারের তথ্য ফ্রি। যাঁরা চান, তাঁদের জন্য প্রিমিয়ামে আছে প্রতিটি শেয়ারের পূর্ণ ব্যাখ্যা।"
          />
        </p>
      </section>

      {/* What we are not */}
      <section className="soft-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-text-main">
          <T en="What we are not" bn="আমরা যা নই" />
        </h2>
        <ul className="space-y-3">
          {NOT_LIST.map((item) => (
            <li key={item.en} className="flex gap-3 text-base leading-[1.65] text-text-muted">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
              <span>
                <T en={item.en} bn={item.bn} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="soft-card ambient-panel p-6 sm:p-7 text-center space-y-4">
        <p className="text-lg font-semibold text-text-main">
          <T en="Ready to look at the rankings?" bn="র‍্যাঙ্কিং দেখতে চান?" />
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/dsestockranking" className="btn-primary">
            <T en="See the rankings" bn="র‍্যাঙ্কিং দেখুন" />
          </Link>
          <Link href="/" className="btn-quiet">
            <T en="Back to home" bn="হোমে ফিরুন" />
          </Link>
        </div>
      </section>
    </div>
  );
}
