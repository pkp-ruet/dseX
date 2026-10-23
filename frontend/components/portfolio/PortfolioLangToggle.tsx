"use client";

import Button from "@/components/ui/Button";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

/** English / বাংলা switch for every sentence on the portfolio page. Sits at the top. */
export default function PortfolioLangToggle({
  lang,
  onChange,
  className = "",
}: {
  lang: AnalysisLang;
  onChange: (lang: AnalysisLang) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex shrink-0 rounded-full border border-border bg-surface p-0.5 ${className}`.trim()}
      role="group"
      aria-label="Language"
    >
      {(["bn", "en"] as AnalysisLang[]).map((l) => (
        <Button
          key={l}
          type="button"
          variant="tab"
          size="sm"
          active={lang === l}
          aria-pressed={lang === l}
          onClick={() => onChange(l)}
          className={l === "bn" ? "font-bn" : ""}
        >
          {l === "en" ? "English" : "বাংলা"}
        </Button>
      ))}
    </div>
  );
}
