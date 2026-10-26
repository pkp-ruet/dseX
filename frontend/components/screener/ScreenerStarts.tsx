"use client";

import { useState } from "react";
import Link from "next/link";
import Chip from "@/components/ui/Chip";
import Sheet from "@/components/ui/Sheet";
import { IconCrown } from "@/components/ui/icons";
import ScreenerStep from "./ScreenerStep";
import type { CustomCheckDef, CustomListTemplate } from "@/lib/api";

/**
 * Step 1: what are you looking for? One row of goal chips (one tap for a
 * beginner) and "More ideas", a sheet with the six research lists rebuilt
 * from menu checks. One line under the row says what the chosen start does.
 */
export default function ScreenerStarts({
  templates,
  byKey,
  active,
  onPick,
  t,
}: {
  templates: CustomListTemplate[];
  byKey: Map<string, CustomCheckDef>;
  active: string | null;
  onPick: (tp: CustomListTemplate) => void;
  t: (en: string, bn: string) => string;
}) {
  const [more, setMore] = useState(false);
  const goals = templates.filter((tp) => tp.kind === "goal");
  const research = templates.filter((tp) => tp.kind === "research");
  const usesPower = (tp: CustomListTemplate) => tp.spec.checks.some((c) => byKey.get(c.key)?.premium);
  const current = templates.find((tp) => tp.id === active);
  const researchOn = current?.kind === "research";

  return (
    <ScreenerStep n={1} title={t("What are you looking for?", "আপনি কী খুঁজছেন?")}>
      <div className="flex flex-wrap gap-2">
        {goals.map((tp) => (
          <Chip key={tp.id} active={tp.id === active} onClick={() => onPick(tp)}>
            {t(tp.title_en, tp.title_bn)}
          </Chip>
        ))}
        <Chip active={researchOn} onClick={() => setMore(true)}>
          {researchOn ? t(current.title_en, current.title_bn) : t("More ideas…", "আরও আইডিয়া…")}
        </Chip>
      </div>

      <p className="mt-3 min-h-5 text-sm text-text-muted">
        {current ? (
          <>
            {t(current.blurb_en, current.blurb_bn)}
            {current.research_slug && (
              <>
                {" · "}
                <Link prefetch={false} href={`/stock-insights/${current.research_slug}`} className="text-primary hover:underline">
                  {t("Read the list", "তালিকাটি পড়ুন")}
                </Link>
              </>
            )}
          </>
        ) : (
          t("Your own screen — change the checks below as you like.", "আপনার নিজের স্ক্রিন — নিচের শর্ত ইচ্ছেমতো বদলান।")
        )}
      </p>

      <Sheet
        open={more}
        onClose={() => setMore(false)}
        title={t("Start from a research list", "গবেষণা তালিকা থেকে শুরু")}
        bn={t("Our six research lists, rebuilt so you can change them.", "আমাদের ছয়টি গবেষণা তালিকা, যাতে আপনি বদলাতে পারেন।")}
      >
        <ul className="divide-y divide-border">
          {research.map((tp) => (
            <li key={tp.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(tp);
                  setMore(false);
                }}
                className="flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left hover:text-primary active:bg-surface-2"
              >
                <span className="text-base font-semibold text-text-main">{t(tp.title_en, tp.title_bn)}</span>
                {usesPower(tp) && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-gold-ink">
                    <IconCrown size={14} /> {t("Power check", "পাওয়ার শর্ত")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </ScreenerStep>
  );
}
