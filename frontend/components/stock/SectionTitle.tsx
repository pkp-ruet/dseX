import type { ReactNode } from "react";
import Bn from "@/components/i18n/Bn";

interface Props {
  /** English section headline, plain words (e.g. "The Health Check"). */
  title: string;
  /** One English sentence under it. */
  sub?: ReactNode;
  /** One simple Bengali line explaining the section. */
  bn?: string;
  /** Right-hand slot (a toggle, a link). */
  right?: ReactNode;
  className?: string;
}

/**
 * The one heading block for every section on `/stock/[code]`. English headline,
 * one English line, one Bengali line — the same rhythm the landing page uses.
 * Keeps the eleven section components from each hand-rolling their own <h2>.
 */
export default function SectionTitle({ title, sub, bn, right, className = "" }: Props) {
  return (
    <div className={`mb-5 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text)" }}>
          {title}
        </h2>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {sub && (
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {sub}
        </p>
      )}
      {bn && (
        <Bn className="text-[0.9rem] font-medium mt-1" >
          <span style={{ color: "var(--text-muted)" }}>{bn}</span>
        </Bn>
      )}
    </div>
  );
}
