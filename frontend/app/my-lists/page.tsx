import type { Metadata } from "next";
import MyListsClient from "@/components/custom-lists/MyListsClient";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Your Own Stock Lists",
  description:
    "Build your own DSE stock list from plain checks — dividend, price, profit, loans, sector — and get told the day a new stock passes every one.",
  robots: { index: false, follow: false },
};

export default function MyListsPage() {
  return (
    <>
      <PageHeader
        title="Your own lists"
        bn="নিজের শর্তে শেয়ারের তালিকা বানান — নতুন কোনো শেয়ার সব শর্ত পূরণ করলেই জানিয়ে দেব।"
        lead="Pick the checks that matter to you. We run them on every rated company each day and tell you when a new stock passes."
      />
      <MyListsClient />
    </>
  );
}
