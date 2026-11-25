import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import PageHeader from "@/components/ui/PageHeader";
import PageGuide from "@/components/seo/PageGuide";
import BuilderClient from "@/components/portfolio-builder/BuilderClient";
import { T } from "@/components/i18n/T";
import { BUILDER_PATH } from "@/lib/portfolio-builder";

// The page is the same for everyone: the explainer below is for readers and
// search, the builder itself runs in the browser for a signed-in reader
// (user decision 2026-11-23: "user must sign in to use this builder").
export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const URL = `${BASE_URL}${BUILDER_PATH}`;
const TITLE = "Portfolio builder: a DSE portfolio for your money";
const DESCRIPTION =
  "Tell us how much you want to invest, what the money is for and what kind of companies you like. We build a whole Dhaka Stock Exchange portfolio from the companies our analysis rates strong: which shares, how many of each, and why.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE portfolio builder",
    "how to build a share portfolio in Bangladesh",
    "which shares to buy with 1 lakh",
    "DSE portfolio for beginners",
    "dividend portfolio Bangladesh",
    "পোর্টফোলিও বানান",
    "শেয়ার পোর্টফোলিও",
  ],
  alternates: { canonical: URL },
  openGraph: { title: `${TITLE} | TopStockBD`, description: DESCRIPTION, url: URL, type: "website" },
};

const FAQ = [
  {
    q: "How does the portfolio builder pick the shares?",
    a: "It starts only from the companies our analysis rates strong: a profit in the latest results, no serious warnings, loans under what they have saved, and traded enough. Each share gets a job: hold steady, pay cash, grow, or bought at a low price. What your money is for decides how much goes to each job. No share gets more than 20% of the money and no business more than 30%.",
    qBn: "পোর্টফোলিও বিল্ডার কীভাবে শেয়ার বাছাই করে?",
    aBn: "শুধু আমাদের বিশ্লেষণে শক্তিশালী কোম্পানি থেকে শুরু করে: সর্বশেষ ফলাফলে মুনাফা, গুরুতর কোনো সতর্কতা নেই, ঋণ জমানো টাকার চেয়ে কম, আর যথেষ্ট লেনদেন হয়। প্রতিটি শেয়ারের একটি কাজ থাকে: স্থির ভিত্তি, নগদ দেওয়া, বাড়া, বা কম দামে কেনা। আপনার টাকার লক্ষ্য ঠিক করে কোন কাজে কতটা যাবে। কোনো শেয়ারে টাকার 20%-এর বেশি নয়, কোনো ব্যবসায় 30%-এর বেশি নয়।",
  },
  {
    q: "Why does a share say “Wait for a better price”?",
    a: "Some strong companies cost a little more today than we would pay. The plan keeps their money aside and gives the price to buy at, with a price alert one tap away.",
    qBn: "কোনো শেয়ারে “ভালো দামের অপেক্ষা” লেখা থাকে কেন?",
    aBn: "কিছু শক্তিশালী কোম্পানির দাম আজ আমাদের হিসাবের চেয়ে একটু বেশি। পরিকল্পনা তাদের টাকা আলাদা রাখে আর কোন দামে কিনবেন তা বলে দেয়, সঙ্গে এক চাপে প্রাইস অ্যালার্ট।",
  },
  {
    q: "Is it free?",
    a: "Sign in and your first plan is free, in full. Building again with another amount, another purpose or other companies is part of Premium.",
    qBn: "এটি কি ফ্রি?",
    aBn: "সাইন ইন করলে প্রথম পরিকল্পনা পুরোটাই ফ্রি। অন্য টাকা, অন্য লক্ষ্য বা অন্য কোম্পানি দিয়ে আবার বানানো প্রিমিয়ামের অংশ।",
  },
  {
    q: "Is this investment advice?",
    a: "No. It is a plan built from our analysis of each company's accounts and today's prices. Read each share's analysis before you buy, and put in only money you won't need for a few years.",
    qBn: "এটি কি বিনিয়োগ পরামর্শ?",
    aBn: "না। এটি প্রতিটি কোম্পানির হিসাব আর আজকের দামের ওপর আমাদের বিশ্লেষণ থেকে বানানো একটি পরিকল্পনা। কেনার আগে প্রতিটি শেয়ারের বিশ্লেষণ পড়ুন, আর শুধু সেই টাকা দিন যা কয়েক বছর লাগবে না।",
  },
];

export default function PortfolioBuilderPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: "Portfolio builder", headline: TITLE, description: DESCRIPTION, url: URL, inLanguage: ["en", "bn"] },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          // In My shares since 2026-11-25; /my is personal (noindex), so the
          // trail goes straight from Home, like Compare's.
          { "@type": "ListItem", position: 2, name: "Portfolio builder", item: URL },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        title={<T en="Build a portfolio with your money" bn="আপনার টাকায় পোর্টফোলিও বানান" />}
        lead={
          <T
            en="Three questions. We build a whole portfolio from the companies our analysis rates strong: which shares, how many of each, and why."
            bn="তিনটি প্রশ্ন। আমাদের বিশ্লেষণে শক্তিশালী কোম্পানি থেকে আমরা পুরো পোর্টফোলিও বানিয়ে দিই: কোন শেয়ার, কতটি করে, আর কেন।"
          />
        }
      />

      <BuilderClient />

      <PageGuide
        title="About the portfolio builder"
        titleBn="পোর্টফোলিও বিল্ডার সম্পর্কে"
        intro={[
          <>
            Picking shares one by one often ends with too much money in one company or one business. The builder
            starts from your amount and works out <b>how to split it</b>: a few big, steady companies, some that pay
            cash every year, some whose profit is growing and some priced low for what they earn, in the mix your
            purpose asks for.
          </>,
          <>
            Every share comes from the companies our analysis rates strong, the same grade you see on each stock page
            and on the <Link href="/dsestockranking">company ranking</Link>. Shares that are worth buying today are
            listed to buy now; a strong company whose price is a little high waits, with the price to buy it at. Once
            you have bought, add the shares to your <Link href="/portfolio">portfolio</Link> and we check them every
            day.
          </>,
        ]}
        introBn={[
          <>
            একটি একটি করে শেয়ার বাছতে গেলে প্রায়ই একটি কোম্পানি বা একটি ব্যবসায় বেশি টাকা চলে যায়। বিল্ডার আপনার
            টাকা থেকে শুরু করে ঠিক করে <b>কীভাবে ভাগ করবেন</b>: কয়েকটি বড়, স্থির কোম্পানি, কিছু যারা প্রতি বছর নগদ
            দেয়, কিছু যাদের মুনাফা বাড়ছে আর কিছু যাদের দাম আয়ের তুলনায় কম, আপনার লক্ষ্য অনুযায়ী।
          </>,
          <>
            প্রতিটি শেয়ার আসে আমাদের বিশ্লেষণে শক্তিশালী কোম্পানি থেকে, প্রতিটি শেয়ারের পেজে আর{" "}
            <Link href="/dsestockranking">কোম্পানির র‍্যাঙ্কিংয়ে</Link> যে গ্রেড দেখেন সেটিই। আজ কেনার মতো শেয়ার
            এখনই কেনার তালিকায় থাকে; শক্তিশালী কোম্পানির দাম একটু বেশি হলে অপেক্ষা, সঙ্গে কোন দামে কিনবেন তা। কেনার পর
            শেয়ারগুলো আপনার <Link href="/portfolio">পোর্টফোলিওতে</Link> যোগ করুন, আমরা প্রতিদিন যাচাই করব।
          </>,
        ]}
        faq={FAQ}
      />
    </>
  );
}
