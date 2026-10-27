import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Get in touch with the TopStockBD team. Questions about DSE stock data, scores, or the site? We'd love to hear from you.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Us — TopStockBD",
    description:
      "Get in touch with the TopStockBD team. Questions about DSE stock data, scores, or the site?",
    url: "/contact",
    type: "website",
  },
};

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/contact`,
      url: `${BASE_URL}/contact`,
      name: "Contact Us — TopStockBD",
      description:
        "Contact TopStockBD for questions about DSE stock data, fundamental scores, or general feedback.",
      isPartOf: { "@id": BASE_URL },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Contact",
          item: `${BASE_URL}/contact`,
        },
      ],
    },
  ],
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <div className="page-narrow space-y-10">
        <PageHeader
          eyebrow={<T en="Contact" bn="যোগাযোগ" />}
          title={<T en="Contact us" bn="আমাদের সঙ্গে যোগাযোগ করুন" />}
          lead={
            <T
              en="Do you have a question, have you found an error in the data, or would you like to share feedback about TopStockBD? We are glad to hear from you."
              bn="কোনো প্রশ্ন আছে, তথ্যে ভুল পেয়েছেন, বা TopStockBD নিয়ে মতামত জানাতে চান? আমরা আপনার কথা শুনতে চাই।"
            />
          }
        />

        <section className="soft-card p-6 space-y-4">
          <h2 className="text-lg font-bold text-text-main">
            <T en="Email us" bn="ইমেইল করুন" />
          </h2>
          <p className="text-lg leading-[1.7] text-text-muted">
            <T
              en="Email is the best way to reach us. We usually reply within 1 to 3 working days."
              bn="আমাদের সঙ্গে যোগাযোগের সবচেয়ে ভালো উপায় ইমেইল। সাধারণত 1 থেকে 3 কার্যদিবসের মধ্যে উত্তর দিই।"
            />
          </p>
          <a href="mailto:topstockbd@gmail.com" className="btn-primary">
            topstockbd@gmail.com
          </a>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-main">
            <T en="What to include" bn="ইমেইলে যা লিখবেন" />
          </h2>
          <ul className="space-y-3">
            <li className="flex gap-3 text-lg leading-[1.7] text-text-muted">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
              <T
                en={
                  <>
                    <strong className="text-text-main">A problem with the data:</strong> the share&apos;s code and what looks wrong.
                  </>
                }
                bn={
                  <>
                    <strong className="text-text-main">তথ্যে সমস্যা:</strong> শেয়ারের কোড আর কোন তথ্য ভুল মনে হচ্ছে।
                  </>
                }
              />
            </li>
            <li className="flex gap-3 text-lg leading-[1.7] text-text-muted">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
              <T
                en={
                  <>
                    <strong className="text-text-main">A question about a score:</strong> which company, and what exactly seems wrong.
                  </>
                }
                bn={
                  <>
                    <strong className="text-text-main">স্কোর নিয়ে প্রশ্ন:</strong> কোন কোম্পানি, আর ঠিক কোন বিষয়টি ভুল মনে হচ্ছে।
                  </>
                }
              />
            </li>
            <li className="flex gap-3 text-lg leading-[1.7] text-text-muted">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
              <T
                en={
                  <>
                    <strong className="text-text-main">General feedback:</strong> anything you would like us to add or improve.
                  </>
                }
                bn={
                  <>
                    <strong className="text-text-main">সাধারণ মতামত:</strong> যা যোগ করলে বা ভালো করলে আপনার কাজে লাগবে।
                  </>
                }
              />
            </li>
          </ul>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-main">
            <T en="About this site" bn="এই সাইট সম্পর্কে" />
          </h2>
          <p className="text-lg leading-[1.78] text-text-muted">
            <T
              en="TopStockBD is an independent site. It studies the public financial data of companies listed on the Dhaka Stock Exchange (DSE). We have no link with DSE, BSEC, or any broker or financial institution."
              bn="TopStockBD একটি স্বাধীন সাইট। ঢাকা স্টক এক্সচেঞ্জে (ডিএসই) তালিকাভুক্ত কোম্পানির প্রকাশিত আর্থিক তথ্য এখানে বিশ্লেষণ করা হয়। ডিএসই, বিএসইসি, কোনো ব্রোকার বা আর্থিক প্রতিষ্ঠানের সঙ্গে আমাদের কোনো সম্পর্ক নেই।"
            />
          </p>
          <p className="text-lg leading-[1.78] text-text-muted">
            <T
              en={
                <>
                  To learn more about the project and how we score companies, see{" "}
                  <Link href="/about" className="font-medium text-primary hover:underline">
                    About TopStockBD
                  </Link>
                  .
                </>
              }
              bn={
                <>
                  প্রকল্পটি আর আমরা কীভাবে কোম্পানির স্কোর দিই, তা জানতে দেখুন{" "}
                  <Link href="/about" className="font-medium text-primary hover:underline">
                    TopStockBD সম্পর্কে
                  </Link>
                  ।
                </>
              }
            />
          </p>
        </section>

      </div>
    </>
  );
}
