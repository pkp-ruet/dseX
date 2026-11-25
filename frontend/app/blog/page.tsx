import type { Metadata } from "next";
import LearnHub from "@/components/learn/LearnHub";

const TITLE = "ধাপে ধাপে শেয়ার বাজার শিখুন";
const DESCRIPTION =
  "সহজ বাংলায় ঢাকা স্টক এক্সচেঞ্জে বিনিয়োগের বিনামূল্যে পাঠ: বিও অ্যাকাউন্ট খোলা, ব্রোকার বাছাই, প্রথম শেয়ার কেনা, তারপর কোম্পানি যাচাই করা শেখা।";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "শেয়ার বাজার",
    "শেয়ার বাজার শিক্ষা",
    "শেয়ার বাজার বাংলা",
    "ডিএসই",
    "ঢাকা স্টক এক্সচেঞ্জ",
    "বিও অ্যাকাউন্ট খোলার নিয়ম",
    "শেয়ার কেনার নিয়ম",
    "নতুনদের জন্য শেয়ার বাজার",
    "DSE Bangla guide",
    "share bazar Bangla",
  ],
  alternates: { canonical: "/blog", languages: { en: "/learn", bn: "/blog", "x-default": "/learn" } },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/blog",
    type: "website",
    locale: "bn_BD",
  },
};

export default function BlogPage() {
  return <LearnHub lang="bn" />;
}
