import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";

/**
 * Block 2 — four plain facts in one white band (rebuilt 2026-10-31). Each is a
 * big word or number with one line under it; the last one is the promise the
 * whole site keeps (no tips, no rumours). The colour key that used to sit here
 * is gone: every coloured word on the page now says what it means.
 */

interface Fact {
  key: string;
  value: ReactNode;
  line: ReactNode;
}

export default function TrustStrip({ totalCount }: { totalCount: number }) {
  const facts: Fact[] = [
    {
      key: "graded",
      value: `${totalCount}+`,
      line: <T en="companies graded after every trading day" bn="কোম্পানির গ্রেড, প্রতিদিন বাজার বন্ধের পর" />,
    },
    {
      key: "checks",
      value: <T en="5 checks" bn="5টি যাচাই" />,
      line: <T en="on every company: profit, loans, business, price, dividend" bn="প্রতিটি কোম্পানিতে: মুনাফা, ঋণ, ব্যবসা, দাম, ডিভিডেন্ড" />,
    },
    {
      key: "lang",
      value: <T en="বাংলা + EN" bn="বাংলা + EN" />,
      line: <T en="every page, in plain words" bn="প্রতিটি পেজ, সহজ ভাষায়" />,
    },
    {
      key: "tips",
      value: <T en="0 tips" bn="0 টিপস" />,
      line: <T en="and no rumours. Only the company’s own numbers." bn="আর কোনো গুজব নয়। শুধু কোম্পানির নিজের হিসাব।" />,
    },
  ];

  return (
    <section aria-label="Why you can trust these numbers" className="lp-bleed border-y border-border bg-surface">
      <ul className="mx-auto grid max-w-5xl grid-cols-2 lg:grid-cols-4">
        {facts.map((f, i) => (
          <li
            key={f.key}
            className={`px-4 py-6 sm:px-6 ${i % 2 === 1 ? "border-l border-border" : ""} ${i > 1 ? "border-t border-border lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
          >
            <p className="text-2xl font-bold tracking-tight text-text-main sm:text-3xl">{f.value}</p>
            <p className="mt-1 text-sm leading-snug text-text-main sm:text-base">{f.line}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
