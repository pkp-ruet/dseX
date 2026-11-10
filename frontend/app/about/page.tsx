import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";
import { TIER_LABELS, TIER_LABELS_BN, TIER_MEANINGS, TIER_MEANINGS_BN, type TierKey } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description:
    "TopStockBD makes fundamental stock analysis accessible to every investor in Bangladesh. No annual reports, no spreadsheets — just clear scores based on real financials.",
  alternates: { canonical: "/about" },
};

/** The four checks behind the grade, then the price (judged on its own since
 *  2026-11-05: the grade measures the business, not the share price). */
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
    desc: "Is the share fairly priced today? We compare the years of profit and the assets you pay for with the company's own usual levels and with similar companies. This check is not part of the grade: a falling price doesn't make a company stronger. It decides the price word and whether we'd buy.",
    descBn: "আজকের দাম কি ন্যায্য? কত বছরের মুনাফা আর কতটা সম্পদের দাম দিচ্ছেন, তা আমরা কোম্পানির নিজের স্বাভাবিক মাত্রা আর একই ধরনের কোম্পানির সঙ্গে মিলিয়ে দেখি। এই যাচাই গ্রেডের অংশ নয়: দাম কমলে কোম্পানি শক্তিশালী হয়ে যায় না। এটি দামের মূল্যায়ন আর কেনার মতো কি না, তা ঠিক করে।",
  },
  {
    label: "Dividend",
    labelBn: "ডিভিডেন্ড",
    desc: "Does the company share its profit with shareholders, and can it afford to? We track how regularly it pays a cash dividend, how much of its profit that takes, and whether the dividend has grown.",
    descBn: "কোম্পানি কি শেয়ারহোল্ডারদের সঙ্গে মুনাফা ভাগ করে, আর তা দেওয়ার সামর্থ্য আছে কি না? আমরা দেখি কত নিয়মিত নগদ ডিভিডেন্ড দেয়, তাতে মুনাফার কত অংশ যায়, আর ডিভিডেন্ড বেড়েছে কি না।",
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

/** The serious problems that outweigh the checks (backend grade_rules.PROBLEMS). */
const PROBLEMS = [
  {
    en: "Its auditor doubts the business can keep running, or objects to its accounts for a serious reason",
    bn: "নিরীক্ষক সন্দেহ করছেন ব্যবসাটি চালু রাখা যাবে কি না, বা গুরুতর কারণে হিসাবে আপত্তি জানিয়েছেন",
  },
  { en: "DSE found its factory closed", bn: "ডিএসই এর কারখানা বন্ধ পেয়েছে" },
  {
    en: "Its loans are bigger than the whole company's market value",
    bn: "এর ঋণ কোম্পানির পুরো বাজারমূল্যের চেয়েও বেশি",
  },
  { en: "It made a loss in its latest results", bn: "সর্বশেষ ফলে এর লোকসান হয়েছে" },
  { en: "Its latest accounts are 2 or more years old", bn: "এর সর্বশেষ হিসাব 2 বছর বা তার বেশি পুরোনো" },
  { en: "DSE has put it in the Z category", bn: "ডিএসই একে জেড ক্যাটাগরিতে রেখেছে" },
  { en: "We have too few of its figures to judge it", bn: "বিচার করার মতো যথেষ্ট তথ্য আমাদের হাতে নেই" },
];

const GROUP_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

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
                The score shows how strong a company looks across four checks of the business: profit, finances,
                business strength and dividend record. The share price is judged separately. Higher is better. Each company
                also gets one of four grades, decided by rules on those checks rather than by cutting the score, so the
                name always says what the company is like:{" "}
                <strong className="text-text-main">Strong all round, Mostly strong, Mixed</strong> and{" "}
                <strong className="text-text-main">Mostly weak</strong>, so you can sort them quickly.
              </>
            }
            bn={
              <>
                স্কোর দেখায় ব্যবসার চারটি যাচাইয়ে কোম্পানিটি কতটা শক্তিশালী: মুনাফা, আর্থিক অবস্থা, ব্যবসার শক্তি আর
                ডিভিডেন্ডের ধারা। শেয়ারের দাম আলাদাভাবে বিচার করা হয়। স্কোর যত বেশি, তত ভালো। প্রতিটি কোম্পানি চারটি
                গ্রেডের একটিও পায়। গ্রেড স্কোর কেটে ঠিক হয় না, ঠিক হয় ওই যাচাইগুলোর নিয়মে, তাই নামটি সবসময় বলে
                কোম্পানিটি আসলে কেমন:{" "}
                <strong className="text-text-main">সব দিকে শক্তিশালী, বেশিরভাগ দিকে শক্তিশালী, মিশ্র</strong> আর{" "}
                <strong className="text-text-main">বেশিরভাগ দিকে দুর্বল</strong>, যাতে দ্রুত বাছাই করতে পারেন।
              </>
            }
          />
        </p>
        <p className={P}>
          <T
            en={
              <>
                Separately, each share&apos;s <strong className="text-text-main">full report</strong> (Premium) answers
                whether to buy it today. The grade tells you how strong the company is. That answer also weighs
                today&apos;s price and how much the share trades.
              </>
            }
            bn={
              <>
                এর বাইরে, প্রতিটি শেয়ারের <strong className="text-text-main">পূর্ণ রিপোর্ট</strong> (প্রিমিয়াম) বলে আজ
                শেয়ারটি কেনা উচিত কি না। গ্রেড বলে কোম্পানিটি কতটা শক্তিশালী। আর ওই উত্তর আজকের দাম আর শেয়ারটির
                লেনদেন কতটা হয়, তা-ও দেখে।
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
          <T en="The four checks behind the grade, and the price" bn="গ্রেডের পেছনের চারটি যাচাই, আর দাম" />
        </h2>
        <p className={P}>
          <T
            en="Every company's grade comes from four checks of its business. Each one answers a question a careful analyst would ask when reading the accounts. The price is the fifth question, answered on its own, so a cheaper share never reads as a stronger company. How the four checks turn into a grade is explained below."
            bn="প্রতিটি কোম্পানির গ্রেড আসে তার ব্যবসার চারটি যাচাই থেকে। প্রতিটি যাচাই এমন একটি প্রশ্নের উত্তর দেয়, যা একজন মনোযোগী বিশ্লেষক হিসাব পড়ার সময় করতেন। দাম পঞ্চম প্রশ্ন, তার উত্তর আলাদা, যাতে দাম কমলে কোম্পানিকে বেশি শক্তিশালী মনে না হয়। চারটি যাচাই থেকে গ্রেড কীভাবে ঠিক হয়, তা নিচে বলা আছে।"
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

      {/* How a company gets its group (grade_rules, 2026-11-05) */}
      <section id="grades" className="space-y-5">
        <h2 className={H2}>
          <T en="How a company gets its grade" bn="কোম্পানির গ্রেড কীভাবে ঠিক হয়" />
        </h2>
        <p className={P}>
          <T
            en="Each of the four checks gets a word: strong, fair or weak. The grade comes from those words, so its name is always true. A check we can't measure, such as an insurer's business strength, is left out. The score only sets the order inside a grade."
            bn="চারটি যাচাইয়ের প্রতিটিকে আমরা একটি শব্দ দিই: শক্তিশালী, মোটামুটি বা দুর্বল। গ্রেড আসে ওই শব্দগুলো থেকে, তাই গ্রেডের নাম সবসময় সত্যি। যে যাচাই মাপা যায় না, যেমন বিমা কোম্পানির ব্যবসার শক্তি, তা বাদ থাকে। স্কোর শুধু একই গ্রেডের ভেতরে ক্রম ঠিক করে।"
          />
        </p>
        <div className="soft-card divide-y divide-border">
          {GROUP_ORDER.map((k) => (
            <div key={k} className="p-5">
              <div className="font-bold text-text-main text-base mb-1">
                <T en={TIER_LABELS[k]} bn={TIER_LABELS_BN[k]} />
              </div>
              <div className="text-base text-text-muted leading-[1.7]">
                <T en={TIER_MEANINGS[k]} bn={TIER_MEANINGS_BN[k]} />
              </div>
            </div>
          ))}
        </div>
        <p className={P}>
          <T
            en="Some facts outweigh the checks. One of these holds a company at Mixed at best; two or more make it Mostly weak:"
            bn="কিছু তথ্য যাচাইয়ের চেয়েও বেশি গুরুত্বপূর্ণ। এর একটি থাকলে কোম্পানি বড়জোর মিশ্র হয়; দুটি বা তার বেশি থাকলে বেশিরভাগ দিকে দুর্বল:"
          />
        </p>
        <ul className="soft-card p-5 space-y-3">
          {PROBLEMS.map((item) => (
            <li key={item.en} className="flex gap-3 text-base leading-[1.65] text-text-muted">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
              <span>
                <T en={item.en} bn={item.bn} />
              </span>
            </li>
          ))}
        </ul>
        <p className={P}>
          <T
            en="A grade changes only when a check moves clearly past its line, so a company sitting right on a line doesn't flip back and forth from one day to the next."
            bn="কোনো যাচাই তার সীমা স্পষ্টভাবে পার হলে তবেই গ্রেড বদলায়। তাই ঠিক সীমার ওপর থাকা কোম্পানির গ্রেড দিনে দিনে ওঠানামা করে না।"
          />
        </p>
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
